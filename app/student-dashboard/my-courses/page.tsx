"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function MyCoursesPage() {
  const router = useRouter();
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

  // تجميع الكورسات حسب المرحلة
  const coursesByStage: Record<string, any[]> = {};
  for (const course of courses) {
    const stage = course.stage || "غير محددة";
    if (!coursesByStage[stage]) coursesByStage[stage] = [];
    coursesByStage[stage].push(course);
  }

  const stageOrder = ["1", "2", "3", "4", "غير محددة"];
  const orderedStages = stageOrder.filter((s) => coursesByStage[s]);

  const stageLabels: Record<string, string> = {
    "1": "المرحلة الأولى",
    "2": "المرحلة الثانية",
    "3": "المرحلة الثالثة",
    "4": "المرحلة الرابعة",
    "غير محددة": "مواد عامة",
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
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">موادي الدراسية</h1>
            </div>
          </div>
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
            <div className="space-y-6">
              {orderedStages.map((stageKey) => (
                <div key={stageKey}>
                  {/* رأس المرحلة */}
                  <div className="flex items-center gap-3 px-4 md:px-6 py-3 bg-[#0f2744] text-white rounded-t-2xl">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-black">
                      {stageKey === "غير محددة" ? "؟" : stageKey}
                    </div>
                    <div>
                      <h2 className="font-black text-base">{stageLabels[stageKey]}</h2>
                      <p className="text-white/50 text-xs">{coursesByStage[stageKey].length} مادة</p>
                    </div>
                  </div>

                  {/* الكورسات */}
                  <div className="card-pro rounded-t-none divide-y divide-slate-50">
                    {coursesByStage[stageKey].map((course: any, index: number) => (
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
                            {course.description && (
                              <span className="text-xs text-slate-400 mt-1">{course.description}</span>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
