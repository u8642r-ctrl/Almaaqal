"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type LectureItem = {
  id: number;
  course_id: number;
  title: string;
  description: string;
  file_name: string | null;
  created_at: string;
  course_name: string;
  course_code: string;
  teacher_name: string;
  content_type_arabic: string;
};

type Course = {
  id: number;
  name: string;
  code: string;
  lectures: LectureItem[];
};

type Stage = {
  stage: string;
  stage_name: string;
  courses: Course[];
};

export default function StudentLecturesPage() {
  const { data: session } = useSession();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/student/content/stages");

      if (response.ok) {
        const stagesData = await response.json();
        setStages(Array.isArray(stagesData) ? stagesData : []);
        setError(null);
        // افتح المرحلة الأولى افتراضياً
        if (stagesData.length > 0) {
          setExpandedStages(new Set([stagesData[0].stage]));
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "حدث خطأ في جلب المحاضرات");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = (stage: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stage)) {
      newExpanded.delete(stage);
    } else {
      newExpanded.add(stage);
    }
    setExpandedStages(newExpanded);
  };

  const toggleCourse = (courseId: number) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadFile = async (contentId: number, fileName: string) => {
    try {
      // Request the file content
      const response = await fetch("/api/student/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId })
      });

      if (response.ok) {
        const data = await response.json();

        if (data.content?.file_data) {
          // Create blob from base64 data
          const byteCharacters = atob(data.content.file_data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray]);

          // Create download link
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
        const errorData = await response.json();
        alert(errorData.error || "فشل في تحميل الملف");
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
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">بوابة الطالب</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">المحاضرات والمواد التعليمية</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">منظمة حسب المراحل الدراسية والمواد</p>
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

        {/* Stages Section */}
        <div className="animate-fade-in-up stagger-1">
          {stages.length === 0 && !loading ? (
            <div className="card-pro py-32 text-center">
              <span className="text-6xl mb-4 block opacity-30">📚</span>
              <p className="text-slate-400 font-bold text-lg">لا توجد محاضرات متاحة بعد</p>
              <p className="text-slate-300 text-sm mt-2">ستظهر المحاضرات هنا عندما يرفعها أساتذتك</p>
            </div>
          ) : (
            <div className="space-y-6">
              {stages.map((stage, stageIndex) => (
                <div key={stage.stage} className="card-pro overflow-hidden">
                  {/* Stage Header */}
                  <div
                    onClick={() => toggleStage(stage.stage)}
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                        {stage.stage}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">{stage.stage_name}</h2>
                        <p className="text-slate-500 text-sm">{stage.courses.length} مادة دراسية</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                        {stage.courses.reduce((total, course) => total + course.lectures.length, 0)} محاضرة
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                          expandedStages.has(stage.stage) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Courses Section */}
                  <div className={`transition-all duration-300 overflow-hidden ${
                    expandedStages.has(stage.stage)
                      ? 'max-h-none opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}>
                    <div className="p-6 pt-0">
                      <div className="space-y-4">
                        {stage.courses.map((course, courseIndex) => (
                          <div key={course.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                            {/* Course Header */}
                            <div
                              onClick={() => toggleCourse(course.id)}
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-800">{course.name}</h3>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
                                  {course.lectures.length} محاضرة
                                </span>
                                <svg
                                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                    expandedCourses.has(course.id) ? 'rotate-180' : ''
                                  }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>

                            {/* Lectures Section */}
                            <div className={`transition-all duration-300 overflow-hidden ${
                              expandedCourses.has(course.id)
                                ? 'max-h-none opacity-100'
                                : 'max-h-0 opacity-0'
                            }`}>
                              <div className="border-t border-slate-100 bg-slate-50">
                                {course.lectures.length === 0 ? (
                                  <div className="p-8 text-center">
                                    <span className="text-2xl mb-2 block opacity-30">📝</span>
                                    <p className="text-slate-400 font-medium text-sm">لا توجد محاضرات في هذه المادة بعد</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                                    {course.lectures.map((lecture, lectureIndex) => (
                                      <div key={lecture.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                                        <div className="mb-3">
                                          <h4 className="font-bold text-slate-800 text-sm line-clamp-2 mb-1">{lecture.title}</h4>
                                          {lecture.description && (
                                            <p className="text-xs text-slate-600 line-clamp-2">{lecture.description}</p>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          <span>{lecture.teacher_name}</span>
                                          <span className="mx-1">•</span>
                                          <span>{formatDate(lecture.created_at)}</span>
                                        </div>

                                        {lecture.file_name && (
                                          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                              </svg>
                                              <span className="truncate">{lecture.file_name}</span>
                                            </div>
                                            <button
                                              onClick={() => downloadFile(lecture.id, lecture.file_name!)}
                                              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-2 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1"
                                            >
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                                              </svg>
                                              تحميل
                                            </button>
                                          </div>
                                        )}

                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                          <Link
                                            href={`/student-dashboard/lectures/${lecture.id}`}
                                            className="text-[#2563eb] hover:text-[#1d4ed8] font-bold text-xs flex items-center gap-1 group/link"
                                          >
                                            <span>عرض التفاصيل</span>
                                            <svg className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                          </Link>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center animate-fade-in-up stagger-3">
          <button
            onClick={fetchData}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 hover:border-[#2563eb]/30 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto transition-all shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث المحاضرات
          </button>
        </div>
      </div>
    </div>
  );
}