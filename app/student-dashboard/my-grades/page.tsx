"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function MyGradesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/student/grades")
      .then((r) => r.json())
      .then((data) => {
        setGrades(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  const gradeValues = grades.filter((g) => g.grade != null).map((g) => Number(g.grade));
  const gpa =
    gradeValues.length > 0
      ? (gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length).toFixed(2)
      : "--";

  const getGradeLabel = (grade: number) => {
    if (grade >= 90) return { label: "ممتاز", color: "text-emerald-600 bg-emerald-50" };
    if (grade >= 80) return { label: "جيد جداً", color: "text-blue-600 bg-blue-50" };
    if (grade >= 70) return { label: "جيد", color: "text-amber-600 bg-amber-50" };
    if (grade >= 60) return { label: "متوسط", color: "text-orange-600 bg-orange-50" };
    if (grade >= 50) return { label: "مقبول", color: "text-slate-600 bg-slate-100" };
    return { label: "راسب", color: "text-red-600 bg-red-50" };
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center hover:bg-slate-50 transition-all"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
                <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">بوابة الطالب</p>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">درجاتي</h1>
            </div>
          </div>
          <p className="text-slate-500 text-xs md:text-sm mt-1">سجل الدرجات والتقديرات</p>
        </div>

        {/* GPA Card */}
        <div className="card-pro p-5 md:p-8 mb-6 text-center animate-fade-in-up stagger-1">
          <div className="w-11 h-11 md:w-14 md:h-14 mx-auto mb-2 md:mb-3 rounded-xl bg-[#c8a44e]/10 flex items-center justify-center">
            <svg className="w-5 h-5 md:w-7 md:h-7 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-[#0f2744]">{gpa}</h2>
          <p className="text-slate-400 font-semibold mt-2">المعدل التراكمي</p>
          <p className="text-slate-300 text-xs mt-1">
            بناءً على {gradeValues.length} درجة مرصودة
          </p>
        </div>

        {/* Grades Table */}
        <div className="card-pro overflow-hidden animate-fade-in-up stagger-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold mt-6">جاري جلب الدرجات...</p>
            </div>
          ) : grades.length === 0 ? (
            <div className="py-32 text-center">
              <span className="text-6xl mb-4 block opacity-30">📝</span>
              <p className="text-slate-400 font-bold text-lg">لا توجد درجات مرصودة بعد</p>
              <p className="text-slate-300 text-sm mt-2">
                ستظهر درجاتك هنا بعد أن يقوم الأساتذة برصدها
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="hidden md:table w-full text-right border-collapse">
                <thead>
                  <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.15em] border-b border-slate-50">
                    <th className="p-6">#</th>
                    <th className="p-6">المادة</th>
                    <th className="p-6">الرمز</th>
                    <th className="p-6">الفصل</th>
                    <th className="p-6 text-center">الدرجة</th>
                    <th className="p-6 text-center">التقدير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50">
                  {grades.map((g: any, index: number) => {
                    const gradeInfo = g.grade != null ? getGradeLabel(g.grade) : null;
                    return (
                      <tr key={g.id} className="hover:bg-slate-50/80 transition-all">
                        <td className="p-6 text-slate-400 text-sm font-bold">{index + 1}</td>
                        <td className="p-6 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{g.course_name}</span>
                            {g.is_carried_over && (
                              <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-100 text-amber-700 whitespace-nowrap">
                                تحميل
                              </span>
                            )}
                          </div>
                          {g.is_carried_over && (
                            <p className="text-xs text-amber-600 mt-1">
                              من المرحلة {g.original_stage}
                            </p>
                          )}
                        </td>
                        <td className="p-6">
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {g.course_code}
                          </span>
                        </td>
                        <td className="p-6 text-slate-500 text-sm">
                          {g.pass_type === 'second_round' && (
                            <span className="inline-block text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 mr-1">
                              دور ثاني
                            </span>
                          )}
                          {g.semester || "--"}
                        </td>
                        <td className="p-6 text-center">
                          <span className="text-2xl font-black text-slate-900">
                            {g.grade != null ? g.grade : "--"}
                          </span>
                        </td>
                        <td className="p-6 text-center">
                          {gradeInfo && (
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-lg ${gradeInfo.color}`}
                            >
                              {gradeInfo.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100">
                {grades.map((g: any, index: number) => {
                  const gradeInfo = g.grade != null ? getGradeLabel(g.grade) : null;
                  return (
                    <div key={g.id} className="p-4 hover:bg-slate-50/80 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs text-slate-400 font-bold">#{index + 1}</span>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{g.course_code}</span>
                            {g.is_carried_over && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                                تحميل
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-800 text-sm">{g.course_name}</p>
                          {g.is_carried_over && (
                            <p className="text-xs text-amber-600 mt-0.5">من المرحلة {g.original_stage}</p>
                          )}
                          {g.semester && <p className="text-slate-400 text-[11px] mt-1">الفصل: {g.semester}</p>}
                          {g.pass_type === 'second_round' && (
                            <p className="text-xs font-bold text-blue-600 mt-1">دور ثاني</p>
                          )}
                        </div>
                        <div className="text-center flex-shrink-0">
                          <span className="text-xl font-black text-slate-900 block">
                            {g.grade != null ? g.grade : "--"}
                          </span>
                          {gradeInfo && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${gradeInfo.color}`}>
                              {gradeInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
