"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuiz, attemptQuiz } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import clsx from "clsx";
import { CheckCircle, XCircle, ChevronLeft, Award } from "lucide-react";

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
  const [result, setResult] = useState<{ score: number; correct: number; total: number; feedback: FeedbackItem[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (id) {
      getQuiz(id as string)
        .then((r) => setQuiz(r.data))
        .finally(() => setFetching(false));
    }
  }, [id, user, loading]);

  const handleSubmit = async () => {
    if (Object.keys(answers).length < (quiz?.questions.length ?? 0)) {
      alert("Please answer all questions before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await attemptQuiz(id as string, answers);
      setResult(r.data);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const getFeedback = (qId: string) => result?.feedback.find((f) => f.question_id === qId);

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">Quiz not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/quizzes")} className="p-2 text-gray-400 hover:text-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{quiz.title}</h1>
            <p className="text-sm text-gray-500">{quiz.questions.length} questions</p>
          </div>
        </div>

        {/* Result card */}
        {submitted && result && (
          <div className={clsx(
            "card text-center",
            result.score >= 70 ? "border-green-200 bg-green-50" : result.score >= 40 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"
          )}>
            <Award className={clsx("w-10 h-10 mx-auto mb-3", result.score >= 70 ? "text-green-500" : result.score >= 40 ? "text-yellow-500" : "text-red-500")} />
            <div className="text-4xl font-bold mb-1">{Math.round(result.score)}%</div>
            <p className="text-gray-600 text-sm">{result.correct} of {result.total} correct</p>
            <p className="text-xs text-gray-500 mt-2">Your competency scores have been updated.</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          {quiz.questions.map((q, i) => {
            const fb = getFeedback(q.id);
            const chosen = answers[q.id];
            return (
              <div key={q.id} className={clsx(
                "card space-y-3",
                submitted && fb?.is_correct && "border-green-200",
                submitted && !fb?.is_correct && "border-red-200",
              )}>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-gray-400 mt-0.5">Q{i + 1}</span>
                  <p className="text-sm font-medium text-gray-800 flex-1">{q.question_text}</p>
                  <span className={clsx(
                    "badge text-xs flex-shrink-0",
                    q.difficulty === "easy" ? "bg-green-100 text-green-700" : q.difficulty === "hard" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  )}>
                    {q.difficulty}
                  </span>
                </div>

                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const isChosen = chosen === opt.id;
                    const isCorrect = submitted && fb?.correct === opt.id;
                    const isWrong = submitted && isChosen && !fb?.is_correct;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => !submitted && setAnswers({ ...answers, [q.id]: opt.id })}
                        className={clsx(
                          "w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all",
                          !submitted && isChosen && "border-primary-500 bg-primary-50 text-primary-800",
                          !submitted && !isChosen && "border-gray-200 hover:border-gray-300 text-gray-700",
                          submitted && isCorrect && "border-green-500 bg-green-50 text-green-800 font-medium",
                          submitted && isWrong && "border-red-400 bg-red-50 text-red-700",
                          submitted && !isCorrect && !isWrong && "border-gray-100 text-gray-400",
                        )}
                        disabled={submitted}
                      >
                        <span className="font-semibold mr-2">{opt.id}.</span> {opt.text}
                        {submitted && isCorrect && <CheckCircle className="inline w-4 h-4 ml-2 text-green-500" />}
                        {submitted && isWrong && <XCircle className="inline w-4 h-4 ml-2 text-red-500" />}
                      </button>
                    );
                  })}
                </div>

                {submitted && fb && (
                  <div className={clsx(
                    "text-xs rounded-lg p-3",
                    fb.is_correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>
                    <span className="font-semibold">{fb.is_correct ? "Correct!" : "Incorrect."}</span>{" "}
                    {fb.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full py-3 text-base disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
        )}

        {submitted && (
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard/quizzes")} className="btn-secondary flex-1 py-2.5">
              Back to Quizzes
            </button>
            <button onClick={() => router.push("/dashboard")} className="btn-primary flex-1 py-2.5">
              View My Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
