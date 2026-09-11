"use client";

import { useAuth } from "@/lib/auth";
import { LogOut, User, Shield, BarChart3, BookOpen, Home, Brain, FileText, Users, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const path = usePathname();

  const navItems = user?.role === "admin"
    ? [
        { href: "/admin", label: "Dashboard", icon: BarChart3 },
        { href: "/admin/officers", label: "Officers", icon: Users },
        { href: "/admin/materials", label: "Materials", icon: FileText },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/dashboard/quizzes", label: "Quizzes", icon: BookOpen },
      ];

  return (
    <nav className="sticky top-0 z-50 border-b border-glass backdrop-blur-xl"
      style={{
        background: "linear-gradient(180deg, rgba(10,17,40,0.95), rgba(5,10,21,0.9))",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left — Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href={user?.role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center relative"
              style={{
                background: "linear-gradient(135deg, #FF9933, #e68a2e)",
                boxShadow: "0 0 20px -5px rgba(255,153,51,0.4)",
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-white text-sm tracking-tight">MoSPI AI</span>
              <span className="text-slate-500 text-xs block -mt-0.5">Competency Platform</span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = path === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-accent-500/15 text-accent-400 shadow-glow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right — User Info + Logout */}
        <div className="flex items-center gap-4">
          {user?.role === "admin" && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(255,153,51,0.12)",
                color: "#ffae33",
                border: "1px solid rgba(255,153,51,0.2)",
              }}
            >
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
          <div className="flex items-center gap-2.5 text-sm text-slate-400">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <User className="w-4 h-4 text-accent-400" />
            </div>
            <span className="hidden sm:block font-medium text-slate-300">{user?.name}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-slate-500 hover:text-rose-400 text-sm transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
