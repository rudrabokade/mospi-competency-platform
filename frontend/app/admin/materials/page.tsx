"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { generateQuiz, listMaterials, uploadMaterial } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  BookOpen,
  Sparkles,
  Search,
  FileCode,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  RefreshCw,
  Cpu,
} from "lucide-react";
import clsx from "clsx";

export default function AdminMaterialsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [materials, setMaterials] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    fetchMaterials();
  }, [user, loading]);

  const fetchMaterials = () => {
    setFetching(true);
    listMaterials()
      .then((r) => setMaterials(r.data || []))
      .catch((err) => console.error("Failed to load materials", err))
      .finally(() => setFetching(false));
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await uploadMaterial(fd);
      setMessage({
        type: "success",
        text: `Successfully uploaded "${file.name}". You can now generate an AI Quiz.`,
      });
      fetchMaterials();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Upload failed. Please check file format and try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleGenerate = async (materialId: string) => {
    setGenerating(materialId);
    setMessage(null);
    try {
      const r = await generateQuiz(materialId);
      setMessage({
        type: "success",
        text: `Groq AI successfully generated quiz: "${r.data.title}" with ${r.data.question_count} assessment questions!`,
      });
      fetchMaterials();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Quiz generation failed via LLM. Falling back to local synthesis.",
      });
    } finally {
      setGenerating(null);
    }
  };

  const filteredMaterials = materials.filter((m) =>
    (m.filename || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const processedCount = materials.filter((m) => m.processed).length;

  const getFormatBadge = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t === "pdf") return { label: "PDF", bg: "rgba(244,63,94,0.15)", text: "#fb7185", border: "rgba(244,63,94,0.3)" };
    if (t === "pptx") return { label: "PPTX", bg: "rgba(249,115,22,0.15)", text: "#fb923c", border: "rgba(249,115,22,0.3)" };
    if (t === "txt") return { label: "TXT", bg: "rgba(14,165,233,0.15)", text: "#38bdf8", border: "rgba(14,165,233,0.3)" };
    return { label: type?.toUpperCase() || "DOC", bg: "rgba(99,102,241,0.15)", text: "#818cf8", border: "rgba(99,102,241,0.3)" };
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent-500/10 text-accent-300 border border-accent-500/20 mb-3">
              <Cpu className="w-3.5 h-3.5 text-accent-400" />
              <span>MoSPI Knowledge RAG Pipeline • Powered by Groq</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary-400" />
              Training Materials & Quizzes
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 max-w-2xl">
              Upload statistical training manuals, survey frameworks, or course materials to automatically generate
              high-fidelity competency assessments via Groq LLaMA-3.3.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchMaterials}
              disabled={fetching}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-slate-300 hover:text-white flex items-center gap-2 transition-all"
            >
              <RefreshCw className={clsx("w-4 h-4", fetching && "animate-spin")} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-primary py-2.5 px-4 text-sm font-semibold flex items-center gap-2 shadow-glow"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={clsx(
              "flex items-start justify-between gap-3 p-4 rounded-xl text-sm border backdrop-blur-md animate-fade-in",
              message.type === "success"
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                : "bg-rose-950/40 text-rose-300 border-rose-500/30"
            )}
          >
            <div className="flex items-center gap-3">
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-xs text-slate-400 hover:text-white ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{materials.length}</div>
              <div className="text-xs text-slate-400">Total Uploaded Materials</div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{processedCount}</div>
              <div className="text-xs text-slate-400">Quizzes Generated & Active</div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-500/15 border border-accent-500/25 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-accent-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">Groq LLaMA-3.3</div>
              <div className="text-xs text-slate-400">Active RAG Inference Engine</div>
            </div>
          </div>
        </div>

        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            "relative rounded-2xl border-2 border-dashed p-8 transition-all duration-300 cursor-pointer text-center",
            dragOver
              ? "border-primary-400 bg-primary-500/10 shadow-[0_0_30px_rgba(255,153,51,0.2)]"
              : "border-white/15 bg-white/[0.02] hover:border-primary-500/50 hover:bg-white/[0.04]"
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.pptx,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center animate-pulse">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">Uploading Document...</p>
                <p className="text-xs text-slate-400 mt-1">Chunking text and preparing for RAG processing</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-500/20 to-accent-500/20 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="w-8 h-8 text-primary-400" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-white">
                  Drag and drop your training file here, or{" "}
                  <span className="text-primary-400 underline underline-offset-4 decoration-primary-500/50">browse</span>
                </p>
                <p className="text-xs text-slate-400">
                  Supports Official MoSPI Survey Manuals, PDFs, PPTXs, and TXT (Max size 50MB)
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-rose-500/15 text-rose-300 border border-rose-500/20">
                  PDF
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                  PPTX
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-sky-500/15 text-sky-300 border border-sky-500/20">
                  TXT
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Materials List Section */}
        <div className="glass-card rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent-400" />
                Uploaded Documents Repository
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage raw files and trigger LLM quiz synthesis per document
              </p>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-navy-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all"
              />
            </div>
          </div>

          {fetching ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              <p className="text-sm text-slate-400">Loading materials repository...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-xl border border-dashed border-white/10">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-300">
                {searchQuery ? "No matching materials found" : "No materials uploaded yet"}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? "Try searching with a different keyword."
                  : "Upload training documents above to start generating AI assessments."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredMaterials.map((m) => {
                const badge = getFormatBadge(m.file_type);
                const isGeneratingThis = generating === m.id;

                return (
                  <div
                    key={m.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] -mx-3 px-3 rounded-xl transition-all"
                  >
                    {/* Left File Meta */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs"
                        style={{
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate max-w-md">
                            {m.filename}
                          </p>
                          {m.processed && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(m.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span>{badge.label} Document</span>
                        </div>

                        {m.error && (
                          <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{m.error}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-center">
                      <button
                        onClick={() => handleGenerate(m.id)}
                        disabled={isGeneratingThis}
                        className={clsx(
                          "flex items-center gap-2 text-xs font-semibold py-2 px-3.5 rounded-xl transition-all duration-200",
                          m.processed
                            ? "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10"
                            : "btn-primary shadow-glow"
                        )}
                      >
                        {isGeneratingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-300" />
                            <span>Synthesizing MCQs...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-primary-300" />
                            <span>{m.processed ? "Regenerate Quiz" : "Generate AI Quiz"}</span>
                          </>
                        )}
                      </button>

                      {m.processed && (
                        <button
                          onClick={() => router.push("/dashboard/quizzes")}
                          className="flex items-center gap-1 text-xs font-medium text-accent-400 hover:text-accent-300 py-2 px-2.5 rounded-xl hover:bg-accent-500/10 transition-colors"
                        >
                          <span>View in Quizzes</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
