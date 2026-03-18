"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center hover:bg-slate-50 transition-all"
    >
      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

const stageLabels: Record<string, string> = {
  "1": "المرحلة الأولى",
  "2": "المرحلة الثانية",
  "3": "المرحلة الثالثة",
  "4": "المرحلة الرابعة",
};

const termLabels: Record<string, string> = {
  "1": "الكورس الأول",
  "2": "الكورس الثاني",
};

function getGradeInfo(grade: number | null, passType: string | null) {
  if (grade === null || grade === undefined) {
    return { label: "لم يُرصد", color: "bg-slate-100 text-slate-500", status: "pending" };
  }

  const isPassed = grade >= 50;
  const isFirstRound = passType === "first_round" || passType === "الدور الأول" || !passType;

  if (isPassed) {
    if (grade >= 90) {
      return {
        label: isFirstRound ? "ممتاز - دور أول" : "ممتاز - دور ثاني",
        color: isFirstRound ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700",
        status: "passed"
      };
    }
    if (grade >= 80) {
      return {
        label: isFirstRound ? "جيد جداً - دور أول" : "جيد جداً - دور ثاني",
        color: isFirstRound ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700",
        status: "passed"
      };
    }
    if (grade >= 70) {
      return {
        label: isFirstRound ? "جيد - دور أول" : "جيد - دور ثاني",
        color: isFirstRound ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700",
        status: "passed"
      };
    }
    if (grade >= 60) {
      return {
        label: isFirstRound ? "متوسط - دور أول" : "متوسط - دور ثاني",
        color: isFirstRound ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700",
        status: "passed"
      };
    }
    return {
      label: isFirstRound ? "مقبول - دور أول" : "مقبول - دور ثاني",
      color: isFirstRound ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700",
      status: "passed"
    };
  }

  // Failed
  return {
    label: "راسب - محمّل",
    color: "bg-red-100 text-red-700",
    status: "failed"
  };
}

export default function AcademicViewPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [allData, setAllData] = useState<any[]>([]);

  // Navigation state
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;

    // Fetch student profile and academic data
    Promise.all([
      fetch("/api/student/profile").then(r => r.json()),
      fetch("/api/student/academic-data").then(r => r.json())
    ]).then(([profileData, academicData]) => {
      setProfile(profileData);
      setAllData(Array.isArray(academicData) ? academicData : []);
      setLoading(false);
    }).catch((err) => {
      console.error("Error fetching data:", err);
      setLoading(false);
    });
  }, [session]);

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

  // Get accessible stages from profile (all stages from 1 to current stage)
  const accessibleStages = profile?.accessible_stages || [];

  // Get unique stages from the data
  const stagesInData = [...new Set(allData.map(item => item.stage).filter(Boolean))].sort();

  // Merge accessible stages with data stages (show all accessible stages even if empty)
  const allStages = [...new Set([...accessibleStages, ...stagesInData])].sort();

  // Group data by stage and term
  const groupedData: Record<string, Record<string, any[]>> = {};
  for (const item of allData) {
    const stage = item.stage || "0";
    const term = item.term || "0";

    if (!groupedData[stage]) groupedData[stage] = {};
    if (!groupedData[stage][term]) groupedData[stage][term] = [];
    groupedData[stage][term].push(item);
  }

  // Breadcrumb navigation
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm mb-6 flex-wrap">
      <button
        onClick={() => { setSelectedStage(null); setSelectedTerm(null); }}
        className={`px-3 py-1.5 rounded-lg transition-all font-bold ${!selectedStage ? 'bg-[#2563eb] text-white' : 'hover:bg-slate-100 text-slate-600'}`}
      >
        المراحل
      </button>
      {selectedStage && (
        <>
          <span className="text-slate-400">←</span>
          <button
            onClick={() => setSelectedTerm(null)}
            className={`px-3 py-1.5 rounded-lg transition-all font-bold ${!selectedTerm ? 'bg-[#2563eb] text-white' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            {stageLabels[selectedStage] || `المرحلة ${selectedStage}`}
          </button>
        </>
      )}
      {selectedTerm && (
        <>
          <span className="text-slate-400">←</span>
          <span className="px-3 py-1.5 bg-[#2563eb] text-white rounded-lg font-bold">
            {termLabels[selectedTerm] || `كورس ${selectedTerm}`}
          </span>
        </>
      )}
    </div>
  );

  // Calculate statistics
  const getStageStats = (stageData: any[]) => {
    const total = stageData.length;
    const graded = stageData.filter(item => item.grade != null).length;
    const passed = stageData.filter(item => item.grade != null && item.grade >= 50).length;
    const failed = stageData.filter(item => item.grade != null && item.grade < 50).length;
    const pending = total - graded;
    const firstRound = stageData.filter(item =>
      item.grade != null && item.grade >= 50 &&
      (item.pass_type === "first_round" || item.pass_type === "الدور الأول" || !item.pass_type)
    ).length;
    const secondRound = passed - firstRound;
    const avgGrade = graded > 0
      ? (stageData.filter(item => item.grade != null).reduce((sum, item) => sum + parseFloat(item.grade), 0) / graded).toFixed(1)
      : "—";

    return { total, graded, passed, failed, pending, firstRound, secondRound, avgGrade };
  };

  // Stage view (المراحل)
  if (!selectedStage) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
        <div className="w-full max-w-5xl mx-auto">
          <div className="mb-6 md:mb-8 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-3">
              <BackButton />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-5 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
                  <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">السجل الأكاديمي</p>
                </div>
                <h1 className="text-2xl md:text-4xl font-black text-[#0f2744]">المراحل الدراسية</h1>
              </div>
            </div>
            <p className="text-slate-500 text-xs md:text-sm mt-1">اضغط على المرحلة لعرض الكورسات والمواد</p>
          </div>

          {renderBreadcrumb()}

          {/* Summary Stats */}
          {allData.length > 0 && (
            <div className="card-pro p-4 mb-6 bg-gradient-to-l from-[#2563eb]/5 to-transparent">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <p className="text-2xl font-black text-[#2563eb]">{allData.length}</p>
                  <p className="text-xs text-slate-500 font-bold">إجمالي المواد</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-600">{allData.filter(d => d.grade >= 50).length}</p>
                  <p className="text-xs text-slate-500 font-bold">ناجح</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-red-600">{allData.filter(d => d.grade != null && d.grade < 50).length}</p>
                  <p className="text-xs text-slate-500 font-bold">محمّل</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-600">{allData.filter(d => d.grade == null).length}</p>
                  <p className="text-xs text-slate-500 font-bold">معلّق</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-700">{allStages.length}</p>
                  <p className="text-xs text-slate-500 font-bold">مراحل</p>
                </div>
              </div>
            </div>
          )}

          {allStages.length === 0 ? (
            <div className="card-pro p-12 text-center">
              <span className="text-6xl mb-4 block opacity-30">📚</span>
              <p className="text-slate-400 font-bold text-lg">لا توجد بيانات أكاديمية مسجلة</p>
              <p className="text-slate-400 text-sm mt-2">تأكد من تسجيلك في المواد الدراسية</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allStages.map((stage: string) => {
                const stageData = Object.values(groupedData[stage] || {}).flat();
                const stats = getStageStats(stageData);
                const coursesCount = Object.keys(groupedData[stage] || {}).length;

                return (
                  <div
                    key={stage}
                    onClick={() => setSelectedStage(stage)}
                    className="card-pro p-6 cursor-pointer hover:shadow-xl transition-all group border-r-4 border-[#2563eb]"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
                        {stage}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-black text-[#0f2744] group-hover:text-[#2563eb] transition-colors">
                          {stageLabels[stage] || `المرحلة ${stage}`}
                        </h2>
                        <p className="text-slate-500 text-sm">{coursesCount} كورس · {stats.total} مادة</p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 text-center mb-4">
                      <div className="bg-emerald-50 p-2 rounded-lg">
                        <p className="text-xl font-black text-emerald-600">{stats.passed}</p>
                        <p className="text-[10px] text-emerald-600 font-bold">ناجح</p>
                      </div>
                      <div className="bg-red-50 p-2 rounded-lg">
                        <p className="text-xl font-black text-red-600">{stats.failed}</p>
                        <p className="text-[10px] text-red-600 font-bold">محمّل</p>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-lg">
                        <p className="text-xl font-black text-amber-600">{stats.pending}</p>
                        <p className="text-[10px] text-amber-600 font-bold">معلّق</p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <p className="text-xl font-black text-blue-600">{stats.avgGrade}</p>
                        <p className="text-[10px] text-blue-600 font-bold">معدل</p>
                      </div>
                    </div>

                    {/* Pass Type Breakdown */}
                    {stats.graded > 0 && (
                      <div className="flex gap-2 text-xs">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                          دور أول: {stats.firstRound}
                        </span>
                        {stats.secondRound > 0 && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">
                            دور ثاني: {stats.secondRound}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Course/Term view (الكورسات)
  if (!selectedTerm) {
    const stageTerms = groupedData[selectedStage] || {};
    const termKeys = Object.keys(stageTerms).sort();

    return (
      <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
        <div className="w-full max-w-5xl mx-auto">
          <div className="mb-6 md:mb-8 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
              <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">السجل الأكاديمي</p>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-[#0f2744]">
              {stageLabels[selectedStage] || `المرحلة ${selectedStage}`}
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">اضغط على الكورس لعرض المواد</p>
          </div>

          {renderBreadcrumb()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {termKeys.map((term) => {
              const subjects = stageTerms[term];
              const stats = getStageStats(subjects);

              return (
                <div
                  key={term}
                  onClick={() => setSelectedTerm(term)}
                  className="card-pro p-6 cursor-pointer hover:shadow-xl transition-all group border-r-4 border-[#059669]"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#059669] to-[#047857] text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
                      {term}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-[#0f2744] group-hover:text-[#059669] transition-colors">
                        {termLabels[term] || `كورس ${term}`}
                      </h3>
                      <p className="text-slate-500 text-sm">{subjects.length} مادة</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center mb-4">
                    <div className="bg-emerald-50 p-2 rounded-lg">
                      <p className="text-xl font-black text-emerald-600">{stats.passed}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">ناجح</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg">
                      <p className="text-xl font-black text-red-600">{stats.failed}</p>
                      <p className="text-[10px] text-red-600 font-bold">محمّل</p>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg">
                      <p className="text-xl font-black text-amber-600">{stats.pending}</p>
                      <p className="text-[10px] text-amber-600 font-bold">معلّق</p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <p className="text-xl font-black text-blue-600">{stats.avgGrade}</p>
                      <p className="text-[10px] text-blue-600 font-bold">معدل</p>
                    </div>
                  </div>

                  {/* Pass Type */}
                  {stats.graded > 0 && (
                    <div className="flex gap-2 text-xs">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                        دور أول: {stats.firstRound}
                      </span>
                      {stats.secondRound > 0 && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">
                          دور ثاني: {stats.secondRound}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Subjects view (المواد)
  const subjects = groupedData[selectedStage]?.[selectedTerm] || [];
  const termStats = getStageStats(subjects);

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">السجل الأكاديمي</p>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-[#0f2744]">
            {termLabels[selectedTerm] || `كورس ${selectedTerm}`}
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">
            {stageLabels[selectedStage] || `المرحلة ${selectedStage}`} · {subjects.length} مادة
          </p>
        </div>

        {renderBreadcrumb()}

        {/* Term Stats Summary */}
        <div className="card-pro p-4 mb-6 bg-gradient-to-l from-[#059669]/5 to-transparent">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-slate-700">{termStats.total}</p>
              <p className="text-xs text-slate-500 font-bold">إجمالي المواد</p>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600">{termStats.passed}</p>
              <p className="text-xs text-slate-500 font-bold">ناجح</p>
            </div>
            <div>
              <p className="text-2xl font-black text-red-600">{termStats.failed}</p>
              <p className="text-xs text-slate-500 font-bold">محمّل</p>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-600">{termStats.pending}</p>
              <p className="text-xs text-slate-500 font-bold">معلّق</p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-600">{termStats.avgGrade}</p>
              <p className="text-xs text-slate-500 font-bold">المعدل</p>
            </div>
          </div>
        </div>

        <div className="card-pro overflow-hidden">
          {subjects.length === 0 ? (
            <div className="py-24 text-center">
              <span className="text-6xl mb-4 block opacity-30">📚</span>
              <p className="text-slate-400 font-bold text-lg">لا توجد مواد في هذا الكورس</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {subjects.map((subject, index) => {
                const grade = subject.grade != null ? parseFloat(subject.grade) : null;
                const gradeInfo = getGradeInfo(grade, subject.pass_type);
                const isCarriedOver = subject.is_carried_over;

                return (
                  <div key={subject.enrollment_id} className="p-4 md:p-6 hover:bg-slate-50 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Course Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow ${
                          gradeInfo.status === 'passed' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' :
                          gradeInfo.status === 'failed' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' :
                          'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 text-lg">{subject.course_name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
                              {subject.course_code}
                            </span>
                            {subject.teacher_name && (
                              <span className="text-xs text-slate-500">
                                {subject.teacher_name}
                              </span>
                            )}
                            {isCarriedOver && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold">
                                محمّل من {subject.original_stage ? `المرحلة ${subject.original_stage}` : 'مرحلة سابقة'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Grade Info */}
                      <div className="flex items-center gap-4 md:text-left">
                        <div className="text-center md:text-left">
                          <div className={`text-3xl font-black ${
                            gradeInfo.status === 'passed' ? 'text-emerald-600' :
                            gradeInfo.status === 'failed' ? 'text-red-600' :
                            'text-slate-400'
                          }`}>
                            {grade !== null ? grade : "—"}
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg inline-block mt-1 ${gradeInfo.color}`}>
                            {gradeInfo.label}
                          </span>
                        </div>

                        {/* Status Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          gradeInfo.status === 'passed' ? 'bg-emerald-100' :
                          gradeInfo.status === 'failed' ? 'bg-red-100' :
                          'bg-slate-100'
                        }`}>
                          {gradeInfo.status === 'passed' ? (
                            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : gradeInfo.status === 'failed' ? (
                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
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