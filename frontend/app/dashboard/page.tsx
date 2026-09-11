"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getCompetencyGaps, getProfile, getRecommendations, refreshRecommendations, updateRecommendationStatus } from "@/lib/api";
import Navbar from "@/components/Navbar";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";
import { useRouter } from "next/navigation";
import { BookOpen, RefreshCw, ExternalLink, Clock, ChevronRight, TrendingUp, Target, Sparkles, Zap } from "lucide-react";
import clsx from "clsx";

const DOMAIN_COLORS: Record<string, string> = {
  statistical: "#818cf8",
  technical: "#34d399",
  digital_governance: "#ffae33",
  behavioural: "#c084fc",
};

const DOMAIN_LABELS: Record<string, string> = {
  statistical: "Statistical",
  technical: "Technical",
  digital_governance: "Digital Gov.",
  behavioural: "Behavioural",
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [gaps, setGaps] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"gaps" | "recommendations">("gaps");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role === "admin") { router.push("/admin"); return; }
    if (user) {
      Promise.all([
        getProfile(user.id).then((r) => setProfile(r.data)),
        getCompetencyGaps(user.id).then((r) => setGaps(r.data.gaps || [])),
        getRecommendations(user.id).then((r) => setRecommendations(r.data || [])),
      ]).finally(() => setFetching(false));
    }
  }, [user, loading]);

  const handleRefreshRecs = async () => {
    setRefreshing(true);
    try {
      await refreshRecommendations();
      const r = await getRecommendations(user!.id);
      setRecommendations(r.data || []);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEnroll = async (recId: string) => {
    await updateRecommendationStatus(recId, "enrolled");
    setRecommendations((prev) => prev.map((r) => (r.id === recId ? { ...r, status: "enrolled" } : r)));
  };

  // Aggregate domain scores for radar chart
  const domainScores = Object.entries(DOMAIN_LABELS).map(([domain, label]) => {
    const domainGaps = gaps.filter((g) => g.domain === domain);
    const avg = domainGaps.length
      ? domainGaps.reduce((s, g) => s + g.current_score, 0) / domainGaps.length
      : 0;
    const target = domainGaps.length
      ? domainGaps.reduce((s, g) => s + g.target_score, 0) / domainGaps.length
      : 0;
    return { domain: label, current: Math.round(avg), target: Math.round(target) };
  });

  // Top gap skills for bar chart
  const topGaps = gaps.slice(0, 10);

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-3 border-accent-500/30 border-t-accent-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
        {/* Welcome header */}
        <div className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-saffron-500" />
              <span className="text-xs font-semibold text-saffron-500 uppercase tracking-widest">Welcome back</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{user?.name}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {user?.designation} · {user?.department} · {user?.experience_years} years experience
            </p>
          </div>
          <div className="flex gap-5">
            {["statistical", "technical", "digital_governance", "behavioural"].map((domain) => {
              const d = domainScores.find((x) => x.domain === DOMAIN_LABELS[domain]);
              return (
                <div key={domain} className="text-center group">
                  <div className="text-2xl font-extrabold transition-transform duration-200 group-hover:scale-110"
                    style={{ color: DOMAIN_COLORS[domain] }}
                  >
                    {d?.current ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 leading-tight mt-0.5">{DOMAIN_LABELS[domain]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar chart */}
          <div className="glass-card">
            <h2 className="section-title mb-6">
              <div className="stat-icon-accent w-8 h-8">
                <Target className="w-4 h-4 text-accent-400" />
              </div>
              Domain Competency
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={domainScores}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} />
                <Radar name="Current" dataKey="current" stroke="#818cf8" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Target" dataKey="target" stroke="#ffae33" fill="#ffae33" fillOpacity={0.08} strokeDasharray="4 4" strokeWidth={2} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart top gaps */}
          <div className="glass-card">
            <h2 className="section-title mb-6">
              <div className="stat-icon-rose w-8 h-8">
                <TrendingUp className="w-4 h-4 text-rose-400" />
              </div>
              Top 10 Skill Gaps
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topGaps} layout="vertical" margin={{ left: 80, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" domain={[0, 50]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} />
                <YAxis type="category" dataKey="skill_name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={80} axisLine={false} />
                <Tooltip
                  formatter={(v) => `${v} pts gap`}
                  contentStyle={{
                    background: "rgba(15,26,54,0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="gap" fill="url(#gapGradient)" radius={[0, 6, 6, 0]} />
                <defs>
                  <linearGradient id="gapGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-card">
          <div className="flex items-center gap-6 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { key: "gaps", label: "Competency Gaps" },
              { key: "recommendations", label: "Course Recommendations" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={activeTab === key ? "tab-btn-active" : "tab-btn-inactive"}
              >
                {label}
              </button>
            ))}
            {activeTab === "recommendations" && (
              <button
                onClick={handleRefreshRecs}
                disabled={refreshing}
                className="ml-auto flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 font-medium transition-colors"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin")} />
                Refresh
              </button>
            )}
          </div>

          {activeTab === "gaps" && (
            <div className="space-y-1">
              {gaps.map((gap) => (
                <div key={gap.skill_id}
                  className="flex items-center gap-4 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/[0.02]"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                >
                  <div className="w-32 text-xs text-slate-300 truncate font-medium">{gap.skill_name}</div>
                  <span className="w-20 text-xs font-semibold" style={{ color: DOMAIN_COLORS[gap.domain] }}>
                    {DOMAIN_LABELS[gap.domain]}
                  </span>
                  <div className="flex-1 progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${gap.current_score}%`,
                        background: `linear-gradient(90deg, ${DOMAIN_COLORS[gap.domain]}, ${DOMAIN_COLORS[gap.domain]}88)`,
                        boxShadow: `0 0 8px ${DOMAIN_COLORS[gap.domain]}33`,
                      }}
                    />
                  </div>
                  <div className="w-20 text-right text-xs text-slate-500 font-mono">
                    {gap.current_score} / {gap.target_score}
                  </div>
                  <span className={`badge-${gap.priority}`}>{gap.priority}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "recommendations" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-slate-600">
                  <Zap className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                  No recommendations yet. Click Refresh to generate them.
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div key={rec.id}
                    className="rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] group"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-white leading-tight group-hover:text-accent-400 transition-colors">
                        {rec.title}
                      </h3>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                        style={{
                          background: "rgba(99,102,241,0.15)",
                          color: "#818cf8",
                          border: "1px solid rgba(99,102,241,0.2)",
                        }}
                      >
                        {Math.round(rec.score)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">{rec.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-600 mb-4">
                      {rec.duration_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {rec.duration_hours}h
                        </span>
                      )}
                      <span>{rec.provider}</span>
                    </div>
                    <div className="flex gap-2">
                      {rec.status === "suggested" && (
                        <button onClick={() => handleEnroll(rec.id)} className="flex-1 btn-primary text-xs py-2">
                          Enroll
                        </button>
                      )}
                      {rec.status === "enrolled" && (
                        <span className="flex-1 text-xs text-center py-2 rounded-xl font-semibold"
                          style={{
                            background: "rgba(16,185,129,0.12)",
                            color: "#34d399",
                            border: "1px solid rgba(16,185,129,0.2)",
                          }}
                        >
                          ✓ Enrolled
                        </span>
                      )}
                      {rec.source_url && (
                        <a href={rec.source_url} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-xl transition-all duration-200 hover:bg-white/5"
                          style={{ border: "1px solid rgba(255,255,255,0.06)", color: "#64748b" }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="glass-card group cursor-pointer" onClick={() => router.push("/dashboard/quizzes")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="stat-icon-emerald w-10 h-10">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Available Quizzes</h2>
                <p className="text-xs text-slate-500">Take AI-generated quizzes to improve your scores</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-accent-400 group-hover:translate-x-1 transition-all duration-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
