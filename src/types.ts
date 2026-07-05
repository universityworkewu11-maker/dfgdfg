export interface GitHubProfile {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  language: string | null;
  languages_url: string;
  size: number;
  open_issues_count: number;
  default_branch: string;
  updated_at: string;
  created_at: string;
}

export interface LanguageStat {
  name: string;
  value: number;
  color: string;
}

export interface AIAuditResult {
  tagline: string;
  summary: string;
  strengths: string[];
  improvements: {
    area: string;
    suggestion: string;
  }[];
  portfolioIdeas: {
    title: string;
    description: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  }[];
}

export interface AIRepoAnalysis {
  rating: string; // e.g. "A+", "B"
  overview: string;
  architectureReview: string;
  codeQualityRating: number; // 1-10
  documentationRating: number; // 1-10
  suggestions: string[];
  enhancedReadme: string; // markdown suggested readme
}
