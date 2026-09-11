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
import { BookOpen, RefreshCw, ExternalLink, Clock, ChevronRight, TrendingUp, Award, Target } from "lucide-react";
import clsx from "clsx";
import { localizeEntity, useLanguage } from "@/lib/i18n";

const DOMAIN_COLORS: Record<string, string> = {
  statistical: "#3b82f6",
  technical: "#10b981",
  digital_governance: "#f59e0b",
  behavioural: "#8b5cf6",
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [gaps, setGaps] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"gaps" | "recommendations">("gaps");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user?.role === "admin") {
      router.push("/admin");
      return;
    }
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

  const domainLabels: Record<string, string> = {
    statistical: t("statistical"), technical: t("technical"), digital_governance: t("digitalGov"), behavioural: t("behavioural"),
  };
  // Aggregate domain scores for radar chart
  const domainScores = Object.entries(domainLabels).map(([domain, label]) => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t("loadingDashboard")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome header */}
        <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t("welcome")}, {localizeEntity(user?.name, language)}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {localizeEntity(user?.designation, language)} · {localizeEntity(user?.department, language)} · {user?.experience_years} {t("yearsExperience")}
            </p>
          </div>
          <div className="flex gap-3">
            {["statistical", "technical", "digital_governance", "behavioural"].map((domain) => {
              const d = domainScores.find((x) => x.domain === domainLabels[domain]);
              return (
                <div key={domain} className="text-center">
                  <div className="text-xl font-bold" style={{ color: DOMAIN_COLORS[domain] }}>
                    {d?.current ?? 0}
                  </div>
                  <div className="text-xs text-gray-400 leading-tight">{domainLabels[domain]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar chart */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-500" /> {t("domainCompetency")}
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={domainScores}>
                <PolarGrid />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Current" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Radar name="Target" dataKey="target" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeDasharray="4 4" />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart top gaps */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-500" /> {t("topSkillGaps")}
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topGaps} layout="vertical" margin={{ left: 80, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 50]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="skill_name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => `${v} pts gap`} />
                <Bar dataKey="gap" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="flex items-center gap-4 border-b border-gray-100 mb-6 -mt-2">
            {[
              { key: "gaps", label: t("competencyGaps") },
              { key: "recommendations", label: t("courseRecommendations") },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={clsx(
                  "pb-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === key
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                {label}
              </button>
            ))}
            {activeTab === "recommendations" && (
              <button
                onClick={handleRefreshRecs}
                disabled={refreshing}
                className="ml-auto flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin")} />
                {t("refresh")}
              </button>
            )}
          </div>

          {activeTab === "gaps" && (
            <div className="space-y-2">
              {gaps.map((gap) => (
                <div key={gap.skill_id} className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="w-32 text-xs text-gray-500 truncate font-medium">{gap.skill_name}</div>
                  <span
                    className="w-20 text-xs font-medium"
                    style={{ color: DOMAIN_COLORS[gap.domain] }}
                  >
                    {domainLabels[gap.domain]}
                  </span>
                  <div className="flex-1 relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{
                        width: `${gap.current_score}%`,
                        backgroundColor: DOMAIN_COLORS[gap.domain],
                      }}
                    />
                    <div
                      className="absolute top-0 h-full w-px bg-orange-400"
                      style={{ left: `${gap.target_score}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-xs text-gray-500">
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
                <div className="col-span-3 text-center py-10 text-gray-400">
                  No recommendations yet. Click Refresh to generate them.
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div key={rec.id} className="border border-gray-100 rounded-xl p-4 hover:border-primary-200 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-800 leading-tight">{rec.title}</h3>
                      <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        {Math.round(rec.score)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{rec.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      {rec.duration_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {rec.duration_hours}h
                        </span>
                      )}
                      <span>{rec.provider}</span>
                    </div>
                    <div className="flex gap-2">
                      {rec.status === "suggested" && (
                        <button
                          onClick={() => handleEnroll(rec.id)}
                          className="flex-1 text-xs btn-primary py-1.5"
                        >
                          {t("enroll")}
                        </button>
                      )}
                      {rec.status === "enrolled" && (
                        <span className="flex-1 text-xs text-center text-green-700 bg-green-50 rounded-lg py-1.5 font-medium">
                          {t("enrolled")}
                        </span>
                      )}
                      {rec.source_url && (
                        <a
                          href={rec.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-primary-600 border border-gray-100 rounded-lg"
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
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-500" /> {t("availableQuizzes")}
          </h2>
          <a href="/dashboard/quizzes" className="flex items-center gap-2 text-primary-600 hover:text-primary-800 text-sm font-medium">
            {t("viewAllQuizzes")} <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
