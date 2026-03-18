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

      setCourses(coursesRes.status === "fulfilled" && Array.isArray(coursesRes.value) ? coursesRes.value : []);
      setContentList(contentRes.status === "fulfilled" && Array.isArray(contentRes.value) ? contentRes.value : []);
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

    if (file.size > 10 * 1024 * 1024) {
      setToast({ type: "error", text: "حجم الملف يجب أن يكون أقل من 10MB" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileContent({ name: file.name, data: reader.result as string });
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

      setToast({ type: "success", text: "تم إرسال المحتوى بنجاح" });
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
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center">←</button>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744]">إرسال المحاضرات والواجبات</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-pro p-4 md:p-6">
            <h2 className="text-base font-black text-[#0f2744] mb-4">محتوى جديد</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المادة</label>
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <option value="">اختر المادة</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">النوع</label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value as "lecture" | "homework")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <option value="lecture">محاضرة</option>
                  <option value="homework">واجب</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">العنوان</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ملف أو صورة (اختياري)</label>
                <input type="file" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
                {fileContent && <p className="text-xs text-emerald-600 mt-2">✓ تم تحميل: {fileContent.name}</p>}
              </div>

              {contentType === "homework" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">موعد التسليم (اختياري)</label>
                  <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
                </div>
              )}

              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#059669] text-white font-bold py-2.5 disabled:opacity-50">
                {submitting ? "جارٍ الإرسال..." : "إرسال"}
              </button>
            </form>
          </div>

          <div className="card-pro p-4 md:p-6">
            <h2 className="text-base font-black text-[#0f2744] mb-4">آخر ما تم نشره</h2>
            {contentList.length === 0 ? (
              <p className="text-sm text-slate-400">لا يوجد محتوى منشور بعد</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {contentList.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700">{item.content_type === "lecture" ? "محاضرة" : "واجب"}</span>
                      <span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString("ar-EG")}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.course_name}</p>
                    {item.description && <p className="text-xs text-slate-500 mt-2">{item.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-6 px-4 py-2 rounded-lg text-white text-sm font-bold shadow-lg ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
