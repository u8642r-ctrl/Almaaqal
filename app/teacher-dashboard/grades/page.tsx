"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function TeacherGradesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [existingGrades, setExistingGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // جلب مواد الأستاذ
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/teacher/courses")
      .then((r) => r.json())
      .then((data) => {
        setCourses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  // إخفاء التنبيه تلقائياً
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // جلب طلاب المادة المحددة ودرجاتهم
  const loadCourseStudents = async (courseId: number) => {
    setSelectedCourse(courseId);
    setStudentsLoading(true);

    try {
      const [enrollRes, gradesRes] = await Promise.all([
        fetch(`/api/enrollments?course_id=${courseId}`).then((r) => r.json()),
        fetch(`/api/grades?course_id=${courseId}`).then((r) => r.json()),
      ]);

      setEnrolledStudents(Array.isArray(enrollRes) ? enrollRes : []);
      setExistingGrades(Array.isArray(gradesRes) ? gradesRes : []);
    } catch {
      setToast({ message: "فشل في جلب البيانات", type: "error" });
    } finally {
      setStudentsLoading(false);
    }
  };

  // حفظ/تعديل درجة
  const saveGrade = async (studentId: number, courseId: number, gradeValue: string) => {
    const numGrade = parseFloat(gradeValue);
    if (isNaN(numGrade) || numGrade < 0 || numGrade > 100) {
      setToast({ message: "الدرجة يجب أن تكون بين 0 و 100", type: "error" });
      return;
    }

    // هل توجد درجة مسبقة؟
    const existing = existingGrades.find(
      (g) => g.student_id === studentId && g.course_id === courseId
    );

    try {
      if (existing) {
        // تعديل الدرجة الموجودة
        await fetch(`/api/grades?id=${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade: numGrade }),
        });
      } else {
        // إضافة درجة جديدة
        await fetch("/api/grades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            course_id: courseId,
            grade: numGrade,
          }),
        });
      }

      setToast({ message: "تم حفظ الدرجة بنجاح", type: "success" });
      // إعادة تحميل الدرجات
      loadCourseStudents(courseId);
    } catch {
      setToast({ message: "فشل في حفظ الدرجة", type: "error" });
    }
  };

  // الحصول على الدرجة الحالية للطالب في المادة
  const getStudentGrade = (studentId: number) => {
    const grade = existingGrades.find((g) => g.student_id === studentId);
    return grade?.grade ?? "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden" dir="rtl">
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
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">إدارة الدرجات</h1>
            </div>
          </div>
          <p className="text-slate-500 text-xs md:text-sm mt-1">رصد وتعديل درجات الطلاب</p>
        </div>

        {/* اختيار المادة */}
        <div className="card-pro p-4 md:p-6 mb-6">
          <h2 className="text-sm md:text-base font-black text-[#0f2744] mb-3 md:mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            اختر المادة
          </h2>
          {courses.length === 0 ? (
            <p className="text-slate-400 text-center py-4">لا توجد مواد مسندة إليك</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {courses.map((course: any) => (
                <button
                  key={course.id}
                  onClick={() => loadCourseStudents(course.id)}
                  className={`p-4 rounded-2xl text-right transition-all border-2 ${
                    selectedCourse === course.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-100 bg-slate-50 hover:border-emerald-200"
                  }`}
                >
                  <h3 className="font-bold text-slate-800">{course.name}</h3>
                  <p className="text-xs font-bold text-emerald-600 mt-2">
                    {course.student_count} طالب
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* قائمة الطلاب والدرجات */}
        {selectedCourse && (
          <div className="card-pro overflow-hidden">
            <div className="p-4 md:p-8 border-b border-slate-50">
              <h2 className="text-base md:text-lg font-black text-slate-900">
                🎓 طلاب المادة - رصد الدرجات
              </h2>
              <p className="text-slate-400 text-xs md:text-sm mt-1">أدخل الدرجة ثم اضغط Enter أو زر الحفظ</p>
            </div>

            {studentsLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold mt-4">جاري تحميل الطلاب...</p>
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="py-20 text-center">
                <span className="text-5xl mb-4 block opacity-30">🎓</span>
                <p className="text-slate-400 font-bold">لا يوجد طلاب مسجلون في هذه المادة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <table className="hidden md:table w-full text-right border-collapse">
                  <thead>
                    <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.15em] border-b border-slate-50">
                      <th className="p-6">#</th>
                      <th className="p-6">اسم الطالب</th>
                      <th className="p-6">البريد</th>
                      <th className="p-6 text-center">الدرجة</th>
                      <th className="p-6 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/50">
                    {enrolledStudents.map((student: any, index: number) => {
                      const currentGrade = getStudentGrade(student.student_id);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition-all">
                          <td className="p-6 text-slate-400 text-sm font-bold">{index + 1}</td>
                          <td className="p-6 font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{student.student_name}</span>
                              {student.is_carried_over && (
                                <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-100 text-amber-700 whitespace-nowrap">
                                  تحميل
                                </span>
                              )}
                            </div>
                            {student.is_carried_over && (
                              <p className="text-xs text-amber-600 mt-1">من المرحلة {student.original_stage}</p>
                            )}
                          </td>
                          <td className="p-6 text-slate-500 text-sm">{student.student_email}</td>
                          <td className="p-6">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={currentGrade}
                              placeholder="0-100"
                              className="w-24 mx-auto block text-center p-2 bg-slate-50 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none font-bold"
                              id={`grade-${student.student_id}`}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const input = document.getElementById(
                                    `grade-${student.student_id}`
                                  ) as HTMLInputElement;
                                  saveGrade(student.student_id, selectedCourse!, input.value);
                                }
                              }}
                            />
                          </td>
                          <td className="p-6 text-center">
                            <button
                              onClick={() => {
                                const input = document.getElementById(
                                  `grade-${student.student_id}`
                                ) as HTMLInputElement;
                                saveGrade(student.student_id, selectedCourse!, input.value);
                              }}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                            >
                              حفظ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                  {enrolledStudents.map((student: any, index: number) => {
                    const currentGrade = getStudentGrade(student.student_id);
                    return (
                      <div key={student.id} className="p-4 hover:bg-slate-50/80 transition-all">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-slate-400 font-bold">#{index + 1}</span>
                            <p className="font-bold text-slate-800 text-sm">{student.student_name}</p>
                            {student.is_carried_over && (
                              <>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 inline-block mt-1">
                                  تحميل
                                </span>
                                <p className="text-xs text-amber-600 mt-0.5">من المرحلة {student.original_stage}</p>
                              </>
                            )}
                            <p className="text-slate-400 text-[11px] truncate">{student.student_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={currentGrade}
                            placeholder="0-100"
                            className="flex-1 text-center p-2 bg-slate-50 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none font-bold text-sm"
                            id={`grade-mobile-${student.student_id}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const input = document.getElementById(
                                  `grade-mobile-${student.student_id}`
                                ) as HTMLInputElement;
                                saveGrade(student.student_id, selectedCourse!, input.value);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById(
                                `grade-mobile-${student.student_id}`
                              ) as HTMLInputElement;
                              saveGrade(student.student_id, selectedCourse!, input.value);
                            }}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                          >
                            حفظ
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:bottom-6 px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl text-white font-bold text-sm md:text-base z-[70] ${
            toast.type === "success" ? "bg-slate-900" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
