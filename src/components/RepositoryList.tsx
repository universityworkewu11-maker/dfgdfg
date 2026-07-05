import React from "react";
import { 
  Search, 
  Star, 
  GitFork, 
  Calendar, 
  Database, 
  Filter, 
  ArrowUpDown,
  Circle
} from "lucide-react";
import { GitHubRepo } from "../types";

interface RepositoryListProps {
  repos: GitHubRepo[];
  onSelectRepo: (repo: GitHubRepo) => void;
  selectedRepo: GitHubRepo | null;
}

type SortOption = "updated" | "stars" | "forks" | "size";

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Shell: "#89e051",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
};

export default function RepositoryList({ 
  repos, 
  onSelectRepo, 
  selectedRepo 
}: RepositoryListProps) {
  const [search, setSearch] = React.useState("");
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>("All");
  const [sortBy, setSortBy] = React.useState<SortOption>("updated");

  // Get unique languages list
  const languages = React.useMemo(() => {
    const langs = new Set<string>();
    repos.forEach(r => {
      if (r.language) langs.add(r.language);
    });
    return ["All", ...Array.from(langs)].sort();
  }, [repos]);

  // Filter and sort repos
  const processedRepos = React.useMemo(() => {
    let filtered = repos.filter(repo => {
      const matchesSearch = 
        repo.name.toLowerCase().includes(search.toLowerCase()) || 
        (repo.description && repo.description.toLowerCase().includes(search.toLowerCase()));
      const matchesLang = selectedLanguage === "All" || repo.language === selectedLanguage;
      return matchesSearch && matchesLang;
    });

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === "stars") {
        return b.stargazers_count - a.stargazers_count;
      } else if (sortBy === "forks") {
        return b.forks_count - a.forks_count;
      } else if (sortBy === "size") {
        return b.size - a.size;
      } else {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [repos, search, selectedLanguage, sortBy]);

  // Format date elegantly
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Convert size in KB to readable string
  const formatSize = (kb: number) => {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6 h-full" id="repository-list-panel">
      {/* Search & Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-200">Repository Workspace</h3>
          <span className="text-xs font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
            {processedRepos.length} Projects
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-1.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950/50 border border-slate-800 rounded-xl focus:border-cyan-500/80 focus:outline-none text-slate-200 placeholder-slate-500 transition-all"
            />
          </div>

          {/* Language Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950/50 border border-slate-800 rounded-xl focus:border-cyan-500/80 focus:outline-none text-slate-300 appearance-none cursor-pointer"
            >
              {languages.map(lang => (
                <option key={lang} value={lang} className="bg-slate-950 text-slate-300">
                  {lang === "All" ? "All Languages" : lang}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950/50 border border-slate-800 rounded-xl focus:border-cyan-500/80 focus:outline-none text-slate-300 appearance-none cursor-pointer"
            >
              <option value="updated" className="bg-slate-950 text-slate-300">Last Updated</option>
              <option value="stars" className="bg-slate-950 text-slate-300">Stars Count</option>
              <option value="forks" className="bg-slate-950 text-slate-300">Forks Count</option>
              <option value="size" className="bg-slate-950 text-slate-300">Project Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Repositories Scrollable List */}
      <div className="flex-1 overflow-y-auto pr-1 max-h-[520px] flex flex-col gap-3" id="repos-container">
        {processedRepos.length === 0 ? (
          <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center gap-3">
            <Search className="w-8 h-8 text-slate-600 stroke-[1.5]" />
            <p className="text-sm">No repositories found matching current criteria.</p>
          </div>
        ) : (
          processedRepos.map((repo) => {
            const isSelected = selectedRepo?.id === repo.id;
            const langColor = LANGUAGE_COLORS[repo.language || ""] || "#94a3b8";

            return (
              <div
                key={repo.id}
                onClick={() => onSelectRepo(repo)}
                className={`p-4 border rounded-xl cursor-pointer transition-all duration-250 flex flex-col gap-3 ${
                  isSelected
                    ? "bg-slate-950/80 border-cyan-500 shadow-md shadow-cyan-500/5"
                    : "bg-slate-950/30 border-slate-800/80 hover:border-slate-700/60 hover:bg-slate-950/50"
                }`}
                id={`repo-item-${repo.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
                      {repo.name}
                    </h4>
                    {repo.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {repo.description}
                      </p>
                    )}
                  </div>

                  {/* Rating Grade if analyzed and match */}
                  {isSelected && (
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-800/60 px-2 py-0.5 rounded-full animate-pulse">
                      Selected
                    </span>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-slate-400">
                  {repo.language && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Circle className="w-2.5 h-2.5 fill-current" style={{ color: langColor }} />
                      <span className="text-slate-300">{repo.language}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-slate-400">
                    <Star className="w-3.5 h-3.5" />
                    <span>{repo.stargazers_count}</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <GitFork className="w-3.5 h-3.5" />
                    <span>{repo.forks_count}</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <Database className="w-3.5 h-3.5" />
                    <span>{formatSize(repo.size)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500 ml-auto shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span>Updated {formatDate(repo.updated_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
