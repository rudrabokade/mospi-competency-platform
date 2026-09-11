"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  getAdminSummary,
  getOrgHeatmap,
  listOfficers,
  listMaterials,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Inbox,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  EmptyState,
  Metric,
  MetricStrip,
  Pill,
  SectionHeading,
  Skeleton,
  Surface,
} from "@/components/ui";
import { cn } from "@/lib/cn";

/* ── Domain metadata ─────────────────────────────────────────── */
const DOMAINS = [
  { key: "statistical", label: "Statistical", color: "#818cf8" },
  { key: "technical", label: "Technical", color: "#34d399" },
  { key: "digital_governance", label: "Digital Governance", color: "#ffae33" },
  { key: "behavioural", label: "Behavioural", color: "#c084fc" },
] as const;

const DOMAIN_LABEL: Record<string, string> = DOMAINS.reduce(
  (acc, d) => ({ ...acc, [d.key]: d.label }),
  {}
);

/* Competency bands. Single source of truth for every score readout. */
type Band = "advanced" | "competent" | "critical";

function bandOf(score: number): Band {
  if (score >= 70) return "advanced";
  if (score >= 50) return "competent";
  return "critical";
}

const BAND_META: Record<
  Band,
  { label: string; text: string; rgb: string; tone: "emerald" | "saffron" | "rose" }
> = {
  advanced: { label: "Advanced", text: "text-emerald-300", rgb: "52,211,153", tone: "emerald" },
  competent: { label: "Competent", text: "text-saffron-400", rgb: "255,174,51", tone: "saffron" },
  critical: { label: "Critical gap", text: "text-rose-300", rgb: "251,113,133", tone: "rose" },
};

/* ── Heatmap cell ────────────────────────────────────────────
   A real heatmap: opacity scales with distance from the 100%
   ceiling, hue encodes the competency band.                    */
function HeatCell({ score }: { score: number | undefined }) {
  if (score === undefined || score === null) {
    return (
      <td className="p-1">
        <div className="flex h-11 items-center justify-center rounded-lg border border-dashed border-white/[0.06] text-[0.6875rem] text-slate-700">
          n/a
        </div>
      </td>
    );
  }

  const { rgb, text } = BAND_META[bandOf(score)];
  // 0 -> 0.30 alpha, 100 -> 0.06 alpha. Lower score reads heavier.
  const alpha = 0.3 - (Math.min(Math.max(score, 0), 100) / 100) * 0.24;

  return (
    <td className="p-1">
      <div
        className="flex h-11 items-center justify-center rounded-lg border transition-transform duration-200 hover:scale-[1.04]"
        style={{
          background: `rgba(${rgb},${alpha.toFixed(3)})`,
          borderColor: `rgba(${rgb},0.22)`,
        }}
        title={`${score.toFixed(1)}%`}
      >
        <span className={cn("font-mono text-xs font-semibold tabular-nums", text)}>
          {score.toFixed(0)}
        </span>
      </div>
    </td>
  );
}

/* ── Loading skeleton ────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-1 px-6 py-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-7 w-16" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Surface className="lg:col-span-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-6 h-[200px] rounded-xl" />
        </Surface>
        <Surface className="lg:col-span-3">
          <Skeleton className="h-3 w-40" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg" />
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<Record<string, Record<string, number>>>({});
  const [officers, setOfficers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    load();
  }, [user, loading]);

  const load = () => {
    setFetching(true);
    setError(null);
    Promise.all([
      getAdminSummary().then((r) => setSummary(r.data)),
      getOrgHeatmap().then((r) => setHeatmap(r.data.heatmap || {})),
      listOfficers().then((r) => setOfficers(r.data || [])),
      listMaterials().then((r) => setMaterials(r.data || [])),
    ])
      .catch(() =>
        setError("Could not reach the analytics service. Check that the API is running.")
      )
      .finally(() => setFetching(false));
  };

  /* ── Derived data ───────────────────────────────────────── */
  const domainData = useMemo(
    () =>
      (summary?.avg_scores_by_domain ?? []).map((d: any) => ({
        domain: DOMAIN_LABEL[d.domain] ?? d.domain,
        short: (DOMAIN_LABEL[d.domain] ?? d.domain).split(" ")[0],
        score: d.avg_score,
        color: DOMAINS.find((x) => x.key === d.domain)?.color ?? "#64748b",
      })),
    [summary]
  );

  const orgAvg = useMemo(() => {
    if (!domainData.length) return null;
    return (
      domainData.reduce((s: number, d: any) => s + d.score, 0) / domainData.length
    );
  }, [domainData]);

  /* Weakest domain drives the headline insight. */
  const weakestDomain = useMemo(() => {
    if (!domainData.length) return null;
    return domainData.reduce((min: any, d: any) => (d.score < min.score ? d : min));
  }, [domainData]);

  const departments = useMemo(() => Object.keys(heatmap).sort(), [heatmap]);

  /* Officers most in need of intervention — replaces the old
     full-table dump, which duplicated /admin/officers.        */
  const needsAttention = useMemo(
    () =>
      [...officers]
        .filter((o) => (o.avg_score ?? 0) < 70)
        .sort((a, b) => (a.avg_score ?? 0) - (b.avg_score ?? 0))
        .slice(0, 6),
    [officers]
  );

  const criticalCount = useMemo(
    () => officers.filter((o) => (o.avg_score ?? 0) < 50).length,
    [officers]
  );

  const pipeline = useMemo(() => {
    const failed = materials.filter((m) => m.error).length;
    const processed = materials.filter((m) => m.processed && !m.error).length;
    return { failed, processed, pending: materials.length - processed - failed };
  }, [materials]);

  const recentMaterials = useMemo(() => materials.slice(0, 5), [materials]);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Header — left aligned, action on the right */}
        <header className="flex flex-col gap-5 border-b border-white/[0.06] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Pill tone="saffron">
              <Building2 className="h-3 w-3" />
              MoSPI · Data Informatics &amp; Innovation Division
            </Pill>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
              Competency overview
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-slate-500">
              Organisation-wide skill posture across departments and competency
              domains, aggregated from quiz attempts and assessed scores.
            </p>
          </div>

          <button
            onClick={load}
            disabled={fetching}
            className={cn(
              "inline-flex flex-shrink-0 items-center gap-2 self-start rounded-xl border border-white/10",
              "bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-300",
              "transition-all duration-200 hover:border-accent-500/30 hover:bg-white/[0.07] hover:text-white",
              "active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", fetching && "animate-spin")} />
            Refresh
          </button>
        </header>

        <div className="mt-8">
          {error ? (
            <Surface>
              <EmptyState
                icon={<ShieldAlert className="h-5 w-5" />}
                title="Unable to load dashboard"
                description={error}
                action={
                  <button
                    onClick={load}
                    className="btn-secondary text-xs active:translate-y-[1px]"
                  >
                    Try again
                  </button>
                }
              />
            </Surface>
          ) : fetching ? (
            <DashboardSkeleton />
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* ── Metrics ──────────────────────────────── */}
              <MetricStrip>
                <Metric
                  label="Officers"
                  value={summary?.total_learners ?? 0}
                  caption="Enrolled learners"
                  icon={<Users className="h-3.5 w-3.5" />}
                />
                <Metric
                  label="Org average"
                  value={orgAvg === null ? "—" : `${orgAvg.toFixed(1)}%`}
                  caption={
                    orgAvg === null
                      ? "Awaiting first assessment"
                      : BAND_META[bandOf(orgAvg)].label
                  }
                  tone={orgAvg === null ? "neutral" : BAND_META[bandOf(orgAvg)].tone}
                  icon={<Gauge className="h-3.5 w-3.5" />}
                />
                <Metric
                  label="Critical gaps"
                  value={criticalCount}
                  caption="Officers scoring below 50%"
                  tone={criticalCount > 0 ? "rose" : "emerald"}
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                />
                <Metric
                  label="Content"
                  value={summary?.total_materials ?? 0}
                  caption={`${summary?.total_quizzes ?? 0} quizzes generated`}
                  icon={<FileText className="h-3.5 w-3.5" />}
                />
              </MetricStrip>

              {/* ── Domain chart + heatmap (asymmetric 2/3) ── */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <Surface className="lg:col-span-2">
                  <SectionHeading
                    title="Score by domain"
                    description={
                      weakestDomain
                        ? `${weakestDomain.domain} is the weakest area at ${weakestDomain.score.toFixed(1)}%.`
                        : undefined
                    }
                  />

                  {domainData.length === 0 ? (
                    <EmptyState
                      icon={<Inbox className="h-5 w-5" />}
                      title="No scores recorded"
                      description="Domain averages appear once officers complete their first assessments."
                    />
                  ) : (
                    <div className="mt-5">
                      <ResponsiveContainer width="100%" height={210}>
                        <BarChart
                          data={domainData}
                          margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="short"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: "#475569" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.03)" }}
                            formatter={(v: number) => [`${v}%`, "Average"]}
                            contentStyle={{
                              background: "rgba(10,17,40,0.96)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "10px",
                              fontSize: "12px",
                              padding: "8px 10px",
                            }}
                            labelStyle={{ color: "#cbd5e1", marginBottom: 2 }}
                          />
                          <Bar dataKey="score" radius={[5, 5, 0, 0]} maxBarSize={44}>
                            {domainData.map((d: any, i: number) => (
                              <Cell key={i} fill={d.color} fillOpacity={0.75} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Surface>

                {/* Heatmap */}
                <Surface className="lg:col-span-3">
                  <SectionHeading
                    title="Department × domain gaps"
                    description="Darker cells indicate weaker competency. Values are mean scores."
                    action={
                      <div className="hidden items-center gap-3 sm:flex">
                        {(["critical", "competent", "advanced"] as Band[]).map((b) => (
                          <span
                            key={b}
                            className="flex items-center gap-1.5 text-[0.6875rem] text-slate-500"
                          >
                            <span
                              className="h-2 w-2 rounded-sm"
                              style={{ background: `rgba(${BAND_META[b].rgb},0.55)` }}
                            />
                            {BAND_META[b].label}
                          </span>
                        ))}
                      </div>
                    }
                  />

                  {departments.length === 0 ? (
                    <EmptyState
                      icon={<Building2 className="h-5 w-5" />}
                      title="No departmental data"
                      description="Once officers from at least one department are assessed, the gap matrix is plotted here."
                    />
                  ) : (
                    <div className="mt-5 -mx-1 overflow-x-auto">
                      <table className="w-full min-w-[520px] border-separate border-spacing-0">
                        <thead>
                          <tr>
                            <th className="px-1 pb-2 text-left text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-slate-600">
                              Department
                            </th>
                            {DOMAINS.map((d) => (
                              <th
                                key={d.key}
                                className="px-1 pb-2 text-center text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-slate-600"
                              >
                                {d.label.split(" ")[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {departments.map((dept) => (
                            <tr key={dept}>
                              <td
                                className="max-w-[190px] truncate px-1 pr-4 text-sm text-slate-300"
                                title={dept}
                              >
                                {dept}
                              </td>
                              {DOMAINS.map((d) => (
                                <HeatCell key={d.key} score={heatmap[dept]?.[d.key]} />
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Surface>
              </div>

              {/* ── Attention list + pipeline ──────────────── */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <Surface className="lg:col-span-3" padded={false}>
                  <div className="p-5 sm:p-6">
                    <SectionHeading
                      title="Priority for training"
                      description="Officers with the largest competency gaps, lowest first."
                      action={
                        <Link
                          href="/admin/officers"
                          className="inline-flex items-center gap-1 text-xs font-medium text-accent-400 transition-colors hover:text-accent-300"
                        >
                          All officers
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      }
                    />
                  </div>

                  {needsAttention.length === 0 ? (
                    <EmptyState
                      icon={<CheckCircle2 className="h-5 w-5" />}
                      title="No officers below threshold"
                      description="Every assessed officer currently scores at or above 70%."
                    />
                  ) : (
                    <ul className="divide-y divide-white/[0.04] border-t border-white/[0.06]">
                      {needsAttention.map((o) => {
                        const score = o.avg_score ?? 0;
                        const meta = BAND_META[bandOf(score)];
                        return (
                          <li
                            key={o.id}
                            className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02] sm:px-6"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">
                                {o.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {o.designation}
                                {o.department ? ` · ${o.department}` : ""}
                              </p>
                            </div>

                            {/* Inline gap bar */}
                            <div className="hidden w-28 flex-shrink-0 sm:block">
                              <div className="progress-track">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${Math.max(score, 2)}%`,
                                    background: `rgba(${meta.rgb},0.7)`,
                                  }}
                                />
                              </div>
                            </div>

                            <span
                              className={cn(
                                "w-12 flex-shrink-0 text-right font-mono text-sm font-semibold tabular-nums",
                                meta.text
                              )}
                            >
                              {score.toFixed(1)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Surface>

                {/* Ingestion pipeline */}
                <Surface className="lg:col-span-2" padded={false}>
                  <div className="p-5 sm:p-6">
                    <SectionHeading
                      title="Material pipeline"
                      description="Processing status of uploaded learning content."
                      action={
                        <Link
                          href="/admin/materials"
                          className="inline-flex items-center gap-1 text-xs font-medium text-accent-400 transition-colors hover:text-accent-300"
                        >
                          Manage
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      }
                    />

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Pill tone="emerald">
                        <CheckCircle2 className="h-3 w-3" />
                        {pipeline.processed} processed
                      </Pill>
                      {pipeline.pending > 0 && (
                        <Pill tone="saffron">
                          <Clock className="h-3 w-3" />
                          {pipeline.pending} in queue
                        </Pill>
                      )}
                      {pipeline.failed > 0 && (
                        <Pill tone="rose">
                          <AlertTriangle className="h-3 w-3" />
                          {pipeline.failed} failed
                        </Pill>
                      )}
                    </div>
                  </div>

                  {recentMaterials.length === 0 ? (
                    <EmptyState
                      icon={<BookOpen className="h-5 w-5" />}
                      title="No material uploaded"
                      description="Upload a document to generate quizzes for officers."
                      action={
                        <Link
                          href="/admin/materials"
                          className="btn-secondary text-xs active:translate-y-[1px]"
                        >
                          Upload material
                        </Link>
                      }
                    />
                  ) : (
                    <ul className="divide-y divide-white/[0.04] border-t border-white/[0.06]">
                      {recentMaterials.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center gap-3 px-5 py-3 sm:px-6"
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                              m.error
                                ? "bg-rose-400"
                                : m.processed
                                  ? "bg-emerald-400"
                                  : "animate-pulse bg-saffron-400"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-xs font-medium text-slate-300"
                              title={m.filename}
                            >
                              {m.filename}
                            </p>
                            <p className="mt-0.5 text-[0.6875rem] uppercase tracking-wide text-slate-600">
                              {m.file_type}
                            </p>
                          </div>
                          <span className="flex-shrink-0 text-[0.6875rem] text-slate-600">
                            {new Date(m.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Surface>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
