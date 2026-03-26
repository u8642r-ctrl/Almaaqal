"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type HomeworkItem = {
  id: number;
  course_id: number;
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
  file_name: string | null;
  has_file: boolean;
};

export default function StudentHomeworkPage() {
  const { data: session } = useSession();
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/student/homework");
      const data = await response.json();

      if (response.ok) {
        setHomework(Array.isArray(data) ? data : []);
        setError(null);
      } else {
        setError(data.error || "حدث خطأ في جلب الواجبات");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
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

  const getTimeUntilDeadline = (dueDateString: string) => {
    const now = new Date();
    const deadline = new Date(dueDateString);
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

  const getStatusStyle = (item: HomeworkItem) => {
    if (item.grade !== null) {
      if (item.grade >= 85) return "bg-emerald-50 text-emerald-700 border-emerald-200";
      if (item.grade >= 70) return "bg-blue-50 text-blue-700 border-blue-200";
      if (item.grade >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (item.submitted_at) return "bg-blue-50 text-blue-700 border-blue-200";
    if (item.is_past_due) return "bg-red-50 text-red-700 border-red-200";
    return "bg-orange-50 text-orange-700 border-orange-200";
  };

  const downloadFile = async (contentId: number, fileName: string) => {
    try {
      const response = await fetch("/api/student/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.content?.file_data) {
          const byteCharacters = atob(data.content.file_data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray]);

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } else {
          alert("الملف غير متوفر");
        }
      } else {
        alert("فشل في تحميل الملف");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("خطأ في تحميل الملف");
    }
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

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <p className="text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">بوابة الطالب</p>
          </div>
          <h1 className="text-3xl font-black text-[#0f2744] tracking-tight">واجباتي</h1>
          <p className="text-slate-500 text-sm mt-1">جميع الواجبات المطلوبة منك</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.82 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Homework List */}
        <div className="space-y-4 animate-fade-in-up">
          {homework.length === 0 ? (
            <div className="card-pro py-20 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-600 mb-2">لا توجد واجبات</h3>
              <p className="text-slate-400 text-sm">ستظهر الواجبات هنا عندما يكلفك أساتذتك بها</p>
            </div>
          ) : (
            homework.map((item) => (
              <div key={item.id} className="card-pro p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Main Content */}
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#2563eb]/10 text-[#2563eb] rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800">{item.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-bold text-slate-600">{item.course_name}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-sm text-slate-500">د. {item.teacher_name}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border whitespace-nowrap ${getStatusStyle(item)}`}>
                        {item.submission_status}
                      </span>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-slate-700 text-sm leading-relaxed">{item.description}</p>
                      </div>
                    )}

                    {/* File Attachment */}
                    {item.file_name && item.has_file && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-blue-800">ملف مرفق</p>
                          <p className="text-xs text-blue-600">{item.file_name}</p>
                        </div>
                        <button
                          onClick={() => downloadFile(item.id, item.file_name!)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-bold transition-colors"
                        >
                          تحميل
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Side Panel */}
                  <div className="lg:w-72 space-y-4">
                    {/* Deadline */}
                    <div className={`p-4 rounded-lg border ${item.is_past_due ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className={`w-4 h-4 ${item.is_past_due ? 'text-red-600' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={`text-xs font-bold ${item.is_past_due ? 'text-red-700' : 'text-blue-700'}`}>
                          الموعد النهائي
                        </span>
                      </div>
                      <p className={`text-sm font-bold ${item.is_past_due ? 'text-red-800' : 'text-blue-800'}`}>
                        {formatDate(item.due_date)}
                      </p>
                      <p className={`text-xs mt-1 ${item.is_past_due ? 'text-red-600' : 'text-blue-600'}`}>
                        {getTimeUntilDeadline(item.due_date)}
                      </p>
                    </div>

                    {/* Grade Display */}
                    {item.grade !== null && (
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-3xl font-black text-green-600 mb-1">{item.grade}</div>
                        <div className="text-sm text-green-700 font-bold">من 100</div>
                        {item.feedback && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                            <p className="text-xs text-green-700 font-bold mb-1">ملاحظات الأستاذ:</p>
                            <p className="text-xs text-slate-700">{item.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    <Link
                      href={`/student-dashboard/homework/${item.id}`}
                      className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 px-4 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {item.grade !== null ? "عرض النتيجة" : item.submitted_at ? "عرض التسليم" : "حل الواجب"}
                    </Link>

                    {/* Status Indicators */}
                    {!item.submitted_at && !item.is_past_due && (
                      <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-200">
                        <span className="text-xs font-bold text-orange-700">⚠️ يحتاج تسليم</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchData}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 hover:border-[#2563eb]/30 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto transition-all shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث الواجبات
          </button>
        </div>
      </div>
    </div>
  );
}