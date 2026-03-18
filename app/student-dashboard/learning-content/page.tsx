"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type ContentItem = {
  id: number;
  content_type: "lecture" | "homework";
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  course_id: number;
  course_name: string;
  course_code: string;
  homework_grade: number | null;
  homework_feedback: string | null;
  graded_at: string | null;
};

export default function StudentLearningContentPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;

    fetch("/api/student/learning-content")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  const { lectures, homeworks } = useMemo(() => {
    return {
      lectures: items.filter((item) => item.content_type === "lecture"),
      homeworks: items.filter((item) => item.content_type === "homework"),
    };
  }, [items]);

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
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
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
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">المحاضرات والواجبات</h1>
            </div>
          </div>
          <p className="text-slate-500 text-xs md:text-sm mt-1">تظهر لك المواد المنشورة من أساتذتك في المواد المسجل بها</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-pro p-4 md:p-6">
            <h2 className="text-base font-black text-[#0f2744] mb-4">المحاضرات</h2>
            {lectures.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">لا توجد محاضرات منشورة حالياً</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {lectures.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700">محاضرة</span>
                      <span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString("ar-EG")}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.course_name} ({item.course_code})</p>
                    {item.description && <p className="text-xs text-slate-500 mt-2">{item.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-pro p-4 md:p-6">
            <h2 className="text-base font-black text-[#0f2744] mb-4">الواجبات</h2>
            {homeworks.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">لا توجد واجبات منشورة حالياً</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {homeworks.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700">واجب</span>
                      <span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString("ar-EG")}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.course_name} ({item.course_code})</p>
                    {item.description && <p className="text-xs text-slate-500 mt-2">{item.description}</p>}

                    {item.due_date && (
                      <p className="text-[11px] text-amber-700 font-bold mt-2">موعد التسليم: {new Date(item.due_date).toLocaleString("ar-EG")}</p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-[11px] font-bold text-slate-600 mb-1">درجة الواجب:</p>
                      {item.homework_grade !== null && item.homework_grade !== undefined ? (
                        <>
                          <p className="text-sm font-black text-[#059669]">{item.homework_grade} / 100</p>
                          {item.homework_feedback && <p className="text-xs text-slate-500 mt-1">ملاحظة الأستاذ: {item.homework_feedback}</p>}
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">لم يتم رصد الدرجة بعد</p>
                      )}
                    </div>
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
