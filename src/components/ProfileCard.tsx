import React from "react";
import { 
  Users, 
  BookOpen, 
  Star, 
  MapPin, 
  Briefcase, 
  Link as LinkIcon, 
  Twitter, 
  Sparkles,
  GitFork
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { GitHubProfile, GitHubRepo } from "../types";

interface ProfileCardProps {
  profile: GitHubProfile;
  repos: GitHubRepo[];
  onTriggerAudit: () => void;
  isAuditing: boolean;
  hasAudit: boolean;
}

const COLORS = ["#06b6d4", "#3b82f6", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#64748b"];

export default function ProfileCard({ 
  profile, 
  repos, 
  onTriggerAudit, 
  isAuditing,
  hasAudit
}: ProfileCardProps) {
  // Calculate total stars and total forks across all public repos
  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0);

  // Calculate language distribution
  const languageStats = React.useMemo(() => {
    const langMap: Record<string, number> = {};
    repos.forEach((r) => {
      if (r.language) {
        langMap[r.language] = (langMap[r.language] || 0) + 1;
      }
    });

    const totalWithLang = Object.values(langMap).reduce((a, b) => a + b, 0);
    if (totalWithLang === 0) return [];

    const sorted = Object.entries(langMap)
      .map(([name, count]) => ({
        name,
        value: count,
        percentage: Math.round((count / totalWithLang) * 100),
      }))
      .sort((a, b) => b.value - a.value);

    // Group items after top 5 as "Other"
    if (sorted.length > 5) {
      const top5 = sorted.slice(0, 5);
      const otherCount = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
      const otherPercentage = sorted.slice(5).reduce((sum, item) => sum + item.percentage, 0);
      top5.push({
        name: "Other",
        value: otherCount,
        percentage: otherPercentage,
      });
      return top5;
    }

    return sorted;
  }, [repos]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6" id="profile-card">
      {/* Header Profile Info */}
      <div className="flex items-start gap-4">
        <img 
          src={profile.avatar_url} 
          alt={profile.name || profile.login} 
          className="w-20 h-20 rounded-full border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/10 object-cover"
          referrerPolicy="no-referrer"
          id="profile-avatar"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-100 truncate flex items-center gap-2" id="profile-name">
            {profile.name || profile.login}
          </h2>
          <p className="text-sm font-mono text-cyan-400" id="profile-login">@{profile.login}</p>
          {profile.bio && (
            <p className="text-sm text-slate-300 mt-2 line-clamp-3 leading-relaxed" id="profile-bio">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Meta Location, Company, Blog */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400 border-t border-slate-800/80 pt-4" id="profile-meta">
        {profile.company && (
          <div className="flex items-center gap-2 truncate">
            <Briefcase className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">{profile.company}</span>
          </div>
        )}
        {profile.location && (
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">{profile.location}</span>
          </div>
        )}
        {profile.blog && (
          <div className="flex items-center gap-2 truncate">
            <LinkIcon className="w-4 h-4 text-slate-500 shrink-0" />
            <a 
              href={profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-cyan-400 hover:underline truncate"
            >
              {profile.blog}
            </a>
          </div>
        )}
        {profile.twitter_username && (
          <div className="flex items-center gap-2 truncate">
            <Twitter className="w-4 h-4 text-slate-500 shrink-0" />
            <a 
              href={`https://twitter.com/${profile.twitter_username}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-slate-200 truncate"
            >
              @{profile.twitter_username}
            </a>
          </div>
        )}
      </div>

      {/* Stats Matrix Grid */}
      <div className="grid grid-cols-2 gap-3" id="profile-stats-grid">
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Followers</span>
          </div>
          <span className="text-lg font-bold text-slate-100 font-mono">
            {profile.followers.toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Repositories</span>
          </div>
          <span className="text-lg font-bold text-slate-100 font-mono">
            {profile.public_repos.toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Star className="w-3.5 h-3.5 text-amber-500/80 fill-amber-500/10" />
            <span>Stars Earned</span>
          </div>
          <span className="text-lg font-bold text-slate-100 font-mono">
            {totalStars.toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <GitFork className="w-3.5 h-3.5 text-blue-500/80" />
            <span>Project Forks</span>
          </div>
          <span className="text-lg font-bold text-slate-100 font-mono">
            {totalForks.toLocaleString()}
          </span>
        </div>
      </div>

      {/* AI Audit Action Call */}
      <button
        onClick={onTriggerAudit}
        disabled={isAuditing}
        className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
          isAuditing
            ? "bg-slate-800 text-slate-400 cursor-not-allowed"
            : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.01]"
        }`}
        id="btn-trigger-audit"
      >
        <Sparkles className={`w-5 h-5 ${isAuditing ? "animate-pulse" : ""}`} />
        <span>{isAuditing ? "Gemini Auditing Profile..." : hasAudit ? "Re-Audit Profile with Gemini" : "Analyze Profile with Gemini"}</span>
      </button>

      {/* Interactive Language Distribution */}
      {languageStats.length > 0 && (
        <div className="border-t border-slate-800/80 pt-5 flex flex-col gap-4" id="language-section">
          <h3 className="text-sm font-semibold text-slate-300">Language Ecosystem</h3>
          
          {/* Recharts Pie Chart container */}
          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={languageStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {languageStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                  itemStyle={{ color: "#22d3ee" }}
                />
                <Legend 
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "#94a3b8"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Progress Bars for Language Breakdown */}
          <div className="flex flex-col gap-2.5">
            {languageStats.map((item, idx) => (
              <div key={item.name} className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium text-slate-300">{item.name}</span>
                  <span className="font-mono">{item.percentage}% ({item.value} repos)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: COLORS[idx % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
