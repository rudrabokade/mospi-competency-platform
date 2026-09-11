"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Shield, TrendingUp, BookOpen, Brain, Lock, Mail, ArrowRight, Landmark } from "lucide-react";

const CAPABILITIES = [
  { icon: TrendingUp, title: "Competency Gap Analysis", desc: "AI-powered skill profiling across 4 domains" },
  { icon: BookOpen, title: "Personalized Recommendations", desc: "Semantic course matching via iGOT catalog" },
  { icon: Brain, title: "AI-Generated Quizzes", desc: "LLM-based MCQ generation from training materials" },
  { icon: Shield, title: "Admin Analytics", desc: "Org-wide gap heatmap and predictive insights" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Render a blank shell on the server so Chrome extensions injecting SVGs
  // into form fields never cause a hydration mismatch.
  if (!mounted) return <div style={{ minHeight: "100vh", background: "#101B33" }} />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: "learner" | "admin") => {
    if (role === "admin") {
      setEmail("admin@mospi.gov.in");
      setPassword("Admin@123");
    } else {
      setEmail("priya.sharma@mospi.gov.in");
      setPassword("Password@123");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-10"
      style={{ background: "#101B33" }}
      suppressHydrationWarning
    >
      <div
        className="font-sans-doc w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] rise-in"
        style={{
          border: "1px solid rgba(169,130,74,0.35)",
          background: "#0C1830",
        }}
        suppressHydrationWarning
      >
        {/* Left — Masthead */}
        <div
          className="p-9 md:p-14 flex flex-col justify-between"
          style={{ borderRight: "1px solid rgba(169,130,74,0.25)" }}
        >
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-12 h-12 flex items-center justify-center rounded-full flex-shrink-0"
                style={{ border: "1px solid #A9824B", color: "#C6661E" }}
                suppressHydrationWarning
              >
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs tracking-wide" style={{ color: "#8C93A6" }}>
                  Government of India
                </p>
                <p className="text-sm font-medium text-white">
                  Ministry of Statistics & Programme Implementation
                </p>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(169,130,74,0.35)", paddingTop: "1.75rem" }}>
              <h1 className="font-serif-doc text-white leading-[1.1]" style={{ fontSize: "2.5rem" }}>
                AI Competency Platform
              </h1>
              <p className="mt-5 text-base leading-relaxed max-w-md" style={{ color: "#B7BECF" }}>
                Empowering MoSPI officers with AI-driven skill gap analysis, personalized learning
                pathways, and continuous assessment — integrated with iGOT Karmayogi.
              </p>
            </div>

            <div
              className="mt-10 space-y-0"
              style={{ borderTop: "1px solid rgba(169,130,74,0.2)" }}
              suppressHydrationWarning
            >
              {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 py-4"
                  style={{ borderBottom: "1px solid rgba(169,130,74,0.2)" }}
                  suppressHydrationWarning
                >
                  <span
                    className="w-4 h-4 mt-1 flex-shrink-0 inline-flex"
                    style={{ color: "#C6661E" }}
                    suppressHydrationWarning
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="font-medium text-white text-sm">{title}</p>
                    <p className="text-sm mt-0.5" style={{ color: "#8C93A6" }}>
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs mt-10" style={{ color: "#5E6577" }}>
            SIH 2024 — Problem Statement SIH 26101
          </p>
        </div>

        {/* Right — Login Form */}
        <div className="p-9 md:p-14 flex flex-col justify-center" style={{ background: "#F6F4EE" }} suppressHydrationWarning>
          <p className="font-serif-doc italic" style={{ color: "#C6661E", fontSize: "0.95rem" }}>
            Officer Sign In
          </p>
          <h2 className="font-serif-doc text-2xl mt-1" style={{ color: "#101B33" }}>
            Welcome back
          </h2>
          <p className="text-sm mt-2 mb-8" style={{ color: "#6B7280" }}>
            Sign in to your MoSPI learning dashboard
          </p>

          {error && (
            <div
              className="mb-6 px-4 py-3 text-sm"
              style={{
                background: "rgba(196,58,58,0.08)",
                borderLeft: "3px solid #C43A3A",
                color: "#9C2E2E",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on" suppressHydrationWarning>
            <div suppressHydrationWarning>
              <label
                className="flex items-center gap-2 text-xs font-medium mb-2"
                style={{ color: "#6B7280" }}
                suppressHydrationWarning
              >
                <span className="w-3.5 h-3.5 inline-flex" suppressHydrationWarning>
                  <Mail className="w-3.5 h-3.5" />
                </span>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@mospi.gov.in"
                required
                className="w-full bg-transparent outline-none text-sm pb-2 transition-colors"
                style={{
                  borderBottom: "1px solid #C9C2B2",
                  color: "#101B33",
                }}
                onFocus={(e) => (e.currentTarget.style.borderBottom = "1px solid #C6661E")}
                onBlur={(e) => (e.currentTarget.style.borderBottom = "1px solid #C9C2B2")}
              />
            </div>
            <div suppressHydrationWarning>
              <label
                className="flex items-center gap-2 text-xs font-medium mb-2"
                style={{ color: "#6B7280" }}
                suppressHydrationWarning
              >
                <span className="w-3.5 h-3.5 inline-flex" suppressHydrationWarning>
                  <Lock className="w-3.5 h-3.5" />
                </span>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-transparent outline-none text-sm pb-2 transition-colors"
                style={{
                  borderBottom: "1px solid #C9C2B2",
                  color: "#101B33",
                }}
                onFocus={(e) => (e.currentTarget.style.borderBottom = "1px solid #C6661E")}
                onBlur={(e) => (e.currentTarget.style.borderBottom = "1px solid #C9C2B2")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ background: "#101B33", color: "#F6F4EE" }}
            >
              {loading ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full animate-spin"
                    style={{ border: "2px solid rgba(246,244,238,0.3)", borderTopColor: "#F6F4EE" }}
                  />
                  Signing in...
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <span className="w-4 h-4 inline-flex" suppressHydrationWarning>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6" style={{ borderTop: "1px solid #DDD7C8" }}>
            <p className="text-xs mb-4" style={{ color: "#6B7280" }}>
              Demo accounts
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => fillDemo("learner")}
                className="text-left py-3 px-4 transition-colors"
                style={{ borderLeft: "2px solid #2F6F52", background: "rgba(47,111,82,0.06)" }}
              >
                <span className="block text-sm font-medium" style={{ color: "#2F6F52" }}>
                  Officer Demo
                </span>
                <span className="text-xs" style={{ color: "#6B7280" }}>
                  Learner role
                </span>
              </button>
              <button
                onClick={() => fillDemo("admin")}
                className="text-left py-3 px-4 transition-colors"
                style={{ borderLeft: "2px solid #C6661E", background: "rgba(198,102,30,0.06)" }}
              >
                <span className="block text-sm font-medium" style={{ color: "#C6661E" }}>
                  Admin Demo
                </span>
                <span className="text-xs" style={{ color: "#6B7280" }}>
                  Admin role
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}