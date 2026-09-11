"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Shield, Brain, TrendingUp, BookOpen } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left — Branding */}
        <div className="text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-saffron rounded-xl flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Competency Platform</h1>
              <p className="text-primary-200 text-sm">Ministry of Statistics & Programme Implementation</p>
            </div>
          </div>

          <p className="text-primary-100 text-lg leading-relaxed">
            Empowering MoSPI officers with AI-driven skill gap analysis, personalized learning pathways,
            and continuous assessment — integrated with iGOT Karmayogi.
          </p>

          <div className="space-y-4">
            {[
              { icon: TrendingUp, title: "Competency Gap Analysis", desc: "AI-powered skill profiling across 4 domains" },
              { icon: BookOpen, title: "Personalized Recommendations", desc: "Semantic course matching via iGOT catalog" },
              { icon: Brain, title: "AI-Generated Quizzes", desc: "LLM-based MCQ generation from training materials" },
              { icon: Shield, title: "Admin Analytics", desc: "Org-wide gap heatmap and predictive insights" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary-200" />
                </div>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-primary-300 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <p className="text-primary-300 text-xs">SIH 2024 — Problem Statement SIH 26101</p>
          </div>
        </div>

        {/* Right — Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign in</h2>
          <p className="text-gray-500 text-sm mb-6">Access your MoSPI learning dashboard</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@mospi.gov.in"
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => fillDemo("learner")}
                className="text-sm border border-primary-200 text-primary-700 rounded-lg py-2 px-3 hover:bg-primary-50 transition-colors text-left"
              >
                <span className="block font-semibold">Officer Demo</span>
                <span className="text-xs text-gray-500">Learner role</span>
              </button>
              <button
                onClick={() => fillDemo("admin")}
                className="text-sm border border-saffron/30 text-orange-700 rounded-lg py-2 px-3 hover:bg-orange-50 transition-colors text-left"
              >
                <span className="block font-semibold">Admin Demo</span>
                <span className="text-xs text-gray-500">Admin role</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
