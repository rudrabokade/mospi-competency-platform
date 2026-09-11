"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listOfficers } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { localizeEntity, useLanguage } from "@/lib/i18n";

export default function AdminOfficersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const [officers, setOfficers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    listOfficers()
      .then((r) => setOfficers(r.data || []))
      .finally(() => setFetching(false));
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-500" /> Officers
        </h1>
        <div className="card overflow-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500 font-medium">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Designation</th>
                <th className="pb-3 pr-4">Department</th>
                <th className="pb-3 pr-4">Exp.</th>
                <th className="pb-3">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : officers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No officers found.</td></tr>
              ) : officers.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-gray-800">{localizeEntity(o.name, language)}</td>
                  <td className="py-3 pr-4 text-gray-500 text-xs">{o.email}</td>
                  <td className="py-3 pr-4 text-gray-500">{localizeEntity(o.designation, language)}</td>
                  <td className="py-3 pr-4 text-gray-500 max-w-[180px] truncate">{localizeEntity(o.department, language)}</td>
                  <td className="py-3 pr-4 text-gray-500">{o.experience_years}y</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      o.avg_score >= 70 ? "bg-green-100 text-green-800" :
                      o.avg_score >= 50 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {o.avg_score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
