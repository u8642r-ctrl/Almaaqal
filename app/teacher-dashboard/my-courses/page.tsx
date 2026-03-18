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

        <div className="card-pro overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold mt-6">جاري جلب المواد...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="py-32 text-center">
              <span className="text-6xl mb-4 block opacity-30">📚</span>
              <p className="text-slate-400 font-bold text-lg">لا توجد مواد مسندة إليك حالياً</p>
              <p className="text-slate-300 text-sm mt-2">
                تواصل مع إدارة القسم لإسناد المواد الدراسية
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {courses.map((course: any, index: number) => (
                <div
                  key={course.id}
                  className="p-4 md:p-6 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 md:gap-6">
                    <div className="w-9 h-9 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-lg flex-shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{course.name}</h3>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
