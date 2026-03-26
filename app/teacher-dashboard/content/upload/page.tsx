"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Course = {
  id: number;
  name: string;
  code: string;
};

export default function ContentUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form state
  const [courseId, setCourseId] = useState("");
  const [contentType, setContentType] = useState("lecture");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [maxGrade, setMaxGrade] = useState("10");
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchCourses();
  }, [session]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/teacher/courses");
      const data = await response.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!courseId || !title || !stage) {
      alert("الرجاء إدخال المادة والعنوان والمرحلة");
      return;
    }

    try {
      setSubmitLoading(true);

      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("contentType", contentType);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("stage", stage);
      if (contentType === "homework") {
        if (dueDate) formData.append("dueDate", dueDate);
        formData.append("maxGrade", maxGrade);
      }
      if (file) {
        formData.append("file", file);
      }

      const response = await fetch("/api/teacher/content", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "تم رفع المحتوى بنجاح");
        router.push("/teacher-dashboard/content");
      } else {
        alert(data.error || "فشل في رفع المحتوى");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/teacher-dashboard/content"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
                <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">بوابة التدريسي</p>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0f2744] tracking-tight">رفع محتوى تعليمي جديد</h1>
              <p className="text-slate-500 text-xs md:text-sm mt-1">إضافة محاضرات ومواد تعليمية للطلاب</p>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="card-pro p-6 md:p-8 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Content Type Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">نوع المحتوى</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setContentType("lecture")}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    contentType === "lecture"
                      ? "border-[#059669] bg-[#059669]/10 text-[#059669]"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v14a2 2 0 002 2h6a2 2 0 002-2V4m-7 7h2m-2 4h2" />
                  </svg>
                  <p className="font-bold text-sm">محاضرة</p>
                  <p className="text-xs opacity-70">مواد تعليمية ومحاضرات</p>
                </button>
                <button
                  type="button"
                  onClick={() => setContentType("homework")}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    contentType === "homework"
                      ? "border-[#059669] bg-[#059669]/10 text-[#059669]"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <p className="font-bold text-sm">واجب دراسي</p>
                  <p className="text-xs opacity-70">مهام وواجبات للطلاب</p>
                </button>
              </div>
            </div>

            {/* Course Selection */}
            <div className="space-y-2">
              <label htmlFor="courseId" className="block text-sm font-bold text-slate-700">المادة الدراسية *</label>
              <select
                id="courseId"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                required
                disabled={loading}
              >
                <option value="">اختر المادة الدراسية</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div className="space-y-2">
              <label htmlFor="stage" className="block text-sm font-bold text-slate-700">المرحلة *</label>
              <select
                id="stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                required
              >
                <option value="">اختر المرحلة</option>
                <option value="1">المرحلة الأولى</option>
                <option value="2">المرحلة الثانية</option>
                <option value="3">المرحلة الثالثة</option>
                <option value="4">المرحلة الرابعة</option>
              </select>
            </div>

            {/* Homework specific fields */}
            {contentType === "homework" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="maxGrade" className="block text-sm font-bold text-slate-700">الدرجة القصوى *</label>
                  <input
                    type="number"
                    id="maxGrade"
                    value={maxGrade}
                    onChange={(e) => setMaxGrade(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="dueDate" className="block text-sm font-bold text-slate-700">تاريخ التسليم (اختياري)</label>
                  <input
                    type="datetime-local"
                    id="dueDate"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-bold text-slate-700">العنوان *</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل عنوان المحتوى"
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-bold text-slate-700">الوصف</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر للمحتوى..."
                rows={4}
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all resize-none"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">الملف المرفق (اختياري)</label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive
                    ? "border-[#059669] bg-[#059669]/10"
                    : "border-slate-300 hover:border-slate-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-[#059669]/10 rounded-xl flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">{file.name}</p>
                      <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-600 text-sm font-bold"
                    >
                      إزالة الملف
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 mb-1">اسحب الملف هنا أو انقر للاختيار</p>
                      <p className="text-sm text-slate-500">PDF, Word, PowerPoint, أو صور - حد أقصى {contentType === 'lecture' ? '50MB' : '10MB'}</p>
                    </div>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-block bg-[#059669] hover:bg-[#047857] text-white px-6 py-2 rounded-lg font-bold text-sm cursor-pointer transition-colors"
                    >
                      اختيار ملف
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={submitLoading}
                className="bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065f46] text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    رفع المحتوى
                  </>
                )}
              </button>
              <Link
                href="/teacher-dashboard/content"
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-3 rounded-xl font-bold text-sm transition-all"
              >
                إلغاء
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}