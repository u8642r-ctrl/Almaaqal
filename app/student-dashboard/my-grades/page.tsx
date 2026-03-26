"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Grade = {
  id: number | string;
  grade: number | null | string;
  semester: string;
  created_at: string;
  pass_type?: 'pending' | string;
};

type Course = {
  id: number;
  name: string;
  code: string;
  stage: string;
  term?: string;
  credit_hours: number;
  theoretical_hours: number;
  practical_hours: number;
  faculty_name: string;
  department_name: string;
  is_carried_over: boolean;
  enrollment_status: string;
  grades: Grade[];
};

type Stage = {
  stage: string;
  courses: Course[];
};

type GradesData = {
  stages: Stage[];
  summary: {
    totalCourses: number;
    averageGrade: string;
  };
};

export default function MyGradesPage() {
  const { data: session } = useSession();
  const [gradesData, setGradesData] = useState<GradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set(['كورس_اول', 'fall', 'الكورس الأول']));
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set());
  const CURRENT_YEAR = "2025-2026";

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchGrades();
  }, [session]);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/student/grades");
      const data = await response.json();
      setGradesData(data);
    } catch (err) {
      console.error("Error fetching grades:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTerm = (term: string) => {
    const newExpanded = new Set(expandedTerms);
    if (newExpanded.has(term)) newExpanded.delete(term);
    else newExpanded.add(term);
    setExpandedTerms(newExpanded);
  };

  const toggleCourse = (courseId: number) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) newExpanded.delete(courseId);
    else newExpanded.add(courseId);
    setExpandedCourses(newExpanded);
  };

  const getGradeStatus = (gradeValue: number | null | string | undefined) => {
    if (gradeValue === undefined || gradeValue === null || typeof gradeValue !== 'number') {
       return { label: "لم ترصد بعد", color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" };
    }
    if (gradeValue < 50) return { label: "راسب", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    if (gradeValue < 60) return { label: "مقبول", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" };
    if (gradeValue < 70) return { label: "متوسط", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" };
    if (gradeValue < 80) return { label: "جيد", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    if (gradeValue < 90) return { label: "جيد جداً", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" };
    return { label: "امتياز", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
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

  // استخراج أخر مرحلة (أعلى مرحلة الطالب موجود بيها حالياً)
  const highestStage = gradesData?.stages?.length 
    ? gradesData.stages.reduce((prev, current) => 
        parseInt(current.stage) > parseInt(prev.stage) ? current : prev
      )
    : null;

  const currentStageCourses = highestStage?.courses || [];

  // استخراج درجات المرحلة الحالية فقط
  const evaluatedCourses = currentStageCourses.map(course => {
    const currentGrade = course.grades?.find(g => g.semester === CURRENT_YEAR || !g.semester);
    return {
      ...course,
      currentGradeValue: currentGrade ? currentGrade.grade : null
    };
  });

  const gradedOnly = evaluatedCourses.filter(c => typeof c.currentGradeValue === 'number');
  const totalAverage = gradedOnly.length > 0 
    ? gradedOnly.reduce((sum, curr) => sum + (curr.currentGradeValue as number), 0) / gradedOnly.length 
    : 0;

  const termNames: Record<string, string> = {
    'كورس_اول': 'الكورس الأول',
    'كورس_ثاني': 'الكورس الثاني',
    'fall': 'الكورس الأول',
    'spring': 'الكورس الثاني',
    'summer': 'الفصل الصيفي'
  };

  const groupedCourses = evaluatedCourses.reduce((acc, course) => {
    const termKey = course.term || 'كورس_اول';
    if (!acc[termKey]) {
      acc[termKey] = [];
    }
    acc[termKey].push(course);
    return acc;
  }, {} as Record<string, typeof evaluatedCourses>);

  const termOrder = ['كورس_اول', 'fall', 'كورس_ثاني', 'spring', 'summer'];
  const sortedTerms = Object.keys(groupedCourses).sort((a, b) => {
    return termOrder.indexOf(a) - termOrder.indexOf(b);
  });

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-4 md:p-8 font-sans overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-2 h-10 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#0f2744] tracking-tight">السجل الأكاديمي ودرجاتي</h1>
              <p className="text-sm font-bold text-[#2563eb] mt-1 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                المرحلة الدراسية الحالية: {highestStage?.stage || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in-up stagger-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
              📚
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 mb-1">المواد المسجلة</p>
              <p className="text-3xl font-black text-[#0f2744]">{evaluatedCourses.length}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
              ✅
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 mb-1">المواد المرصودة</p>
              <p className="text-3xl font-black text-[#0f2744]">{gradedOnly.length}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-gradient-to-br from-[#c8a44e]/10 to-transparent rounded-full pointer-events-none"></div>
            <div className="w-14 h-14 bg-amber-50 text-[#c8a44e] rounded-2xl flex items-center justify-center text-2xl font-bold z-10">
              📊
            </div>
            <div className="z-10">
              <p className="text-sm font-bold text-slate-400 mb-1">معدل العام الحالي</p>
              <p className="text-3xl font-black text-[#0f2744]">{totalAverage > 0 ? `%${totalAverage.toFixed(1)}` : '--'}</p>
            </div>
          </div>
        </div>

        {/* Grades Accordion */}
        {evaluatedCourses.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center animate-fade-in-up stagger-2">
            <span className="text-6xl mb-4 block opacity-50">📝</span>
            <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد مواد مسجلة</h3>
            <p className="text-slate-500 font-medium">لم يتم العثور على مواد مسجلة لك في هذا العام الدراسي.</p>
          </div>
        ) : (
          <div className="space-y-10 animate-fade-in-up stagger-2">
            {sortedTerms.map(term => (
              <div key={term} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Term Header */}
                <button 
                  onClick={() => toggleTerm(term)}
                  className="w-full p-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] rounded-full"></div>
                    <h2 className="text-xl font-black text-[#0f2744]">
                      {termNames[term] || term}
                    </h2>
                    <span className="bg-blue-100 text-blue-700 py-0.5 px-2.5 rounded-full text-xs font-bold">
                      {groupedCourses[term].length} مواد
                    </span>
                  </div>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expandedTerms.has(term) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Term Content (Courses) */}
                <div className={`transition-all duration-300 ease-in-out ${expandedTerms.has(term) ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                  <div className="p-4 space-y-3">
                    {groupedCourses[term].map((course, idx) => {
                      const status = getGradeStatus(course.currentGradeValue);
                      const isCourseExpanded = expandedCourses.has(course.id);
                      
                      return (
                        <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden hover:border-blue-100 transition-colors">
                          {/* Course Header */}
                          <button 
                            onClick={() => toggleCourse(course.id)}
                            className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 text-right">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${status.bg} ${status.color}`}>
                                {typeof course.currentGradeValue === 'number' ? course.currentGradeValue : '-'}
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-[#0f2744]">{course.name}</h3>
                                <p className="text-xs text-slate-400 uppercase">{course.code}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${status.bg} ${status.color} ${status.border}`}>
                                {status.label}
                              </span>
                              <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isCourseExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>

                          {/* Course Details (Expanded) */}
                          <div className={`transition-all duration-300 ease-in-out bg-slate-50 border-t border-slate-100 ${isCourseExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                            <div className="p-5">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    معلومات المادة
                                  </h4>
                                  <ul className="space-y-2 text-sm text-slate-600 bg-white p-4 rounded-xl border border-slate-100">
                                    <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400">المرحلة:</span> <span className="font-bold">{course.stage || (highestStage ? highestStage.stage : '-')}</span></li>
                                    <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400">الوحدات:</span> <span className="font-bold">{course.credit_hours || 0}</span></li>
                                    <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400">النظري:</span> <span className="font-bold">{course.theoretical_hours || 0}</span></li>
                                    <li className="flex justify-between pt-1"><span className="text-slate-400">العملي:</span> <span className="font-bold">{course.practical_hours || 0}</span></li>
                                  </ul>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    تفاصيل الدرجة
                                  </h4>
                                  <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center h-[132px]">
                                    {typeof course.currentGradeValue === 'number' ? (
                                      <>
                                        <span className={`text-4xl font-black ${status.color} mb-1`}>{course.currentGradeValue}</span>
                                        <span className="text-xs text-slate-400 font-bold">الدرجة النهائية للمادة</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-2xl font-black text-slate-300 mb-1">--</span>
                                        <span className="text-xs text-slate-400 font-bold">الدرجة غير مكتملة أو لم ترصد بعد</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchGrades}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 hover:border-[#2563eb]/30 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto transition-all shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث السجل
          </button>
        </div>
      </div>
    </div>
  );
}
