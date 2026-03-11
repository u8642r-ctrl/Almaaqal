"use client";

import React, { useEffect, useState } from "react";

type AttendanceRecord = {
  id: number;
  course_name: string;
  course_code: string;
  date: string;
  status: string;
  recorded_at: string;
};

type CourseSummary = {
  course_name: string;
  course_code: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
};

export default function MyAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        // جلب بيانات الطالب أولاً
        const profileRes = await fetch("/api/student/profile");
        if (!profileRes.ok) return;
        const profile = await profileRes.json();

        const res = await fetch(`/api/attendance?student_id=${profile.id}`);
        if (res.ok) {
          const data = await res.json();
          setRecords(Array.isArray(data) ? data : []);
        }
      } catch {
        console.error("فشل جلب سجلات الحضور");
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  // حساب ملخص لكل مادة
  const courseSummaries: CourseSummary[] = [];
  const courseMap = new Map<string, { name: string; code: string; total: number; present: number; absent: number }>();

  records.forEach((r) => {
    const key = r.course_code;
    if (!courseMap.has(key)) {
      courseMap.set(key, { name: r.course_name, code: r.course_code, total: 0, present: 0, absent: 0 });
    }
    const entry = courseMap.get(key)!;
    entry.total++;
    if (r.status === "present") entry.present++;
    else entry.absent++;
  });

  courseMap.forEach((val) => {
    courseSummaries.push({
      course_name: val.name,
      course_code: val.code,
      total: val.total,
      present: val.present,
      absent: val.absent,
      percentage: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
    });
  });

  const filteredRecords = filter === "all" ? records : records.filter((r) => r.course_code === filter);
  const totalPresent = records.filter((r) => r.status === "present").length;
  const totalAbsent = records.filter((r) => r.status === "absent").length;
  const overallPercentage = records.length > 0 ? Math.round((totalPresent / records.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-5xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">لوحة الطالب</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">سجل الحضور</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">متابعة حضورك وغيابك في المواد الدراسية</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400 font-bold mt-6">جاري التحميل...</p>
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <div className="bg-white p-3 sm:p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                <span className="text-slate-400 text-[11px] md:text-sm font-bold">إجمالي المحاضرات</span>
                <h3 className="text-2xl md:text-4xl font-black text-slate-900 mt-1 md:mt-3">{records.length}</h3>
              </div>
              <div className="bg-white p-3 sm:p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                <span className="text-green-600 text-[11px] md:text-sm font-bold">حضور</span>
                <h3 className="text-2xl md:text-4xl font-black text-green-600 mt-1 md:mt-3">{totalPresent}</h3>
              </div>
              <div className="bg-white p-3 sm:p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                <span className="text-red-500 text-[11px] md:text-sm font-bold">غياب</span>
                <h3 className="text-2xl md:text-4xl font-black text-red-500 mt-1 md:mt-3">{totalAbsent}</h3>
              </div>
              <div className="bg-white p-3 sm:p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                <span className="text-blue-600 text-[11px] md:text-sm font-bold">نسبة الحضور</span>
                <h3 className={`text-2xl md:text-4xl font-black mt-1 md:mt-3 ${overallPercentage >= 75 ? "text-green-600" : overallPercentage >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {overallPercentage}%
                </h3>
              </div>
            </div>

            {/* Per-Course Summary */}
            {courseSummaries.length > 0 && (
              <div className="bg-white rounded-2xl md:rounded-[2rem] p-5 md:p-8 shadow-lg border border-slate-100">
                <h2 className="text-lg md:text-xl font-black text-slate-900 mb-4 md:mb-6">ملخص حسب المادة</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {courseSummaries.map((cs) => (
                    <div
                      key={cs.course_code}
                      className="border border-slate-100 rounded-2xl p-4 md:p-5 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setFilter(filter === cs.course_code ? "all" : cs.course_code)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold font-mono">
                            {cs.course_code}
                          </span>
                          <p className="font-bold text-slate-800 mt-2">{cs.course_name}</p>
                        </div>
                        <span
                          className={`text-2xl font-black ${
                            cs.percentage >= 75 ? "text-green-600" : cs.percentage >= 50 ? "text-amber-600" : "text-red-600"
                          }`}
                        >
                          {cs.percentage}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            cs.percentage >= 75 ? "bg-green-500" : cs.percentage >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${cs.percentage}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-slate-400 font-bold">
                        <span>حضور: {cs.present}</span>
                        <span>غياب: {cs.absent}</span>
                        <span>الإجمالي: {cs.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Records Table */}
            <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-lg border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
              <div className="p-4 md:p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-base md:text-xl font-black text-slate-900">
                  سجل المحاضرات {filter !== "all" && `- ${filter}`}
                </h2>
                {filter !== "all" && (
                  <button
                    onClick={() => setFilter("all")}
                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100"
                  >
                    عرض الكل
                  </button>
                )}
              </div>

              {filteredRecords.length === 0 ? (
                <div className="py-20 text-center text-slate-300 font-medium">
                  <div className="text-5xl mb-4">📋</div>
                  لا توجد سجلات حضور بعد
                </div>
              ) : (
                <>
                {/* Desktop Table */}
                <table className="hidden md:table w-full text-right">
                  <thead>
                    <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                      <th className="p-6">#</th>
                      <th className="p-6">المادة</th>
                      <th className="p-6">التاريخ</th>
                      <th className="p-6">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredRecords.map((record, idx) => (
                      <tr key={record.id} className="hover:bg-slate-50/80 transition-all">
                        <td className="p-6 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-6">
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold font-mono mr-2">
                            {record.course_code}
                          </span>
                          <span className="font-bold text-slate-800">{record.course_name}</span>
                        </td>
                        <td className="p-6 text-sm text-slate-600 font-mono">
                          {new Date(record.date).toLocaleDateString("ar-IQ")}
                        </td>
                        <td className="p-6">
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-bold ${
                              record.status === "present"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {record.status === "present" ? "حاضر ✓" : "غائب ✗"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredRecords.map((record, idx) => (
                    <div key={record.id} className="p-4 hover:bg-slate-50/80 transition-all">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-400 font-bold">#{idx + 1}</span>
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                              {record.course_code}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 text-sm">{record.course_name}</p>
                          <p className="text-slate-400 text-[11px] mt-1 font-mono">
                            {new Date(record.date).toLocaleDateString("ar-IQ")}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 ${
                            record.status === "present"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {record.status === "present" ? "حاضر ✓" : "غائب ✗"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
