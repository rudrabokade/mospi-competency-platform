"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listQuizzes } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { BookOpen, Clock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuizzesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      listQuizzes()
        .then((r) => setQuizzes(r.data || []))
        .finally(() => setFetching(false));
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary-500" /> Available Quizzes
        </h1>

        {fetching ? (
          <div className="text-center py-10 text-gray-400">Loading quizzes...</div>
        ) : quizzes.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            No quizzes available yet. Admins can upload materials to generate quizzes.
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/quiz/${quiz.id}`}
                className="card flex items-center justify-between hover:border-primary-200 hover:shadow-md transition-all group"
              >
                <div>
                  <h2 className="font-semibold text-gray-800 group-hover:text-primary-700">{quiz.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Source: {quiz.material_filename || "Uploaded Material"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(quiz.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
