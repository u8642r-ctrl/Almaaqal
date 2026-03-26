"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentStagesPage() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<number | null>(null);
  const [enrollingAll, setEnrollingAll] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((data) => {
        setStudents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const enrollStudent = async (studentId: number, studentName: string) => {
    setEnrolling(studentId);
    setMessage(null);
    try {
      const response = await fetch("/api/enrollments/enroll-student-all-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId }),
      });
      const result = await response.json();
      if (result.success) {
        setMessage({ type: "success", text: `✅ تم تسجيل ${studentName} في ${result.total_enrolled} مادة` });
      } else {
        setMessage({ type: "error", text: `❌ فشل تسجيل ${studentName}: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: "error", text: `❌ خطأ في الاتصال` });
    }
    setEnrolling(null);
  };

  const enrollAllStudents = async () => {
    setEnrollingAll(true);
    setMessage(null);
    try {
      const response = await fetch("/api/enrollments/enroll-all-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (result.success) {
        setMessage({
          type: "success",
          text: `✅ ${result.message}`
        });
      } else {
        setMessage({ type: "error", text: `❌ فشل التسجيل الجماعي: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: "error", text: `❌ خطأ في الاتصال` });
    }
    setEnrollingAll(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-[#c8a44e]/20 border-t-[#c8a44e] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-semibold text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#c8a44e] to-[#059669] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#c8a44e]/60 uppercase tracking-widest">بوابة الادارة</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">تسجيل الطلاب في المراحل</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">تسجيل الطلاب في مواد جميع مراحلهم الدراسية (الحالية والسابقة)</p>
        </div>

        {/* Enroll All Students Button */}
        <div className="mb-6 animate-fade-in-up">
          <button
            onClick={enrollAllStudents}
            disabled={enrollingAll || enrolling !== null}
            className="px-6 py-3 bg-gradient-to-l from-[#059669] to-[#047857] text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {enrollingAll ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                جاري تسجيل جميع الطلاب...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                تسجيل جميع الطلاب في مراحلهم
                <span className="text-xs bg-white/20 px-2 py-1 rounded-md">({students.length} طالب)</span>
              </>
            )}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-2xl animate-fade-in-up ${message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            <p className="font-bold">{message.text}</p>
          </div>
        )}

        {/* Students List */}
        <div className="card-pro overflow-hidden animate-fade-in-up">
          <div className="divide-y divide-slate-50">
            {students.length === 0 ? (
              <div className="py-32 text-center">
                <span className="text-6xl mb-4 block opacity-30">👥</span>
                <p className="text-slate-400 font-bold text-lg">لا يوجد طلاب</p>
                <p className="text-slate-300 text-sm mt-2">قم بإضافة طلاب أولاً</p>
              </div>
            ) : (
              students.map((student, index) => (
                <div key={student.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-all">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-[#2563eb]/20 to-[#2563eb]/5 rounded-xl md:rounded-2xl flex items-center justify-center text-[#2563eb] font-black text-sm md:text-lg flex-shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm md:text-base text-[#0f2744]">{student.name}</p>
                      <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-500 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">المرحلة {student.stage || "غير محددة"}</span>
                        <span>•</span>
                        <span>{student.department || "غير محدد"}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => enrollStudent(student.id, student.name)}
                    disabled={enrolling === student.id || enrollingAll}
                    className="px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-l from-[#2563eb] to-[#1d4ed8] text-white rounded-xl font-bold text-xs md:text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {enrolling === student.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        جاري التسجيل...
                      </>
                    ) : enrollingAll ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        جاري التسجيل الجماعي...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        تسجيل في جميع المراحل
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
