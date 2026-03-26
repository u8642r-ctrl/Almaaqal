"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Homework = {
  id: number;
  course_id: number;
  title: string;
  description: string;
  due_date: string;
  file_name: string | null;
  created_at: string;
  course_name: string;
  course_code: string;
  total_submissions: number;
  graded_submissions: number;
};

export default function TeacherHomeworkPage() {
  const { data: session } = useSession();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchHomework();
  }, [session]);

  const fetchHomework = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/teacher/homework");
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
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getStatusColor = (homework: Homework) => {
    const overdue = isOverdue(homework.due_date);
    const pendingGrading = homework.total_submissions - homework.graded_submissions;

    if (overdue && pendingGrading > 0) return "text-red-600 bg-red-50";
    if (pendingGrading > 0) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
  };

  const getStatusText = (homework: Homework) => {
    const overdue = isOverdue(homework.due_date);
    const pendingGrading = homework.total_submissions - homework.graded_submissions;

    if (overdue && pendingGrading > 0) return "متأخر - يحتاج تصحيح";
    if (pendingGrading > 0) return "يحتاج تصحيح";
    return "مكتمل";
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
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">بوابة التدريسي</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">إدارة الواجبات</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">إنشاء وإدارة ومتابعة الواجبات الدراسية</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up stagger-1">
          <Link
            href="/teacher-dashboard/homework/create"
            className="btn-primary bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065f46] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إنشاء واجب جديد
          </Link>
          <button
            onClick={fetchHomework}
            className="btn-secondary bg-white border border-slate-200 hover:border-[#059669]/30 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 animate-fade-in-up">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.82 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Homework List */}
        <div className="card-pro overflow-hidden animate-fade-in-up stagger-2">
          {homework.length === 0 ? (
            <div className="py-32 text-center">
              <span className="text-6xl mb-4 block opacity-30">📝</span>
              <p className="text-slate-400 font-bold text-lg">لا توجد واجبات بعد</p>
              <p className="text-slate-300 text-sm mt-2">
                ابدأ بإنشاء واجبات دراسية لطلابك
              </p>
              <Link
                href="/teacher-dashboard/homework/create"
                className="inline-block mt-4 bg-[#059669] hover:bg-[#047857] text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                إنشاء واجب جديد
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {homework.map((item, index) => {
                const pendingGrading = item.total_submissions - item.graded_submissions;
                const completionRate = item.total_submissions > 0 ? Math.round((item.graded_submissions / item.total_submissions) * 100) : 0;
                const overdue = isOverdue(item.due_date);

                return (
                  <div
                    key={item.id}
                    className="p-4 md:p-6 hover:bg-slate-50/80 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 md:gap-4 flex-1">
                        {/* Homework Icon */}
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-50 text-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-base flex-shrink-0">
                          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>

                        {/* Homework Info */}
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800 text-sm md:text-base">{item.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{item.course_name}</span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                          )}

                          {/* Due Date */}
                          <div className="flex items-center gap-2 mt-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className={`text-xs font-bold ${overdue ? 'text-red-600' : 'text-slate-500'}`}>
                              الموعد النهائي: {formatDate(item.due_date)}
                            </span>
                            {overdue && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                                متأخر
                              </span>
                            )}
                          </div>

                          {/* File Info */}
                          {item.file_name && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              {item.file_name}
                            </div>
                          )}

                          {/* Status and Stats */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(item)}`}>
                              {getStatusText(item)}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Statistics */}
                      <div className="flex flex-col items-end gap-3">
                        <div className="text-center">
                          <div className="flex items-center gap-3 text-xs">
                            <div className="text-center">
                              <span className="block text-lg font-black text-[#059669]">{item.total_submissions}</span>
                              <span className="text-slate-400 font-bold">تسليم</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-lg font-black text-blue-600">{item.graded_submissions}</span>
                              <span className="text-slate-400 font-bold">مُصحح</span>
                            </div>
                            {pendingGrading > 0 && (
                              <div className="text-center">
                                <span className="block text-lg font-black text-orange-600">{pendingGrading}</span>
                                <span className="text-slate-400 font-bold">معلق</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-24">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-400">التقدم</span>
                            <span className="text-xs font-bold text-slate-600">{completionRate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-[#059669] to-[#047857] h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/teacher-dashboard/homework/${item.id}`}
                            className="p-2 text-[#059669] hover:text-[#047857] hover:bg-[#059669]/10 rounded-lg transition-all text-xs font-bold"
                            title="عرض التسليمات والتصحيح"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}