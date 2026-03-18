"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EnrollAllStagesPage() {
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
    let successCount = 0;
    let failCount = 0;

    for (const student of students) {
      try {
        const response = await fetch("/api/enrollments/enroll-student-all-stages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: student.id }),
        });
        const result = await response.json();
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setMessage({
      type: successCount > 0 ? "success" : "error",
      text: `✅ تم تسجيل ${successCount} طالب بنجاح${failCount > 0 ? ` | ❌ فشل ${failCount}` : ""}`,
    });
    setEnrollingAll(false);
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
    <div className="min-h-screen bg-[#f0f4f8] p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center hover:bg-slate-50 transition-all"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#0f2744]">تسجيل الطلاب في جميع المراحل</h1>
            <p className="text-slate-500 text-sm">تسجيل الطلاب في مواد مراحلهم السابقة والحالية المرتبطة بقسمهم فقط</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {/* Enroll All Button */}
        <div className="mb-6">
          <button
            onClick={enrollAllStudents}
            disabled={enrollingAll || students.length === 0}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-l from-[#2563eb] to-[#1d4ed8] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {enrollingAll ? "جاري تسجيل الجميع..." : `📚 تسجيل جميع الطلاب (${students.length})`}
          </button>
        </div>

        {/* Students List */}
        <div className="card-pro overflow-hidden">
          <div className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-400 font-bold">لا يوجد طلاب</p>
              </div>
            ) : (
              students.map((student) => (
                <div key={student.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2563eb]/10 rounded-xl flex items-center justify-center text-[#2563eb] font-bold">
                      {student.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-bold text-[#0f2744]">{student.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>المرحلة {student.stage || "غير محددة"}</span>
                        <span>•</span>
                        <span>{student.department || "غير محدد"}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => enrollStudent(student.id, student.name)}
                    disabled={enrolling === student.id || enrollingAll}
                    className="px-4 py-2 bg-[#2563eb] text-white rounded-lg font-bold text-sm hover:bg-[#1d4ed8] transition-all disabled:opacity-50"
                  >
                    {enrolling === student.id ? "جاري التسجيل..." : "تسجيل"}
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
