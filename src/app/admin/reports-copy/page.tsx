"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";

interface MasterReport {
  user_id: number;
  first_name: string;
  last_name: string;
  display_name: string | null;
  month: string;
  hours: number;
  steam_bath: number;
  brand_steam: number;
  intro_steam: number;
  scrubbing: number;
  zaparnik: number;
  earnings: number;
  total_payouts: number;
  remaining: number;
}

function monthLabel(ym: string) {
  const [year, month] = ym.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function generateLastMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push(ym);
  }
  return out;
}

export default function ReportsCopyPage() {
  const [months, setMonths] = useState<string[]>(generateLastMonths(6));
  const [reportsByMonth, setReportsByMonth] = useState<Record<string, MasterReport[]>>({});
  const [monthClosed, setMonthClosed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [monthTotals, setMonthTotals] = useState<Record<string, { earned: number; paid: number; remaining: number }>>({});

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadMonthStatuses(), loadReportsForMonths(months), loadMonthTotals(months)]);
    };
    init();
  }, [months]);

  const loadMonthStatuses = async () => {
    try {
      const res = await fetch("/api/admin/month-status");
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, boolean> = {};
      (data.statuses || []).forEach((s: { month: string; closed: boolean }) => {
        map[s.month] = !!s.closed;
      });
      months.forEach((m) => {
        if (!(m in map)) map[m] = false;
      });
      setMonthClosed(map);
    } catch (e) {
      console.error("Не удалось загрузить статусы месяцев", e);
    }
  };

  const loadReportsForMonths = async (ms: string[]) => {
    try {
      const results = await Promise.all(
        ms.map((m) => fetch(`/api/admin/reports?month=${m}`).then((r) => (r.ok ? r.json() : [])))
      );

      const map: Record<string, MasterReport[]> = {};
      ms.forEach((m, i) => {
        const list: MasterReport[] = results[i] || [];
        list.sort((a, b) => {
          const an = (a.display_name || `${a.first_name} ${a.last_name || ""}`).trim().toLowerCase();
          const bn = (b.display_name || `${b.first_name} ${b.last_name || ""}`).trim().toLowerCase();
          return an.localeCompare(bn, "ru");
        });
        map[m] = list;
      });
      setReportsByMonth(map);
    } catch (e) {
      console.error("Не удалось загрузить отчёты", e);
    }
  };

  const loadMonthTotals = async (ms: string[]) => {
    try {
      const results = await Promise.all(
        ms.map((m) => fetch(`/api/admin/month-totals?month=${m}`).then((r) => (r.ok ? r.json() : null)))
      );
      const map: Record<string, { earned: number; paid: number; remaining: number }> = {};
      ms.forEach((m, i) => {
        const data = results[i];
        if (data) {
          map[m] = { earned: data.earned || 0, paid: data.paid || 0, remaining: (data.earned || 0) - (data.paid || 0) };
        } else {
          map[m] = { earned: 0, paid: 0, remaining: 0 };
        }
      });
      setMonthTotals(map);
    } catch (e) {
      console.error("Не удалось загрузить месячные итоги", e);
    }
  };

  const totalsFor = (m: string) => {
    const list = reportsByMonth[m] || [];
    const earned = monthTotals[m]?.earned ?? list.reduce((sum, r) => sum + (r.earnings || 0), 0);
    const paid = monthTotals[m]?.paid ?? list.reduce((sum, r) => sum + (r.total_payouts || 0), 0);
    const remaining = earned - paid;
    return { earned, paid, remaining };
  };

  const setClosed = async (m: string, closed: boolean) => {
    try {
      const res = await fetch("/api/admin/month-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: m, closed }),
      });
      if (res.ok) {
        setMonthClosed((prev) => ({ ...prev, [m]: closed }));
      }
    } catch (e) {
      console.error("Не удалось обновить статус месяца", e);
    }
  };

  const toggleMonth = (m: string) => {
    setExpanded((prev) => ({ ...prev, [m]: !prev[m] }));
  };

  return (
    <div className="p-4 space-y-4 bg-amber-50 min-h-screen">
      <h1 className="text-3xl font-bold text-stone-800 mb-4">Отчёты</h1>

      <div className="space-y-4">
        {months.map((m) => {
          const totals = totalsFor(m);
          const isOpen = !!expanded[m];
          const closed = !!monthClosed[m];
          return (
            <Card key={m} className="border border-amber-200 rounded-xl shadow-sm">
              <CardContent className="p-0">
                <div className={`p-5 ${closed ? "bg-stone-100" : "bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-semibold text-stone-900">{monthLabel(m)}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-stone-700 select-none">
                        <input
                          type="checkbox"
                          checked={closed}
                          onChange={(e) => setClosed(m, e.target.checked)}
                        />
                        Закрыт
                      </label>
                      <button
                        className="text-stone-500 hover:text-stone-700"
                        aria-label={isOpen ? "Свернуть" : "Развернуть"}
                        onClick={() => toggleMonth(m)}
                      >
                        <svg
                          className={`w-6 h-6 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-lg text-stone-800">
                    <span className="font-semibold">{totals.earned.toLocaleString("ru-RU")} ₽ заработано</span>
                    <span className="mx-2 text-stone-500">/</span>
                    <span className="font-semibold">{totals.paid.toLocaleString("ru-RU")} ₽ выплачено</span>
                  </div>

                  <div className="mt-2 text-lg font-semibold text-stone-900">Остаток: {totals.remaining.toLocaleString("ru-RU")} ₽</div>

                  {/* Горизонтальная таблица по сотрудникам за месяц */}
                  {isOpen && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full border border-amber-100">
                        <thead>
                          <tr className="bg-amber-50">
                            <th className="text-left p-2 text-stone-700">Сотрудник</th>
                            <th className="text-right p-2 text-stone-700">Путевое</th>
                            <th className="text-right p-2 text-stone-700">Фирменное</th>
                            <th className="text-right p-2 text-stone-700">Ознакомительное</th>
                            <th className="text-right p-2 text-stone-700">Скрабирование</th>
                            <th className="text-right p-2 text-stone-700">Запарник</th>
                            <th className="text-right p-2 text-stone-700">Часы</th>
                            <th className="text-right p-2 text-stone-700">Заработано</th>
                            <th className="text-right p-2 text-stone-700">Выплачено</th>
                            <th className="text-right p-2 text-stone-700">Остаток</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(reportsByMonth[m] || [])
                            .filter((r) => (r.hours || 0) > 0 || (r.earnings || 0) > 0)
                            .map((r) => {
                              const name = r.display_name || `${r.first_name} ${r.last_name || ""}`;
                              const remaining = Math.max(0, (r.earnings || 0) - (r.total_payouts || 0));
                              return (
                                <tr key={`${m}-${r.user_id}`} className="border-t border-amber-100">
                                  <td className="p-2 text-stone-900 font-medium">{name}</td>
                                  <td className="p-2 text-right">{r.steam_bath || 0}</td>
                                  <td className="p-2 text-right">{r.brand_steam || 0}</td>
                                  <td className="p-2 text-right">{r.intro_steam || 0}</td>
                                  <td className="p-2 text-right">{r.scrubbing || 0}</td>
                                  <td className="p-2 text-right">{r.zaparnik || 0}</td>
                                  <td className="p-2 text-right">{r.hours || 0}</td>
                                  <td className="p-2 text-right font-semibold">{(r.earnings || 0).toLocaleString("ru-RU")} ₽</td>
                                  <td className="p-2 text-right">{(r.total_payouts || 0).toLocaleString("ru-RU")} ₽</td>
                                  <td className="p-2 text-right">{remaining.toLocaleString("ru-RU")} ₽</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}