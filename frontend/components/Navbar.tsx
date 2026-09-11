"use client";

import { useAuth } from "@/lib/auth";
import { Brain, LogOut, User, Shield, BarChart3, BookOpen, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { localizeEntity, useLanguage } from "@/lib/i18n";

export default function Navbar() {
  const { user, logout } = useAuth();
  const path = usePathname();
  const { language, setLanguage, t } = useLanguage();

  const navItems = user?.role === "admin"
    ? [
        { href: "/admin", label: t("dashboard"), icon: BarChart3 },
        { href: "/admin/officers", label: t("officers"), icon: User },
        { href: "/admin/materials", label: t("materials"), icon: BookOpen },
      ]
    : [
        { href: "/dashboard", label: t("dashboard"), icon: Home },
        { href: "/dashboard/quizzes", label: t("quizzes"), icon: BookOpen },
      ];

  return (
    <nav className="bg-primary-900 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-6">
        <Link href={user?.role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-saffron rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-sm hidden sm:block">MoSPI {t("platform")}</span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                path === href ? "bg-white/20 text-white" : "text-primary-200 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user?.role === "admin" && (
          <span className="flex items-center gap-1 text-xs bg-saffron/20 text-saffron px-2.5 py-1 rounded-full font-medium">
            <Shield className="w-3 h-3" /> {t("admin")}
          </span>
        )}
        <label className="hidden sm:flex items-center gap-1 text-primary-200 text-xs" title={t("language")}>
          <span aria-hidden="true">A/अ</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as "en" | "hi")} className="bg-transparent text-primary-100 outline-none cursor-pointer" aria-label={t("language")}>
            <option value="en" className="text-gray-900">EN</option>
            <option value="hi" className="text-gray-900">हि</option>
          </select>
        </label>
        <div className="flex items-center gap-2 text-sm text-primary-200">
          <User className="w-4 h-4" />
          <span className="hidden sm:block">{localizeEntity(user?.name, language)}</span>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-primary-300 hover:text-white text-sm transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">{t("logout")}</span>
        </button>
      </div>
    </nav>
  );
}
