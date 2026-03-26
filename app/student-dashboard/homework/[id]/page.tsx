"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type HomeworkDetail = {
  id: number;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  course_name: string;
  course_code: string;
  teacher_name: string;
  submission_text: string | null;
  submitted_at: string | null;
  grade: number | null;
  feedback: string | null;
  submission_status: string;
  is_overdue: boolean;
  is_past_due: boolean;
  student_file_name?: string | null;
};

export default function HomeworkDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const homeworkId = params.id as string;

  const [homework, setHomework] = useState<HomeworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [submissionText, setSubmissionText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!session?.user?.email || !homeworkId) return;
    fetchHomework();
  }, [session, homeworkId]);

  const fetchHomework = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/student/homework?homework_id=${homeworkId}`);
      const data = await response.json();

      if (response.ok) {
        setHomework(data);
        setSubmissionText(data.submission_text || "");
      } else {
        alert(data.error || "فشل في جلب تفاصيل الواجب");
      }
    } catch (err) {
      console.error("Fetch homework error:", err);
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!submissionText.trim() && !file) {
      alert("الرجاء كتابة حل الواجب أو إرفاق ملف");
      return;
    }

    try {
      setSubmitting(true);

      const method = homework?.submitted_at ? "PUT" : "POST";
      
      const formData = new FormData();
      formData.append("homeworkId", homeworkId);
      if (submissionText.trim()) formData.append("submissionText", submissionText.trim());
      if (file) formData.append("file", file);

      const response = await fetch("/api/student/homework", {
        method: method,
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "تم تسليم الواجب بنجاح");
        fetchHomework(); // Refresh data
        setIsEditing(false);
        setFile(null);
      } else {
        alert(data.error || "فشل في تسليم الواجب");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntilDeadline = () => {
    if (!homework) return "";

    const now = new Date();
    const deadline = new Date(homework.due_date);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    if (diffTime < 0) {
      return `متأخر ${Math.abs(diffDays)} يوم`;
    } else if (diffDays === 0) {
      if (diffHours > 0) {
        return `باقي ${diffHours} ساعة`;
      } else {
        return "ينتهي خلال ساعة";
      }
    } else if (diffDays === 1) {
      return "ينتهي غداً";
    } else {
      return `باقي ${diffDays} يوم`;
    }
  };

  const canSubmit = () => {
    return homework && !homework.is_past_due && homework.grade === null;
  };

  const canEdit = () => {
    return homework && homework.submitted_at && homework.grade === null;
  };

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

  if (!homework) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="text-center">
          <span className="text-6xl mb-4 block opacity-30">❌</span>
          <p className="text-slate-400 font-bold text-lg">الواجب غير موجود</p>
          <Link
            href="/student-dashboard/homework"
            className="inline-block mt-4 bg-[#2563eb] text-white px-6 py-2 rounded-lg font-bold text-sm"
          >
            العودة للواجبات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/student-dashboard/homework"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
                <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">بوابة الطالب</p>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-[#0f2744] tracking-tight">تفاصيل الواجب</h1>
            </div>
          </div>
        </div>

        {/* Course Info */}
        <div className="card-pro p-4 mb-6 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#2563eb]/20 text-[#2563eb] rounded-xl flex items-center justify-center font-bold">
              📚
            </div>
            <div>
              <h2 className="font-bold text-[#2563eb]">{homework.course_name}</h2>
              <p className="text-sm font-bold text-slate-600">د. {homework.teacher_name}</p>
            </div>
          </div>
        </div>

        {/* Homework Details */}
        <div className="card-pro p-6 md:p-8 mb-6 animate-fade-in-up stagger-1">
          {/* Title and Status */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-black text-[#0f2744] mb-3">{homework.title}</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`px-3 py-1 rounded-full font-bold border ${
                  homework.grade !== null
                    ? "text-green-600 bg-green-50 border-green-200"
                    : homework.submitted_at
                    ? "text-blue-600 bg-blue-50 border-blue-200"
                    : homework.is_past_due
                    ? "text-red-600 bg-red-50 border-red-200"
                    : "text-orange-600 bg-orange-50 border-orange-200"
                }`}>
                  {homework.submission_status}
                </span>
                {homework.submitted_at && (
                  <span className="text-slate-500">
                    تُسلم في: {formatDate(homework.submitted_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Grade Display */}
            {homework.grade !== null && (
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="text-4xl font-black text-green-600 mb-1">{homework.grade}</div>
                <div className="text-sm text-green-700 font-bold">من 100</div>
              </div>
            )}
          </div>

          {/* Due Date Warning */}
          <div className={`p-4 rounded-xl mb-6 border ${
            homework.is_past_due
              ? "bg-red-50 border-red-200 text-red-700"
              : homework.is_overdue
              ? "bg-orange-50 border-orange-200 text-orange-700"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-bold">الموعد النهائي: {formatDate(homework.due_date)}</p>
                <p className="text-sm">{getTimeUntilDeadline()}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              تعليمات الواجب
            </h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{homework.description}</p>
            </div>
          </div>

          {/* Teacher Feedback */}
          {homework.feedback && (
            <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-8">
              <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                ملاحظات الأستاذ
              </h4>
              <p className="text-green-700">{homework.feedback}</p>
            </div>
          )}

          {/* Current Submission */}
          {homework.submitted_at && !isEditing && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  تسليمك الحالي
                </h4>
                {canEdit() && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[#2563eb] hover:text-[#1d4ed8] font-bold text-sm flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    تعديل
                  </button>
                )}
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                {homework.submission_text && (
                  <p className="text-blue-800 whitespace-pre-wrap mb-3">{homework.submission_text}</p>
                )}
                {homework.student_file_name && (
                  <div className="flex items-center gap-2 pt-3 border-t border-blue-200/50">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    <p className="text-sm font-bold text-blue-700">الملف المرفق: {homework.student_file_name}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submission Form */}
          {(canSubmit() || isEditing) && (
            <div className="border-t border-slate-100 pt-8">
              <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {homework.submitted_at ? "تعديل التسليم" : "تسليم الواجب"}
              </h4>

              <div className="space-y-4">
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="اكتب حل الواجب هنا (اختياري في حال إرفاق ملف)..."
                  rows={12}
                  className="w-full p-4 border border-slate-200 rounded-xl focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 transition-all resize-none"
                />

                {/* إرفاق ملف */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">إرفاق ملف (اختياري)</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-3 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-slate-500 font-bold">
                          {file ? file.name : "اضغط هنا لاختيار ملف (PDF, Word, صور)"}
                        </p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  
                  {/* زر إزالة الملف المختار حالياً */}
                  {file && (
                    <div className="mt-3 flex justify-end">
                      <button type="button" onClick={() => setFile(null)} className="text-sm text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        إزالة الملف المرفق
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || (!submissionText.trim() && !file)}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        جاري التسليم...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        {homework.submitted_at ? "تحديث التسليم" : "تسليم الواجب"}
                      </>
                    )}
                  </button>

                  {isEditing && (
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setSubmissionText(homework.submission_text || "");
                        setFile(null);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm transition-all"
                    >
                      إلغاء
                    </button>
                  )}
                </div>

                {homework.is_past_due && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.82 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      انتبه: انتهى الموعد النهائي، لكن يمكنك التسليم كتسليم متأخر
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Graded Message */}
          {homework.grade !== null && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                تم تصحيح الواجب ولا يمكن تعديله الآن
              </div>
            </div>
          )}

          {/* Past Due Message */}
          {!canSubmit() && homework.grade === null && homework.is_past_due && !homework.submitted_at && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                انتهى الموعد النهائي ولم يتم التسليم - تواصل مع أستاذ المادة
              </div>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center animate-fade-in-up stagger-2">
          <Link
            href="/student-dashboard/homework"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            العودة لقائمة الواجبات
          </Link>
        </div>
      </div>
    </div>
  );
}