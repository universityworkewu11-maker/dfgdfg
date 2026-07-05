import React from "react";
import { 
  Sparkles, 
  Github, 
  Search, 
  LogOut, 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle, 
  Key,
  BookOpen,
  Terminal,
  ChevronRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { GitHubProfile, GitHubRepo, AIAuditResult, AIRepoAnalysis } from "./types";
import ProfileCard from "./components/ProfileCard";
import RepositoryList from "./components/RepositoryList";
import AIAuditPanel from "./components/AIAuditPanel";
import AIRepoAnalysisPanel from "./components/AIRepoAnalysisPanel";

const POPULAR_USERS = ["torvalds", "gaearon", "yyx990803", "mrdoob", "tj"];

export default function App() {
  // Session & Config States
  const [authStatus, setAuthStatus] = React.useState<{ authenticated: boolean; user?: any }>({ authenticated: false });
  const [oauthConfig, setOauthConfig] = React.useState<{ hasClientId: boolean; clientId: string }>({ hasClientId: false, clientId: "" });
  const [customPat, setCustomPat] = React.useState("");
  const [showPatInput, setShowPatInput] = React.useState(false);
  const [activePat, setActivePat] = React.useState<string | null>(null);

  // Search & Workspace States
  const [usernameInput, setUsernameInput] = React.useState("");
  const [currentUsername, setCurrentUsername] = React.useState("");
  const [profile, setProfile] = React.useState<GitHubProfile | null>(null);
  const [repos, setRepos] = React.useState<GitHubRepo[] | null>(null);
  const [selectedRepo, setSelectedRepo] = React.useState<GitHubRepo | null>(null);
  const [repoDetails, setRepoDetails] = React.useState<any>(null);

  // loading & Error States
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // AI Service States
  const [isAuditingProfile, setIsAuditingProfile] = React.useState(false);
  const [profileAudit, setProfileAudit] = React.useState<AIAuditResult | null>(null);
  const [isAnalyzingRepo, setIsAnalyzingRepo] = React.useState(false);
  const [repoAnalysis, setRepoAnalysis] = React.useState<AIRepoAnalysis | null>(null);

  // Fetch OAuth Configuration & Initial Auth status
  React.useEffect(() => {
    fetchOauthConfig();
    checkAuthStatus();
  }, []);

  // Listen for OAuth messages from callback popups
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Allow messages from the same host or dynamic run.app domains
      if (!origin.endsWith(".run.app") && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
        return;
      }

      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        checkAuthStatus(true); // check auth and auto-trigger dashboard for their own account
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Load profile and repos if auth details update
  React.useEffect(() => {
    if (authStatus.authenticated && authStatus.user) {
      loadProfileAndRepos(authStatus.user.login);
    }
  }, [authStatus]);

  const fetchOauthConfig = async () => {
    try {
      const res = await fetch("/api/auth/config");
      if (res.ok) {
        const data = await res.json();
        setOauthConfig(data);
      }
    } catch (err) {
      console.error("Failed to fetch OAuth configuration:", err);
    }
  };

  const checkAuthStatus = async (autoLoadWorkspace = false) => {
    try {
      const res = await fetch("/api/auth/status");
      if (res.ok) {
        const data = await res.json();
        setAuthStatus(data);
        if (data.authenticated && data.user && autoLoadWorkspace) {
          loadProfileAndRepos(data.user.login);
        }
      }
    } catch (err) {
      console.error("Failed to verify authentication status:", err);
    }
  };

  const handleOAuthConnect = async () => {
    try {
      const res = await fetch("/api/auth/url");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate connect URL");
      }
      const { url } = await res.json();
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        url,
        "GitHub Connect",
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!authWindow) {
        setError("Popup was blocked. Please enable popups in your browser settings to log in with GitHub.");
      }
    } catch (err: any) {
      setError(err.message || "Could not launch OAuth flow.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuthStatus({ authenticated: false });
      setProfile(null);
      setRepos(null);
      setSelectedRepo(null);
      setRepoDetails(null);
      setProfileAudit(null);
      setRepoAnalysis(null);
      setCurrentUsername("");
      setActivePat(null);
    } catch (err) {
      setError("Failed to log out cleanly.");
    }
  };

  // Fetch public or authenticated data
  const loadProfileAndRepos = async (username: string, patToken?: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedRepo(null);
    setRepoDetails(null);
    setProfileAudit(null);
    setRepoAnalysis(null);

    const tokenToUse = patToken || activePat;
    const headers: Record<string, string> = {};
    if (tokenToUse) {
      headers["Authorization"] = `Bearer ${tokenToUse}`;
    }

    try {
      // 1. Fetch Profile
      const profileUrl = username ? `/api/github/profile/${username}` : "/api/github/profile";
      const profileRes = await fetch(profileUrl, { headers });
      if (!profileRes.ok) {
        throw new Error(profileRes.status === 404 ? "GitHub user not found." : "Failed to load developer profile details.");
      }
      const profileData: GitHubProfile = await profileRes.json();

      // 2. Fetch Repositories
      const reposUrl = username ? `/api/github/repos/${username}` : "/api/github/repos";
      const reposRes = await fetch(reposUrl, { headers });
      if (!reposRes.ok) {
        throw new Error("Failed to load developer projects list.");
      }
      const reposData: GitHubRepo[] = await reposRes.json();

      setProfile(profileData);
      setRepos(reposData);
      setCurrentUsername(profileData.login);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while querying GitHub API.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      loadProfileAndRepos(usernameInput.trim());
    }
  };

  const handleApplyCustomPat = () => {
    if (customPat.trim()) {
      setActivePat(customPat.trim());
      setShowPatInput(false);
      // Immediately try to query auth state or reload current view with PAT
      loadProfileAndRepos(currentUsername || "user", customPat.trim());
    }
  };

  const handleSelectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setRepoDetails(null);
    setRepoAnalysis(null);

    const headers: Record<string, string> = {};
    if (activePat) {
      headers["Authorization"] = `Bearer ${activePat}`;
    }

    try {
      const res = await fetch(`/api/github/repo-details/${repo.full_name}`, { headers });
      if (res.ok) {
        const details = await res.json();
        setRepoDetails(details);
      }
    } catch (err) {
      console.error("Failed to load repository file details:", err);
    }
  };

  // AI Profile Audit Trigger
  const handleTriggerAudit = async () => {
    if (!profile || !repos) return;
    setIsAuditingProfile(true);
    setProfileAudit(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/audit-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, repos }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Audit request failed");
      }
      const result: AIAuditResult = await res.json();
      setProfileAudit(result);
      
      // Scroll smoothly to audit panel
      setTimeout(() => {
        document.getElementById("ai-audit-panel")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      setError(`AI Profile Audit failed: ${err.message}. Please verify Gemini API key settings.`);
    } finally {
      setIsAuditingProfile(false);
    }
  };

  // AI Repo Analysis Trigger
  const handleTriggerRepoAnalysis = async () => {
    if (!selectedRepo || !repoDetails) return;
    setIsAnalyzingRepo(true);
    setRepoAnalysis(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/analyze-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoDetails }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Repository analysis request failed");
      }
      const result: AIRepoAnalysis = await res.json();
      setRepoAnalysis(result);

      // Scroll smoothly to repo analysis result
      setTimeout(() => {
        document.getElementById("repo-analysis-panel")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      setError(`AI Code analysis failed: ${err.message}. Please verify Gemini API key settings.`);
    } finally {
      setIsAnalyzingRepo(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Banner Header */}
      <header className="border-b border-slate-900 bg-slate-950/45 backdrop-blur-md sticky top-0 z-50 px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-1.5 font-sans">
              DevLens
            </h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">AI Portfolio Analyst</p>
          </div>
        </div>

        {/* Global Nav Lookup / Action Items */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Lookup Box */}
          {profile && (
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Analyze username..."
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg focus:border-cyan-500/80 focus:outline-none text-slate-200 placeholder-slate-500"
              />
            </form>
          )}

          {/* PAT Token Configuration option */}
          <button
            onClick={() => setShowPatInput(!showPatInput)}
            className={`p-1.5 border rounded-lg hover:bg-slate-900 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono ${
              activePat ? "border-emerald-500/50 text-emerald-400 bg-emerald-950/10" : "border-slate-800 text-slate-400"
            }`}
            title="Set GitHub Token"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{activePat ? "Token Set" : "Custom Token"}</span>
          </button>

          {/* OAuth Connections */}
          {authStatus.authenticated ? (
            <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 py-1.5 pl-2 pr-3 rounded-lg text-xs font-medium">
              <img 
                src={authStatus.user?.avatar_url} 
                alt={authStatus.user?.login} 
                className="w-5 h-5 rounded-full object-cover border border-cyan-500/30"
                referrerPolicy="no-referrer"
              />
              <span className="text-slate-300 font-mono text-xs">{authStatus.user?.login}</span>
              <button 
                onClick={handleLogout}
                className="p-1 hover:bg-slate-800 rounded-md text-red-400 cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            oauthConfig.hasClientId && (
              <button
                onClick={handleOAuthConnect}
                className="py-1.5 px-3.5 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/20 hover:to-blue-600/20 border border-cyan-500/25 rounded-lg text-xs font-medium text-cyan-400 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Github className="w-3.5 h-3.5" />
                <span>Sync with GitHub</span>
              </button>
            )
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        
        {/* Active PAT Token Input Form Drawer */}
        <AnimatePresence>
          {showPatInput && (
            <motion.div 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3 shadow-lg shadow-cyan-950/10"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">GitHub Personal Access Token (PAT)</h4>
                <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                  Paste a PAT to fetch your private repositories or bypass public API rate limits. Tokens are strictly saved in memory.
                </p>
              </div>
              <div className="flex w-full sm:w-auto items-center gap-2">
                <input
                  type="password"
                  placeholder="ghp_..."
                  value={customPat}
                  onChange={(e) => setCustomPat(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-850 rounded-lg focus:border-cyan-500/80 focus:outline-none text-slate-200 placeholder-slate-700 font-mono w-full sm:w-64"
                />
                <button
                  onClick={handleApplyCustomPat}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-all cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-red-950/20 border border-red-900/50 text-red-400 p-4 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Operation Issue: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* LOADING SHIMMERING OVERLAY FOR USER SEARCHES */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-slate-800 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-xs font-mono text-slate-500 tracking-wider uppercase">Fetching Profile & Project details from GitHub...</p>
          </div>
        ) : (
          /* NO USER DATA YET: EMPTY STATE LANDING CARD */
          !profile ? (
            <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col items-center justify-center py-10 md:py-16 text-center gap-8">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-gradient-to-tr from-cyan-950/40 to-blue-950/20 border border-cyan-800/40 rounded-3xl text-cyan-400 shadow-xl shadow-cyan-500/5 hover:scale-105 transition-all">
                  <Github className="w-14 h-14 stroke-[1.2]" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight mt-3 bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Understand Developer DNA with AI
                </h2>
                <p className="text-sm text-slate-400 max-w-md mt-1 leading-relaxed">
                  Enter any public GitHub username, or connect your account to evaluate code architecture, review profile presentation, and generate tailored growth suggestions.
                </p>
              </div>

              {/* Central Big Search bar */}
              <form onSubmit={handleSearchSubmit} className="w-full max-w-lg relative bg-slate-950/50 border border-slate-800 p-2.5 rounded-2xl flex items-center shadow-lg hover:border-slate-700/80 transition-colors focus-within:border-cyan-500/80">
                <Search className="absolute left-5 text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Enter any GitHub username (e.g. torvalds)..."
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-transparent border-none text-slate-200 placeholder-slate-500 text-sm focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer shrink-0 transition-all hover:scale-[1.02]"
                >
                  Analyze
                </button>
              </form>

              {/* Popular Developers Quick Selection */}
              <div className="flex flex-col items-center gap-2.5">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Or inspect reference profiles</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {POPULAR_USERS.map((user) => (
                    <button
                      key={user}
                      onClick={() => {
                        setUsernameInput(user);
                        loadProfileAndRepos(user);
                      }}
                      className="text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full hover:border-cyan-500/50 text-slate-300 hover:text-slate-100 cursor-pointer transition-all"
                    >
                      {user}
                    </button>
                  ))}
                </div>
              </div>

              {/* OAuth sync setup guidance */}
              {!authStatus.authenticated && !oauthConfig.hasClientId && (
                <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 text-xs text-slate-500 flex items-start gap-2 max-w-md mx-auto text-left leading-normal mt-4">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-400">Sync Config Guide: </span>
                    <span>To connect your real account and analyze private repositories, configure <code className="text-cyan-500/80">GITHUB_CLIENT_ID</code> and <code className="text-cyan-500/80">GITHUB_CLIENT_SECRET</code> in the AI Studio Settings secrets panel.</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* USER DATA LOADED: THE DASHBOARD WORKSPACE */
            <div className="flex flex-col gap-6" id="dashboard-workspace">
              {/* Dashboard header details */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/30 border border-slate-900 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-xs font-mono text-slate-400">
                    Inspecting Portfolio for: <strong className="text-slate-200">@{currentUsername}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Not @{currentUsername}?</span>
                  <button
                    onClick={() => {
                      setProfile(null);
                      setRepos(null);
                      setSelectedRepo(null);
                      setRepoDetails(null);
                      setProfileAudit(null);
                      setRepoAnalysis(null);
                    }}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    Look up another user
                  </button>
                </div>
              </div>

              {/* Dual-Column Layout Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column (35%): Profile statistics */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <ProfileCard
                    profile={profile}
                    repos={repos || []}
                    onTriggerAudit={handleTriggerAudit}
                    isAuditing={isAuditingProfile}
                    hasAudit={!!profileAudit}
                  />
                </div>

                {/* Right Column (65%): Repository list & Deep dive panels */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  
                  {/* Repository explorer */}
                  <RepositoryList
                    repos={repos || []}
                    selectedRepo={selectedRepo}
                    onSelectRepo={handleSelectRepo}
                  />

                  {/* AI Selected Repository Deep Dive Panel */}
                  {selectedRepo && (
                    <AIRepoAnalysisPanel
                      repo={selectedRepo}
                      repoDetails={repoDetails}
                      analysis={repoAnalysis}
                      onAnalyze={handleTriggerRepoAnalysis}
                      isAnalyzing={isAnalyzingRepo}
                    />
                  )}
                </div>
              </div>

              {/* AI PROFILE AUDIT DISPLAY GRID (Spans across bottom if triggered) */}
              <AnimatePresence>
                {profileAudit && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="mt-4"
                  >
                    <AIAuditPanel
                      audit={profileAudit}
                      username={currentUsername}
                      onClose={() => setProfileAudit(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        )}
      </main>

      {/* Humble, clean page footer */}
      <footer className="border-t border-slate-950 mt-auto py-5 text-center text-xs text-slate-600 bg-slate-950/20">
        <p>&copy; {new Date().getFullYear()} DevLens &bull; AI Developer Portfolio Lens powered by Gemini 3.5 Flash</p>
      </footer>
    </div>
  );
}
