"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type ContentItem = {
  id: number;
  content_type: "lecture" | "homework";
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  course_name: string;
  file_name: string | null;
  file_data: string | null;
  homework_grade: number | null;
  homework_feedback: string | null;
};

export default function StudentLearningContentPage() {
  const { data: session } = useSession();
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

  const { lectures, homeworks } = useMemo(() => ({
    lectures: items.filter((item) => item.content_type === "lecture"),
    homeworks: items.filter((item) => item.content_type === "homework"),
  }), [items]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] mb-6">المحاضرات والواجبات</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-pro p-4 md:p-6">
            <h2 className="text-base font-black text-[#0f2744] mb-4">المحاضرات</h2>
            {lectures.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">لا توجد محاضرات حالياً</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {lectures.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.course_name}</p>
                    {item.description && <p className="text-xs text-slate-500 mt-2">{item.description}</p>}
                    {item.file_data && item.file_name && (
                      <a href={item.file_data} download={item.file_name} className="inline-block mt-2 text-xs font-bold text-[#2563eb] hover:underline">
                        تحميل المرفق: {item.file_name}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-pro p-4 md:p-6">
            <h2 className="text-base font-black text-[#0f2744] mb-4">الواجبات</h2>
            {homeworks.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">لا توجد واجبات حالياً</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {homeworks.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.course_name}</p>
                    {item.description && <p className="text-xs text-slate-500 mt-2">{item.description}</p>}

                    {item.due_date && (
                      <p className="text-[11px] text-amber-700 font-bold mt-2">موعد التسليم: {new Date(item.due_date).toLocaleString("ar-EG")}</p>
                    )}

                    {item.file_data && item.file_name && (
                      <a href={item.file_data} download={item.file_name} className="inline-block mt-2 text-xs font-bold text-[#2563eb] hover:underline">
                        تحميل المرفق: {item.file_name}
                      </a>
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
