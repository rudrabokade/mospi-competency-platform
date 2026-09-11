"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listQuizzes } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  ChevronRight,
  Sparkles,
  Search,
  Award,
  FileText,
  Target,
  ArrowRight,
  Brain,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function QuizzesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetchQuizzes();
  }, [user, loading]);

  const fetchQuizzes = () => {
    setFetching(true);
    listQuizzes()
      .then((r) => setQuizzes(r.data || []))
      .catch((err) => console.error("Failed to load quizzes", err))
      .finally(() => setFetching(false));
  };

  const filteredQuizzes = quizzes.filter(
    (q) =>
      (q.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.material_filename || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">
        {/* Header Banner */}
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-10 border border-white/10 glass-card">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent-500/10 text-accent-300 border border-accent-500/20">
              <Brain className="w-3.5 h-3.5 text-accent-400" />
              <span>Adaptive Knowledge Tracing Pipeline</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Knowledge Assessments & Quizzes
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Complete rigorous AI-generated assessments synthesised directly from MoSPI official documentation,
              sampling methodologies, and survey guidelines to refine your competency profile in real-time.
            </p>

            <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary-400" />
                <span>Calibrates Your Competency Gaps</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Unlocks Tailored iGOT Courses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-accent-400" />
                <span>Instant Diagnostic Explanations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assessment topics or source materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900/80 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all"
            />
          </div>

          <div className="text-xs text-slate-400 font-medium self-center">
            {quizzes.length} {quizzes.length === 1 ? "Assessment" : "Assessments"} Available
          </div>
        </div>

        {/* Quizzes List / Grid */}
        {fetching ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Fetching available assessments...</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {searchQuery ? "No matching quizzes found" : "No assessments available yet"}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? "Try searching for another topic or clear the filter."
                : "Department administrators will upload training materials and generate new quizzes shortly."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/quiz/${quiz.id}`}
                className="glass-card p-6 rounded-2xl border border-white/10 hover:border-primary-500/40 hover:bg-white/[0.04] transition-all duration-300 group relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500/20 to-accent-500/20 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-primary-400" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-500/10 text-accent-300 border border-accent-500/20">
                      <Sparkles className="w-3 h-3 text-accent-400" /> Groq AI Verified
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-2">
                      {quiz.title}
                    </h3>

                    {quiz.material_filename && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                        <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">Source: {quiz.material_filename}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(quiz.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-400 group-hover:translate-x-1 transition-transform">
                    <span>Take Assessment</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
