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
      <div className="examPage examPage--center">
        <div className="examSpinner" />
        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=IBM+Plex+Sans:wght@400;500;600&display=swap");
        `}</style>
        <style jsx>{`
          .examPage {
            --paper: #eaedec;
            --ink: #17233e;
            --rule: #c7ccc8;
            min-height: 100vh;
            background: var(--paper);
          }
          :global(.dark) .examPage {
            --paper: #12161c;
            --ink: #e7e9e4;
            --rule: #2b323b;
          }
          .examPage--center {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .examSpinner {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 3px solid var(--rule);
            border-top-color: var(--ink);
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="examPage">
        <Navbar />
        <div className="examEmpty">Quiz not found.</div>
        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=IBM+Plex+Sans:wght@400;500;600&display=swap");
        `}</style>
        <style jsx>{`
          .examPage {
            --paper: #eaedec;
            --ink-soft: #5b6472;
            min-height: 100vh;
            background: var(--paper);
          }
          :global(.dark) .examPage {
            --paper: #12161c;
            --ink-soft: #9aa3ac;
          }
          .examEmpty {
            max-width: 640px;
            margin: 0 auto;
            padding: 96px 24px;
            text-align: center;
            font-family: "Source Serif 4", Georgia, serif;
            font-size: 18px;
            color: var(--ink-soft);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="examPage">
      <Navbar />
      <div className="examSheet">
        {/* Header */}
        <div className="examHeader">
          <button onClick={() => router.push("/dashboard/quizzes")} className="examBack" aria-label="Back to quizzes">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="examTitleBlock">
            <h1 className="examTitle">{quiz.title}</h1>
            <p className="examMeta">{quiz.questions.length} questions</p>
          </div>
        </div>

        {/* Result stamp */}
        {submitted && result && (
          <div
            className={clsx(
              "examStamp",
              result.score >= 70 ? "examStamp--good" : result.score >= 40 ? "examStamp--mid" : "examStamp--low"
            )}
          >
            <div className="examStampCircle">
              <Award className="w-5 h-5 examStampIcon" />
              <div className="examStampScore">{Math.round(result.score)}%</div>
            </div>
            <div className="examStampText">
              <p className="examStampLine">
                {result.correct} of {result.total} correct
              </p>
              <p className="examStampSub">Your competency scores have been updated.</p>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="examList">
          {quiz.questions.map((q, i) => {
            const fb = getFeedback(q.id);
            const chosen = answers[q.id];
            return (
              <div key={q.id} className="examBlock">
                <div className="examBlockHead">
                  <span className="examNumber">{i + 1}</span>
                  <div className="examBlockHeadText">
                    <p className="examQuestion">{q.question_text}</p>
                    <span
                      className={clsx(
                        "examDifficulty",
                        q.difficulty === "easy" && "examDifficulty--easy",
                        q.difficulty === "hard" && "examDifficulty--hard",
                        q.difficulty === "medium" && "examDifficulty--medium"
                      )}
                    >
                      {q.difficulty}
                    </span>
                  </div>
                </div>

                <div className="examOptions">
                  {q.options.map((opt) => {
                    const isChosen = chosen === opt.id;
                    const isCorrect = submitted && fb?.correct === opt.id;
                    const isWrong = submitted && isChosen && !fb?.is_correct;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => !submitted && setAnswers({ ...answers, [q.id]: opt.id })}
                        disabled={submitted}
                        className={clsx(
                          "examOption",
                          !submitted && isChosen && "examOption--selected",
                          submitted && isCorrect && "examOption--correct",
                          submitted && isWrong && "examOption--wrong",
                          submitted && !isCorrect && !isWrong && "examOption--faded"
                        )}
                      >
                        <span className="examOptionMark">{opt.id}</span>
                        <span className="examOptionText">{opt.text}</span>
                        {submitted && isCorrect && <CheckCircle className="w-4 h-4 examOptionIcon examOptionIcon--correct" />}
                        {submitted && isWrong && <XCircle className="w-4 h-4 examOptionIcon examOptionIcon--wrong" />}
                      </button>
                    );
                  })}
                </div>

                {submitted && fb && (
                  <div className={clsx("examFeedback", fb.is_correct ? "examFeedback--correct" : "examFeedback--wrong")}>
                    <span className="examFeedbackLabel">{fb.is_correct ? "Correct." : "Incorrect."}</span> {fb.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!submitted && (
          <button onClick={handleSubmit} disabled={submitting} className="examSubmit">
            {submitting ? "Submitting…" : "Submit quiz"}
          </button>
        )}

        {submitted && (
          <div className="examActions">
            <button onClick={() => router.push("/dashboard/quizzes")} className="examBtn examBtn--ghost">
              Back to quizzes
            </button>
            <button onClick={() => router.push("/dashboard")} className="examBtn examBtn--solid">
              View my dashboard
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=IBM+Plex+Sans:wght@400;500;600&display=swap");
      `}</style>

      <style jsx>{`
        .examPage {
          --paper: #eaedec;
          --paper-card: #f6f7f5;
          --ink: #17233e;
          --ink-soft: #5b6472;
          --accent: #2b4c86;
          --accent-soft: #e4e9f3;
          --correct: #2f6b4a;
          --correct-soft: #e3efe7;
          --incorrect: #9e3b2e;
          --incorrect-soft: #f5e6e2;
          --rule: #c7ccc8;
          min-height: 100vh;
          background: var(--paper);
        }
        :global(.dark) .examPage {
          --paper: #12161c;
          --paper-card: #191f27;
          --ink: #e7e9e4;
          --ink-soft: #9aa3ac;
          --accent: #7fa0dc;
          --accent-soft: rgba(127, 160, 220, 0.14);
          --correct: #6fbe93;
          --correct-soft: rgba(111, 190, 147, 0.12);
          --incorrect: #e08876;
          --incorrect-soft: rgba(224, 136, 118, 0.12);
          --rule: #2b323b;
        }

        .examSheet {
          max-width: 700px;
          margin: 0 auto;
          padding: 40px 24px 64px;
          font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
        }

        .examHeader {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding-bottom: 20px;
          border-bottom: 2px solid var(--ink);
          margin-bottom: 28px;
        }
        .examBack {
          margin-top: 2px;
          color: var(--ink-soft);
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
        }
        .examBack:hover {
          color: var(--ink);
        }
        .examTitleBlock {
          flex: 1;
        }
        .examTitle {
          font-family: "Source Serif 4", Georgia, serif;
          font-weight: 600;
          font-size: 26px;
          line-height: 1.25;
          color: var(--ink);
          margin: 0 0 4px;
        }
        .examMeta {
          font-size: 13px;
          color: var(--ink-soft);
          margin: 0;
        }

        /* Result stamp */
        .examStamp {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 18px 20px;
          border-radius: 4px;
          background: var(--paper-card);
          border: 1px solid var(--rule);
          margin-bottom: 32px;
        }
        .examStampCircle {
          flex-shrink: 0;
          width: 74px;
          height: 74px;
          border-radius: 50%;
          border: 2.5px solid var(--tone, var(--ink));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transform: rotate(-4deg);
          color: var(--tone, var(--ink));
        }
        .examStampIcon {
          margin-bottom: 1px;
        }
        .examStampScore {
          font-family: "Source Serif 4", Georgia, serif;
          font-weight: 600;
          font-size: 17px;
          line-height: 1;
        }
        .examStamp--good .examStampCircle {
          --tone: var(--correct);
        }
        .examStamp--mid .examStampCircle {
          --tone: var(--accent);
        }
        .examStamp--low .examStampCircle {
          --tone: var(--incorrect);
        }
        .examStampText {
          flex: 1;
        }
        .examStampLine {
          font-size: 15px;
          font-weight: 500;
          color: var(--ink);
          margin: 0 0 2px;
        }
        .examStampSub {
          font-size: 13px;
          color: var(--ink-soft);
          margin: 0;
        }

        .examList {
          display: flex;
          flex-direction: column;
        }

        .examBlock {
          padding: 24px 0;
          border-bottom: 1px solid var(--rule);
        }
        .examBlock:first-child {
          padding-top: 0;
        }

        .examBlockHead {
          display: flex;
          gap: 14px;
          margin-bottom: 14px;
        }
        .examNumber {
          flex-shrink: 0;
          width: 30px;
          font-family: "Source Serif 4", Georgia, serif;
          font-size: 20px;
          color: var(--ink-soft);
          line-height: 1.4;
        }
        .examBlockHeadText {
          flex: 1;
        }
        .examQuestion {
          font-family: "Source Serif 4", Georgia, serif;
          font-size: 17px;
          line-height: 1.5;
          color: var(--ink);
          margin: 0 0 8px;
        }
        .examDifficulty {
          display: inline-block;
          font-size: 12px;
          padding: 2px 9px;
          border-radius: 999px;
          border: 1px solid var(--rule);
          color: var(--ink-soft);
        }
        .examDifficulty--easy {
          color: var(--correct);
          border-color: var(--correct-soft);
          background: var(--correct-soft);
        }
        .examDifficulty--hard {
          color: var(--incorrect);
          border-color: var(--incorrect-soft);
          background: var(--incorrect-soft);
        }
        .examDifficulty--medium {
          color: var(--accent);
          border-color: var(--accent-soft);
          background: var(--accent-soft);
        }

        .examOptions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-left: 44px;
        }
        .examOption {
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          padding: 9px 12px;
          border-radius: 5px;
          border: 1px solid var(--rule);
          background: transparent;
          font-size: 14.5px;
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .examOption:hover:not(:disabled) {
          border-color: var(--ink-soft);
        }
        .examOption:disabled {
          cursor: default;
        }
        .examOptionMark {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1.5px solid var(--rule);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--ink-soft);
        }
        .examOptionText {
          flex: 1;
        }
        .examOption--selected {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .examOption--selected .examOptionMark {
          border-color: var(--accent);
          background: var(--accent);
          color: #fff;
        }
        .examOption--correct {
          border-color: var(--correct);
          background: var(--correct-soft);
        }
        .examOption--correct .examOptionMark {
          border-color: var(--correct);
          background: var(--correct);
          color: #fff;
        }
        .examOption--wrong {
          border-color: var(--incorrect);
          background: var(--incorrect-soft);
        }
        .examOption--wrong .examOptionMark {
          border-color: var(--incorrect);
          background: var(--incorrect);
          color: #fff;
        }
        .examOption--faded {
          opacity: 0.5;
        }
        .examOptionIcon {
          margin-left: auto;
        }
        .examOptionIcon--correct {
          color: var(--correct);
        }
        .examOptionIcon--wrong {
          color: var(--incorrect);
        }

        .examFeedback {
          margin-top: 12px;
          margin-left: 44px;
          padding: 10px 12px;
          border-radius: 5px;
          font-size: 13px;
          line-height: 1.5;
        }
        .examFeedback--correct {
          background: var(--correct-soft);
          color: var(--correct);
        }
        .examFeedback--wrong {
          background: var(--incorrect-soft);
          color: var(--incorrect);
        }
        .examFeedbackLabel {
          font-weight: 600;
        }

        .examSubmit {
          width: 100%;
          margin-top: 32px;
          padding: 13px;
          border-radius: 5px;
          border: none;
          background: var(--ink);
          color: var(--paper);
          font-family: "IBM Plex Sans", sans-serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
        }
        .examSubmit:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .examSubmit:hover:not(:disabled) {
          background: var(--accent);
        }

        .examActions {
          display: flex;
          gap: 12px;
          margin-top: 32px;
        }
        .examBtn {
          flex: 1;
          padding: 11px;
          border-radius: 5px;
          font-size: 14.5px;
          font-weight: 500;
          cursor: pointer;
        }
        .examBtn--ghost {
          background: transparent;
          border: 1px solid var(--rule);
          color: var(--ink);
        }
        .examBtn--ghost:hover {
          border-color: var(--ink-soft);
        }
        .examBtn--solid {
          background: var(--ink);
          border: 1px solid var(--ink);
          color: var(--paper);
        }
        .examBtn--solid:hover {
          background: var(--accent);
          border-color: var(--accent);
        }

        @media (max-width: 480px) {
          .examOptions,
          .examFeedback {
            padding-left: 0;
            margin-left: 0;
          }
          .examBlockHead {
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}