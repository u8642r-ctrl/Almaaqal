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

type CourseGroup = {
  course_id: number;
  course_name: string;
  course_code: string;
  teacher_name: string;
  homework: HomeworkItem[];
};

export default function StudentHomeworkPage() {
  const { data: session } = useSession();
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set());

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
        const items = Array.isArray(data) ? data : [];
        setHomework(items);
        setError(null);
        // افتح المادة الأولى تلقائياً
        if (items.length > 0) {
          setExpandedCourses(new Set([items[0].course_id]));
        }
      } else {
        setError(data.error || "حدث خطأ في جلب الواجبات");
      }
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  // تجميع الواجبات حسب المادة
  const courseGroups: CourseGroup[] = React.useMemo(() => {
    const map = new Map<number, CourseGroup>();
    homework.forEach((item) => {
      if (!map.has(item.course_id)) {
        map.set(item.course_id, {
          course_id: item.course_id,
          course_name: item.course_name,
          course_code: item.course_code,
          teacher_name: item.teacher_name,
          homework: [],
        });
      }
      map.get(item.course_id)!.homework.push(item);
    });
    return Array.from(map.values());
  }, [homework]);

  const toggleCourse = (courseId: number) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

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
        body: JSON.stringify({ contentId }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.content?.file_data) {
          const byteCharacters = atob(data.content.file_data);
          const byteArray = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
          }
          const blob = new Blob([byteArray]);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
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
    } catch {
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
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">بوابة الطالب</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0f2744] tracking-tight">واجباتي</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">
            {courseGroups.length > 0
              ? `${courseGroups.length} مادة — ${homework.length} واجب`
              : "لا توجد واجبات حالياً"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Empty State */}
        {courseGroups.length === 0 && !error && (
          <div className="card-pro py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-600 mb-2">لا توجد واجبات</h3>
            <p className="text-slate-400 text-sm">ستظهر الواجبات هنا عندما يكلفك أساتذتك بها</p>
          </div>
        )}

        {/* Courses grouped */}
        <div className="space-y-4 animate-fade-in-up">
          {courseGroups.map((group) => {
            const isOpen = expandedCourses.has(group.course_id);
            const pendingCount = group.homework.filter(
              (h) => !h.submitted_at && !h.is_past_due
            ).length;

            return (
              <div key={group.course_id} className="card-pro overflow-hidden">

                {/* ── Course Header (clickable) ── */}
                <button
                  onClick={() => toggleCourse(group.course_id)}
                  className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-slate-50 transition-colors text-right"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Icon */}
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>

                    {/* Text - overflow protected */}
                    <div className="min-w-0 text-right">
                      <h2 className="font-black text-[#0f2744] text-sm md:text-base truncate">
                        {group.course_name}
                      </h2>
                      <p className="text-slate-500 text-xs truncate">د. {group.teacher_name}</p>
                    </div>
                  </div>

                  {/* Badges + Arrow */}
                  <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                    {pendingCount > 0 && (
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {pendingCount} معلق
                      </span>
                    )}
                    <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {group.homework.length} واجب
                    </span>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* ── Homework List (collapsible) ── */}
                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {group.homework.map((item) => (
                      <div key={item.id} className="p-4 md:p-5 hover:bg-slate-50/70 transition-colors">

                        {/* Row: title + status */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-bold text-slate-800 text-sm leading-snug flex-1 min-w-0">
                            {item.title}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border whitespace-nowrap flex-shrink-0 ${getStatusStyle(item)}`}>
                            {item.submission_status}
                          </span>
                        </div>

                        {/* Description */}
                        {item.description && (
                          <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className={item.is_past_due ? "text-red-600 font-bold" : ""}>
                              {formatDate(item.due_date)}
                            </span>
                          </span>
                          {item.grade !== null && (
                            <span className="font-bold text-emerald-600">الدرجة: {item.grade}/100</span>
                          )}
                        </div>

                        {/* File attachment */}
                        {item.file_name && item.has_file && (
                          <div className="flex items-center justify-between gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200 mb-3">
                            <span className="text-xs text-blue-700 truncate flex-1">{item.file_name}</span>
                            <button
                              onClick={() => downloadFile(item.id, item.file_name!)}
                              className="text-[10px] font-bold px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                            >
                              تحميل
                            </button>
                          </div>
                        )}

                        {/* Feedback */}
                        {item.feedback && (
                          <div className="p-2.5 bg-green-50 rounded-lg border border-green-200 mb-3">
                            <p className="text-[10px] font-bold text-green-700 mb-0.5">ملاحظات الأستاذ:</p>
                            <p className="text-xs text-slate-700">{item.feedback}</p>
                          </div>
                        )}

                        {/* Action button */}
                        <Link
                          href={`/student-dashboard/homework/${item.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {item.grade !== null ? "عرض النتيجة" : item.submitted_at ? "عرض التسليم" : "حل الواجب"}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Refresh */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchData}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 hover:border-[#2563eb]/30 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto transition-all shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث الواجبات
          </button>
        </div>
      </div>
    </div>
  );
}