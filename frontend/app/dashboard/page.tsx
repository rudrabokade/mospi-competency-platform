"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  earnRewardPoints,
  getCompetencyGaps,
  getProfile,
  getRecommendations,
  getRewards,
  refreshRecommendations,
  updateRecommendationStatus,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Gift,
  Goal,
  MessageSquare,
  RefreshCw,
  Search,
  Target,
  Trophy,
  User,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { localizeEntity, useLanguage } from "@/lib/i18n";

type Gap = {
  skill_id?: string;
  skill_name: string;
  domain: string;
  current_score: number;
  target_score: number;
  gap: number;
  priority: string;
};

type Rec = {
  id: string;
  title: string;
  description?: string;
  duration_hours?: number;
  provider?: string;
  status?: string;
  source_url?: string;
};

type Tab = "overview" | "roadmap" | "assessment" | "rewards" | "profile";

const labels: Record<string, string> = {
  statistical: "Statistical",
  technical: "Technical",
  digital_governance: "Digital governance",
  behavioural: "Behavioural",
};

const colors: Record<string, string> = {
  statistical: "#3b82f6",
  technical: "#10b981",
  digital_governance: "#f59e0b",
  behavioural: "#8b5cf6",
};

const badges = [
  {
    name: "First step",
    text: "Complete your first self-assessment",
    icon: "🌱",
    earned: true,
  },
  {
    name: "Skill builder",
    text: "Improve a competency by 10 points",
    icon: "🛠️",
    earned: false,
  },
  {
    name: "Learning streak",
    text: "Complete three learning activities",
    icon: "🔥",
    earned: false,
  },
];

const readStore = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { language, t } = useLanguage();

  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<any>(null);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("all");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<string[]>([]);
  const [points, setPoints] = useState(420);
  const [reward, setReward] = useState("certificate");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [notice, setNotice] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);

  const persist = (key: string, value: unknown) => {
    if (user) localStorage.setItem(`${key}:${user.id}`, JSON.stringify(value));
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user?.role === "admin") {
      router.push("/admin");
      return;
    }
    if (!user) return;

    setRatings(readStore(`ratings:${user.id}`, {}));
    setEvidence(readStore(`evidence:${user.id}`, {}));
    setGoals(
      readStore(`goals:${user.id}`, ["Become proficient in data visualisation"])
    );
    setPoints(readStore(`points:${user.id}`, 420));
    setReward(readStore(`reward:${user.id}`, "certificate"));

    Promise.allSettled([
      getProfile(user.id),
      getCompetencyGaps(user.id),
      getRecommendations(user.id),
      getRewards(user.id),
    ])
      .then(([p, g, r, rewards]) => {
        if (p.status === "fulfilled") setProfile(p.value.data);
        if (g.status === "fulfilled") setGaps(g.value.data.gaps || []);
        if (r.status === "fulfilled") setRecs(r.value.data || []);
        if (rewards.status === "fulfilled") {
          setPoints(rewards.value.data.points ?? 0);
          setTransactions(rewards.value.data.transactions || []);
          setReward(rewards.value.data.policy?.conversion_type || "certificate");
        }
      })
      .finally(() => setFetching(false));
  }, [user, loading, router]);

  const filtered = useMemo(
    () =>
      gaps.filter(
        (g) =>
          (!search || g.skill_name.toLowerCase().includes(search.toLowerCase())) &&
          (domain === "all" || domain === g.domain)
      ),
    [gaps, search, domain]
  );

  const average = gaps.length
    ? Math.round(gaps.reduce((s, g) => s + g.current_score, 0) / gaps.length)
    : 0;

  const completion = gaps.length
    ? Math.round(
        gaps.reduce(
          (s, g) =>
            s +
            Math.min(
              100,
              (g.current_score / Math.max(g.target_score, 1)) * 100
            ),
          0
        ) / gaps.length
      )
    : 0;

  const rate = async (id: string, value: number) => {
    const firstRating = !ratings[id];
    const next = { ...ratings, [id]: value };
    setRatings(next);
    persist("ratings", next);
    if (firstRating && user) {
      try {
        const response = await earnRewardPoints(user.id, "assessment", id);
        setPoints((current) => current + response.data.points);
      } catch {
        /* Keep assessment usable if rewards are unavailable. */
      }
    }
  };

  const addEvidence = (id: string, value: string) => {
    const next = { ...evidence, [id]: value };
    setEvidence(next);
    persist("evidence", next);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshRecommendations();
      if (user) setRecs((await getRecommendations(user.id)).data || []);
    } finally {
      setRefreshing(false);
    }
  };

  const enroll = async (id: string) => {
    await updateRecommendationStatus(id, "enrolled");
    setRecs((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: "enrolled" } : r))
    );
  };

  if (loading || fetching)
    return (
      <div className="min-h-screen flex items-center justify-center">
        {t("loadingDashboard")}
      </div>
    );

  const tabs: [Tab, string, any][] = [
    ["overview", t("dashboard") || "Overview", Target],
    ["roadmap", "Learning roadmap", BookOpen],
    ["assessment", "Self-assessment", FileText],
    ["rewards", "Rewards", Trophy],
    ["profile", "Profile & goals", User],
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <section className="card flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <p className="text-sm text-primary-600 font-semibold">
              PERSONAL LEARNING HUB
            </p>
            <h1 className="text-2xl font-bold mt-1">
              Welcome, {localizeEntity(user?.name, language)}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {localizeEntity(
                user?.designation || profile?.designation || "MoSPI officer",
                language
              )}{" "}
              ·{" "}
              {localizeEntity(
                user?.department || profile?.department || "Your department",
                language
              )}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <b className="text-2xl text-primary-600">{points}</b>
              <div className="text-xs text-gray-500">Reward points</div>
            </div>
            <div className="text-center">
              <b className="text-2xl text-emerald-600">{completion}%</b>
              <div className="text-xs text-gray-500">Progress</div>
            </div>
            <button
              onClick={() => setNotice(!notice)}
              className="relative p-2"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notice && (
                <div className="absolute right-0 top-11 z-20 w-72 card text-left">
                  <b className="text-sm">Notifications</b>
                  <p className="text-xs text-gray-500 mt-2">
                    Your skill-gap review is ready. Complete an assessment to
                    earn 10 points.
                  </p>
                </div>
              )}
            </button>
          </div>
        </section>

        <nav className="card p-2 flex gap-1 overflow-x-auto">
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap",
                tab === key
                  ? "bg-primary-600 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <Overview
            gaps={filtered}
            average={average}
            search={search}
            setSearch={setSearch}
            domain={domain}
            setDomain={setDomain}
          />
        )}
        {tab === "roadmap" && (
          <Roadmap
            recs={recs}
            refresh={refresh}
            refreshing={refreshing}
            enroll={enroll}
          />
        )}
        {tab === "assessment" && (
          <Assessment
            gaps={gaps}
            ratings={ratings}
            evidence={evidence}
            rate={rate}
            addEvidence={addEvidence}
          />
        )}
        {tab === "rewards" && (
          <Rewards
            points={points}
            reward={reward}
            setReward={(v) => {
              setReward(v);
              persist("reward", v);
            }}
            transactions={transactions}
          />
        )}
        {tab === "profile" && (
          <Profile
            goals={goals}
            addGoal={() => {
              const v = window.prompt("What is your learning goal?");
              if (v?.trim()) {
                const next = [...goals, v.trim()];
                setGoals(next);
                persist("goals", next);
              }
            }}
            removeGoal={(i) => {
              const next = goals.filter((_, n) => n !== i);
              setGoals(next);
              persist("goals", next);
            }}
            feedback={feedback}
            setFeedback={setFeedback}
            sent={sent}
            send={() => {
              setSent(true);
              setFeedback("");
            }}
          />
        )}
      </main>
    </div>
  );
}

function Overview({
  gaps,
  average,
  search,
  setSearch,
  domain,
  setDomain,
}: {
  gaps: Gap[];
  average: number;
  search: string;
  setSearch: (v: string) => void;
  domain: string;
  setDomain: (v: string) => void;
}) {
  return (
    <>
      <div className="grid md:grid-cols-3 gap-4">
        <Metric
          title="Average competency"
          value={`${average}%`}
          detail="Across assessed skills"
        />
        <Metric
          title="Priority gaps"
          value={gaps.filter((g) => g.priority === "high").length}
          detail="Skills needing attention"
        />
        <Metric
          title="Next milestone"
          value="500 pts"
          detail="80 points to certificate"
        />
      </div>
      <section className="card">
        <div className="flex flex-col md:flex-row justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-semibold">Skill-gap analysis</h2>
            <p className="text-sm text-gray-500">
              Compare current scores with target levels.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills"
                className="input pl-9 w-48"
              />
            </div>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All domains</option>
              {Object.entries(labels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        {gaps.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No competency data matches your filters.
          </p>
        ) : (
          <div className="space-y-4">
            {gaps.map((g, i) => (
              <div key={g.skill_id || `${g.skill_name}-${i}`}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{g.skill_name}</span>
                  <span className="text-gray-500">
                    {g.current_score} / {g.target_score}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, g.current_score)}%`,
                      backgroundColor: colors[g.domain] || colors.technical,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs">
                  <span style={{ color: colors[g.domain] }}>
                    {labels[g.domain] || g.domain}
                  </span>
                  <span
                    className={
                      g.priority === "high" ? "text-red-500" : "text-gray-400"
                    }
                  >
                    {g.gap} point gap · {g.priority} priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="card">
        <h2 className="text-lg font-semibold flex gap-2 items-center">
          <Award className="w-5 h-5 text-amber-500" /> Achievements
        </h2>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          {badges.map((b) => (
            <div
              key={b.name}
              className={clsx(
                "rounded-xl border p-4",
                b.earned ? "border-amber-200 bg-amber-50/50" : "opacity-60"
              )}
            >
              <div className="text-2xl">{b.icon}</div>
              <b className="text-sm block mt-2">{b.name}</b>
              <small className="text-gray-500">{b.text}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Metric({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-2 text-primary-600">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{detail}</p>
    </div>
  );
}

function Roadmap({
  recs,
  refresh,
  refreshing,
  enroll,
}: {
  recs: Rec[];
  refresh: () => void;
  refreshing: boolean;
  enroll: (id: string) => void;
}) {
  return (
    <section className="card">
      <div className="flex justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold">Your learning roadmap</h2>
          <p className="text-sm text-gray-500">
            Recommended next steps based on your skill gaps.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="btn-secondary flex gap-2 items-center"
        >
          <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>
      <div className="space-y-3">
        {recs.length === 0 ? (
          <p className="text-center py-12 text-gray-500">
            No recommendations yet. Refresh to generate them.
          </p>
        ) : (
          recs.map((r, i) => (
            <div
              key={r.id}
              className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                {i + 1}
              </div>
              <div className="flex-1">
                <b>{r.title}</b>
                <p className="text-sm text-gray-500 mt-1">{r.description}</p>
                <small className="text-gray-400">
                  <Clock className="w-3 h-3 inline" /> {r.duration_hours || 2}h ·{" "}
                  {r.provider || "MoSPI Learning"}
                </small>
              </div>
              {r.status === "enrolled" ? (
                <span className="text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 inline" /> Enrolled
                </span>
              ) : (
                <button onClick={() => enroll(r.id)} className="btn-primary text-sm">
                  Start learning
                </button>
              )}
              {r.source_url && (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 border rounded-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Assessment({
  gaps,
  ratings,
  evidence,
  rate,
  addEvidence,
}: {
  gaps: Gap[];
  ratings: Record<string, number>;
  evidence: Record<string, string>;
  rate: (id: string, v: number) => void;
  addEvidence: (id: string, v: string) => void;
}) {
  return (
    <section className="card">
      <h2 className="text-lg font-semibold">Self-assessment & evidence</h2>
      <p className="text-sm text-gray-500 mb-5">
        Rate confidence and add projects, certificates, or work examples.
      </p>
      <div className="space-y-5">
        {gaps.slice(0, 12).map((g, i) => {
          const id = g.skill_id || `${g.skill_name}-${i}`;
          return (
            <div key={id} className="border-b pb-5">
              <div className="flex justify-between">
                <b className="text-sm">{g.skill_name}</b>
                <small className="text-gray-500">{ratings[id] || 0}/5</small>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={ratings[id] || 0}
                onChange={(e) => rate(id, Number(e.target.value))}
                className="w-full mt-3 accent-primary-600"
              />
              <input
                className="input mt-3"
                value={evidence[id] || ""}
                onChange={(e) => addEvidence(id, e.target.value)}
                placeholder="Evidence or notes (optional)"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Rewards({
  points,
  reward,
  setReward,
  transactions,
}: {
  points: number;
  reward: string;
  setReward: (v: string) => void;
  transactions: any[];
}) {
  const options = [
    {
      key: "holiday",
      label: "Holiday benefit",
      text: "Additional leave or holiday benefits",
    },
    {
      key: "certificate",
      label: "Certificate",
      text: "Verified competency certificate",
    },
    {
      key: "recognition",
      label: "Recognition",
      text: "Organization-wide recognition",
    },
    {
      key: "promotion",
      label: "Promotion consideration",
      text: "Eligibility for promotion consideration",
    },
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <section className="card lg:col-span-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <Gift className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Your reward balance</p>
            <p className="text-3xl font-bold text-amber-600">{points} points</p>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span>
              Next reward: {options.find((o) => o.key === reward)?.label}
            </span>
            <span>500 points</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-amber-500"
              style={{ width: `${Math.min(100, points / 5)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Points are earned through assessments and learning activities.
            Organizations configure conversion rules.
          </p>
        </div>
        <h3 className="font-semibold mt-8 mb-3">
          Organization reward conversion
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => setReward(o.key)}
              className={clsx(
                "text-left border rounded-xl p-4",
                reward === o.key
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-100"
              )}
            >
              <b className="text-sm">{o.label}</b>
              <p className="text-xs text-gray-500 mt-1">{o.text}</p>
            </button>
          ))}
        </div>
        <h3 className="font-semibold mt-8 mb-3">Recent activity</h3>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-500">No reward activity yet.</p>
          ) : (
            transactions.slice(0, 6).map((transaction) => (
              <div
                key={transaction.id}
                className="flex justify-between border-b py-2 text-sm"
              >
                <span className="capitalize">{transaction.action}</span>
                <span className="font-semibold text-emerald-600">
                  +{transaction.points}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="card">
        <h3 className="font-semibold flex gap-2 items-center">
          <Trophy className="w-5 h-5 text-amber-500" /> Badge collection
        </h3>
        <div className="space-y-3 mt-4">
          {badges.map((b) => (
            <div key={b.name} className="flex gap-3 items-center">
              <span className="text-xl">{b.icon}</span>
              <div>
                <b className="text-sm">{b.name}</b>
                <p className="text-xs text-gray-500">
                  {b.earned ? "Earned" : "In progress"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Profile({
  goals,
  addGoal,
  removeGoal,
  feedback,
  setFeedback,
  sent,
  send,
}: {
  goals: string[];
  addGoal: () => void;
  removeGoal: (i: number) => void;
  feedback: string;
  setFeedback: (v: string) => void;
  sent: boolean;
  send: () => void;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="card">
        <h2 className="text-lg font-semibold flex gap-2 items-center">
          <Goal className="w-5 h-5 text-primary-500" /> Career goals
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Keep your roadmap aligned with your aspirations.
        </p>
        <div className="space-y-2 mt-5">
          {goals.map((g, i) => (
            <div
              key={`${g}-${i}`}
              className="flex justify-between border rounded-lg px-3 py-3 text-sm"
            >
              <span>{g}</span>
              <button onClick={() => removeGoal(i)} aria-label="Remove goal">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addGoal} className="btn-primary mt-4 text-sm">
          Add goal
        </button>
      </section>
      <section className="card">
        <h2 className="text-lg font-semibold flex gap-2 items-center">
          <MessageSquare className="w-5 h-5 text-primary-500" /> Feedback
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Help improve your learning experience.
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="input mt-5 min-h-32"
          placeholder="Share feedback or request a resource..."
        />
        <button
          onClick={send}
          disabled={!feedback.trim()}
          className="btn-primary mt-3 text-sm"
        >
          Send feedback
        </button>
        {sent && (
          <p className="text-sm text-emerald-600 mt-3">
            Thank you. Your feedback was recorded.
          </p>
        )}
      </section>
    </div>
  );
}
