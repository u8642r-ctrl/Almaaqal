"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function HomeworkGradingPage() {
  const { data: session } = useSession();
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [selectedHomework, setSelectedHomework] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/teacher/homework-grading")
      .then((r) => r.json())
      .then((data) => {
        setHomeworks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  useEffect(() => {
    if (!selectedHomework) {
      setStudents([]);
      return;
    }

    fetch(`/api/teacher/homework-grading?homework_id=${selectedHomework}`)
      .then((r) => r.json())
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch(() => setStudents([]));
  }, [selectedHomework]);

  const saveGrade = async (student: any) => {
    const grade = Number(student.grade);
    if (Number.isNaN(grade)) return;

    setSavingId(student.student_id);
    try {
      await fetch("/api/teacher/homework-grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: Number(selectedHomework),
          student_id: student.student_id,
          grade,
          feedback: student.feedback || "",
        }),
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] mb-6">تصحيح الواجبات</h1>

        <div className="card-pro p-4 md:p-6 mb-6">
          <label className="block text-xs font-bold text-slate-500 mb-1">اختر الواجب</label>
          <select value={selectedHomework} onChange={(e) => setSelectedHomework(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="">-- اختر --</option>
            {homeworks.map((hw) => (
              <option key={hw.id} value={hw.id}>{hw.title} - {hw.course_name}</option>
            ))}
          </select>
        </div>

        {selectedHomework && (
          <div className="card-pro p-4 md:p-6">
            <h2 className="text-base font-black text-[#0f2744] mb-4">الطلاب</h2>
            {students.length === 0 ? (
              <p className="text-slate-400 text-sm">لا يوجد طلاب في هذا الواجب</p>
            ) : (
              <div className="space-y-3">
                {students.map((student, index) => (
                  <div key={student.student_id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-slate-800">{index + 1}. {student.student_name}</p>
                        <p className="text-xs text-slate-400">{student.student_email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={student.grade ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setStudents((prev) => prev.map((s) => s.student_id === student.student_id ? { ...s, grade: value } : s));
                        }}
                        placeholder="الدرجة"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        value={student.feedback ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setStudents((prev) => prev.map((s) => s.student_id === student.student_id ? { ...s, feedback: value } : s));
                        }}
                        placeholder="ملاحظة"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                      />
                    </div>

                    <button
                      onClick={() => saveGrade(student)}
                      disabled={savingId === student.student_id}
                      className="mt-3 rounded-lg bg-[#059669] text-white text-sm font-bold px-4 py-2 disabled:opacity-50"
                    >
                      {savingId === student.student_id ? "جارٍ الحفظ..." : "حفظ الدرجة"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
