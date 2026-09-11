"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuiz, attemptQuiz } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import clsx from "clsx";
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Award,
  BookOpen,
  Sparkles,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Check,
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  options: { id: string; text: string }[];
  difficulty: string;
}

interface FeedbackItem {
  question_id: string;
  chosen: string;
  correct: string;
  is_correct: boolean;
  explanation: string;
}

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [quiz, setQuiz] = useState<{ id: string; title: string; questions: Question[] } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    correct: number;
    total: number;
    feedback: FeedbackItem[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (id) {
      getQuiz(id as string)
        .then((r) => setQuiz(r.data))
        .catch((err) => console.error("Error fetching quiz", err))
        .finally(() => setFetching(false));
    }
  }, [id, user, loading]);

  const handleSubmit = async () => {
    if (!quiz) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.questions.length) {
      alert(`Please complete all questions (${answeredCount}/${quiz.questions.length} answered).`);
      return;
    }
    setSubmitting(true);
    try {
      const r = await attemptQuiz(id as string, answers);
      setResult(r.data);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Submission failed", err);
      alert("Failed to submit quiz attempt. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getFeedback = (qId: string) => result?.feedback.find((f) => f.question_id === qId);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz?.questions.length || 0;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (fetching) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading assessment questions...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Assessment Not Found</h2>
          <p className="text-sm text-slate-400 mb-6">The requested quiz could not be located or has been archived.</p>
          <button onClick={() => router.push("/dashboard/quizzes")} className="btn-primary py-2 px-5 text-sm">
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[30rem] h-[30rem] bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">
        {/* Top Breadcrumb & Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/quizzes")}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-400">
                  Assessment
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">{totalQuestions} Questions</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                {quiz.title}
              </h1>
            </div>
          </div>

          {!submitted && (
            <div className="flex flex-col sm:items-end gap-1.5">
              <div className="text-xs font-medium text-slate-400">
                Answered <span className="text-white font-bold">{answeredCount}</span> of {totalQuestions}
              </div>
              <div className="w-36 bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Result Evaluation Banner */}
        {submitted && result && (
          <div
            className={clsx(
              "glass-card p-8 rounded-3xl border text-center relative overflow-hidden shadow-2xl animate-fade-in",
              result.score >= 70
                ? "border-emerald-500/40 bg-emerald-950/20 shadow-emerald-500/10"
                : result.score >= 40
                ? "border-amber-500/40 bg-amber-950/20 shadow-amber-500/10"
                : "border-rose-500/40 bg-rose-950/20 shadow-rose-500/10"
            )}
          >
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-white/10 backdrop-blur-md">
              <Award
                className={clsx(
                  "w-9 h-9",
                  result.score >= 70
                    ? "text-emerald-400"
                    : result.score >= 40
                    ? "text-amber-400"
                    : "text-rose-400"
                )}
              />
            </div>

            <div className="text-5xl sm:text-6xl font-black tracking-tight text-white mb-2">
              {Math.round(result.score)}%
            </div>

            <div className="text-base font-semibold text-slate-200">
              {result.correct} of {result.total} Questions Answered Correctly
            </div>

            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
              Knowledge Tracing has calibrated your skill graph with this attempt. Tailored recommendations
              have been refreshed on your dashboard.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button
                onClick={() => router.push("/dashboard")}
                className="btn-primary py-2.5 px-6 text-sm font-semibold flex items-center gap-2"
              >
                <span>View My Dashboard & Gaps</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push("/dashboard/quizzes")}
                className="btn-secondary py-2.5 px-5 text-sm font-medium"
              >
                More Assessments
              </button>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-6">
          {quiz.questions.map((q, idx) => {
            const fb = getFeedback(q.id);
            const chosen = answers[q.id];

            return (
              <div
                key={q.id}
                className={clsx(
                  "glass-card p-6 sm:p-7 rounded-2xl border transition-all duration-200",
                  submitted && fb?.is_correct && "border-emerald-500/30 bg-emerald-950/10",
                  submitted && !fb?.is_correct && "border-rose-500/30 bg-rose-950/10",
                  !submitted && "border-white/10 hover:border-white/20"
                )}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 text-xs font-bold text-primary-400 flex items-center justify-center flex-shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Question
                    </span>
                  </div>

                  <span
                    className={clsx(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize",
                      q.difficulty === "easy"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                        : q.difficulty === "hard"
                        ? "bg-rose-500/15 text-rose-400 border-rose-500/25"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                    )}
                  >
                    {q.difficulty}
                  </span>
                </div>

                <p className="text-base sm:text-lg font-semibold text-white leading-relaxed mb-6">
                  {q.question_text}
                </p>

                {/* Option Buttons */}
                <div className="space-y-3">
                  {q.options.map((opt) => {
                    const isChosen = chosen === opt.id;
                    const isCorrect = submitted && fb?.correct === opt.id;
                    const isWrongChosen = submitted && isChosen && !fb?.is_correct;

                    return (
                      <button
                        key={opt.id}
                        onClick={() => !submitted && setAnswers({ ...answers, [q.id]: opt.id })}
                        disabled={submitted}
                        className={clsx(
                          "w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 flex items-center justify-between group",
                          // Normal interactive state before submit
                          !submitted && isChosen && "border-primary-500 bg-primary-500/15 text-white shadow-glow-sm",
                          !submitted && !isChosen && "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05] hover:border-white/20",
                          // Post-submit states
                          submitted && isCorrect && "border-emerald-500 bg-emerald-500/20 text-emerald-200 font-semibold",
                          submitted && isWrongChosen && "border-rose-500 bg-rose-500/20 text-rose-200 font-semibold",
                          submitted && !isCorrect && !isWrongChosen && "border-white/5 bg-white/[0.01] text-slate-500 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <span
                            className={clsx(
                              "w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors",
                              !submitted && isChosen
                                ? "bg-primary-500 text-white"
                                : submitted && isCorrect
                                ? "bg-emerald-500 text-white"
                                : submitted && isWrongChosen
                                ? "bg-rose-500 text-white"
                                : "bg-white/10 text-slate-400 group-hover:text-white"
                            )}
                          >
                            {opt.id}
                          </span>
                          <span className="leading-snug">{opt.text}</span>
                        </div>

                        <div className="flex-shrink-0">
                          {submitted && isCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          )}
                          {submitted && isWrongChosen && (
                            <XCircle className="w-5 h-5 text-rose-400" />
                          )}
                          {!submitted && isChosen && (
                            <div className="w-2 h-2 rounded-full bg-primary-400 shadow-glow" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Drawer */}
                {submitted && fb && (
                  <div
                    className={clsx(
                      "mt-5 p-4 rounded-xl border text-xs sm:text-sm leading-relaxed animate-fade-in",
                      fb.is_correct
                        ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                        : "bg-rose-950/30 border-rose-500/30 text-rose-200"
                    )}
                  >
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-white">
                      {fb.is_correct ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>{fb.is_correct ? "Correct Analysis" : "Diagnostic Explanation"}</span>
                    </div>
                    <p className="text-slate-300">{fb.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Actions Bottom Bar */}
        {!submitted ? (
          <div className="sticky bottom-6 z-20 glass-card p-4 rounded-2xl border border-white/15 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span>
                {answeredCount === totalQuestions
                  ? "All questions answered. Ready to submit!"
                  : `Please answer remaining questions (${answeredCount}/${totalQuestions})`}
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount < totalQuestions}
              className={clsx(
                "w-full sm:w-auto py-3 px-8 rounded-xl font-bold text-sm transition-all duration-200 shadow-glow flex items-center justify-center gap-2",
                answeredCount === totalQuestions
                  ? "btn-primary"
                  : "bg-white/10 text-slate-400 cursor-not-allowed border border-white/10"
              )}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating Assessment...</span>
                </>
              ) : (
                <>
                  <span>Submit Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => router.push("/dashboard/quizzes")}
              className="btn-secondary py-3 px-6 text-sm font-semibold flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Assessment List</span>
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-primary py-3 px-6 text-sm font-semibold flex items-center gap-2"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
