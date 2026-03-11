"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0 });
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentTeachers, setRecentTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/students").then((r) => r.json()),
      fetch("/api/teachers").then((r) => r.json()),
      fetch("/api/courses").then((r) => r.json()),
    ])
      .then(([students, teachers, courses]) => {
        const s = Array.isArray(students) ? students : [];
        const t = Array.isArray(teachers) ? teachers : [];
        const c = Array.isArray(courses) ? courses : [];
        setStats({ students: s.length, teachers: t.length, courses: c.length });
        setRecentStudents(s.slice(0, 5));
        setRecentTeachers(t.slice(0, 5));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#1a3a5c] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#1a3a5c]/50 uppercase tracking-widest">لوحة التحكم</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">نظرة عامة على النظام</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">إدارة النظام الأكاديمي لجامعة المعقل</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-1 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2563eb]/60 via-[#2563eb] to-[#2563eb]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#2563eb]/5 rounded-full blur-2xl group-hover:bg-[#2563eb]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#2563eb]/20 to-[#2563eb]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#2563eb]/10 text-[#2563eb] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">نشط</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{loading ? "..." : stats.students}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">إجمالي الطلاب</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#2563eb]/10 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-l from-[#2563eb] to-[#2563eb]/60 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-2 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#059669]/60 via-[#059669] to-[#059669]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#059669]/5 rounded-full blur-2xl group-hover:bg-[#059669]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#059669]/20 to-[#059669]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#059669]/10 text-[#059669] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">نشط</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{loading ? "..." : stats.teachers}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">إجمالي الأساتذة</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#059669]/10 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-gradient-to-l from-[#059669] to-[#059669]/60 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-3 group col-span-2 md:col-span-1">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7c3aed]/60 via-[#7c3aed] to-[#7c3aed]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#7c3aed]/5 rounded-full blur-2xl group-hover:bg-[#7c3aed]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#7c3aed]/20 to-[#7c3aed]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#7c3aed]/10 text-[#7c3aed] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">نشط</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{loading ? "..." : stats.courses}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">المواد الدراسية</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#7c3aed]/10 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-l from-[#7c3aed] to-[#7c3aed]/60 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-pro p-4 md:p-6 mb-6 md:mb-8 animate-fade-in-up stagger-4">
          <h2 className="text-base font-black text-[#0f2744] mb-4 md:mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            الإجراءات السريعة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Link href="/students" className="p-4 md:p-5 bg-gradient-to-bl from-[#2563eb]/5 to-[#2563eb]/10 rounded-2xl hover:from-[#2563eb]/10 hover:to-[#2563eb]/20 transition-all text-center group border border-[#2563eb]/10">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 rounded-xl bg-[#2563eb]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
              </div>
              <span className="font-bold text-[#2563eb] text-sm">إدارة الطلاب</span>
              <p className="text-slate-400 text-xs mt-1">إضافة، تعديل، حذف</p>
            </Link>
            <Link href="/teachers" className="p-4 md:p-5 bg-gradient-to-bl from-[#059669]/5 to-[#059669]/10 rounded-2xl hover:from-[#059669]/10 hover:to-[#059669]/20 transition-all text-center group border border-[#059669]/10">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 rounded-xl bg-[#059669]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              </div>
              <span className="font-bold text-[#059669] text-sm">إدارة الأساتذة</span>
              <p className="text-slate-400 text-xs mt-1">إضافة، تعديل، حذف</p>
            </Link>
            <Link href="/courses" className="p-4 md:p-5 bg-gradient-to-bl from-[#7c3aed]/5 to-[#7c3aed]/10 rounded-2xl hover:from-[#7c3aed]/10 hover:to-[#7c3aed]/20 transition-all text-center group border border-[#7c3aed]/10">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <span className="font-bold text-[#7c3aed] text-sm">إدارة المواد</span>
              <p className="text-slate-400 text-xs mt-1">إضافة، تعديل، حذف</p>
            </Link>
            <Link href="/faculties" className="p-4 md:p-5 bg-gradient-to-bl from-[#e07b39]/5 to-[#e07b39]/10 rounded-2xl hover:from-[#e07b39]/10 hover:to-[#e07b39]/20 transition-all text-center group border border-[#e07b39]/10">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 rounded-xl bg-[#e07b39]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-[#e07b39]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
              </div>
              <span className="font-bold text-[#e07b39] text-sm">الكليات والأقسام</span>
              <p className="text-slate-400 text-xs mt-1">إضافة، تعديل، حذف</p>
            </Link>
          </div>
        </div>

        {/* Recent Records */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 animate-fade-in-up stagger-5">
          <div className="card-pro p-4 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-[#0f2744] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#2563eb]"></div>
                آخر الطلاب المسجلين
              </h2>
              <Link href="/students" className="text-xs font-bold text-[#2563eb] hover:text-[#1a3a5c] transition-colors">
                عرض الكل
              </Link>
            </div>
            {recentStudents.length === 0 ? (
              <p className="text-slate-400 text-center py-8 text-sm">لا توجد بيانات</p>
            ) : (
              <div className="space-y-2">
                {recentStudents.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f0f4f8] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#2563eb]/10 flex items-center justify-center text-xs font-bold text-[#2563eb]">
                        {s.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-[#0f2744] text-sm">{s.name}</p>
                        <p className="text-slate-400 text-xs">{s.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">#{s.id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-pro p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <h2 className="text-base font-black text-[#0f2744] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#059669]"></div>
                آخر الأساتذة المسجلين
              </h2>
              <Link href="/teachers" className="text-xs font-bold text-[#059669] hover:text-[#0f2744] transition-colors">
                عرض الكل
              </Link>
            </div>
            {recentTeachers.length === 0 ? (
              <p className="text-slate-400 text-center py-8 text-sm">لا توجد بيانات</p>
            ) : (
              <div className="space-y-2">
                {recentTeachers.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f0f4f8] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#059669]/10 flex items-center justify-center text-xs font-bold text-[#059669]">
                        {t.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-[#0f2744] text-sm">{t.name}</p>
                        <p className="text-slate-400 text-xs">{t.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">#{t.id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
