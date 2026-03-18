"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const stageLabels: Record<string, string> = {
  "1": "المرحلة الأولى",
  "2": "المرحلة الثانية",
  "3": "المرحلة الثالثة",
  "4": "المرحلة الرابعة",
  "0": "غير محددة",
};

const termLabels: Record<string, string> = {
  "1": "الكورس الأول",
  "2": "الكورس الثاني",
  "0": "كورس غير محدد",
};

const termColors: Record<string, string> = {
  "1": "bg-blue-50 text-blue-700 border-blue-200",
  "2": "bg-purple-50 text-purple-700 border-purple-200",
  "0": "bg-slate-100 text-slate-500 border-slate-200",
};

function getGradeLabel(grade: number) {
  if (grade >= 90) return { label: "ممتاز",   color: "text-emerald-600 bg-emerald-50" };
  if (grade >= 80) return { label: "جيد جداً", color: "text-blue-600 bg-blue-50" };
  if (grade >= 70) return { label: "جيد",      color: "text-amber-600 bg-amber-50" };
  if (grade >= 60) return { label: "متوسط",    color: "text-orange-600 bg-orange-50" };
  if (grade >= 50) return { label: "مقبول",    color: "text-slate-600 bg-slate-100" };
  return             { label: "راسب",           color: "text-red-600 bg-red-50" };
}

function getPassBadge(passType: string | null) {
  if (passType === "second_round")
    return { label: "الدور الثاني", color: "text-blue-600 bg-blue-50" };
  return { label: "الدور الأول", color: "text-emerald-600 bg-emerald-50" };
}

export default function TranscriptPage() {
  const { data: session } = useSession();
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/student/transcript")
      .then((r) => r.json())
      .then((data) => { setGrades(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  // ── إحصائيات ──────────────────────────────────────────────
  // حساب المعدل من الكورسات التي لها درجات فقط
  const gradesWithScores = grades.filter((g) => g.grade != null);
  const gpa = gradesWithScores.length > 0
    ? (gradesWithScores.reduce((s, g) => s + (parseFloat(g.grade) || 0), 0) / gradesWithScores.length).toFixed(1)
    : "—";

  const totalCourses = grades.length;
  const coursesWithGrades = gradesWithScores.length;
  const coursesPending = totalCourses - coursesWithGrades;

  // ── تجميع: مرحلة → كورس → مواد ────────────────────────────
  // grouped[stage][term] = grade[]
  const grouped: Record<string, Record<string, any[]>> = {};
  for (const g of grades) {
    const s = g.stage || "0";
    const t = g.term  || "0";
    if (!grouped[s]) grouped[s] = {};
    if (!grouped[s][t]) grouped[s][t] = [];
    grouped[s][t].push(g);
  }

  const stageOrder = ["1", "2", "3", "4", "0"];
  const termOrder  = ["1", "2", "0"];
  const orderedStages = stageOrder.filter((s) => grouped[s]);

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-5xl mx-auto">

        {/* ── الترويسة ─────────────────────────────────────── */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">بوابة الطالب</p>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-[#0f2744]">السجل الأكاديمي</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">مرتّب حسب المرحلة والكورس</p>
        </div>

        {/* ── ملخص الإحصائيات ──────────────────────────────── */}
        {!loading && grades.length > 0 && (
          <div className="card-pro p-4 md:p-5 mb-6 animate-fade-in-up stagger-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div>
                <p className="text-[11px] text-slate-400 font-bold">إجمالي المواد</p>
                <p className="text-2xl font-black text-[#0f2744]">{totalCourses}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">مسجّلة</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold">مواد مرصودة</p>
                <p className="text-2xl font-black text-emerald-600">{coursesWithGrades}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">لها درجات</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold">مواد معلقة</p>
                <p className="text-2xl font-black text-amber-500">{coursesPending}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">بانتظار الرصد</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold">المعدل التراكمي</p>
                <p className="text-2xl font-black text-[#2563eb]">{gpa}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">من {coursesWithGrades} مادة</p>
              </div>
            </div>
          </div>
        )}

        {/* ── حالات التحميل والفراغ ────────────────────────── */}
        {loading ? (
          <div className="card-pro flex flex-col items-center justify-center py-24 animate-fade-in-up">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold mt-4 text-sm">جاري التحميل...</p>
          </div>
        ) : grades.length === 0 ? (
          <div className="card-pro py-24 text-center animate-fade-in-up">
            <p className="text-4xl mb-3 opacity-30">📋</p>
            <p className="text-slate-400 font-bold">لا توجد مواد مسجلة</p>
            <p className="text-slate-300 text-sm mt-1">تواصل مع إدارة الشؤون الأكاديمية للتسجيل في المواد</p>
          </div>
        ) : (

          // ── المراحل ─────────────────────────────────────────
          <div className="space-y-6 animate-fade-in-up stagger-2">
            {orderedStages.map((stageKey) => {
              const orderedTerms = termOrder.filter((t) => grouped[stageKey][t]);

              return (
                <div key={stageKey} className="card-pro overflow-hidden">

                  {/* رأس المرحلة */}
                  <div className="flex items-center gap-3 px-4 md:px-6 py-4 bg-[#0f2744] text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-black">
                      {stageKey === "0" ? "؟" : stageKey}
                    </div>
                    <div>
                      <h2 className="font-black text-base md:text-lg">{stageLabels[stageKey]}</h2>
                      <p className="text-white/50 text-xs">
                        {Object.values(grouped[stageKey]).flat().length} مادة
                        &nbsp;·&nbsp;
                        {orderedTerms.length} كورس
                      </p>
                    </div>
                  </div>

                  {/* الكورسات ضمن المرحلة */}
                  <div className="divide-y divide-slate-100">
                    {orderedTerms.map((termKey) => {
                      const termGrades = grouped[stageKey][termKey];
                      // حساب المعدل من المواد التي لها درجات فقط
                      const termGradesWithScores = termGrades.filter((g: any) => g.grade != null);
                      const termAvg = termGradesWithScores.length > 0
                        ? (termGradesWithScores.reduce((s: number, g: any) => s + (parseFloat(g.grade) || 0), 0) / termGradesWithScores.length).toFixed(1)
                        : "—";

                      return (
                        <div key={termKey}>

                          {/* رأس الكورس */}
                          <div className="flex items-center justify-between px-4 md:px-6 py-2.5 bg-slate-50 border-b border-slate-100">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${termColors[termKey]}`}>
                              {termLabels[termKey]}
                            </span>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span>{termGrades.length} مادة ({termGradesWithScores.length} مرصودة)</span>
                              <span>معدل الكورس: <span className="font-black text-slate-600">{termAvg}</span></span>
                            </div>
                          </div>

                          {/* جدول Desktop */}
                          <table className="hidden md:table w-full text-right">
                            <thead>
                              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                                <th className="px-6 py-2.5">#</th>
                                <th className="px-6 py-2.5">المادة</th>
                                <th className="px-6 py-2.5">الرمز</th>
                                <th className="px-6 py-2.5">السنة</th>
                                <th className="px-6 py-2.5 text-center">الدرجة</th>
                                <th className="px-6 py-2.5 text-center">التقدير</th>
                                <th className="px-6 py-2.5 text-center">الحالة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {termGrades.map((g: any, i: number) => {
                                const hasGrade = g.grade != null;
                                const n = hasGrade ? parseFloat(g.grade) : null;
                                const gradeInfo = n != null && !isNaN(n) ? getGradeLabel(n) : null;
                                const passInfo  = hasGrade ? getPassBadge(g.pass_type) : null;
                                return (
                                  <tr key={g.enrollment_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3.5 text-slate-400 text-sm">{i + 1}</td>
                                    <td className="px-6 py-3.5 font-bold text-slate-800">{g.course_name}</td>
                                    <td className="px-6 py-3.5">
                                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{g.course_code}</span>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-500 text-sm">{g.semester || "—"}</td>
                                    <td className="px-6 py-3.5 text-center font-black text-xl text-slate-900">
                                      {hasGrade ? (n != null && !isNaN(n) ? n : "—") : "—"}
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                      {gradeInfo ? (
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${gradeInfo.color}`}>{gradeInfo.label}</span>
                                      ) : (
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400">لم يُرصد</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                      {passInfo ? (
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${passInfo.color}`}>{passInfo.label}</span>
                                      ) : (
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600">معلق</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {/* قائمة Mobile */}
                          <div className="md:hidden divide-y divide-slate-100">
                            {termGrades.map((g: any, i: number) => {
                              const hasGrade = g.grade != null;
                              const n = hasGrade ? parseFloat(g.grade) : null;
                              const gradeInfo = n != null && !isNaN(n) ? getGradeLabel(n) : null;
                              const passInfo  = hasGrade ? getPassBadge(g.pass_type) : null;
                              return (
                                <div key={g.enrollment_id} className="flex items-center justify-between gap-3 px-4 py-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{g.course_code}</span>
                                      {passInfo ? (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${passInfo.color}`}>{passInfo.label}</span>
                                      ) : (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-600">معلق</span>
                                      )}
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm truncate">{g.course_name}</p>
                                    {g.semester && <p className="text-slate-400 text-[11px]">{g.semester}</p>}
                                  </div>
                                  <div className="text-left flex-shrink-0">
                                    <p className="text-xl font-black text-slate-900">
                                      {hasGrade ? (n != null && !isNaN(n) ? n : "—") : "—"}
                                    </p>
                                    {gradeInfo ? (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${gradeInfo.color}`}>{gradeInfo.label}</span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400">لم يُرصد</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
