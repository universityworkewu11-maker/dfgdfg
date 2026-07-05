import { 
  Sparkles, 
  CheckCircle, 
  ArrowUpRight, 
  AlertTriangle, 
  Layers, 
  X,
  Compass
} from "lucide-react";
import { AIAuditResult } from "../types";

interface AIAuditPanelProps {
  audit: AIAuditResult;
  onClose: () => void;
  username: string;
}

export default function AIAuditPanel({ 
  audit, 
  onClose,
  username
}: AIAuditPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-cyan-950/20 backdrop-blur-md flex flex-col gap-6 relative animate-fadeIn" id="ai-audit-panel">
      {/* Top Banner Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-950/50 border border-cyan-800/50 rounded-lg text-cyan-400">
            <Sparkles className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Gemini Profile Audit</h3>
            <p className="text-xs text-slate-400 font-mono">Expert carrier advice for @{username}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          aria-label="Close Audit"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* BillBoard / Dynamic Tagline */}
      <div className="bg-gradient-to-br from-cyan-950/20 to-blue-950/10 border border-cyan-800/30 rounded-2xl p-5 flex flex-col gap-3">
        <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">Generated Brand Tagline</span>
        <blockquote className="text-lg md:text-xl font-bold text-slate-100 italic leading-snug">
          &ldquo;{audit.tagline}&rdquo;
        </blockquote>
      </div>

      {/* Summary */}
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>Technical Brand Overview</span>
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
          {audit.summary}
        </p>
      </div>

      {/* Grid: Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Profile Strengths */}
        <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Key Branding Strengths</span>
          </h4>
          <ul className="flex flex-col gap-2.5">
            {audit.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Target Recommendations</span>
          </h4>
          <div className="flex flex-col gap-3">
            {audit.improvements.map((item, index) => (
              <div key={index} className="flex flex-col gap-1 text-xs border-b border-slate-800/50 last:border-0 pb-2.5 last:pb-0">
                <span className="font-semibold text-slate-200 uppercase tracking-wider text-[10px] text-amber-500/90 font-mono">
                  {item.area}
                </span>
                <span className="text-slate-300 leading-relaxed mt-0.5">
                  {item.suggestion}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Project Recommendations */}
      <div className="flex flex-col gap-3 border-t border-slate-800 pt-5">
        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Tailored Portfolio Project Recommendations</span>
        </h4>
        <p className="text-xs text-slate-400">
          Personalized software project suggestions that complement your existing repository ecosystem and fill stack gaps.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
          {audit.portfolioIdeas.map((idea, idx) => {
            const difficultyColors = {
              Beginner: "bg-emerald-950/50 border-emerald-800/50 text-emerald-400",
              Intermediate: "bg-blue-950/50 border-blue-800/50 text-blue-400",
              Advanced: "bg-purple-950/50 border-purple-800/50 text-purple-400",
            };

            const colors = difficultyColors[idea.difficulty] || difficultyColors.Intermediate;

            return (
              <div 
                key={idx} 
                className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-200 line-clamp-1">
                      {idea.title}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${colors}`}>
                      {idea.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1 line-clamp-3">
                    {idea.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-cyan-400 font-mono font-medium border-t border-slate-800/50 pt-2.5 mt-1">
                  <span>Explore stack outline</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
