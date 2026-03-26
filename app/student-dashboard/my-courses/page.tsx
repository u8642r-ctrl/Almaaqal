"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type CourseItem = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  teacher_name: string | null;
  enrolled_at: string;
  term: string | null;
  stage: string;
  is_carried_over: boolean;
  original_stage: string | null;
  grade: number | null;
  grade_description: string;
};

type Term = {
  term: string;
  term_name: string;
  courses: CourseItem[];
  total_courses: number;
};

type Stage = {
  stage: string;
  stage_name: string;
  terms: Term[];
  total_courses: number;
};

type StagesResponse = {
  stages: Stage[];
  summary: {
    total_stages: number;
    total_courses: number;
    active_courses: number;
  };
};

export default function MyCoursesPage() {
  const { data: session } = useSession();
  const [stagesData, setStagesData] = useState<StagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/student/courses/stages");

      if (response.ok) {
        const data = await response.json();
        setStagesData(data);
        setError(null);
        // افتح المرحلة الأولى افتراضياً
        if (data.stages && data.stages.length > 0) {
          setExpandedStages(new Set([data.stages[0].stage]));
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "حدث خطأ في جلب المواد الدراسية");
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

  const toggleTerm = (stageTermKey: string) => {
    const newExpanded = new Set(expandedTerms);
    if (newExpanded.has(stageTermKey)) {
      newExpanded.delete(stageTermKey);
    } else {
      newExpanded.add(stageTermKey);
    }
    setExpandedTerms(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">السجل الأكاديمي</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">منظمة حسب المراحل الدراسية والفصول</p>
        </div>

        {/* Summary Cards */}
        {stagesData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-fade-in-up stagger-1">
            <div className="card-pro p-4 text-center">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H3a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-slate-800">{stagesData.summary.total_stages}</p>
              <p className="text-xs text-slate-500 font-medium">مراحل دراسية</p>
            </div>
            <div className="card-pro p-4 text-center">
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-slate-800">{stagesData.summary.total_courses}</p>
              <p className="text-xs text-slate-500 font-medium">إجمالي المواد</p>
            </div>
            <div className="card-pro p-4 text-center">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-slate-800">{stagesData.summary.active_courses}</p>
              <p className="text-xs text-slate-500 font-medium">مواد نشطة</p>
            </div>
          </div>
        )}

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
        <div className="animate-fade-in-up stagger-2">
          {!stagesData || stagesData.stages.length === 0 ? (
            <div className="card-pro py-32 text-center">
              <span className="text-6xl mb-4 block opacity-30">📖</span>
              <p className="text-slate-400 font-bold text-lg">لا توجد مواد مسجلة حالياً</p>
              <p className="text-slate-300 text-sm mt-2">تواصل مع إدارة الشؤون الأكاديمية للتسجيل</p>
            </div>
          ) : (
            <div className="space-y-6">
              {stagesData.stages.map((stage, stageIndex) => (
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
                        <p className="text-slate-500 text-sm">{stage.total_courses} مادة دراسية</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                        {stage.total_courses} مواد
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

                  {/* Terms and Courses Section */}
                  <div className={`transition-all duration-300 overflow-hidden ${
                    expandedStages.has(stage.stage)
                      ? 'max-h-none opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}>
                    <div className="p-6 pt-4">
                      {stage.terms.length === 0 ? (
                        <div className="py-8 text-center">
                          <span className="text-2xl mb-2 block opacity-30">📚</span>
                          <p className="text-slate-400 font-medium text-sm">لا توجد مواد في هذه المرحلة</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {stage.terms.map((term) => {
                            const termKey = `${stage.stage}-${term.term}`;
                            const isTermExpanded = expandedTerms.has(termKey);

                            return (
                              <div key={termKey} className="border border-slate-200 rounded-xl overflow-hidden">
                                {/* Term Header */}
                                <div
                                  onClick={() => toggleTerm(termKey)}
                                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors bg-gradient-to-r from-slate-50 to-white"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow">
                                      {(term.term === 'fall' || term.term === 'كورس_اول') ? '١' : '٢'}
                                    </div>
                                    <div>
                                      <h3 className="text-base font-bold text-slate-800">{term.term_name}</h3>
                                      <p className="text-slate-500 text-xs">{term.total_courses} مادة</p>
                                    </div>
                                  </div>
                                  <svg
                                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                                      isTermExpanded ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>

                                {/* Courses in Term */}
                                <div className={`transition-all duration-300 overflow-hidden ${
                                  isTermExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
                                }`}>
                                  <div className="p-4 pt-0 bg-slate-50/50">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      {term.courses.map((course) => (
                                        <div key={course.id} className={`border rounded-xl p-4 hover:shadow-md transition-shadow ${
                                          course.is_carried_over
                                            ? 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200'
                                            : 'bg-white border-slate-200'
                                        }`}>
                                          <div className="flex items-start gap-3 mb-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                              course.is_carried_over
                                                ? 'bg-purple-100 text-purple-600'
                                                : 'bg-blue-50 text-blue-600'
                                            }`}>
                                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                              </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{course.name}</h3>
                                                {course.is_carried_over && (
                                                  <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs rounded-full font-medium whitespace-nowrap flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    تحميل من المرحلة {course.original_stage || '؟'}
                                                  </span>
                                                )}
                                              </div>
                                              {course.description && (
                                                <p className="text-xs text-slate-600 line-clamp-2 mb-2">{course.description}</p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="space-y-2">
                                            {course.teacher_name && (
                                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span>د. {course.teacher_name}</span>
                                              </div>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 12V11a2 2 0 012-2h4a2 2 0 012 2v8m-6 0h6" />
                                              </svg>
                                              <span>تسجيل: {formatDate(course.enrolled_at)}</span>
                                            </div>
                                          </div>

                                          <div className="mt-3 pt-3 border-t border-slate-100">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                  course.is_carried_over
                                                    ? 'text-purple-600 bg-purple-100'
                                                    : 'text-green-600 bg-green-50'
                                                }`}>
                                                  {course.is_carried_over ? '🔄 تحميل' : '✓ مسجل'}
                                                </span>
                                                {course.grade_description && (
                                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                                      course.grade_description === 'راسب' ? 'bg-red-100 text-red-700' :
                                                      course.grade_description === 'لم تسجل بعد' ? 'bg-slate-100 text-slate-500' :
                                                      'bg-sky-100 text-sky-700'
                                                  }`}>
                                                      {course.grade_description}
                                                  </span>
                                                )}
                                              </div>
                                              <button className={`text-xs font-bold flex items-center gap-1 group transition-colors ${
                                                course.is_carried_over
                                                  ? 'text-purple-600 hover:text-purple-800'
                                                  : 'text-blue-600 hover:text-blue-800'
                                              }`}>
                                                <span>عرض التفاصيل</span>
                                                <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
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
            تحديث المواد
          </button>
        </div>
      </div>
    </div>
  );
}
