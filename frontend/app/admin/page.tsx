"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getAdminSummary, getOrgHeatmap, listOfficers } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Users, BookOpen, FileText, TrendingUp, BarChart3 } from "lucide-react";
import clsx from "clsx";
import { localizeEntity, useLanguage } from "@/lib/i18n";

const DOMAIN_COLORS: Record<string, string> = {
  statistical: "#3b82f6",
  technical: "#10b981",
  digital_governance: "#f59e0b",
  behavioural: "#8b5cf6",
};

function ScoreCell({ score }: { score: number }) {
  const pct = score ?? 0;
  const bg =
    pct >= 70 ? "bg-green-100 text-green-800" :
    pct >= 50 ? "bg-yellow-100 text-yellow-800" :
    "bg-red-100 text-red-800";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${bg}`}>
      {pct.toFixed(1)}
    </span>
  );
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();

  const [summary, setSummary] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<Record<string, Record<string, number>>>({});
  const [officers, setOfficers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    Promise.all([
      getAdminSummary().then((r) => setSummary(r.data)),
      getOrgHeatmap().then((r) => setHeatmap(r.data.heatmap || {})),
      listOfficers().then((r) => setOfficers(r.data || [])),
    ]).finally(() => setFetching(false));
  }, [user, loading]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const departments = Object.keys(heatmap);
  const domains = ["statistical", "technical", "digital_governance", "behavioural"];

  const domainAvgData = summary?.avg_scores_by_domain?.map((d: any) => ({
    domain: d.domain.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    score: d.avg_score,
    color: DOMAIN_COLORS[d.domain] || "#6b7280",
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">Organisation-wide competency analytics · MoSPI DIID</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Officers", value: summary?.total_learners ?? 0, icon: Users, color: "text-primary-600 bg-primary-50" },
            { label: "Materials Uploaded", value: summary?.total_materials ?? 0, icon: FileText, color: "text-amber-600 bg-amber-50" },
            { label: "Quizzes Generated", value: summary?.total_quizzes ?? 0, icon: BookOpen, color: "text-green-600 bg-green-50" },
            { label: "Avg Org Score", value: `${(domainAvgData.reduce((s: number, d: any) => s + d.score, 0) / (domainAvgData.length || 1)).toFixed(1)}%`, icon: BarChart3, color: "text-purple-600 bg-purple-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Domain avg bar chart + Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" /> Average Score by Domain
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={domainAvgData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="domain" tick={{ fontSize: 11 }} angle={-10} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {domainAvgData.map((d: any, i: number) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Heatmap */}
          <div className="card overflow-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Department × Domain Gap Heatmap</h2>
            {departments.length === 0 ? (
              <p className="text-gray-400 text-sm">No data yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-1.5 pr-3 text-gray-500 font-medium min-w-[140px]">Department</th>
                    {domains.map((d) => (
                      <th key={d} className="text-center px-2 py-1.5 text-gray-500 font-medium capitalize">
                        {d.replace("_", " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept} className="border-t border-gray-50">
                      <td className="py-2 pr-3 text-gray-700 font-medium truncate max-w-[160px]" title={dept}>
                        {localizeEntity(dept, language)}
                      </td>
                      {domains.map((d) => (
                        <td key={d} className="text-center px-2 py-2">
                          <ScoreCell score={heatmap[dept]?.[d] ?? 0} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Officers table */}
        <div className="card overflow-auto">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" /> All Officers
          </h2>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500 font-medium">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Designation</th>
                <th className="pb-3 pr-4">Department</th>
                <th className="pb-3 pr-4">Experience</th>
                <th className="pb-3">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-800">{localizeEntity(o.name, language)}</td>
                  <td className="py-3 pr-4 text-gray-500">{localizeEntity(o.designation, language)}</td>
                  <td className="py-3 pr-4 text-gray-500 max-w-[180px] truncate">{localizeEntity(o.department, language)}</td>
                  <td className="py-3 pr-4 text-gray-500">{o.experience_years}y</td>
                  <td className="py-3">
                    <ScoreCell score={o.avg_score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
