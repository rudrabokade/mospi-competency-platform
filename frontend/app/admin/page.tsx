"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import {
  awardOfficerReward,
  createOfficer,
  deleteMaterial,
  deleteQuiz,
  exportOfficers,
  generateQuiz,
  getAdminQuizDetail,
  getAdminRewardTransactions,
  getAdminSummary,
  getIgotCourses,
  getLearningAnalytics,
  getOfficerDetail,
  getOrgHeatmap,
  getRecentActivity,
  getRewardPolicy,
  getSkillsBreakdown,
  listAdminQuizzes,
  listMaterials,
  listOfficers,
  recomputeAllRecommendations,
  syncIgotCourses,
  updateRewardPolicy,
  uploadMaterial,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  Users, BookOpen, FileText, TrendingUp, Gift, Save, Activity,
  RefreshCw, Plus, Trash2, Eye, Award, CheckCircle2, AlertTriangle,
  Search, Filter, ExternalLink, X, Clock, Download, ChevronRight,
  Database, Sparkles, Check, AlertCircle, HelpCircle, Briefcase, GraduationCap
} from "lucide-react";
import clsx from "clsx";
import { localizeEntity, useLanguage } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Design tokens — "statistical ledger": deep navy, warm ledger paper, brass accent
// ---------------------------------------------------------------------------
const PAPER = "#F6F4EE";
const PAPER_DARK = "#0E1521";
const RULE = "#DAD4C4";
const NAVY = "#16233A";
const BRASS = "#A9762C";

const DOMAIN_COLORS: Record<string, string> = {
  statistical: "#2C5EBF",
  technical: "#0E8F63",
  digital_governance: "#A9762C",
  behavioural: "#6E4FA6",
};

const DOMAIN_LABELS: Record<string, string> = {
  statistical: "Statistical",
  technical: "Technical",
  digital_governance: "Digital Governance",
  behavioural: "Behavioural",
};

type TabKey = "overview" | "officers" | "training" | "igot" | "rewards";

function ScoreCell({ score }: { score: number }) {
  const pct = score ?? 0;
  const tone =
    pct >= 70 ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40" :
    pct >= 50 ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40" :
    "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40";
  return (
    <span className={clsx("font-mono text-[12px] tabular-nums px-2 py-0.5 border rounded-sm", tone)}>
      {pct.toFixed(1)}
    </span>
  );
}

function SectionLabel({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-serif text-[18px] text-[#16233A] dark:text-[#EDE8DC]">
      <Icon className="w-4 h-4 text-[#A9762C] dark:text-[#C69A5B]" strokeWidth={1.75} />
      {children}
    </h2>
  );
}

function AdminDashboardContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [summary, setSummary] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<Record<string, Record<string, number>>>({});
  const [officers, setOfficers] = useState<any[]>([]);
  const [skillsBreakdown, setSkillsBreakdown] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [igotCourses, setIgotCourses] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [rewardTxs, setRewardTxs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  const [fetching, setFetching] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [syncingIgot, setSyncingIgot] = useState(false);
  const [recomputingRecs, setRecomputingRecs] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [generatingQuizId, setGeneratingQuizId] = useState<string | null>(null);

  // Filters & Search
  const [officerSearch, setOfficerSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedTier, setSelectedTier] = useState("all");
  const [skillDomainFilter, setSkillDomainFilter] = useState("all");

  // Modals & Drawers
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const [officerDossier, setOfficerDossier] = useState<any>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [awardPoints, setAwardPoints] = useState(50);
  const [awardNote, setAwardNote] = useState("Excellence in National Statistical Work");
  const [awardingReward, setAwardingReward] = useState(false);

  // Quiz Preview Modal
  const [previewQuizId, setPreviewQuizId] = useState<string | null>(null);
  const [previewQuizData, setPreviewQuizData] = useState<any>(null);
  const [loadingQuizPreview, setLoadingQuizPreview] = useState(false);

  // New Officer Form
  const [newOfficer, setNewOfficer] = useState({
    name: "",
    email: "",
    password: "Password@123",
    designation: "Statistical Officer",
    department: "Price Statistics Division",
    experience_years: 3,
    qualifications: "M.Sc. Statistics",
  });
  const [creatingOfficer, setCreatingOfficer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read URL tab param if provided
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabKey;
    if (tabParam && ["overview", "officers", "training", "igot", "rewards"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const showNotification = (type: "success" | "error", text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const loadData = async () => {
    setFetching(true);
    try {
      const [
        sumRes,
        heatRes,
        offRes,
        skRes,
        actRes,
        qRes,
        matRes,
        igotRes,
        polRes,
        txRes,
        anaRes,
      ] = await Promise.all([
        getAdminSummary().catch(() => ({ data: null })),
        getOrgHeatmap().catch(() => ({ data: { heatmap: {} } })),
        listOfficers().catch(() => ({ data: [] })),
        getSkillsBreakdown().catch(() => ({ data: [] })),
        getRecentActivity().catch(() => ({ data: [] })),
        listAdminQuizzes().catch(() => ({ data: [] })),
        listMaterials().catch(() => ({ data: [] })),
        getIgotCourses().catch(() => ({ data: [] })),
        getRewardPolicy().catch(() => ({ data: null })),
        getAdminRewardTransactions().catch(() => ({ data: [] })),
        getLearningAnalytics().catch(() => ({ data: null })),
      ]);

      setSummary(sumRes.data);
      setHeatmap(heatRes.data?.heatmap || {});
      setOfficers(offRes.data || []);
      setSkillsBreakdown(skRes.data || []);
      setActivities(actRes.data || []);
      setQuizzes(qRes.data || []);
      setMaterials(matRes.data || []);
      setIgotCourses(igotRes.data || []);
      setPolicy(polRes.data);
      setRewardTxs(txRes.data || []);
      setAnalytics(anaRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    loadData();
  }, [user, loading]);

  // Handle viewing officer details
  const handleOpenDossier = async (officerId: string) => {
    setSelectedOfficerId(officerId);
    setLoadingDossier(true);
    try {
      const res = await getOfficerDetail(officerId);
      setOfficerDossier(res.data);
    } catch (err: any) {
      showNotification("error", "Could not load officer dossier.");
    } finally {
      setLoadingDossier(false);
    }
  };

  // Handle granting reward points to officer
  const handleAwardReward = async () => {
    if (!selectedOfficerId) return;
    setAwardingReward(true);
    try {
      await awardOfficerReward(selectedOfficerId, awardPoints, awardNote);
      showNotification("success", `Granted ${awardPoints} points to ${officerDossier?.name || "officer"}.`);
      const res = await getOfficerDetail(selectedOfficerId);
      setOfficerDossier(res.data);
      getAdminRewardTransactions().then((r) => setRewardTxs(r.data || []));
      getRecentActivity().then((r) => setActivities(r.data || []));
    } catch (err: any) {
      showNotification("error", err.response?.data?.detail || "Failed to award points.");
    } finally {
      setAwardingReward(false);
    }
  };

  // Handle opening quiz preview
  const handlePreviewQuiz = async (quizId: string) => {
    setPreviewQuizId(quizId);
    setLoadingQuizPreview(true);
    try {
      const res = await getAdminQuizDetail(quizId);
      setPreviewQuizData(res.data);
    } catch (err: any) {
      showNotification("error", "Could not load quiz details.");
    } finally {
      setLoadingQuizPreview(false);
    }
  };

  // Handle deleting a quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await deleteQuiz(quizId);
      showNotification("success", "Quiz removed from bank.");
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      getAdminSummary().then((r) => setSummary(r.data));
    } catch (err: any) {
      showNotification("error", "Could not delete quiz.");
    }
  };

  // Handle deleting a material
  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Are you sure you want to delete this material and its generated quizzes?")) return;
    try {
      await deleteMaterial(materialId);
      showNotification("success", "Material and related quizzes removed.");
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      listAdminQuizzes().then((r) => setQuizzes(r.data || []));
      getAdminSummary().then((r) => setSummary(r.data));
    } catch (err: any) {
      showNotification("error", "Could not delete material.");
    }
  };

  // Handle uploading training material
  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMaterial(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await uploadMaterial(fd);
      showNotification("success", `Uploaded ${file.name}. Ready for AI Quiz generation.`);
      listMaterials().then((r) => setMaterials(r.data || []));
      getAdminSummary().then((r) => setSummary(r.data));
    } catch (err: any) {
      showNotification("error", err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploadingMaterial(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle generating quiz from material
  const handleGenerateQuiz = async (materialId: string) => {
    setGeneratingQuizId(materialId);
    try {
      const res = await generateQuiz(materialId);
      showNotification("success", `AI Quiz generated: "${res.data.title}" (${res.data.question_count} questions).`);
      listAdminQuizzes().then((r) => setQuizzes(r.data || []));
      listMaterials().then((r) => setMaterials(r.data || []));
      getAdminSummary().then((r) => setSummary(r.data));
    } catch (err: any) {
      showNotification("error", err.response?.data?.detail || "AI Quiz generation failed.");
    } finally {
      setGeneratingQuizId(null);
    }
  };

  // Handle syncing iGOT courses
  const handleSyncIgot = async () => {
    setSyncingIgot(true);
    try {
      const res = await syncIgotCourses();
      showNotification("success", `${res.data.message} (${res.data.synced_count} courses active).`);
      getIgotCourses().then((r) => setIgotCourses(r.data || []));
    } catch (err: any) {
      showNotification("error", "Failed to sync iGOT Karmayogi catalog.");
    } finally {
      setSyncingIgot(false);
    }
  };

  // Handle recomputing AI recommendations for all officers
  const handleRecomputeAllRecs = async () => {
    setRecomputingRecs(true);
    try {
      const res = await recomputeAllRecommendations();
      showNotification("success", res.data.message);
      getLearningAnalytics().then((r) => setAnalytics(r.data));
    } catch (err: any) {
      showNotification("error", "Failed to recompute recommendations.");
    } finally {
      setRecomputingRecs(false);
    }
  };

  // Handle onboarding new officer
  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingOfficer(true);
    try {
      await createOfficer({
        name: newOfficer.name,
        email: newOfficer.email,
        password: newOfficer.password,
        designation: newOfficer.designation,
        department: newOfficer.department,
        experience_years: Number(newOfficer.experience_years),
        qualifications: newOfficer.qualifications.split(",").map((s) => s.trim()).filter(Boolean),
      });
      showNotification("success", `Officer ${newOfficer.name} provisioned with baseline competencies.`);
      setOnboardModalOpen(false);
      setNewOfficer({
        name: "",
        email: "",
        password: "Password@123",
        designation: "Statistical Officer",
        department: "Price Statistics Division",
        experience_years: 3,
        qualifications: "M.Sc. Statistics",
      });
      listOfficers().then((r) => setOfficers(r.data || []));
      getAdminSummary().then((r) => setSummary(r.data));
      getSkillsBreakdown().then((r) => setSkillsBreakdown(r.data || []));
    } catch (err: any) {
      showNotification("error", err.response?.data?.detail || "Could not onboard officer.");
    } finally {
      setCreatingOfficer(false);
    }
  };

  // Handle saving policy
  const savePolicy = async () => {
    setSavingPolicy(true);
    try {
      const res = await updateRewardPolicy(policy);
      setPolicy(res.data);
      showNotification("success", "Reward policy updated successfully.");
    } catch (error: any) {
      showNotification("error", error.response?.data?.detail || "Could not save reward policy.");
    } finally {
      setSavingPolicy(false);
    }
  };

  // Handle CSV export
  const downloadOfficerReport = async () => {
    try {
      const response = await exportOfficers();
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mospi-officers-competency-audit.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showNotification("error", "Failed to export report.");
    }
  };

  // Computed data
  const departments = Object.keys(heatmap);
  const domains = ["statistical", "technical", "digital_governance", "behavioural"];

  const domainAvgData = summary?.avg_scores_by_domain?.map((d: any) => ({
    domain: DOMAIN_LABELS[d.domain] || d.domain,
    score: d.avg_score,
    color: DOMAIN_COLORS[d.domain] || "#6b7280",
  })) || [];

  const orgAvg = (domainAvgData.reduce((s: number, d: any) => s + d.score, 0) / (domainAvgData.length || 1));

  // Critical Skill Deficits (top skills with highest gap)
  const criticalDeficits = useMemo(() => {
    return skillsBreakdown
      .filter((s) => skillDomainFilter === "all" || s.domain === skillDomainFilter)
      .slice(0, 8);
  }, [skillsBreakdown, skillDomainFilter]);

  // Filtered officers
  const filteredOfficers = useMemo(() => {
    return officers.filter((o) => {
      const matchesSearch =
        !officerSearch ||
        o.name.toLowerCase().includes(officerSearch.toLowerCase()) ||
        o.email.toLowerCase().includes(officerSearch.toLowerCase()) ||
        (o.designation && o.designation.toLowerCase().includes(officerSearch.toLowerCase()));

      const matchesDept = selectedDept === "all" || o.department === selectedDept;

      const matchesTier =
        selectedTier === "all" ||
        (selectedTier === "proficient" && o.avg_score >= 70) ||
        (selectedTier === "developing" && o.avg_score >= 50 && o.avg_score < 70) ||
        (selectedTier === "needs_attention" && o.avg_score < 50);

      return matchesSearch && matchesDept && matchesTier;
    });
  }, [officers, officerSearch, selectedDept, selectedTier]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    officers.forEach((o) => { if (o.department) set.add(o.department); });
    return Array.from(set);
  }, [officers]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4" style={{ background: PAPER }}>
        <div className="w-10 h-10 border-4 border-[#A9762C] border-t-transparent rounded-full animate-spin" />
        <p className="font-serif text-[15px] text-[#16233A] dark:text-[#EDE8DC]">
          Loading MoSPI Competency Command Center…
        </p>
      </div>
    );
  }

  const kpis = [
    { label: "Learner officers", value: summary?.total_learners ?? officers.length, icon: Users },
    { label: "Training materials", value: summary?.total_materials ?? materials.length, icon: FileText },
    { label: "AI quizzes generated", value: summary?.total_quizzes ?? quizzes.length, icon: BookOpen },
    { label: "Ministry average score", value: `${orgAvg.toFixed(1)}%`, icon: TrendingUp },
    { label: "Assessment pass rate", value: `${analytics?.pass_rate ?? 0}%`, icon: CheckCircle2 },
    { label: "Critical skill gaps", value: skillsBreakdown.filter((s) => s.gap >= 20).length, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen font-sans text-[#16233A] dark:text-[#EDE8DC] antialiased" style={{ background: PAPER }}>
      <style jsx global>{`
        .dark body { background: ${PAPER_DARK}; }
      `}</style>

      <Navbar />

      {/* MoSPI Administrative Masthead */}
      <div style={{ background: NAVY }} className="dark:bg-[#0B1220] border-b border-[#0f1a2c]">
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#C69A5B] bg-[#C69A5B]/15 px-2 py-0.5 rounded-sm border border-[#C69A5B]/30">
                  Government of India · MoSPI DIID
                </span>
                <span className="text-[11px] font-mono text-[#9AA3B0]">
                  System Ver 2.4
                </span>
              </div>
              <h1 className="font-serif text-[28px] text-[#F6F4EE] leading-tight">
                MoSPI Competency & Governance Platform
              </h1>
              <p className="text-[13px] text-[#B9C2D3] mt-1">
                Executive analytics, cadre competency tracking, AI assessment generation, and iGOT Karmayogi integration
              </p>
            </div>

            {/* Masthead Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setOnboardModalOpen(true)}
                className="flex items-center gap-1.5 text-[12.5px] px-3.5 py-2 bg-[#A9762C] text-[#F6F4EE] hover:bg-[#8F6324] transition-colors rounded-sm shadow-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Onboard Officer
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingMaterial}
                className="flex items-center gap-1.5 text-[12.5px] px-3.5 py-2 bg-white/10 hover:bg-white/20 text-[#F6F4EE] transition-colors rounded-sm border border-white/15"
              >
                <FileText className="w-4 h-4 text-[#C69A5B]" />
                {uploadingMaterial ? "Uploading…" : "Upload Material"}
              </button>
              <button
                onClick={handleSyncIgot}
                disabled={syncingIgot}
                className="flex items-center gap-1.5 text-[12.5px] px-3.5 py-2 bg-white/10 hover:bg-white/20 text-[#F6F4EE] transition-colors rounded-sm border border-white/15"
                title="Synchronize iGOT Karmayogi Courses"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5 text-[#C69A5B]", syncingIgot && "animate-spin")} />
                {syncingIgot ? "Syncing…" : "Sync iGOT"}
              </button>
              <button
                onClick={downloadOfficerReport}
                className="flex items-center gap-1.5 text-[12.5px] px-3.5 py-2 bg-white/10 hover:bg-white/20 text-[#F6F4EE] transition-colors rounded-sm border border-white/15"
              >
                <Download className="w-3.5 h-3.5" /> Export Audit
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx,.txt,.mp4"
                className="hidden"
                onChange={handleMaterialUpload}
              />
            </div>
          </div>

          {/* Navigation Bar / Tabs */}
          <div className="flex items-center gap-1 mt-7 border-t border-white/10 pt-3 overflow-x-auto">
            {[
              { id: "overview", label: "Executive Overview", icon: Activity },
              { id: "officers", label: `Cadre Directory (${officers.length})`, icon: Users },
              { id: "training", label: `Materials & Quizzes (${materials.length}/${quizzes.length})`, icon: BookOpen },
              { id: "igot", label: `iGOT Karmayogi (${igotCourses.length})`, icon: Database },
              { id: "rewards", label: "Incentives & Policies", icon: Gift },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabKey)}
                className={clsx(
                  "flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium transition-all rounded-sm whitespace-nowrap",
                  activeTab === id
                    ? "bg-[#F6F4EE] text-[#16233A] font-semibold shadow-sm"
                    : "text-[#B9C2D3] hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className={clsx("w-4 h-4", activeTab === id ? "text-[#A9762C]" : "text-[#B9C2D3]")} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[3px]" style={{ background: BRASS }} />
      </div>

      {/* Floating Action Alert / Toast */}
      {actionMessage && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div
            className={clsx(
              "flex items-center justify-between px-4 py-3 border text-[13px] rounded-sm transition-all",
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
            )}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)}>
              <X className="w-4 h-4 opacity-70 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* KPI Ledger Strip */}
            <div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 border shadow-xs"
              style={{ borderColor: RULE, background: "white" }}
            >
              {kpis.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="px-4 py-4 dark:bg-[#121C2B] dark:border-[#22304487]"
                  style={{ borderColor: RULE }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-4 h-4 text-[#A9762C] dark:text-[#C69A5B]" strokeWidth={1.75} />
                  </div>
                  <p className="font-mono text-[24px] tabular-nums text-[#16233A] dark:text-[#EDE8DC] leading-none font-bold">
                    {value}
                  </p>
                  <p className="text-[12px] text-[#6B6455] dark:text-[#9AA3B0] mt-1.5 line-clamp-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Critical Competency Deficits Table */}
            <div className="border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs" style={{ borderColor: RULE, background: "white" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <SectionLabel icon={AlertTriangle}>Critical MoSPI Competency Deficits</SectionLabel>
                  <p className="text-[12.5px] text-[#6B6455] dark:text-[#9AA3B0] mt-1">
                    Top national skill areas requiring urgent capacity building interventions across MoSPI cadres
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#6B6455] dark:text-[#9AA3B0]">Domain:</span>
                  <select
                    value={skillDomainFilter}
                    onChange={(e) => setSkillDomainFilter(e.target.value)}
                    className="text-[12.5px] px-2.5 py-1 border border-[#C9C2AE] dark:border-[#2E3D52] bg-transparent rounded-sm outline-none"
                  >
                    <option value="all">All Domains</option>
                    <option value="statistical">Statistical</option>
                    <option value="technical">Technical</option>
                    <option value="digital_governance">Digital Governance</option>
                    <option value="behavioural">Behavioural</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b text-[#6B6455] dark:text-[#9AA3B0]" style={{ borderColor: RULE }}>
                      <th className="text-left pb-2.5 font-normal">Skill</th>
                      <th className="text-left pb-2.5 font-normal">Domain</th>
                      <th className="text-left pb-2.5 font-normal">Ministry Avg</th>
                      <th className="text-left pb-2.5 font-normal">Target Benchmark</th>
                      <th className="text-left pb-2.5 font-normal">Deficit / Gap</th>
                      <th className="text-left pb-2.5 font-normal">Officers Needing Training</th>
                      <th className="text-right pb-2.5 font-normal">Priority Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalDeficits.map((skill) => (
                      <tr
                        key={skill.id}
                        className="border-b hover:bg-[#F6F4EE]/60 dark:hover:bg-[#182233] transition-colors"
                        style={{ borderColor: RULE }}
                      >
                        <td className="py-2.5 font-medium text-[#16233A] dark:text-[#EDE8DC]">
                          {skill.name}
                          {skill.description && (
                            <span className="block text-[11px] text-[#6B6455] dark:text-[#9AA3B0] font-normal truncate max-w-xs">
                              {skill.description}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-sm font-medium"
                            style={{
                              backgroundColor: `${DOMAIN_COLORS[skill.domain]}15`,
                              color: DOMAIN_COLORS[skill.domain],
                              border: `1px solid ${DOMAIN_COLORS[skill.domain]}30`
                            }}
                          >
                            {DOMAIN_LABELS[skill.domain] || skill.domain}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono tabular-nums text-[13px]">
                          {skill.avg_score}%
                        </td>
                        <td className="py-2.5 font-mono tabular-nums text-[13px] text-[#6B6455] dark:text-[#9AA3B0]">
                          {skill.target_score}%
                        </td>
                        <td className="py-2.5">
                          <span className={clsx(
                            "font-mono tabular-nums font-semibold",
                            skill.gap >= 20 ? "text-rose-600" : skill.gap >= 10 ? "text-amber-600" : "text-emerald-600"
                          )}>
                            -{skill.gap} pts
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="text-[12px] font-mono text-[#16233A] dark:text-[#EDE8DC]">
                            {skill.deficit_count} officers ({skill.deficit_percentage}%)
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={clsx(
                            "text-[10.5px] uppercase font-mono px-2 py-0.5 rounded-sm border",
                            skill.priority === "high"
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                              : skill.priority === "medium"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                          )}>
                            {skill.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Domain chart + Department heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Domain Bar Chart */}
              <div className="border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs" style={{ borderColor: RULE, background: "white" }}>
                <div className="flex items-center justify-between mb-4">
                  <SectionLabel icon={TrendingUp}>Average score by domain</SectionLabel>
                  <span className="text-[12px] font-mono text-[#6B6455] dark:text-[#9AA3B0]">Target: 65-70%</span>
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={domainAvgData} margin={{ bottom: 20, left: -20, top: 10 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke={RULE} vertical={false} />
                    <XAxis dataKey="domain" tick={{ fontSize: 11, fill: "#6B6455" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6B6455" }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, "Average Score"]} />
                    <Bar dataKey="score" radius={[2, 2, 0, 0]}>
                      {domainAvgData.map((d: any, i: number) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department Heatmap */}
              <div className="border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs overflow-auto" style={{ borderColor: RULE, background: "white" }}>
                <div className="flex items-center justify-between mb-4">
                  <SectionLabel icon={Users}>Department × Domain Matrix</SectionLabel>
                  <span className="text-[12px] font-mono text-[#6B6455] dark:text-[#9AA3B0]">
                    {departments.length} Divisions
                  </span>
                </div>
                {departments.length === 0 ? (
                  <p className="text-[#9A9585] dark:text-[#6B7480] text-[13px] py-8 text-center">No departmental records yet.</p>
                ) : (
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="border-b" style={{ borderColor: RULE }}>
                        <th className="text-left py-2 pr-3 text-[#6B6455] dark:text-[#9AA3B0] font-normal min-w-[130px]">Department</th>
                        {domains.map((d) => (
                          <th key={d} className="text-center px-1.5 py-2 text-[#6B6455] dark:text-[#9AA3B0] font-normal">
                            {DOMAIN_LABELS[d]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept) => (
                        <tr key={dept} className="border-b hover:bg-[#F6F4EE]/50 transition-colors" style={{ borderColor: RULE }}>
                          <td className="py-2 pr-3 font-serif text-[#16233A] dark:text-[#EDE8DC] truncate max-w-[140px]" title={dept}>
                            {dept}
                          </td>
                          {domains.map((d) => (
                            <td key={d} className="text-center px-1.5 py-2">
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

            {/* Live Activity & Audit Feed */}
            <div className="border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs" style={{ borderColor: RULE, background: "white" }}>
              <div className="flex items-center justify-between mb-4">
                <SectionLabel icon={Activity}>Ministry Live Activity & Audit Stream</SectionLabel>
                <button
                  onClick={() => getRecentActivity().then((r) => setActivities(r.data || []))}
                  className="text-[12px] flex items-center gap-1 text-[#A9762C] hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {activities.length === 0 ? (
                <p className="text-[13px] text-[#6B6455] dark:text-[#9AA3B0] py-6 text-center">No recent activity logged.</p>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto" style={{ borderColor: RULE }}>
                  {activities.map((act) => (
                    <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={clsx(
                          "w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0 mt-0.5",
                          act.type === "quiz_attempt" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40" :
                          act.type === "material_upload" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40" :
                          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                        )}>
                          {act.type === "quiz_attempt" ? <BookOpen className="w-3.5 h-3.5" /> :
                           act.type === "material_upload" ? <FileText className="w-3.5 h-3.5" /> :
                           <Award className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#16233A] dark:text-[#EDE8DC]">{act.title}</p>
                          <p className="text-[12px] text-[#6B6455] dark:text-[#9AA3B0]">{act.detail}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6B6455] dark:text-[#9AA3B0]">
                            <span>{act.officer_name}</span>
                            {act.department && <span>· {act.department}</span>}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-[#6B6455] dark:text-[#9AA3B0] whitespace-nowrap">
                        {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: OFFICERS MANAGEMENT */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "officers" && (
          <div className="space-y-6">
            <div className="border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs" style={{ borderColor: RULE, background: "white" }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <SectionLabel icon={Users}>Cadre Competency Register</SectionLabel>
                  <p className="text-[12.5px] text-[#6B6455] dark:text-[#9AA3B0] mt-1">
                    Manage officers across all statistical divisions, inspect dossiers, and award commendations
                  </p>
                </div>
                <button
                  onClick={() => setOnboardModalOpen(true)}
                  className="flex items-center gap-1.5 text-[12.5px] px-3.5 py-2 bg-[#16233A] text-white hover:bg-[#A9762C] transition-colors rounded-sm shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Provision New Officer
                </button>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B6455]" />
                  <input
                    type="text"
                    placeholder="Search by name, email, designation…"
                    value={officerSearch}
                    onChange={(e) => setOfficerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-[#C9C2AE] dark:border-[#2E3D52] bg-transparent outline-none rounded-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#6B6455]" />
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full py-1.5 px-2 text-[13px] border border-[#C9C2AE] dark:border-[#2E3D52] bg-transparent outline-none rounded-sm"
                  >
                    <option value="all">All Departments</option>
                    {uniqueDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="w-full py-1.5 px-2 text-[13px] border border-[#C9C2AE] dark:border-[#2E3D52] bg-transparent outline-none rounded-sm"
                  >
                    <option value="all">All Performance Tiers</option>
                    <option value="proficient">Proficient (≥70%)</option>
                    <option value="developing">Developing (50–69%)</option>
                    <option value="needs_attention">Needs Attention (&lt;50%)</option>
                  </select>
                </div>
              </div>

              {/* Officers Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor: RULE }}>
                      <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Officer Name</th>
                      <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Email</th>
                      <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Designation</th>
                      <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Department</th>
                      <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Exp.</th>
                      <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Competency</th>
                      <th className="text-right pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOfficers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#6B6455] dark:text-[#9AA3B0]">
                          No officers match the active filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredOfficers.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b hover:bg-[#F6F4EE]/60 dark:hover:bg-[#182233] transition-colors"
                          style={{ borderColor: RULE }}
                        >
                          <td className="py-2.5 pr-3 font-serif font-medium text-[#16233A] dark:text-[#EDE8DC]">
                            {o.name}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-[12px] text-[#6B6455] dark:text-[#9AA3B0]">
                            {o.email}
                          </td>
                          <td className="py-2.5 pr-3 text-[#6B6455] dark:text-[#9AA3B0]">{o.designation}</td>
                          <td className="py-2.5 pr-3 text-[#6B6455] dark:text-[#9AA3B0] max-w-[180px] truncate" title={o.department}>
                            {o.department}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-[#6B6455] dark:text-[#9AA3B0]">{o.experience_years}y</td>
                          <td className="py-2.5 pr-3">
                            <ScoreCell score={o.avg_score} />
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleOpenDossier(o.id)}
                              className="text-[12px] px-2.5 py-1 border border-[#16233A] dark:border-[#3A4A63] hover:bg-[#16233A] hover:text-white transition-colors rounded-sm font-medium"
                            >
                              Inspect Dossier
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: MATERIALS & AI QUIZ BANK */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "training" && (
          <div className="space-y-8">
            {/* Upload Area */}
            <div className="border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs" style={{ borderColor: RULE, background: "white" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <SectionLabel icon={FileText}>Statistical Training Materials</SectionLabel>
                  <p className="text-[12.5px] text-[#6B6455] dark:text-[#9AA3B0] mt-1">
                    Upload official MoSPI manuals, survey schedules, and methodological notes to auto-generate adaptive quizzes
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMaterial}
                  className="flex items-center gap-1.5 text-[12.5px] px-3.5 py-2 bg-[#16233A] text-white hover:bg-[#A9762C] transition-colors rounded-sm"
                >
                  <Plus className="w-4 h-4" /> Upload Document
                </button>
              </div>

              {materials.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#C9C2AE] p-8 text-center cursor-pointer hover:border-[#A9762C] transition-colors rounded-sm my-4"
                >
                  <FileText className="w-8 h-8 text-[#A9762C] mx-auto mb-2" />
                  <p className="text-[13px] font-medium text-[#16233A] dark:text-[#EDE8DC]">
                    No training documents uploaded yet. Click to upload PDF, PPTX, or text files.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b" style={{ borderColor: RULE }}>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Document Name</th>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Type</th>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Uploaded</th>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Status</th>
                        <th className="text-right pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m) => (
                        <tr key={m.id} className="border-b hover:bg-[#F6F4EE]/50" style={{ borderColor: RULE }}>
                          <td className="py-2.5 font-medium text-[#16233A] dark:text-[#EDE8DC]">
                            {m.filename || "Untitled Document"}
                          </td>
                          <td className="py-2.5 font-mono text-[11px] uppercase text-[#6B6455] dark:text-[#9AA3B0]">
                            {m.file_type}
                          </td>
                          <td className="py-2.5 font-mono text-[11.5px] text-[#6B6455] dark:text-[#9AA3B0]">
                            {new Date(m.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2.5">
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </td>
                          <td className="py-2.5 text-right space-x-2">
                            <button
                              onClick={() => handleGenerateQuiz(m.id)}
                              disabled={generatingQuizId === m.id}
                              className="text-[12px] px-2.5 py-1 bg-[#A9762C] text-white hover:bg-[#8F6324] transition-colors rounded-sm font-medium"
                            >
                              {generatingQuizId === m.id ? "Generating…" : "Generate AI Quiz"}
                            </button>
                            <button
                              onClick={() => handleDeleteMaterial(m.id)}
                              className="text-[12px] p-1 text-rose-600 hover:bg-rose-50 rounded-sm"
                              title="Delete Material"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AI Quiz Bank Register */}
            <div className="border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs" style={{ borderColor: RULE, background: "white" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <SectionLabel icon={BookOpen}>AI Quiz Bank & Assessment Metrics</SectionLabel>
                  <p className="text-[12.5px] text-[#6B6455] dark:text-[#9AA3B0] mt-1">
                    Manage system-generated multiple choice assessments, inspect question keys, and monitor officer scores
                  </p>
                </div>
                <span className="text-[12.5px] font-mono text-[#6B6455] dark:text-[#9AA3B0]">
                  {quizzes.length} Assessments Active
                </span>
              </div>

              {quizzes.length === 0 ? (
                <p className="text-[13px] text-[#6B6455] dark:text-[#9AA3B0] py-6 text-center">
                  No quizzes generated yet. Upload a material above to create the first quiz.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b" style={{ borderColor: RULE }}>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Quiz Title</th>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Source Material</th>
                        <th className="text-center pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Questions</th>
                        <th className="text-center pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Attempts</th>
                        <th className="text-center pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Pass Rate</th>
                        <th className="text-center pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Avg Score</th>
                        <th className="text-right pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizzes.map((q) => (
                        <tr key={q.id} className="border-b hover:bg-[#F6F4EE]/50" style={{ borderColor: RULE }}>
                          <td className="py-2.5 font-medium text-[#16233A] dark:text-[#EDE8DC] max-w-xs truncate">
                            {q.title}
                          </td>
                          <td className="py-2.5 text-[#6B6455] dark:text-[#9AA3B0] max-w-[180px] truncate">
                            {q.material_filename || "Official Syllabus"}
                          </td>
                          <td className="py-2.5 text-center font-mono">{q.question_count}</td>
                          <td className="py-2.5 text-center font-mono">{q.attempts_count}</td>
                          <td className="py-2.5 text-center">
                            <span className={clsx(
                              "font-mono text-[12px] font-semibold",
                              q.pass_rate >= 70 ? "text-emerald-700" : q.pass_rate >= 50 ? "text-amber-700" : "text-rose-700"
                            )}>
                              {q.pass_rate}%
                            </span>
                          </td>
                          <td className="py-2.5 text-center font-mono">{q.avg_score}%</td>
                          <td className="py-2.5 text-right space-x-2">
                            <button
                              onClick={() => handlePreviewQuiz(q.id)}
                              className="text-[12px] px-2.5 py-1 border border-[#16233A] dark:border-[#3A4A63] hover:bg-[#16233A] hover:text-white transition-colors rounded-sm"
                            >
                              Preview Questions
                            </button>
                            <button
                              onClick={() => handleDeleteQuiz(q.id)}
                              className="text-[12px] p-1 text-rose-600 hover:bg-rose-50 rounded-sm"
                              title="Delete Quiz"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: iGOT KARMAYOGI INTEGRATION */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "igot" && (
          <div className="space-y-6">
            <div className="border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs" style={{ borderColor: RULE, background: "white" }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <SectionLabel icon={Database}>iGOT Karmayogi Course Catalog & Synchronization</SectionLabel>
                  <p className="text-[12.5px] text-[#6B6455] dark:text-[#9AA3B0] mt-1">
                    Direct integration bridge with Mission Karmayogi National Portal for statistical capacity building
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncIgot}
                    disabled={syncingIgot}
                    className="flex items-center gap-1.5 text-[12.5px] px-3.5 py-2 bg-[#A9762C] text-white hover:bg-[#8F6324] transition-colors rounded-sm font-medium"
                  >
                    <RefreshCw className={clsx("w-3.5 h-3.5", syncingIgot && "animate-spin")} />
                    {syncingIgot ? "Syncing Catalog…" : "Sync iGOT Catalog"}
                  </button>
                  <button
                    onClick={handleRecomputeAllRecs}
                    disabled={recomputingRecs}
                    className="flex items-center gap-1.5 text-[12.5px] px-3.5 py-2 bg-[#16233A] text-white hover:bg-[#A9762C] transition-colors rounded-sm font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C69A5B]" />
                    {recomputingRecs ? "Recomputing…" : "Recompute AI Recommendations"}
                  </button>
                </div>
              </div>

              {/* Status Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-sm mb-6 bg-[#F6F4EE]/50 dark:bg-[#0B1220]" style={{ borderColor: RULE }}>
                <div>
                  <span className="text-[11.5px] text-[#6B6455] dark:text-[#9AA3B0] block">Catalog Status</span>
                  <span className="text-[13px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized & Active
                  </span>
                </div>
                <div>
                  <span className="text-[11.5px] text-[#6B6455] dark:text-[#9AA3B0] block">Total Mapped Courses</span>
                  <span className="text-[14px] font-mono font-bold text-[#16233A] dark:text-[#EDE8DC] mt-0.5 block">
                    {igotCourses.length} Courses
                  </span>
                </div>
                <div>
                  <span className="text-[11.5px] text-[#6B6455] dark:text-[#9AA3B0] block">Official Provider</span>
                  <span className="text-[13px] font-medium text-[#16233A] dark:text-[#EDE8DC] mt-0.5 block">
                    iGOT Karmayogi Bharat Portal
                  </span>
                </div>
              </div>

              {/* Courses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {igotCourses.map((c) => (
                  <div key={c.id} className="border p-4 rounded-sm flex flex-col justify-between space-y-3 hover:border-[#A9762C] transition-colors" style={{ borderColor: RULE }}>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] bg-[#16233A] text-[#F6F4EE] px-2 py-0.5 rounded-sm">
                          {c.external_id}
                        </span>
                        <span className="text-[11.5px] text-[#6B6455] dark:text-[#9AA3B0] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {c.duration_hours || 8} hours
                        </span>
                      </div>
                      <h3 className="font-serif font-semibold text-[15px] text-[#16233A] dark:text-[#EDE8DC] leading-snug">
                        {c.title}
                      </h3>
                      <p className="text-[12.5px] text-[#6B6455] dark:text-[#9AA3B0] mt-1.5 line-clamp-2">
                        {c.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: RULE }}>
                      <div className="flex flex-wrap gap-1">
                        {c.skill_tags?.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-[10px] font-mono bg-[#A9762C]/10 text-[#A9762C] px-1.5 py-0.5 rounded-sm">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      {c.source_url && (
                        <a
                          href={c.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-[#16233A] dark:text-[#C69A5B] flex items-center gap-1 hover:underline"
                        >
                          Portal Link <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 5: INCENTIVES, POLICIES & REWARDS */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "rewards" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Policy Form */}
              <div className="lg:col-span-2 border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs" style={{ borderColor: RULE, background: "white" }}>
                <SectionLabel icon={Gift}>Ministry Reward Policy & Allocation Rules</SectionLabel>
                <p className="text-[13px] text-[#6B6455] dark:text-[#9AA3B0] mt-1">
                  Define points issued across assessments, course completion, and competency self-evaluations
                </p>

                {policy && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 mt-6">
                    {[
                      ["points_per_quiz", "Quiz completion points"],
                      ["points_per_course", "Course completion points"],
                      ["points_per_assessment", "Assessment points"],
                      ["points_per_evidence", "Evidence validation points"],
                      ["redemption_threshold", "Redemption threshold"],
                    ].map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="text-[12px] text-[#6B6455] dark:text-[#9AA3B0] font-medium">{label}</span>
                        <input
                          className="mt-1 w-full bg-transparent border-b border-[#C9C2AE] dark:border-[#2E3D52] focus:border-[#A9762C] outline-none py-1 font-mono text-[14px] text-[#16233A] dark:text-[#EDE8DC] transition-colors"
                          type="number"
                          min="0"
                          value={policy[key]}
                          onChange={(e) => setPolicy({ ...policy, [key]: Number(e.target.value) })}
                        />
                      </label>
                    ))}
                    <label className="block">
                      <span className="text-[12px] text-[#6B6455] dark:text-[#9AA3B0] font-medium">Reward Conversion</span>
                      <select
                        className="mt-1 w-full bg-transparent border-b border-[#C9C2AE] dark:border-[#2E3D52] focus:border-[#A9762C] outline-none py-1 text-[14px] text-[#16233A] dark:text-[#EDE8DC] transition-colors"
                        value={policy.conversion_type}
                        onChange={(e) => setPolicy({ ...policy, conversion_type: e.target.value })}
                      >
                        <option value="certificate">Verified Certificate</option>
                        <option value="holiday">Holiday / Leave Benefit</option>
                        <option value="recognition">Ministry Recognition</option>
                        <option value="promotion">Promotion Consideration</option>
                      </select>
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-between mt-8 pt-4 border-t" style={{ borderColor: RULE }}>
                  <label className="flex items-center gap-2 text-[13px] text-[#16233A] dark:text-[#EDE8DC] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policy?.enabled ?? false}
                      onChange={(e) => setPolicy({ ...policy, enabled: e.target.checked })}
                      className="accent-[#A9762C] w-4 h-4"
                    />
                    Enable Reward & Gamification System
                  </label>
                  <button
                    onClick={savePolicy}
                    disabled={!policy || savingPolicy}
                    className="flex items-center gap-2 text-[13px] px-4 py-2 bg-[#16233A] text-[#F6F4EE] hover:bg-[#A9762C] disabled:opacity-50 transition-colors rounded-sm font-medium"
                  >
                    <Save className="w-3.5 h-3.5" /> {savingPolicy ? "Saving Policy…" : "Save Policy"}
                  </button>
                </div>
              </div>

              {/* Mini Analytics */}
              <div className="border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs" style={{ borderColor: RULE, background: "white" }}>
                <SectionLabel icon={Activity}>Learning Analytics</SectionLabel>
                <div className="mt-6 divide-y" style={{ borderColor: RULE }}>
                  {[
                    ["Total Quiz Attempts", analytics?.quiz_attempts ?? 0, false],
                    ["Passed Assessments", analytics?.passed_attempts ?? 0, true],
                    ["Ministry Pass Rate", `${analytics?.pass_rate ?? 0}%`, true],
                    ["Average Quiz Score", `${analytics?.average_quiz_score ?? 0}%`, true],
                    ["Active Interventions", analytics?.active_recommendations ?? 0, false],
                  ].map(([label, value, accent]) => (
                    <div key={label as string} className="flex items-baseline justify-between py-3">
                      <span className="text-[13px] text-[#6B6455] dark:text-[#9AA3B0]">{label}</span>
                      <span
                        className={clsx(
                          "font-mono text-[17px] tabular-nums font-bold",
                          accent ? "text-[#0E8F63] dark:text-emerald-400" : "text-[#16233A] dark:text-[#EDE8DC]"
                        )}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ministry Reward Transactions Ledger */}
            <div className="border p-6 dark:bg-[#121C2B] dark:border-[#22304487] shadow-xs" style={{ borderColor: RULE, background: "white" }}>
              <div className="flex items-center justify-between mb-4">
                <SectionLabel icon={Award}>Ministry Reward & Commendation Ledger</SectionLabel>
                <span className="text-[12px] font-mono text-[#6B6455] dark:text-[#9AA3B0]">
                  {rewardTxs.length} Transactions Logged
                </span>
              </div>

              {rewardTxs.length === 0 ? (
                <p className="text-[13px] text-[#6B6455] dark:text-[#9AA3B0] py-6 text-center">
                  No reward transactions logged yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b" style={{ borderColor: RULE }}>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Officer</th>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Department</th>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Action / Milestone</th>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Points</th>
                        <th className="text-left pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Note</th>
                        <th className="text-right pb-2.5 font-normal text-[#6B6455] dark:text-[#9AA3B0]">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rewardTxs.map((tx) => (
                        <tr key={tx.id} className="border-b hover:bg-[#F6F4EE]/50" style={{ borderColor: RULE }}>
                          <td className="py-2.5 font-serif font-medium text-[#16233A] dark:text-[#EDE8DC]">{tx.officer_name}</td>
                          <td className="py-2.5 text-[#6B6455] dark:text-[#9AA3B0]">{tx.department || "MoSPI"}</td>
                          <td className="py-2.5 capitalize">{tx.action}</td>
                          <td className="py-2.5 font-mono font-semibold text-emerald-700 dark:text-emerald-400">+{tx.points} pts</td>
                          <td className="py-2.5 text-[#6B6455] dark:text-[#9AA3B0] max-w-xs truncate">{tx.note || "—"}</td>
                          <td className="py-2.5 font-mono text-[11.5px] text-right text-[#6B6455] dark:text-[#9AA3B0]">
                            {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 1: ONBOARD NEW OFFICER */}
      {/* --------------------------------------------------------------------- */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#F6F4EE] dark:bg-[#121C2B] border border-[#DAD4C4] dark:border-[#22304487] max-w-lg w-full p-6 rounded-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: RULE }}>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#A9762C]" />
                <h3 className="font-serif text-[18px] text-[#16233A] dark:text-[#EDE8DC]">Provision MoSPI Officer</h3>
              </div>
              <button onClick={() => setOnboardModalOpen(false)}>
                <X className="w-5 h-5 text-[#6B6455] hover:text-[#16233A]" />
              </button>
            </div>

            <form onSubmit={handleCreateOfficer} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#6B6455] dark:text-[#9AA3B0]">Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Dr. Ramesh Chander"
                  value={newOfficer.name}
                  onChange={(e) => setNewOfficer({ ...newOfficer, name: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border border-[#C9C2AE] dark:border-[#2E3D52] bg-white dark:bg-[#0E1521] text-[13px] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#6B6455] dark:text-[#9AA3B0]">Govt Email</label>
                  <input
                    required
                    type="email"
                    placeholder="ramesh.c@mospi.gov.in"
                    value={newOfficer.email}
                    onChange={(e) => setNewOfficer({ ...newOfficer, email: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-[#C9C2AE] dark:border-[#2E3D52] bg-white dark:bg-[#0E1521] text-[13px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#6B6455] dark:text-[#9AA3B0]">Initial Password</label>
                  <input
                    required
                    type="text"
                    value={newOfficer.password}
                    onChange={(e) => setNewOfficer({ ...newOfficer, password: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-[#C9C2AE] dark:border-[#2E3D52] bg-white dark:bg-[#0E1521] text-[13px] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#6B6455] dark:text-[#9AA3B0]">Designation</label>
                  <select
                    value={newOfficer.designation}
                    onChange={(e) => setNewOfficer({ ...newOfficer, designation: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-[#C9C2AE] dark:border-[#2E3D52] bg-white dark:bg-[#0E1521] text-[13px] outline-none"
                  >
                    <option value="Statistical Officer">Statistical Officer</option>
                    <option value="Senior Statistical Officer">Senior Statistical Officer</option>
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Deputy Director (Statistics)">Deputy Director (Statistics)</option>
                    <option value="Joint Director (DIID)">Joint Director (DIID)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#6B6455] dark:text-[#9AA3B0]">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="45"
                    value={newOfficer.experience_years}
                    onChange={(e) => setNewOfficer({ ...newOfficer, experience_years: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-[#C9C2AE] dark:border-[#2E3D52] bg-white dark:bg-[#0E1521] text-[13px] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6B6455] dark:text-[#9AA3B0]">Department / Division</label>
                <select
                  value={newOfficer.department}
                  onChange={(e) => setNewOfficer({ ...newOfficer, department: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border border-[#C9C2AE] dark:border-[#2E3D52] bg-white dark:bg-[#0E1521] text-[13px] outline-none"
                >
                  <option value="Price Statistics Division">Price Statistics Division</option>
                  <option value="National Accounts Division">National Accounts Division</option>
                  <option value="Labour and Employment Division">Labour and Employment Division</option>
                  <option value="Agricultural Statistics Division">Agricultural Statistics Division</option>
                  <option value="Social Statistics Division">Social Statistics Division</option>
                  <option value="Survey Coordination Division">Survey Coordination Division</option>
                  <option value="IT and Data Management Division">IT and Data Management Division</option>
                  <option value="Data Informatics and Innovation Division">Data Informatics and Innovation Division</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6B6455] dark:text-[#9AA3B0]">Qualifications (comma-separated)</label>
                <input
                  type="text"
                  placeholder="M.Sc. Statistics, B.Sc. Mathematics"
                  value={newOfficer.qualifications}
                  onChange={(e) => setNewOfficer({ ...newOfficer, qualifications: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border border-[#C9C2AE] dark:border-[#2E3D52] bg-white dark:bg-[#0E1521] text-[13px] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: RULE }}>
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="px-3.5 py-1.5 text-[13px] border border-[#C9C2AE] dark:border-[#2E3D52] text-[#6B6455] hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOfficer}
                  className="px-4 py-1.5 text-[13px] bg-[#16233A] text-white hover:bg-[#A9762C] transition-colors rounded-sm font-medium"
                >
                  {creatingOfficer ? "Provisioning…" : "Onboard Officer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* DRAWER / MODAL 2: OFFICER COMPETENCY DOSSIER */}
      {/* --------------------------------------------------------------------- */}
      {selectedOfficerId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#F6F4EE] dark:bg-[#121C2B] border border-[#DAD4C4] dark:border-[#22304487] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 rounded-sm shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: RULE }}>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#A9762C]" />
                <h3 className="font-serif text-[20px] text-[#16233A] dark:text-[#EDE8DC]">
                  Officer Competency Dossier
                </h3>
              </div>
              <button onClick={() => setSelectedOfficerId(null)}>
                <X className="w-5 h-5 text-[#6B6455] hover:text-[#16233A]" />
              </button>
            </div>

            {loadingDossier ? (
              <div className="py-12 text-center text-[13px] text-[#6B6455]">Loading officer dossier…</div>
            ) : officerDossier ? (
              <div className="space-y-6 text-[13px]">
                {/* Officer Header Card */}
                <div className="p-4 border bg-white dark:bg-[#0E1521] rounded-sm" style={{ borderColor: RULE }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-serif font-bold text-[18px] text-[#16233A] dark:text-[#EDE8DC]">
                        {officerDossier.name}
                      </h4>
                      <p className="text-[12.5px] text-[#6B6455] dark:text-[#9AA3B0] mt-0.5">
                        {officerDossier.designation} · {officerDossier.department}
                      </p>
                      <p className="text-[12px] font-mono text-[#6B6455] dark:text-[#9AA3B0] mt-1">
                        {officerDossier.email} · {officerDossier.experience_years} years service
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11.5px] text-[#6B6455] block">Reward Balance</span>
                      <span className="font-mono text-[20px] font-bold text-amber-600 block leading-tight">
                        {officerDossier.reward_points} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Domain Scores Breakdown */}
                <div>
                  <h5 className="font-serif font-semibold text-[15px] mb-3 text-[#16233A] dark:text-[#EDE8DC]">
                    Domain Proficiency Breakdown
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(DOMAIN_LABELS).map(([domain, label]) => {
                      const score = officerDossier.domain_averages?.[domain] ?? 0;
                      return (
                        <div key={domain} className="p-3 border bg-white dark:bg-[#0E1521] rounded-sm" style={{ borderColor: RULE }}>
                          <div className="flex items-center justify-between text-[12px] mb-1">
                            <span className="font-medium" style={{ color: DOMAIN_COLORS[domain] }}>{label}</span>
                            <span className="font-mono font-bold">{score}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, score)}%`, backgroundColor: DOMAIN_COLORS[domain] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assigned iGOT Courses */}
                <div>
                  <h5 className="font-serif font-semibold text-[15px] mb-2 text-[#16233A] dark:text-[#EDE8DC]">
                    Assigned iGOT Interventions ({officerDossier.recommendations?.length || 0})
                  </h5>
                  {officerDossier.recommendations?.length === 0 ? (
                    <p className="text-[12.5px] text-[#6B6455]">No course recommendations assigned yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {officerDossier.recommendations.map((rec: any) => (
                        <div key={rec.id} className="p-2.5 border bg-white dark:bg-[#0E1521] flex items-center justify-between rounded-sm" style={{ borderColor: RULE }}>
                          <div>
                            <p className="font-medium text-[12.5px]">{rec.title}</p>
                            <span className="text-[11px] text-[#6B6455]">{rec.duration_hours || 8}h · {rec.provider}</span>
                          </div>
                          <span className={clsx(
                            "text-[11px] font-mono px-2 py-0.5 rounded-sm capitalize border",
                            rec.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            rec.status === "enrolled" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {rec.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quiz History */}
                <div>
                  <h5 className="font-serif font-semibold text-[15px] mb-2 text-[#16233A] dark:text-[#EDE8DC]">
                    Recent Quiz Attempts ({officerDossier.attempts?.length || 0})
                  </h5>
                  {officerDossier.attempts?.length === 0 ? (
                    <p className="text-[12.5px] text-[#6B6455]">No quiz attempts logged for this officer.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {officerDossier.attempts.map((att: any) => (
                        <div key={att.id} className="p-2 border bg-white dark:bg-[#0E1521] flex items-center justify-between rounded-sm" style={{ borderColor: RULE }}>
                          <span className="font-medium text-[12.5px]">{att.quiz_title}</span>
                          <div className="flex items-center gap-3">
                            <ScoreCell score={att.score} />
                            <span className="text-[11px] font-mono text-[#6B6455]">
                              {att.attempted_at ? new Date(att.attempted_at).toLocaleDateString() : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Award Tool */}
                <div className="p-4 border bg-[#F6F4EE]/50 dark:bg-[#0B1220] rounded-sm space-y-3" style={{ borderColor: RULE }}>
                  <h5 className="font-serif font-semibold text-[14px] text-[#16233A] dark:text-[#EDE8DC] flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#A9762C]" /> Grant Official Commendation / Bonus Points
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#6B6455]">Points</label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        step="5"
                        value={awardPoints}
                        onChange={(e) => setAwardPoints(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 border border-[#C9C2AE] bg-white text-[13px] font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-[#6B6455]">Commendation Note / Justification</label>
                      <input
                        type="text"
                        value={awardNote}
                        onChange={(e) => setAwardNote(e.target.value)}
                        placeholder="e.g. Excellent survey design in Labour Bureau pilot"
                        className="w-full mt-1 px-2.5 py-1.5 border border-[#C9C2AE] bg-white text-[13px]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAwardReward}
                    disabled={awardingReward}
                    className="w-full py-2 bg-[#16233A] text-white hover:bg-[#A9762C] transition-colors font-medium rounded-sm text-[12.5px]"
                  >
                    {awardingReward ? "Granting Commendation…" : `Award ${awardPoints} Points to ${officerDossier.name}`}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 3: QUIZ PREVIEW */}
      {/* --------------------------------------------------------------------- */}
      {previewQuizId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#F6F4EE] dark:bg-[#121C2B] border border-[#DAD4C4] dark:border-[#22304487] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 rounded-sm shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: RULE }}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#A9762C]" />
                <h3 className="font-serif text-[18px] text-[#16233A] dark:text-[#EDE8DC]">
                  AI Quiz Question Audit
                </h3>
              </div>
              <button onClick={() => setPreviewQuizId(null)}>
                <X className="w-5 h-5 text-[#6B6455] hover:text-[#16233A]" />
              </button>
            </div>

            {loadingQuizPreview ? (
              <div className="py-12 text-center text-[13px] text-[#6B6455]">Loading quiz questions…</div>
            ) : previewQuizData ? (
              <div className="space-y-6 text-[13px]">
                <div>
                  <h4 className="font-serif font-bold text-[17px] text-[#16233A] dark:text-[#EDE8DC]">
                    {previewQuizData.title}
                  </h4>
                  <p className="text-[12px] text-[#6B6455] mt-1">
                    Source Document: {previewQuizData.material_filename || "Official Training Syllabus"} · {previewQuizData.questions?.length || 0} Questions
                  </p>
                </div>

                <div className="space-y-5">
                  {previewQuizData.questions?.map((q: any, idx: number) => (
                    <div key={q.id || idx} className="p-4 border bg-white dark:bg-[#0E1521] rounded-sm space-y-3" style={{ borderColor: RULE }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-[13.5px] text-[#16233A] dark:text-[#EDE8DC]">
                          <span className="font-mono text-[#A9762C] mr-1.5">Q{idx + 1}.</span> {q.question_text}
                        </p>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-black/5 text-[#6B6455] rounded-sm">
                          {q.difficulty || "medium"}
                        </span>
                      </div>

                      <div className="space-y-1.5 pl-4">
                        {q.options?.map((opt: any) => {
                          const isCorrect = opt.id === q.correct_option_id;
                          return (
                            <div
                              key={opt.id}
                              className={clsx(
                                "flex items-center gap-2 p-2 rounded-sm text-[12.5px]",
                                isCorrect
                                  ? "bg-emerald-50 text-emerald-900 font-medium border border-emerald-200"
                                  : "text-[#6B6455]"
                              )}
                            >
                              <span className="font-mono font-bold text-[11px] w-5">({opt.id})</span>
                              <span>{opt.text}</span>
                              {isCorrect && (
                                <span className="ml-auto text-[11px] font-mono text-emerald-700 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Correct Answer
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="p-2.5 bg-[#F6F4EE]/60 text-[12px] text-[#6B6455] border-l-2 border-[#A9762C] mt-2">
                          <span className="font-semibold text-[#16233A] block mb-0.5">Methodological Explanation:</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center space-y-4" style={{ background: PAPER }}>
          <div className="w-10 h-10 border-4 border-[#A9762C] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}