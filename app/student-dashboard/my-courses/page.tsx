"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function MyCoursesPage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/student/courses")
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
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">بوابة الطالب</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">موادي الدراسية</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">قائمة المواد المسجلة في الفصل الحالي</p>
        </div>

        <div className="card-pro overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold mt-6">جاري جلب المواد...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="py-32 text-center">
              <span className="text-6xl mb-4 block opacity-30">📖</span>
              <p className="text-slate-400 font-bold text-lg">لا توجد مواد مسجلة حالياً</p>
              <p className="text-slate-300 text-sm mt-2">
                تواصل مع إدارة الشؤون الأكاديمية للتسجيل
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
                    <div className="w-9 h-9 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-lg flex-shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{course.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {course.code}
                        </span>
                        {course.description && (
                          <span className="text-xs text-slate-400">{course.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right sm:text-left mr-auto sm:mr-0 flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                      {course.teacher_name || "غير محدد"}
                    </span>
                    {course.enrolled_at && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        تسجيل:{" "}
                        {new Date(course.enrolled_at).toLocaleDateString("ar-EG")}
                      </p>
                    )}
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
