"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import JsBarcode from "jsbarcode";

// مكوّن عرض باركود Code128 (مبسط)
function BarcodeCanvas({ value, width = 200, height = 60 }: { value: string; width?: number; height?: number }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.5,
        height: Math.max(40, height - 20),
        displayValue: true,
        fontSize: 12,
        font: 'monospace',
        textMargin: 4,
        margin: 5,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch (err) {
      console.error('Barcode error', err);
    }
  }, [value, width, height]);

  return <svg ref={svgRef} style={{ maxWidth: width }} />;
}

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;

    Promise.all([
      fetch("/api/student/profile").then((r) => r.json()),
      fetch("/api/student/courses").then((r) => r.json()),
      fetch("/api/student/grades").then((r) => r.json()),
    ])
      .then(([profileData, coursesData, gradesData]) => {
        setProfile(profileData?.error ? null : profileData);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setGrades(Array.isArray(gradesData) ? gradesData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  const gradeValues = grades.filter((g) => g.grade != null).map((g) => Number(g.grade));
  const gpa =
    gradeValues.length > 0
      ? (gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length).toFixed(1)
      : "--";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-[#2563eb]/20 border-t-[#2563eb] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-semibold text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 overflow-x-hidden font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">بوابة الطالب</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">
            مرحبا، {session?.user?.name || "طالب"}
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">جامعة المعقل - النظام الأكاديمي</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-1 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2563eb]/60 via-[#2563eb] to-[#2563eb]/60"></div>
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#2563eb]/5 rounded-full blur-2xl group-hover:bg-[#2563eb]/10 transition-all duration-500 hidden md:block"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#2563eb]/20 to-[#2563eb]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#2563eb]/10 text-[#2563eb] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">مسجل</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{courses.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">المواد المسجلة</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#2563eb]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#2563eb] to-[#2563eb]/60 rounded-full" style={{width: '80%'}}></div>
              </div>
            </div>
          </div>
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-2 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#059669]/60 via-[#059669] to-[#059669]/60"></div>
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#059669]/5 rounded-full blur-2xl group-hover:bg-[#059669]/10 transition-all duration-500 hidden md:block"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#059669]/20 to-[#059669]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#059669]/10 text-[#059669] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">مرصود</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{grades.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">الدرجات المرصودة</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#059669]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#059669] to-[#059669]/60 rounded-full" style={{width: courses.length > 0 ? `${Math.min((grades.length / courses.length) * 100, 100)}%` : '0%'}}></div>
              </div>
            </div>
          </div>
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-3 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c8a44e]/60 via-[#c8a44e] to-[#c8a44e]/60"></div>
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#c8a44e]/5 rounded-full blur-2xl group-hover:bg-[#c8a44e]/10 transition-all duration-500 hidden md:block"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#c8a44e]/20 to-[#c8a44e]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#c8a44e]/10 text-[#c8a44e] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">GPA</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{gpa}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">المعدل التراكمي</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#c8a44e]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#c8a44e] to-[#c8a44e]/60 rounded-full" style={{width: `${(parseFloat(gpa) / 4) * 100}%`}}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        {profile && (
          <div className="card-pro p-4 md:p-6 mb-6 animate-fade-in-up stagger-4">
            <h2 className="text-base font-black text-[#0f2744] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              معلوماتي الشخصية
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-[#f0f4f8] p-4 rounded-xl">
                <span className="text-slate-400 font-semibold text-xs">الاسم الكامل</span>
                <p className="font-bold text-[#0f2744] mt-1">{profile.name}</p>
              </div>
              <div className="bg-[#f0f4f8] p-4 rounded-xl">
                <span className="text-slate-400 font-semibold text-xs">البريد الإلكتروني</span>
                <p className="font-bold text-[#0f2744] mt-1">{profile.email}</p>
              </div>
              <div className="bg-[#f0f4f8] p-4 rounded-xl">
                <span className="text-slate-400 font-semibold text-xs">القسم</span>
                <p className="font-bold text-[#0f2744] mt-1">{profile.department || "غير محدد"}</p>
              </div>
              <div className="bg-[#f0f4f8] p-4 rounded-xl">
                <span className="text-slate-400 font-semibold text-xs">رقم الهاتف</span>
                <p className="font-bold text-[#0f2744] mt-1" dir="ltr">{profile.phone || "غير محدد"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Student Barcode Card */}
        {profile && (
          <div className="card-pro p-4 md:p-6 mb-6 animate-fade-in-up">
            <h2 className="text-base font-black text-[#0f2744] mb-4">بطاقة الحضور</h2>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white border-2 border-slate-200 rounded-xl p-6 text-center w-full md:w-1/2">
                <div className="text-[#c8a44e] font-black text-sm mb-1">جامعة المعقل</div>
                <div className="text-[10px] text-slate-400 mb-2">بطاقة تسجيل الحضور</div>
                <div className="font-black text-lg text-slate-900 mb-1">{profile.name}</div>
                <div className="text-xs text-slate-400 mb-3">{profile.department || '—'}</div>
                <BarcodeCanvas value={`STU-${profile.id}`} width={260} height={80} />
                <div className="mt-3 text-sm text-slate-500 font-mono">STU-{profile.id}</div>
              </div>
              <div className="w-full md:w-1/2">
                <p className="text-sm text-slate-600 mb-3">يمكنك عرض هذه البطاقة لمدرّسك ليقوم بمسحها لتسجيل حضورك. أو طباعتها إذا رغبت.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.print()}
                    className="bg-gradient-to-l from-[#0f2744] to-[#1a3a5c] text-white px-6 py-3 rounded-xl font-bold shadow-lg"
                  >طباعة البطاقة</button>
                  <Link href="/student-dashboard/scan-attendance" className="px-6 py-3 rounded-xl border border-slate-200 font-bold">مسح حضور آخر</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <Link href="/student-dashboard/my-courses" className="card-pro p-6 group animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#0f2744] group-hover:text-[#2563eb] transition-colors">موادي الدراسية</h2>
                <p className="text-slate-400 text-sm mt-1">عرض المواد المسجلة والأساتذة</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#2563eb]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
            </div>
          </Link>

          <Link href="/student-dashboard/my-grades" className="card-pro p-6 group animate-fade-in-up stagger-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#0f2744] group-hover:text-[#2563eb] transition-colors">درجاتي</h2>
                <p className="text-slate-400 text-sm mt-1">عرض الدرجات والمعدل التراكمي</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#059669]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </div>
            </div>
          </Link>

          <Link href="/student-dashboard/academic-view" className="card-pro p-6 group animate-fade-in-up stagger-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#0f2744] group-hover:text-[#2563eb] transition-colors">السجل الأكاديمي</h2>
                <p className="text-slate-400 text-sm mt-1">عرض كامل السجل الأكاديمي</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#c8a44e]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
