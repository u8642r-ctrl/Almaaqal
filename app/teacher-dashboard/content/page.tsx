"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function TeacherContentPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [courses, setCourses] = useState<any[]>([]);
  const [contentList, setContentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [courseId, setCourseId] = useState("");
  const [contentType, setContentType] = useState<"lecture" | "homework">("lecture");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fileContent, setFileContent] = useState<{name: string; data: string} | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [coursesRes, contentRes] = await Promise.allSettled([
        fetch("/api/teacher/courses").then((r) => r.json()),
        fetch("/api/teacher/learning-content").then((r) => r.json()),
      ]);

      if (coursesRes.status === "fulfilled") {
        setCourses(Array.isArray(coursesRes.value) ? coursesRes.value : []);
      } else {
        setCourses([]);
        setToast({ type: "error", text: "تعذر جلب مواد الأستاذ" });
      }

      if (contentRes.status === "fulfilled") {
        setContentList(Array.isArray(contentRes.value) ? contentRes.value : []);
      } else {
        setContentList([]);
        setToast({ type: "error", text: "تعذر جلب المحتوى المنشور" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.email) return;
    loadData();
  }, [session]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // حد أقصى 10 MB
    if (file.size > 10 * 1024 * 1024) {
      setToast({ type: "error", text: "حجم الملف يجب أن يكون أقل من 10 MB" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setFileContent({ name: file.name, data });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!courseId || !title.trim()) {
      setToast({ type: "error", text: "يرجى اختيار المادة وكتابة العنوان" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/teacher/learning-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: Number(courseId),
          content_type: contentType,
          title: title.trim(),
          description: description.trim(),
          due_date: contentType === "homework" && dueDate ? dueDate : null,
          file: fileContent ? { name: fileContent.name, data: fileContent.data } : null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setToast({ type: "error", text: result?.error || "فشل في الإرسال" });
        setSubmitting(false);
        return;
      }

      setToast({ type: "success", text: "تم إرسال المحتوى للطلاب بنجاح" });
      setTitle("");
      setDescription("");
      setDueDate("");
      setFileContent(null);
      await loadData();
    } catch {
      setToast({ type: "error", text: "خطأ في الاتصال" });
    } finally {
      setSubmitting(false);
    }
  };

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
                <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
                <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">بوابة التدريسي</p>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">إرسال المحاضرات والواجبات</h1>
            </div>
          </div>
          <p className="text-slate-500 text-xs md:text-sm mt-1">نشر محاضرات أو واجبات للطلاب المسجلين في المادة</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-pro p-4 md:p-6">
            <h2 className="text-base font-black text-[#0f2744] mb-4">محتوى جديد</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المادة</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-[#059669] outline-none"
                >
                  <option value="">اختر المادة</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">النوع</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as "lecture" | "homework")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-[#059669] outline-none"
                >
                  <option value="lecture">محاضرة</option>
                  <option value="homework">واجب</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">العنوان</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-[#059669] outline-none"
                  placeholder="مثال: واجب الفصل الثالث"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-[#059669] outline-none"
                  placeholder="تفاصيل المحاضرة أو متطلبات الواجب"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ملف أو صورة (اختياري)</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-[#059669] outline-none"
                  />
                  {fileContent && (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-[#059669]/5 rounded-lg">
                      <span className="text-xs font-semibold text-[#059669]">✓ تم تحميل: {fileContent.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {contentType === "homework" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">موعد التسليم (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-[#059669] outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-l from-[#059669] to-[#047857] text-white py-3 font-bold disabled:opacity-50"
              >
                {submitting ? "جاري الإرسال..." : "إرسال للطلاب"}
              </button>
            </form>
          </div>

          <div className="card-pro p-4 md:p-6">
            <h2 className="text-base font-black text-[#0f2744] mb-4">آخر ما تم إرساله</h2>
            {contentList.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">لا يوجد محتوى مرسل بعد</p>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {contentList.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${item.content_type === "homework" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                        {item.content_type === "homework" ? "واجب" : "محاضرة"}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString("ar-EG")}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.course_name} ({item.course_code})</p>
                    {item.description && <p className="text-xs text-slate-500 mt-2">{item.description}</p>}
                    {item.content_type === "homework" && item.due_date && (
                      <p className="text-[11px] text-amber-700 font-bold mt-2">موعد التسليم: {new Date(item.due_date).toLocaleString("ar-EG")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-fit px-5 py-3 rounded-xl text-white font-bold text-sm shadow-2xl z-[70] ${toast.type === "success" ? "bg-slate-900" : "bg-red-500"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
