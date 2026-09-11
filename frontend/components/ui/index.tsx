"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ── Surface ──────────────────────────────────────────────────
   A panel that does NOT rely on the heavy .glass-card treatment.
   Used for grouping content where elevation is meaningful.       */
export function Surface({
  className,
  children,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/[0.06] bg-surface-1/60",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl",
        padded && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── SectionHeading ───────────────────────────────────────────
   Label + optional description and right-aligned action.
   Kept borderless so sections can be separated by space alone.   */
export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ── Metric ───────────────────────────────────────────────────
   Borderless KPI. Separated by dividers rather than boxed in a
   card, so a row of metrics reads as one continuous strip.       */
const TONE_TEXT = {
  neutral: "text-white",
  accent: "text-accent-300",
  saffron: "text-saffron-400",
  emerald: "text-emerald-300",
  rose: "text-rose-300",
} as const;

export type MetricTone = keyof typeof TONE_TEXT;

export function Metric({
  label,
  value,
  caption,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  tone?: MetricTone;
  icon?: ReactNode;
}) {
  return (
    <div className="px-5 py-5 sm:px-6">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "mt-3 font-mono text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums",
          TONE_TEXT[tone]
        )}
      >
        {value}
      </p>
      {caption && <p className="mt-2 text-xs text-slate-600">{caption}</p>}
    </div>
  );
}

/** Wraps Metric children in a divided, responsive strip.
 *  Uses a 1px grid gap over a light background to draw the
 *  dividers, which stays exact at every breakpoint.            */
export function MetricStrip({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden rounded-2xl",
        "border border-white/[0.06] bg-white/[0.06]",
        "sm:grid-cols-2 lg:grid-cols-4",
        "[&>*]:bg-surface-1"
      )}
    >
      {children}
    </div>
  );
}

/* ── Pill ─────────────────────────────────────────────────────
   Small status label. Tone-driven, no glow.                      */
const PILL_TONE = {
  neutral: "border-white/10 bg-white/[0.04] text-slate-400",
  accent: "border-accent-500/25 bg-accent-500/10 text-accent-300",
  saffron: "border-saffron-500/25 bg-saffron-500/10 text-saffron-400",
  emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  rose: "border-rose-500/25 bg-rose-500/10 text-rose-300",
} as const;

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof PILL_TONE;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5",
        "text-[0.6875rem] font-medium",
        PILL_TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ── Skeleton ─────────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

/* ── EmptyState ───────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-500">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-[42ch] text-xs leading-relaxed text-slate-600">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
