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

export default function HomeworkCreatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form state
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxGrade, setMaxGrade] = useState("100");
  const [stage, setStage] = useState("");
  const [file, setFile] = useState<File | null>(null);
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

    if (!courseId || !title || !dueDate || !maxGrade || !stage) {
      alert("الرجاء إدخال جميع البيانات المطلوبة");
      return;
    }

    // التحقق من صحة الدرجة القصوى
    const maxGradeNum = parseInt(maxGrade);
    if (isNaN(maxGradeNum) || maxGradeNum <= 0 || maxGradeNum > 1000) {
      alert("الدرجة القصوى يجب أن تكون رقماً بين 1 و 1000");
      return;
    }

    // التحقق من أن موعد التسليم في المستقبل
    const dueDateObj = new Date(dueDate);
    const now = new Date();
    if (dueDateObj <= now) {
      alert("موعد التسليم يجب أن يكون في المستقبل");
      return;
    }

    try {
      setSubmitLoading(true);

      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("dueDate", dueDate);
      formData.append("maxGrade", maxGrade);
      formData.append("stage", stage);
      if (file) {
        formData.append("file", file);
      }

      const response = await fetch("/api/teacher/homework", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "تم إنشاء الواجب بنجاح");
        router.push("/teacher-dashboard/homework");
      } else {
        alert(data.error || "فشل في إنشاء الواجب");
      }
    } catch (err) {
      console.error("Create homework error:", err);
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

  // تحديد الحد الأدنى للتاريخ (اليوم + ساعة)
  const getMinDate = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1); // إضافة ساعة للحد الأدنى
    return now.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/teacher-dashboard/homework"
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0f2744] tracking-tight">إنشاء واجب دراسي جديد</h1>
              <p className="text-slate-500 text-xs md:text-sm mt-1">إضافة واجب دراسي جديد للطلاب مع موعد تسليم</p>
            </div>
          </div>
        </div>

        {/* Create Form */}
        <div className="card-pro p-6 md:p-8 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-bold text-slate-700">عنوان الواجب *</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل عنوان الواجب"
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                required
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <label htmlFor="dueDate" className="block text-sm font-bold text-slate-700">موعد التسليم *</label>
              <input
                type="datetime-local"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={getMinDate()}
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                required
              />
              <p className="text-xs text-slate-500">
                حدد الموعد النهائي لتسليم الواجب (يجب أن يكون في المستقبل)
              </p>
            </div>

            {/* Max Grade */}
            <div className="space-y-2">
              <label htmlFor="maxGrade" className="block text-sm font-bold text-slate-700">الدرجة القصوى *</label>
              <input
                type="number"
                id="maxGrade"
                value={maxGrade}
                onChange={(e) => setMaxGrade(e.target.value)}
                min="1"
                max="1000"
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                required
              />
              <p className="text-xs text-slate-500">
                حدد الدرجة القصوى لهذا الواجب (مثل: 20، 50، 100)
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-bold text-slate-700">تعليمات الواجب *</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب تعليمات مفصلة للواجب، الأهداف المطلوبة، معايير التقييم..."
                rows={6}
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all resize-none"
                required
              />
              <p className="text-xs text-slate-500">
                قدم وصفاً واضحاً وتعليمات مفصلة للواجب
              </p>
            </div>

            {/* File Upload for Instructions */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">ملف تعليمات إضافي (اختياري)</label>
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
                      <p className="font-bold text-slate-700 mb-1">ملف تعليمات إضافي (PDF, Word, PowerPoint)</p>
                      <p className="text-sm text-slate-500">اسحب الملف هنا أو انقر للاختيار - حد أقصى 10MB</p>
                    </div>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      className="hidden"
                      id="instructions-file-upload"
                    />
                    <label
                      htmlFor="instructions-file-upload"
                      className="inline-block bg-[#059669] hover:bg-[#047857] text-white px-6 py-2 rounded-lg font-bold text-sm cursor-pointer transition-colors"
                    >
                      اختيار ملف
                    </label>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                يمكنك إرفاق ملف PDF أو Word يحتوي على تعليمات تفصيلية أو نماذج للواجب
              </p>
            </div>

            {/* Advanced Settings */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                معلومات مهمة
              </h3>
              <div className="text-sm text-slate-600 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-[#059669] rounded-full mt-2 flex-shrink-0"></div>
                  <p>سيتم إشعار جميع الطلاب المسجلين في المادة بالواجب الجديد تلقائياً</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-[#059669] rounded-full mt-2 flex-shrink-0"></div>
                  <p>يمكن للطلاب تسليم الواجب حتى الموعد المحدد، وستظهر التسليمات المتأخرة بوضوح</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-[#059669] rounded-full mt-2 flex-shrink-0"></div>
                  <p>ستتمكن من تصحيح الواجبات وإعطاء درجات وملاحظات لكل طالب بعد إنشاء الواجب</p>
                </div>
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
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    إنشاء الواجب
                  </>
                )}
              </button>
              <Link
                href="/teacher-dashboard/homework"
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