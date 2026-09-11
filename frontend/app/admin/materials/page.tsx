"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { generateQuiz, listMaterials, uploadMaterial } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, AlertCircle, Plus, Loader2, BookOpen } from "lucide-react";
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

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    fetchMaterials();
  }, [user, loading]);

  const fetchMaterials = () => {
    listMaterials()
      .then((r) => setMaterials(r.data || []))
      .finally(() => setFetching(false));
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await uploadMaterial(fd);
      setMessage({ type: "success", text: `Uploaded: ${file.name}` });
      fetchMaterials();
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
      fetchMaterials();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Quiz generation failed." });
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-500" /> Training Materials
          </h1>
          <p className="text-gray-500 text-sm mt-1">Upload PDFs, PPTXs or text files to generate AI quizzes</p>
        </div>

        {message && (
          <div className={clsx(
            "flex items-center gap-2 p-4 rounded-lg text-sm",
            message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
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
            dragOver ? "border-primary-400 bg-primary-50" : "border-gray-200 hover:border-primary-300"
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
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-sm text-gray-500">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Drop a file or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">Supports PDF, PPTX, TXT — max 50MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Materials list */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Uploaded Materials</h2>
          {fetching ? (
            <div className="text-center py-6 text-gray-400">Loading...</div>
          ) : materials.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No materials uploaded yet.</div>
          ) : (
            <div className="space-y-3">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.filename}</p>
                    <p className="text-xs text-gray-400">
                      {m.file_type.toUpperCase()} · {new Date(m.created_at).toLocaleDateString("en-IN")}
                    </p>
                    {m.error && <p className="text-xs text-red-500 mt-0.5">{m.error}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {m.processed ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Processed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400">Pending</span>
                    )}
                    <button
                      onClick={() => handleGenerate(m.id)}
                      disabled={generating === m.id}
                      className="flex items-center gap-1.5 text-xs btn-primary py-1.5 px-3 disabled:opacity-60"
                    >
                      {generating === m.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                      ) : (
                        <><BookOpen className="w-3.5 h-3.5" /> Generate Quiz</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
