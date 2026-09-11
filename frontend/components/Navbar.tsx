"use client";

import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  Brain,
  LogOut,
  User,
  Shield,
  BarChart3,
  BookOpen,
  Home,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const path = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const navItems =
    user?.role === "admin"
      ? [
          { href: "/admin", label: "Dashboard", icon: BarChart3 },
          { href: "/admin/officers", label: "Officers", icon: User },
          { href: "/admin/materials", label: "Materials & Quizzes", icon: BookOpen },
        ]
      : [
          { href: "/dashboard", label: "Dashboard", icon: Home },
          { href: "/dashboard/quizzes", label: "Quizzes", icon: BookOpen },
        ];

  return (
    <nav className="bg-primary-900 dark:bg-primary-950 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-6">
        <Link
          href={user?.role === "admin" ? "/admin" : "/dashboard"}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 bg-saffron rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-sm hidden sm:block">
            MoSPI AI Competency
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                path === href
                  ? "bg-white/20 text-white"
                  : "text-primary-200 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user?.role === "admin" && (
          <span className="flex items-center gap-1 text-xs bg-saffron/20 text-saffron px-2.5 py-1 rounded-full font-medium">
            <Shield className="w-3 h-3" /> Admin
          </span>
        )}
        <div className="flex items-center gap-2 text-sm text-primary-200">
          <User className="w-4 h-4" />
          <span className="hidden sm:block">{user?.name}</span>
        </div>

        {mounted && (
          <button
            onClick={toggleTheme}
            className="p-2 text-primary-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-primary-300 hover:text-white text-sm transition-colors p-2 rounded-lg hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </nav>
  );
}
