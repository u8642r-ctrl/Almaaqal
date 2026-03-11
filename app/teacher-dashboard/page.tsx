"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function TeacherDashboardPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;

    Promise.all([
      fetch("/api/teacher/profile").then((r) => r.json()),
      fetch("/api/teacher/courses").then((r) => r.json()),
    ])
      .then(([profileData, coursesData]) => {
        setProfile(profileData?.error ? null : profileData);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  const totalStudents = courses.reduce((sum, c) => sum + Number(c.student_count || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-[#059669]/20 border-t-[#059669] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-semibold text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">بوابة التدريسي</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">
            مرحبا، {session?.user?.name || "أستاذ"}
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">جامعة المعقل - النظام الأكاديمي</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-1 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#059669]/60 via-[#059669] to-[#059669]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#059669]/5 rounded-full blur-2xl group-hover:bg-[#059669]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#059669]/20 to-[#059669]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#059669]/10 text-[#059669] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">مادة</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{courses.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">المواد التي أدرّسها</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#059669]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#059669] to-[#059669]/60 rounded-full" style={{width: '75%'}}></div>
              </div>
            </div>
          </div>
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-2 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2563eb]/60 via-[#2563eb] to-[#2563eb]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#2563eb]/5 rounded-full blur-2xl group-hover:bg-[#2563eb]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#2563eb]/20 to-[#2563eb]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#2563eb]/10 text-[#2563eb] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">طالب</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{totalStudents}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">إجمالي طلابي</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#2563eb]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#2563eb] to-[#2563eb]/60 rounded-full" style={{width: '65%'}}></div>
              </div>
            </div>
          </div>
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-3 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c8a44e]/60 via-[#c8a44e] to-[#c8a44e]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#c8a44e]/5 rounded-full blur-2xl group-hover:bg-[#c8a44e]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#c8a44e]/20 to-[#c8a44e]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#c8a44e]/10 text-[#c8a44e] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">فعّال</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#059669]">فعّال</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">حالة الحساب</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#c8a44e]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#c8a44e] to-[#c8a44e]/60 rounded-full" style={{width: '100%'}}></div>
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

        {/* My Courses */}
        <div className="card-pro p-4 md:p-6 mb-6 animate-fade-in-up stagger-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-black text-[#0f2744] flex items-center gap-2">
              <svg className="w-5 h-5 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              موادي الدراسية
            </h2>
            <Link href="/teacher-dashboard/my-courses" className="text-xs font-bold text-[#059669] hover:text-[#0f2744] transition-colors">
              عرض الكل
            </Link>
          </div>
          {courses.length === 0 ? (
            <p className="text-slate-400 text-center py-8 text-sm">لا توجد مواد مسندة إليك حالياً</p>
          ) : (
            <div className="space-y-2">
              {courses.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f0f4f8] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#059669]/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div>
                      <span className="font-bold text-[#0f2744] text-sm">{c.name}</span>
                      <span className="text-slate-400 text-xs mr-2">({c.code})</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#059669] bg-[#059669]/10 px-2.5 py-1 rounded-lg">
                    {c.student_count} طالب
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
          <Link href="/teacher-dashboard/my-courses" className="card-pro p-4 md:p-6 group animate-fade-in-up stagger-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#0f2744] group-hover:text-[#059669] transition-colors">موادي الدراسية</h2>
                <p className="text-slate-400 text-xs md:text-sm mt-1">إدارة المواد وعرض الطلاب</p>
              </div>
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-[#059669]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4 md:w-6 md:h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
            </div>
          </Link>

          <Link href="/teacher-dashboard/grades" className="card-pro p-4 md:p-6 group animate-fade-in-up stagger-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#0f2744] group-hover:text-[#059669] transition-colors">إدارة الدرجات</h2>
                <p className="text-slate-400 text-xs md:text-sm mt-1">رصد وتعديل درجات الطلاب</p>
              </div>
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-[#c8a44e]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4 md:w-6 md:h-6 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
