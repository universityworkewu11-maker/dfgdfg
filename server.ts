import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Helper to retrieve cookie values manually to avoid external cookie-parser dependency
const getCookie = (req: express.Request, name: string): string | null => {
  const cookies = req.headers.cookie?.split("; ") || [];
  const cookie = cookies.find((c) => c.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
};

// Helper to build headers with authentication if available
const getGitHubHeaders = (req: express.Request) => {
  const headers: Record<string, string> = {
    "User-Agent": "DevLens-Portfolio-Auditor",
    "Accept": "application/vnd.github.v3+json",
  };

  // 1. Try manual Auth header (e.g. Personal Access Token entered by user)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    headers["Authorization"] = `token ${authHeader.substring(7)}`;
    return headers;
  }

  // 2. Try cookie-based OAuth token
  const cookieToken = getCookie(req, "github_token");
  if (cookieToken) {
    headers["Authorization"] = `token ${cookieToken}`;
    return headers;
  }

  return headers;
};

// Lazy initialization of Gemini SDK client
let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ==========================================
// API ROUTES
// ==========================================

// Auth Configuration Endpoint
app.get("/api/auth/config", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID || "";
  res.json({
    hasClientId: !!clientId,
    clientId: clientId,
  });
});

// Get OAuth URL
app.get("/api/auth/url", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({ error: "GitHub OAuth Client ID is not configured." });
  }

  // Use current APP_URL or request origin as fallback for callback
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
  const redirectUri = `${appUrl.replace(/\/$/, "")}/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user repo",
    state: Math.random().toString(36).substring(7),
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl });
});

// OAuth Callback Route
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Authorization code is missing");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send("GitHub Client credentials are not configured on the server.");
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const data: any = await response.json();
    const token = data.access_token;

    if (!token) {
      throw new Error(data.error_description || "Access token not received from GitHub");
    }

    // Set secure cookie for cross-origin iframe
    res.cookie("github_token", token, {
      secure: true,
      sameSite: "none",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Return HTML that posts a success message and closes the popup window
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              background-color: #0d1117;
              color: #c9d1d9;
              margin: 0;
            }
            .spinner {
              border: 4px solid rgba(255, 255, 255, 0.1);
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border-left-color: #58a6ff;
              animation: spin 1s linear infinite;
              margin-bottom: 16px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>Authentication Successful!</h2>
          <p>Connecting back to DevLens... This window will close shortly.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "OAUTH_AUTH_SUCCESS" }, "*");
              setTimeout(() => {
                window.close();
              }, 1000);
            } else {
              window.location.href = "/";
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

// Check Session / Get Authenticated User Profile
app.get("/api/auth/status", async (req, res) => {
  const headers = getGitHubHeaders(req);
  if (!headers["Authorization"]) {
    return res.json({ authenticated: false });
  }

  try {
    const response = await fetch("https://api.github.com/user", { headers });
    if (!response.ok) {
      return res.json({ authenticated: false });
    }
    const profile = await response.json();
    res.json({ authenticated: true, user: profile });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

// Logout Route
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("github_token", {
    secure: true,
    sameSite: "none",
    httpOnly: true,
  });
  res.json({ success: true });
});

// Fetch Profile
app.get("/api/github/profile/:username?", async (req, res) => {
  const username = req.params.username;
  const headers = getGitHubHeaders(req);

  // If no username provided, try to fetch authenticated user's profile
  const url = username 
    ? `https://api.github.com/users/${username}`
    : "https://api.github.com/user";

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorMsg = await response.text();
      return res.status(response.status).json({ error: "Failed to fetch profile", details: errorMsg });
    }
    const profile = await response.json();
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch Repositories
app.get("/api/github/repos/:username?", async (req, res) => {
  const username = req.params.username;
  const headers = getGitHubHeaders(req);

  // If no username provided, try to fetch authenticated user's repos (includes private)
  // Else fetch the public repos of the target username
  const url = username
    ? `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`
    : "https://api.github.com/user/repos?per_page=100&sort=updated";

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorMsg = await response.text();
      return res.status(response.status).json({ error: "Failed to fetch repositories", details: errorMsg });
    }
    const repos = await response.json();
    res.json(repos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch Repository Content & README & package.json
app.get("/api/github/repo-details/:owner/:repo", async (req, res) => {
  const { owner, repo } = req.params;
  const headers = getGitHubHeaders(req);

  try {
    // 1. Fetch repo details (e.g. branch, stats)
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      throw new Error("Failed to get repository meta info");
    }
    const repoMeta = await repoRes.json();

    // 2. Try fetching package.json to understand stack
    let packageJson = null;
    const packageRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers });
    if (packageRes.ok) {
      const packageData: any = await packageRes.json();
      if (packageData.content) {
        packageJson = Buffer.from(packageData.content, "base64").toString("utf-8");
      }
    }

    // 3. Try fetching README.md
    let readme = "";
    const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
    if (readmeRes.ok) {
      const readmeData: any = await readmeRes.json();
      if (readmeData.content) {
        readme = Buffer.from(readmeData.content, "base64").toString("utf-8");
      }
    }

    // 4. Fetch repo top level directory structure
    let files: string[] = [];
    const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
    if (filesRes.ok) {
      const filesData: any = await filesRes.json();
      if (Array.isArray(filesData)) {
        files = filesData.map((f: any) => `${f.type === "dir" ? "[DIR] " : ""}${f.name}`);
      }
    }

    res.json({
      meta: repoMeta,
      files,
      packageJson,
      readme: readme ? readme.substring(0, 3000) : "", // Truncate README to save tokens
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GEMINI AI SERVICE ENDPOINTS
// ==========================================

// AI Profile Audit
app.post("/api/ai/audit-profile", async (req, res) => {
  const { profile, repos } = req.body;

  if (!profile) {
    return res.status(400).json({ error: "Profile data is required for auditing." });
  }

  try {
    const ai = getAIClient();

    const reposContext = repos && Array.isArray(repos)
      ? repos.slice(0, 10).map((r: any) => `- ${r.name}: ${r.description || "No description"} (Language: ${r.language || "N/A"}, Stars: ${r.stargazers_count})`).join("\n")
      : "No repository overview available.";

    const prompt = `You are an elite developer portfolio auditor and career coach. Review the following GitHub profile data and top projects, and generate a comprehensive, actionable profile audit.

GITHUB PROFILE:
- Username: ${profile.login}
- Name: ${profile.name || "N/A"}
- Bio: ${profile.bio || "N/A"}
- Company: ${profile.company || "N/A"}
- Blog/Website: ${profile.blog || "N/A"}
- Location: ${profile.location || "N/A"}
- Followers: ${profile.followers}
- Following: ${profile.following}
- Public Repos: ${profile.public_repos}

TOP REPOSITORIES:
${reposContext}

Generate the audit as a clean JSON object exactly matching this schema:
{
  "tagline": "A punchy, custom 1-sentence headline summarizing their developer identity and branding",
  "summary": "A 2-3 sentence inspiring executive summary of their technical brand and overall potential",
  "strengths": ["List 3-4 specific technical or soft-skill branding strengths based on their profile and repos"],
  "improvements": [
    {
      "area": "Specific section (e.g. 'Bio & Headline', 'Repository Presentation', 'Readme completeness')",
      "suggestion": "Concrete, step-by-step advice on how to improve this area to attract top recruiters or collaborators"
    }
  ],
  "portfolioIdeas": [
    {
      "title": "A custom project idea that would perfectly bridge or expand their existing skills",
      "description": "Short explanation of the tech stack and unique value proposition of the proposed project",
      "difficulty": "Beginner | Intermediate | Advanced"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tagline: { type: Type.STRING },
            summary: { type: Type.STRING },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            improvements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  area: { type: Type.STRING },
                  suggestion: { type: Type.STRING }
                },
                required: ["area", "suggestion"]
              }
            },
            portfolioIdeas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  difficulty: { type: Type.STRING }
                },
                required: ["title", "description", "difficulty"]
              }
            }
          },
          required: ["tagline", "summary", "strengths", "improvements", "portfolioIdeas"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("AI Audit error:", error);
    res.status(500).json({ error: error.message });
  }
});

// AI Repository Deep Dive
app.post("/api/ai/analyze-repo", async (req, res) => {
  const { repoDetails } = req.body;

  if (!repoDetails || !repoDetails.meta) {
    return res.status(400).json({ error: "Repository details are required for analysis." });
  }

  const meta = repoDetails.meta;
  const files = repoDetails.files || [];
  const packageJson = repoDetails.packageJson || "";
  const readme = repoDetails.readme || "";

  try {
    const ai = getAIClient();

    const prompt = `You are a veteran Principal Software Engineer. Conduct a thorough technical analysis and audit of the following GitHub repository:

REPOSITORY METRICS:
- Name: ${meta.name}
- Full Name: ${meta.full_name}
- Description: ${meta.description || "N/A"}
- Language: ${meta.language || "N/A"}
- Stars: ${meta.stargazers_count}
- Open Issues: ${meta.open_issues_count}

REPOSITORY STRUCTURE (Top Files/Folders):
${files.slice(0, 20).join("\n")}

PACKAGE.JSON CONTENTS (Partial):
${packageJson ? packageJson.substring(0, 1500) : "N/A"}

CURRENT README CONTENTS (Partial):
${readme ? readme.substring(0, 1500) : "N/A"}

Perform your review and respond with a highly detailed, constructive JSON object conforming to this exact schema:
{
  "rating": "An engineering letter grade (e.g. 'A+', 'B-', 'C')",
  "overview": "A 2-sentence summary of what this project is and its clear value",
  "architectureReview": "Technical critique of the file structure, stack, and dependencies seen",
  "codeQualityRating": 8, // A rating out of 10
  "documentationRating": 5, // A rating out of 10
  "suggestions": [
    "At least 3 practical, code-level optimizations, architecture adjustments, or developer practices"
  ],
  "enhancedReadme": "A gorgeous, comprehensive markdown template tailored specifically to replace their current README. Include badges, stack info, getting started steps, and structure. Use proper escape tags where necessary."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rating: { type: Type.STRING },
            overview: { type: Type.STRING },
            architectureReview: { type: Type.STRING },
            codeQualityRating: { type: Type.INTEGER },
            documentationRating: { type: Type.INTEGER },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            enhancedReadme: { type: Type.STRING }
          },
          required: ["rating", "overview", "architectureReview", "codeQualityRating", "documentationRating", "suggestions", "enhancedReadme"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("AI Repo Analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// STATIC ASSETS & VITE INTEGRATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
