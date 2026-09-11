"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  awardOfficerReward,
  createOfficer,
  exportOfficers,
  getOfficerDetail,
  listOfficers,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import {
  Users, Plus, Search, Filter, Download, X, Briefcase, Award, CheckCircle2, AlertCircle, Check
} from "lucide-react";
import clsx from "clsx";

const DOMAIN_COLORS: Record<string, string> = {
  statistical: "#2C5EBF",
  technical: "#0E8F63",
  digital_governance: "#A9762C",
  behavioural: "#6E4FA6",
};

const DOMAIN_LABELS: Record<string, string> = {
  statistical: "Statistical",
  technical: "Technical",
  digital_governance: "Digital Governance",
  behavioural: "Behavioural",
};

export default function AdminOfficersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [officers, setOfficers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedTier, setSelectedTier] = useState("all");

  // Onboard Modal
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOfficer, setNewOfficer] = useState({
    name: "",
    email: "",
    password: "Password@123",
    designation: "Statistical Officer",
    department: "Price Statistics Division",
    experience_years: 3,
    qualifications: "M.Sc. Statistics",
  });

  // Dossier Drawer
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<any>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [awardPoints, setAwardPoints] = useState(50);
  const [awardNote, setAwardNote] = useState("Excellence in National Statistical Work");
  const [awarding, setAwarding] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchOfficers = () => {
    setFetching(true);
    listOfficers()
      .then((r) => setOfficers(r.data || []))
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    fetchOfficers();
  }, [user, loading]);

  const handleOpenDossier = async (id: string) => {
    setSelectedOfficerId(id);
    setLoadingDossier(true);
    try {
      const res = await getOfficerDetail(id);
      setDossier(res.data);
    } catch {
      showNotification("error", "Could not load officer dossier.");
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleAward = async () => {
    if (!selectedOfficerId) return;
    setAwarding(true);
    try {
      await awardOfficerReward(selectedOfficerId, awardPoints, awardNote);
      showNotification("success", `Granted ${awardPoints} points to ${dossier?.name}.`);
      const res = await getOfficerDetail(selectedOfficerId);
      setDossier(res.data);
    } catch (err: any) {
      showNotification("error", err.response?.data?.detail || "Failed to award points.");
    } finally {
      setAwarding(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createOfficer({
        name: newOfficer.name,
        email: newOfficer.email,
        password: newOfficer.password,
        designation: newOfficer.designation,
        department: newOfficer.department,
        experience_years: Number(newOfficer.experience_years),
        qualifications: newOfficer.qualifications.split(",").map((s) => s.trim()).filter(Boolean),
      });
      showNotification("success", `Officer ${newOfficer.name} provisioned with baseline competencies.`);
      setOnboardOpen(false);
      setNewOfficer({
        name: "",
        email: "",
        password: "Password@123",
        designation: "Statistical Officer",
        department: "Price Statistics Division",
        experience_years: 3,
        qualifications: "M.Sc. Statistics",
      });
      fetchOfficers();
    } catch (err: any) {
      showNotification("error", err.response?.data?.detail || "Could not onboard officer.");
    } finally {
      setCreating(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await exportOfficers();
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mospi-officers-competency-audit.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showNotification("error", "Failed to export report.");
    }
  };

  const uniqueDepts = useMemo(() => {
    const s = new Set<string>();
    officers.forEach((o) => { if (o.department) s.add(o.department); });
    return Array.from(s);
  }, [officers]);

  const filtered = useMemo(() => {
    return officers.filter((o) => {
      const matchSearch =
        !search ||
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.email.toLowerCase().includes(search.toLowerCase()) ||
        (o.designation && o.designation.toLowerCase().includes(search.toLowerCase()));

      const matchDept = selectedDept === "all" || o.department === selectedDept;

      const matchTier =
        selectedTier === "all" ||
        (selectedTier === "proficient" && o.avg_score >= 70) ||
        (selectedTier === "developing" && o.avg_score >= 50 && o.avg_score < 70) ||
        (selectedTier === "needs_attention" && o.avg_score < 50);

      return matchSearch && matchDept && matchTier;
    });
  }, [officers, search, selectedDept, selectedTier]);

  return (
    <div className="ledgerPage">
      <Navbar />
      <div className="ledgerSheet">
        {/* Header */}
        <div className="ledgerHeader">
          <div className="flex items-center gap-3.5">
            <div className="ledgerHeaderIcon">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="ledgerTitle">MoSPI Cadre Register</h1>
              <p className="ledgerMeta">
                {fetching ? "Loading register…" : `${officers.length} officers on record across divisions`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnboardOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#17233e] text-[#f6f7f5] hover:bg-[#2b4c86] transition-colors text-[13px] font-medium rounded-sm"
            >
              <Plus className="w-4 h-4" /> Onboard Officer
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-[#17233e] text-[#17233e] dark:text-[#e7e9e4] dark:border-[#9aa3ac] hover:bg-black/5 transition-colors text-[13px] font-medium rounded-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {notification && (
          <div className={clsx(
            "mb-4 px-4 py-2.5 rounded-sm border text-[13px] flex items-center justify-between",
            notification.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
          )}>
            <span className="flex items-center gap-2">
              {notification.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {notification.text}
            </span>
            <button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#5b6472]" />
            <input
              type="text"
              placeholder="Search by name, email, designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-[#c7ccc8] dark:border-[#2b323b] bg-white dark:bg-[#191f27] rounded-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#5b6472]" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full py-1.5 px-2 text-[13px] border border-[#c7ccc8] dark:border-[#2b323b] bg-white dark:bg-[#191f27] rounded-sm outline-none"
            >
              <option value="all">All Departments</option>
              {uniqueDepts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full py-1.5 px-2 text-[13px] border border-[#c7ccc8] dark:border-[#2b323b] bg-white dark:bg-[#191f27] rounded-sm outline-none"
            >
              <option value="all">All Performance Tiers</option>
              <option value="proficient">Proficient (≥70%)</option>
              <option value="developing">Developing (50–69%)</option>
              <option value="needs_attention">Needs Attention (&lt;50%)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="ledgerTableWrap">
          <table className="ledgerTable">
            <thead>
              <tr>
                <th>Officer Name</th>
                <th>Govt Email</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Exp.</th>
                <th>Avg Score</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr className="ledgerEmptyRow">
                  <td colSpan={7}>Loading register…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="ledgerEmptyRow">
                  <td colSpan={7}>No officers found matching the filters.</td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="ledgerRow">
                    <td className="ledgerName">{o.name}</td>
                    <td className="ledgerSub ledgerMono">{o.email}</td>
                    <td className="ledgerSub">{o.designation}</td>
                    <td className="ledgerSub ledgerTruncate" title={o.department}>{o.department}</td>
                    <td className="ledgerSub">{o.experience_years}y</td>
                    <td>
                      <span
                        className={
                          "ledgerScore " +
                          (o.avg_score >= 70
                            ? "ledgerScore--good"
                            : o.avg_score >= 50
                            ? "ledgerScore--mid"
                            : "ledgerScore--low")
                        }
                      >
                        {o.avg_score.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleOpenDossier(o.id)}
                        className="text-[12px] px-2.5 py-1 border border-[#17233e] dark:border-[#9aa3ac] hover:bg-[#17233e] hover:text-white transition-colors rounded-sm font-medium"
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Modal */}
      {onboardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#eaedec] dark:bg-[#191f27] border border-[#c7ccc8] dark:border-[#2b323b] max-w-lg w-full p-6 rounded-sm shadow-xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b pb-3 border-[#c7ccc8]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2b4c86]" />
                <h3 className="font-serif text-[18px] font-bold text-[#17233e] dark:text-[#e7e9e4]">Provision MoSPI Officer</h3>
              </div>
              <button onClick={() => setOnboardOpen(false)}><X className="w-5 h-5 text-[#5b6472]" /></button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-[#5b6472]">Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Dr. Ramesh Chander"
                  value={newOfficer.name}
                  onChange={(e) => setNewOfficer({ ...newOfficer, name: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border border-[#c7ccc8] dark:border-[#2b323b] bg-white dark:bg-[#12161c] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#5b6472]">Govt Email</label>
                  <input
                    required
                    type="email"
                    placeholder="ramesh.c@mospi.gov.in"
                    value={newOfficer.email}
                    onChange={(e) => setNewOfficer({ ...newOfficer, email: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-[#c7ccc8] dark:border-[#2b323b] bg-white dark:bg-[#12161c] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#5b6472]">Password</label>
                  <input
                    required
                    type="text"
                    value={newOfficer.password}
                    onChange={(e) => setNewOfficer({ ...newOfficer, password: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-[#c7ccc8] dark:border-[#2b323b] bg-white dark:bg-[#12161c] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#5b6472]">Designation</label>
                  <select
                    value={newOfficer.designation}
                    onChange={(e) => setNewOfficer({ ...newOfficer, designation: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-[#c7ccc8] dark:border-[#2b323b] bg-white dark:bg-[#12161c] outline-none"
                  >
                    <option value="Statistical Officer">Statistical Officer</option>
                    <option value="Senior Statistical Officer">Senior Statistical Officer</option>
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Deputy Director (Statistics)">Deputy Director (Statistics)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#5b6472]">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="45"
                    value={newOfficer.experience_years}
                    onChange={(e) => setNewOfficer({ ...newOfficer, experience_years: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-[#c7ccc8] dark:border-[#2b323b] bg-white dark:bg-[#12161c] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#5b6472]">Department</label>
                <select
                  value={newOfficer.department}
                  onChange={(e) => setNewOfficer({ ...newOfficer, department: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border border-[#c7ccc8] dark:border-[#2b323b] bg-white dark:bg-[#12161c] outline-none"
                >
                  <option value="Price Statistics Division">Price Statistics Division</option>
                  <option value="National Accounts Division">National Accounts Division</option>
                  <option value="Labour and Employment Division">Labour and Employment Division</option>
                  <option value="Agricultural Statistics Division">Agricultural Statistics Division</option>
                  <option value="Social Statistics Division">Social Statistics Division</option>
                  <option value="Survey Coordination Division">Survey Coordination Division</option>
                  <option value="IT and Data Management Division">IT and Data Management Division</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#5b6472]">Qualifications</label>
                <input
                  type="text"
                  placeholder="M.Sc. Statistics, B.Sc. Mathematics"
                  value={newOfficer.qualifications}
                  onChange={(e) => setNewOfficer({ ...newOfficer, qualifications: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border border-[#c7ccc8] dark:border-[#2b323b] bg-white dark:bg-[#12161c] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#c7ccc8]">
                <button
                  type="button"
                  onClick={() => setOnboardOpen(false)}
                  className="px-3.5 py-1.5 border border-[#c7ccc8] text-[#5b6472]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 bg-[#17233e] text-white hover:bg-[#2b4c86] transition-colors rounded-sm font-medium"
                >
                  {creating ? "Provisioning…" : "Onboard Officer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dossier Drawer */}
      {selectedOfficerId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#eaedec] dark:bg-[#191f27] border border-[#c7ccc8] dark:border-[#2b323b] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 rounded-sm shadow-xl space-y-5 font-sans">
            <div className="flex items-center justify-between border-b pb-3 border-[#c7ccc8]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#2b4c86]" />
                <h3 className="font-serif text-[19px] font-bold text-[#17233e] dark:text-[#e7e9e4]">
                  Officer Competency Dossier
                </h3>
              </div>
              <button onClick={() => setSelectedOfficerId(null)}><X className="w-5 h-5 text-[#5b6472]" /></button>
            </div>

            {loadingDossier ? (
              <div className="py-12 text-center text-[13px] text-[#5b6472]">Loading officer dossier…</div>
            ) : dossier ? (
              <div className="space-y-5 text-[13px]">
                {/* Info Card */}
                <div className="p-4 border bg-white dark:bg-[#12161c] border-[#c7ccc8] dark:border-[#2b323b] rounded-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-serif font-bold text-[18px] text-[#17233e] dark:text-[#e7e9e4]">{dossier.name}</h4>
                      <p className="text-[12.5px] text-[#5b6472]">{dossier.designation} · {dossier.department}</p>
                      <p className="text-[11.5px] font-mono text-[#5b6472] mt-0.5">{dossier.email} · {dossier.experience_years} years service</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#5b6472] block">Reward Balance</span>
                      <span className="font-mono text-[20px] font-bold text-amber-600 block">{dossier.reward_points} pts</span>
                    </div>
                  </div>
                </div>

                {/* Domain Scores */}
                <div>
                  <h5 className="font-serif font-semibold text-[15px] mb-2.5 text-[#17233e] dark:text-[#e7e9e4]">Domain Competencies</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(DOMAIN_LABELS).map(([domain, label]) => {
                      const score = dossier.domain_averages?.[domain] ?? 0;
                      return (
                        <div key={domain} className="p-3 border bg-white dark:bg-[#12161c] border-[#c7ccc8] dark:border-[#2b323b] rounded-sm">
                          <div className="flex items-center justify-between text-[12px] mb-1">
                            <span className="font-medium" style={{ color: DOMAIN_COLORS[domain] }}>{label}</span>
                            <span className="font-mono font-bold">{score}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, score)}%`, backgroundColor: DOMAIN_COLORS[domain] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Interventions */}
                <div>
                  <h5 className="font-serif font-semibold text-[15px] mb-2 text-[#17233e] dark:text-[#e7e9e4]">Assigned Courses ({dossier.recommendations?.length || 0})</h5>
                  {dossier.recommendations?.length === 0 ? (
                    <p className="text-[#5b6472]">No courses assigned yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dossier.recommendations.map((rec: any) => (
                        <div key={rec.id} className="p-2 border bg-white dark:bg-[#12161c] border-[#c7ccc8] dark:border-[#2b323b] flex items-center justify-between rounded-sm">
                          <div>
                            <span className="font-medium text-[12.5px]">{rec.title}</span>
                            <span className="text-[11px] text-[#5b6472] block">{rec.duration_hours || 8}h · {rec.provider}</span>
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 border rounded-sm capitalize">{rec.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Commendation Tool */}
                <div className="p-4 border bg-white dark:bg-[#12161c] border-[#c7ccc8] dark:border-[#2b323b] rounded-sm space-y-3">
                  <h5 className="font-serif font-semibold text-[14px] text-[#17233e] dark:text-[#e7e9e4] flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#2b4c86]" /> Issue Administrative Commendation
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#5b6472]">Points</label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        value={awardPoints}
                        onChange={(e) => setAwardPoints(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 border border-[#c7ccc8] bg-transparent text-[13px] font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-[#5b6472]">Commendation Note</label>
                      <input
                        type="text"
                        value={awardNote}
                        onChange={(e) => setAwardNote(e.target.value)}
                        placeholder="e.g. Excellent survey design in Labour Bureau pilot"
                        className="w-full mt-1 px-2.5 py-1.5 border border-[#c7ccc8] bg-transparent text-[13px]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAward}
                    disabled={awarding}
                    className="w-full py-2 bg-[#17233e] text-white hover:bg-[#2b4c86] transition-colors font-medium rounded-sm text-[12.5px]"
                  >
                    {awarding ? "Granting Commendation…" : `Award ${awardPoints} Points`}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=IBM+Plex+Sans:wght@400;500;600&display=swap");
      `}</style>

      <style jsx>{`
        .ledgerPage {
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
          --caution: #8a6a1f;
          --caution-soft: #f3ecdc;
          --rule: #c7ccc8;
          min-height: 100vh;
          background: var(--paper);
        }
        :global(.dark) .ledgerPage {
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
          --caution: #d9b96b;
          --caution-soft: rgba(217, 185, 107, 0.12);
          --rule: #2b323b;
        }

        .ledgerSheet {
          max-width: 1140px;
          margin: 0 auto;
          padding: 32px 24px 64px;
          font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
        }

        .ledgerHeader {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 2px solid var(--ink);
          margin-bottom: 24px;
          gap: 16px;
        }
        .ledgerHeaderIcon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1.5px solid var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          flex-shrink: 0;
        }
        .ledgerTitle {
          font-family: "Source Serif 4", Georgia, serif;
          font-weight: 600;
          font-size: 24px;
          color: var(--ink);
          margin: 0 0 2px;
        }
        .ledgerMeta {
          font-size: 13px;
          color: var(--ink-soft);
          margin: 0;
        }

        .ledgerTableWrap {
          overflow-x: auto;
          border: 1px solid var(--rule);
          border-radius: 4px;
          background: var(--paper-card);
        }
        .ledgerTable {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
          white-space: nowrap;
        }
        .ledgerTable thead th {
          text-align: left;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--ink-soft);
          padding: 12px 16px;
          border-bottom: 1.5px solid var(--ink);
        }
        .ledgerRow {
          border-bottom: 1px solid var(--rule);
          transition: background 0.12s ease;
        }
        .ledgerRow:last-child {
          border-bottom: none;
        }
        .ledgerRow:hover {
          background: var(--accent-soft);
        }
        .ledgerTable td {
          padding: 12px 16px;
          vertical-align: middle;
        }
        .ledgerName {
          font-family: "Source Serif 4", Georgia, serif;
          font-weight: 600;
          color: var(--ink);
        }
        .ledgerSub {
          color: var(--ink-soft);
        }
        .ledgerMono {
          font-size: 12px;
        }
        .ledgerTruncate {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ledgerScore {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid transparent;
        }
        .ledgerScore--good {
          color: var(--correct);
          background: var(--correct-soft);
          border-color: var(--correct-soft);
        }
        .ledgerScore--mid {
          color: var(--caution);
          background: var(--caution-soft);
          border-color: var(--caution-soft);
        }
        .ledgerScore--low {
          color: var(--incorrect);
          background: var(--incorrect-soft);
          border-color: var(--incorrect-soft);
        }

        .ledgerEmptyRow td {
          text-align: center;
          padding: 48px 16px;
          color: var(--ink-soft);
          font-family: "Source Serif 4", Georgia, serif;
          font-style: italic;
          white-space: normal;
        }
      `}</style>
    </div>
  );
}