"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { listOfficers } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Mail,
  Briefcase,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

export default function AdminOfficersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [officers, setOfficers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "score-desc" | "score-asc" | "exp">("score-desc");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetchOfficers();
  }, [user, loading]);

  const fetchOfficers = () => {
    setFetching(true);
    listOfficers()
      .then((r) => setOfficers(r.data || []))
      .catch((err) => console.error("Failed to load officers", err))
      .finally(() => setFetching(false));
  };

  // Distinct departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    officers.forEach((o) => {
      if (o.department) depts.add(o.department);
    });
    return Array.from(depts);
  }, [officers]);

  // Filter and sort
  const processedOfficers = useMemo(() => {
    return officers
      .filter((o) => {
        const matchesSearch =
          (o.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (o.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (o.designation || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (o.department || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === "all" || o.department === selectedDept;
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "score-desc") return (b.avg_score || 0) - (a.avg_score || 0);
        if (sortBy === "score-asc") return (a.avg_score || 0) - (b.avg_score || 0);
        if (sortBy === "exp") return (b.experience_years || 0) - (a.experience_years || 0);
        return 0;
      });
  }, [officers, searchQuery, selectedDept, sortBy]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = officers.length;
    if (total === 0) return { total: 0, high: 0, low: 0, avg: 0 };
    const high = officers.filter((o) => o.avg_score >= 70).length;
    const low = officers.filter((o) => o.avg_score < 50).length;
    const avg = officers.reduce((acc, o) => acc + (o.avg_score || 0), 0) / total;
    return { total, high, low, avg: Math.round(avg * 10) / 10 };
  }, [officers]);

  const getScoreStatus = (score: number) => {
    if (score >= 70) {
      return {
        label: "Advanced",
        badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
        textClass: "text-emerald-400",
      };
    }
    if (score >= 50) {
      return {
        label: "Competent",
        badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/25",
        textClass: "text-amber-400",
      };
    }
    return {
      label: "Needs Training",
      badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/25",
      textClass: "text-rose-400",
    };
  };

  const getInitials = (name: string) => {
    return (name || "O")
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[30rem] h-[30rem] bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-300 border border-primary-500/20 mb-3">
              <Users className="w-3.5 h-3.5 text-primary-400" />
              <span>MoSPI Cadre Administration</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-primary-400" />
              Officers Directory & Competency Oversight
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 max-w-2xl">
              Monitor individual statistical officers, tracked competencies, departmental distributions, and performance
              readiness across divisions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOfficers}
              disabled={fetching}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-slate-300 hover:text-white flex items-center gap-2 transition-all"
            >
              <RefreshCw className={clsx("w-4 h-4", fetching && "animate-spin")} />
              <span>Refresh Cadre</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Officers</span>
              <div className="w-8 h-8 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-2">{stats.total}</div>
            <div className="text-xs text-slate-400 mt-1">Enrolled statistical officers</div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Average Cadre Score</span>
              <div className="w-8 h-8 rounded-lg bg-accent-500/15 text-accent-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-2">{stats.avg}%</div>
            <div className="text-xs text-slate-400 mt-1">Across all assessed domains</div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Advanced Proficiency</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">{stats.high}</div>
            <div className="text-xs text-slate-400 mt-1">Scores ≥ 70% in competencies</div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Target Upskilling</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-2">{stats.low}</div>
            <div className="text-xs text-slate-400 mt-1">Scores &lt; 50% requiring training</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by officer name, email, department, or designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900/80 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Department Filter */}
            <div className="relative">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="appearance-none bg-navy-900/80 border border-white/10 text-slate-300 text-xs rounded-xl px-3.5 py-2.5 pr-8 focus:outline-none focus:border-primary-500/50 cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-navy-900/80 border border-white/10 text-slate-300 text-xs rounded-xl px-3.5 py-2.5 pr-8 focus:outline-none focus:border-primary-500/50 cursor-pointer"
              >
                <option value="score-desc">Score: High to Low</option>
                <option value="score-asc">Score: Low to High</option>
                <option value="name">Name: A to Z</option>
                <option value="exp">Experience: High to Low</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Officers Directory Table */}
        <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-4 px-6">Officer</th>
                  <th className="py-4 px-4">Designation</th>
                  <th className="py-4 px-4">Department</th>
                  <th className="py-4 px-4">Experience</th>
                  <th className="py-4 px-4">Competency Score</th>
                  <th className="py-4 px-6 text-right">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {fetching ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary-400" />
                        <span className="text-sm">Loading cadre officers...</span>
                      </div>
                    </td>
                  </tr>
                ) : processedOfficers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-8 h-8 text-slate-600" />
                        <span className="text-sm font-medium text-slate-300">No officers found</span>
                        <span className="text-xs text-slate-500">
                          Try modifying your search or department filter.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedOfficers.map((o) => {
                    const status = getScoreStatus(o.avg_score || 0);

                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-white/[0.02] transition-colors duration-150 group"
                      >
                        {/* Name and Contact */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-500/20 to-primary-500/20 border border-white/10 flex items-center justify-center font-bold text-xs text-primary-300 group-hover:scale-105 transition-transform flex-shrink-0">
                              {getInitials(o.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white group-hover:text-primary-300 transition-colors truncate">
                                {o.name}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-slate-500" />
                                <span className="truncate">{o.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Designation */}
                        <td className="py-4 px-4 text-slate-300">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                            <span>{o.designation || "Statistical Officer"}</span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                            <Building2 className="w-3 h-3 text-accent-400" />
                            {o.department || "General Administration"}
                          </span>
                        </td>

                        {/* Experience */}
                        <td className="py-4 px-4 text-xs text-slate-300 font-mono">
                          {o.experience_years ? `${o.experience_years} Years` : "—"}
                        </td>

                        {/* Average Score */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <span className={clsx("font-bold text-sm", status.textClass)}>
                              {o.avg_score ? `${o.avg_score}%` : "Not Assessed"}
                            </span>
                            {o.avg_score > 0 && (
                              <div className="w-20 bg-white/10 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className={clsx(
                                    "h-full rounded-full transition-all duration-500",
                                    o.avg_score >= 70
                                      ? "bg-emerald-400"
                                      : o.avg_score >= 50
                                      ? "bg-amber-400"
                                      : "bg-rose-400"
                                  )}
                                  style={{ width: `${Math.min(100, o.avg_score)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Readiness Tag */}
                        <td className="py-4 px-6 text-right">
                          <span
                            className={clsx(
                              "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border",
                              status.badgeClass
                            )}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
