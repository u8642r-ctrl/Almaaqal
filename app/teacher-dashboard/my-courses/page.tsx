"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function TeacherMyCoursesPage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/teacher/courses")
      .then((r) => r.json())
      .then((data) => {
        setCourses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">بوابة التدريسي</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">موادي الدراسية</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">المواد المسندة إليّ وإحصائيات الطلاب</p>
        </div>

        {loading ? (
          <div className="card-pro flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-[#c8a44e]/20 border-t-[#c8a44e] rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold mt-6">جاري جلب المواد...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="card-pro py-32 text-center">
            <span className="text-6xl mb-4 block opacity-30">📚</span>
            <p className="text-slate-400 font-bold text-lg">لا توجد مواد مسندة إليك حالياً</p>
            <p className="text-slate-300 text-sm mt-2">
              تواصل مع إدارة القسم لإسناد المواد الدراسية
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {courses.map((course: any, index: number) => (
              <div
                key={course.id}
                className="group relative bg-gradient-to-b from-[#0f2744] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#0f2744] p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl border border-[#c8a44e]/20 overflow-hidden cursor-default"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#c8a44e]/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">{course.name}</h3>
                    {course.description && (
                      <p className="text-sm text-white/60 leading-relaxed">
                        {course.description}
                      </p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-black/20 border border-[#c8a44e]/30 text-[#c8a44e] rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 group-hover:border-[#c8a44e]/60 transition-colors">
                    {index + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
