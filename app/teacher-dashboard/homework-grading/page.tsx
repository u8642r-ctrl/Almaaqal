"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function TeacherHomeworkGradingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [gradeInputs, setGradeInputs] = useState<Record<number, string>>({});
  const [feedbackInputs, setFeedbackInputs] = useState<Record<number, string>>({});

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadHomeworks = async () => {
    try {
      const result = await fetch("/api/teacher/homework-grading").then((r) => r.json());
      setHomeworks(Array.isArray(result?.homeworks) ? result.homeworks : []);
    } catch {
      setToast({ type: "error", text: "فشل في جلب الواجبات" });
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsForHomework = async (homeworkId: string) => {
    if (!homeworkId) {
      setStudents([]);
      return;
    }

    setStudentsLoading(true);
    try {
      const result = await fetch(`/api/teacher/homework-grading?homework_id=${homeworkId}`).then((r) => r.json());
      const rows = Array.isArray(result?.students) ? result.students : [];
      setStudents(rows);

      const nextGrades: Record<number, string> = {};
      const nextFeedback: Record<number, string> = {};
      rows.forEach((row: any) => {
        nextGrades[row.student_id] = row.grade !== null && row.grade !== undefined ? String(row.grade) : "";
        nextFeedback[row.student_id] = row.feedback || "";
      });
      setGradeInputs(nextGrades);
      setFeedbackInputs(nextFeedback);
    } catch {
      setToast({ type: "error", text: "فشل في جلب طلاب الواجب" });
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.email) return;
    loadHomeworks();
  }, [session]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const saveGrade = async (studentId: number) => {
    if (!selectedHomeworkId) return;

    const gradeValue = Number(gradeInputs[studentId]);
    if (Number.isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
      setToast({ type: "error", text: "الدرجة يجب أن تكون بين 0 و 100" });
      return;
    }

    const rowKey = `${selectedHomeworkId}-${studentId}`;
    setSavingKey(rowKey);

    try {
      const response = await fetch("/api/teacher/homework-grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homework_id: Number(selectedHomeworkId),
          student_id: studentId,
          grade: gradeValue,
          feedback: feedbackInputs[studentId] || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setToast({ type: "error", text: result?.error || "فشل في حفظ الدرجة" });
        setSavingKey(null);
        return;
      }

      setToast({ type: "success", text: "تم إرسال درجة الواجب" });
      await loadStudentsForHomework(selectedHomeworkId);
    } catch {
      setToast({ type: "error", text: "خطأ في الاتصال" });
    } finally {
      setSavingKey(null);
    }
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
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center hover:bg-slate-50 transition-all"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
                <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">بوابة التدريسي</p>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">تصحيح الواجبات</h1>
            </div>
          </div>
          <p className="text-slate-500 text-xs md:text-sm mt-1">اختر الواجب ثم أدخل درجة كل طالب وأرسلها</p>
        </div>

        <div className="card-pro p-4 md:p-6 mb-6">
          <label className="block text-xs font-bold text-slate-500 mb-2">اختر الواجب</label>
          <select
            value={selectedHomeworkId}
            onChange={(e) => {
              const nextId = e.target.value;
              setSelectedHomeworkId(nextId);
              loadStudentsForHomework(nextId);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-[#059669] outline-none"
          >
            <option value="">-- اختر واجب --</option>
            {homeworks.map((homework) => (
              <option key={homework.id} value={homework.id}>
                {homework.title} - {homework.course_name}
              </option>
            ))}
          </select>
        </div>

        <div className="card-pro overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100">
            <h2 className="text-base font-black text-[#0f2744]">طلاب الواجب</h2>
          </div>

          {studentsLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold mt-4">جاري تحميل الطلاب...</p>
            </div>
          ) : !selectedHomeworkId ? (
            <div className="py-20 text-center text-slate-400 font-bold">اختر واجباً أولاً</div>
          ) : students.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-bold">لا يوجد طلاب مسجلون في المادة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.12em] border-b border-slate-50">
                    <th className="p-4">الطالب</th>
                    <th className="p-4">الإجابة</th>
                    <th className="p-4">الدرجة</th>
                    <th className="p-4">ملاحظات الأستاذ</th>
                    <th className="p-4">إرسال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map((student: any) => {
                    const rowKey = `${selectedHomeworkId}-${student.student_id}`;
                    const isSaving = savingKey === rowKey;

                    return (
                      <tr key={student.student_id} className="hover:bg-slate-50 transition-all">
                        <td className="p-4">
                          <p className="font-bold text-slate-800 text-sm">{student.student_name}</p>
                          <p className="text-xs text-slate-400">{student.student_email}</p>
                        </td>
                        <td className="p-4 text-xs text-slate-500 max-w-[240px]">
                          {student.submission_text ? student.submission_text : "لا توجد إجابة مرسلة بعد"}
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={gradeInputs[student.student_id] ?? ""}
                            onChange={(e) =>
                              setGradeInputs((prev) => ({ ...prev, [student.student_id]: e.target.value }))
                            }
                            className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-[#059669]"
                            placeholder="0-100"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            value={feedbackInputs[student.student_id] ?? ""}
                            onChange={(e) =>
                              setFeedbackInputs((prev) => ({ ...prev, [student.student_id]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#059669]"
                            placeholder="ملاحظة للطالب"
                          />
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => saveGrade(student.student_id)}
                            disabled={isSaving}
                            className="bg-[#059669] text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                          >
                            {isSaving ? "جاري..." : "إرسال"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-fit px-5 py-3 rounded-xl text-white font-bold text-sm shadow-2xl z-[70] ${toast.type === "success" ? "bg-slate-900" : "bg-red-500"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
