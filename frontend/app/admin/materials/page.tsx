"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  deleteMaterial,
  deleteQuiz,
  generateQuiz,
  getAdminQuizDetail,
  listAdminQuizzes,
  listMaterials,
  uploadMaterial,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, CheckCircle, AlertCircle, Plus, Loader2, BookOpen, Trash2, Eye, X, Check
} from "lucide-react";
import clsx from "clsx";

export default function AdminMaterialsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [materials, setMaterials] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Preview Modal
  const [previewQuizId, setPreviewQuizId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    loadData();
  }, [user, loading]);

  const loadData = () => {
    setFetching(true);
    Promise.all([
      listMaterials().catch(() => ({ data: [] })),
      listAdminQuizzes().catch(() => ({ data: [] })),
    ]).then(([mRes, qRes]) => {
      setMaterials(mRes.data || []);
      setQuizzes(qRes.data || []);
    }).finally(() => setFetching(false));
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await uploadMaterial(fd);
      setMessage({ type: "success", text: `Uploaded: ${file.name}` });
      loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Upload failed." });
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
      setMessage({ type: "success", text: `Quiz generated: ${r.data.title} (${r.data.question_count} questions)` });
      loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Quiz generation failed." });
    } finally {
      setGenerating(null);
    }
  };

  const handleDeleteMat = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material and its generated quizzes?")) return;
    try {
      await deleteMaterial(id);
      setMessage({ type: "success", text: "Material deleted successfully." });
      loadData();
    } catch {
      setMessage({ type: "error", text: "Failed to delete material." });
    }
  };

  const handleDeleteQz = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await deleteQuiz(id);
      setMessage({ type: "success", text: "Quiz deleted from bank." });
      loadData();
    } catch {
      setMessage({ type: "error", text: "Failed to delete quiz." });
    }
  };

  const handleOpenPreview = async (quizId: string) => {
    setPreviewQuizId(quizId);
    setLoadingPreview(true);
    try {
      const res = await getAdminQuizDetail(quizId);
      setPreviewData(res.data);
    } catch {
      setMessage({ type: "error", text: "Failed to load quiz details." });
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-500 dark:text-primary-400" /> Training Materials & AI Quiz Bank
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Upload official MoSPI documentation, manuals, and datasets to generate and manage adaptive competency quizzes
          </p>
        </div>

        {message && (
          <div className={clsx(
            "flex items-center gap-2 p-4 rounded-lg text-sm",
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
              : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20"
          )}>
            {message.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Upload dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            "card border-2 border-dashed cursor-pointer text-center transition-all",
            dragOver ? "border-primary-400 bg-primary-50 dark:bg-primary-500/15" : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500"
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.pptx,.txt,.mp4"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-primary-500 dark:text-primary-400 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Uploading document…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-500/15 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary-500 dark:text-primary-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-200">Drop a file or click to browse</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Supports PDF, PPTX, TXT, MP4 — max 50MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Materials list */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Uploaded Training Documents ({materials.length})
          </h2>
          {fetching ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500">Loading documents…</div>
          ) : materials.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">No materials uploaded yet.</div>
          ) : (
            <div className="space-y-3">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-800/50 last:border-0">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{m.filename}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {m.file_type.toUpperCase()} · {new Date(m.created_at).toLocaleDateString("en-IN")}
                    </p>
                    {m.error && <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{m.error}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerate(m.id)}
                      disabled={generating === m.id}
                      className="flex items-center gap-1.5 text-xs btn-primary py-1.5 px-3 disabled:opacity-60"
                    >
                      {generating === m.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                      ) : (
                        <><BookOpen className="w-3.5 h-3.5" /> Generate AI Quiz</>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteMat(m.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                      title="Delete Material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Quiz Bank */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-500" /> AI Quiz Bank ({quizzes.length})
            </h2>
            <span className="text-xs font-mono text-gray-500">Auto-calibrated questions</span>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
              No quizzes created yet. Generate one from the uploaded documents above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs">
                    <th className="text-left pb-2.5 font-medium">Quiz Title</th>
                    <th className="text-left pb-2.5 font-medium">Document</th>
                    <th className="text-center pb-2.5 font-medium">Questions</th>
                    <th className="text-center pb-2.5 font-medium">Attempts</th>
                    <th className="text-center pb-2.5 font-medium">Pass Rate</th>
                    <th className="text-center pb-2.5 font-medium">Avg Score</th>
                    <th className="text-right pb-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {quizzes.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                      <td className="py-3 font-medium text-gray-800 dark:text-gray-200 max-w-xs truncate">
                        {q.title}
                      </td>
                      <td className="py-3 text-gray-500 text-xs truncate max-w-[160px]">
                        {q.material_filename || "Syllabus"}
                      </td>
                      <td className="py-3 text-center font-mono text-xs">{q.question_count}</td>
                      <td className="py-3 text-center font-mono text-xs">{q.attempts_count}</td>
                      <td className="py-3 text-center">
                        <span className={clsx(
                          "font-mono text-xs font-semibold",
                          q.pass_rate >= 70 ? "text-emerald-600" : q.pass_rate >= 50 ? "text-amber-600" : "text-rose-600"
                        )}>
                          {q.pass_rate}%
                        </span>
                      </td>
                      <td className="py-3 text-center font-mono text-xs">{q.avg_score}%</td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenPreview(q.id)}
                          className="text-xs px-2.5 py-1 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        >
                          Preview Key
                        </button>
                        <button
                          onClick={() => handleDeleteQz(q.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
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

      {/* Quiz Preview Modal */}
      {previewQuizId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 rounded-xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-500" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                  AI Quiz Question Audit
                </h3>
              </div>
              <button onClick={() => setPreviewQuizId(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>

            {loadingPreview ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading questions…</div>
            ) : previewData ? (
              <div className="space-y-6 text-sm">
                <div>
                  <h4 className="font-semibold text-base text-gray-800 dark:text-gray-100">{previewData.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Document: {previewData.material_filename || "Official Manual"} · {previewData.questions?.length || 0} Questions
                  </p>
                </div>

                <div className="space-y-4">
                  {previewData.questions?.map((q: any, idx: number) => (
                    <div key={q.id || idx} className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          <span className="text-primary-600 mr-1.5 font-mono">Q{idx + 1}.</span> {q.question_text}
                        </p>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                          {q.difficulty || "medium"}
                        </span>
                      </div>

                      <div className="space-y-1 pl-4">
                        {q.options?.map((opt: any) => {
                          const isCorrect = opt.id === q.correct_option_id;
                          return (
                            <div
                              key={opt.id}
                              className={clsx(
                                "flex items-center gap-2 p-2 rounded text-xs",
                                isCorrect
                                  ? "bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                  : "text-gray-600 dark:text-gray-400"
                              )}
                            >
                              <span className="font-mono w-4 font-bold">({opt.id})</span>
                              <span>{opt.text}</span>
                              {isCorrect && (
                                <span className="ml-auto text-[11px] text-emerald-600 flex items-center gap-1 font-mono">
                                  <Check className="w-3.5 h-3.5" /> Correct
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-600 dark:text-gray-300 border-l-2 border-primary-500 mt-2">
                          <span className="font-semibold block mb-0.5 text-gray-800 dark:text-gray-200">Explanation:</span>
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