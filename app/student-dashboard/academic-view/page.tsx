"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface StudentProfile {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
}

interface StudentCourse {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  teacher_name?: string | null;
  enrolled_at?: string | null;
}

interface StudentGrade {
  id: number;
  course_id: number;
  grade: number | null;
  semester?: string | null;
  created_at?: string | null;
  course_name?: string | null;
  course_code?: string | null;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  course_id: number;
  course_name: string;
  course_code?: string | null;
  date: string;
  status: string;
}

interface CourseAcademicSummary {
  courseId: number;
  courseName: string;
  teacherName?: string | null;
  semester?: string | null;
  grade?: number | null;
  gradeLabel?: string;
  enrolledAt?: string | null;
  attendancePercent?: number | null;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
}

function mapGradeToLabel(grade?: number | null): string {
  if (grade == null) return "";
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 70) return "C";
  if (grade >= 60) return "D";
  return "F";
}

export default function StudentAcademicViewPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summaries, setSummaries] = useState<CourseAcademicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const profileRes = await fetch("/api/student/profile");
        if (!profileRes.ok) {
          setLoading(false);
          setError("فشل جلب بيانات الطالب");
          return;
        }
        const profileData = await profileRes.json();
        if (profileData?.error) {
          setLoading(false);
          setError("غير مصرح");
          return;
        }

        setProfile(profileData as StudentProfile);

        const [gradesRes, coursesRes, attendanceRes] = await Promise.all([
          fetch("/api/student/grades"),
          fetch("/api/student/courses"),
          fetch(`/api/attendance?student_id=${profileData.id}`),
        ]);

        const gradesData: StudentGrade[] = (await gradesRes.json()) ?? [];
        const coursesData: StudentCourse[] = (await coursesRes.json()) ?? [];
        const attendanceData: AttendanceRecord[] = (await attendanceRes.json()) ?? [];

        setGrades(Array.isArray(gradesData) ? gradesData : []);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);

        // بناء ملخص لكل مادة
        const courseMap = new Map<number, CourseAcademicSummary>();

        for (const c of coursesData) {
          courseMap.set(c.id, {
            courseId: c.id,
            courseName: c.name,
            teacherName: c.teacher_name ?? null,
            enrolledAt: c.enrolled_at ?? null,
          });
        }

        for (const g of gradesData) {
          const existing = courseMap.get(g.course_id) ?? {
            courseId: g.course_id,
            courseName: g.course_name || "—",
          };

          existing.grade = g.grade;
          existing.gradeLabel = mapGradeToLabel(g.grade == null ? null : Number(g.grade));
          existing.semester = g.semester ?? existing.semester;
          courseMap.set(g.course_id, existing);
        }

        const attendanceByCourse: Record<number, { present: number; total: number }> = {};
        for (const rec of attendanceData) {
          if (!attendanceByCourse[rec.course_id]) {
            attendanceByCourse[rec.course_id] = { present: 0, total: 0 };
          }
          attendanceByCourse[rec.course_id].total += 1;
          if (rec.status === "present" || rec.status === "حاضر") {
            attendanceByCourse[rec.course_id].present += 1;
          }
        }

        for (const [courseId, agg] of Object.entries(attendanceByCourse)) {
          const idNum = Number(courseId);
          const existing = courseMap.get(idNum) ?? {
            courseId: idNum,
            courseName: attendanceData.find((r) => r.course_id === idNum)?.course_name || "—",
          };
          existing.attendancePercent = agg.total > 0 ? Math.round((agg.present / agg.total) * 100) : null;
          courseMap.set(idNum, existing);
        }

        const merged = Array.from(courseMap.values()).sort((a, b) => {
          if (a.enrolledAt && b.enrolledAt) {
            return new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime();
          }
          return a.courseName.localeCompare(b.courseName, "ar");
        });

        setSummaries(merged);
      } catch (err) {
        console.error("فشل جلب السجل الأكاديمي", err);
        setError("حدث خطأ غير متوقع أثناء جلب البيانات");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const gradeValues = grades.filter((g) => g.grade != null).map((g) => Number(g.grade));
  const gpa =
    gradeValues.length > 0
      ? (gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length).toFixed(1)
      : "--";

  const overallAttendance = (() => {
    if (attendance.length === 0) return "--";
    let present = 0;
    for (const rec of attendance) {
      if (rec.status === "present" || rec.status === "حاضر") {
        present += 1;
      }
    }
    return `${Math.round((present / attendance.length) * 100)}%`;
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-[#2563eb]/20 border-t-[#2563eb] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-semibold text-sm">جاري تحميل السجل الأكاديمي...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]" dir="rtl">
        <div className="bg-white shadow-lg rounded-2xl p-6 max-w-md text-center">
          <h1 className="text-lg font-black text-[#0f2744] mb-2">حدث خطأ</h1>
          <p className="text-slate-500 mb-4">{error}</p>
          <Link href="/student-dashboard" className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#2563eb] text-white font-bold text-sm">
            العودة للواجهة الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">بوابة الطالب</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">السجل الأكاديمي</h1>
          {profile && (
            <p className="text-slate-500 text-xs md:text-sm mt-1">
              {profile.name} 
              {profile.department ? ` - ${profile.department}` : ""}
            </p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2563eb]/60 via-[#2563eb] to-[#2563eb]/60"></div>
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#2563eb]/5 rounded-full blur-2xl group-hover:bg-[#2563eb]/10 transition-all duration-500 hidden md:block"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#2563eb]/20 to-[#2563eb]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#2563eb]/10 text-[#2563eb] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">مواد</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{courses.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">المواد المسجلة</p>
            </div>
          </div>

          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#059669]/60 via-[#059669] to-[#059669]/60"></div>
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#059669]/5 rounded-full blur-2xl group-hover:bg-[#059669]/10 transition-all duration-500 hidden md:block"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#059669]/20 to-[#059669]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#059669]/10 text-[#059669] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">GPA</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{gpa}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">المعدل التراكمي</p>
            </div>
          </div>

          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c8a44e]/60 via-[#c8a44e] to-[#c8a44e]/60"></div>
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#c8a44e]/5 rounded-full blur-2xl group-hover:bg-[#c8a44e]/10 transition-all duration-500 hidden md:block"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#c8a44e]/20 to-[#c8a44e]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#c8a44e]/10 text-[#c8a44e] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">الحضور</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{overallAttendance}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">نسبة الحضور الإجمالية</p>
            </div>
          </div>
        </div>

        {/* Academic Record Table */}
        <div className="card-pro p-4 md:p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-base md:text-xl font-black text-[#0f2744]">تفاصيل السجل الأكاديمي</h2>
            <Link
              href="/student-dashboard/my-grades"
              className="text-xs md:text-sm font-bold text-[#2563eb] hover:text-[#0f2744] bg-[#2563eb]/5 px-3 py-1.5 rounded-xl"
            >
              صفحة الدرجات التفصيلية
            </Link>
          </div>

          {summaries.length === 0 ? (
            <div className="py-20 text-center text-slate-300 font-medium">
              <div className="text-5xl mb-4">📚</div>
              لا توجد بيانات أكاديمية مسجلة بعد
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <table className="hidden md:table w-full text-right border-collapse">
                <thead>
                  <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.15em] border-b border-slate-50">
                    <th className="p-4">#</th>
                    <th className="p-4">المادة</th>
                    <th className="p-4">التدريسي</th>
                    <th className="p-4">الفصل</th>
                    <th className="p-4">الدرجة</th>
                    <th className="p-4">الحضور</th>
                    <th className="p-4">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {summaries.map((s, index) => (
                    <tr key={s.courseId} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-xs text-slate-400 font-bold">{index + 1}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-[#0f2744]">{s.courseName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {s.teacherName || "—"}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {s.semester || "—"}
                      </td>
                      <td className="p-4 text-sm">
                        {s.grade == null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                            {s.grade}
                            {s.gradeLabel && <span className="text-[10px] opacity-70">({s.gradeLabel})</span>}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {s.attendancePercent == null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                            {s.attendancePercent}%
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {formatDate(s.enrolledAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {summaries.map((s, index) => (
                  <div key={s.courseId} className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400">مادة رقم {index + 1}</p>
                        <h3 className="font-black text-sm text-slate-900">{s.courseName}</h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
                      <div className="bg-slate-50 rounded-xl p-2">
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">التدريسي</p>
                        <p className="font-bold text-slate-700">{s.teacherName || "—"}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">الفصل</p>
                        <p className="font-bold text-slate-700">{s.semester || "—"}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">الدرجة</p>
                        <p className="font-bold text-slate-700">
                          {s.grade == null ? "—" : `${s.grade}${s.gradeLabel ? ` (${s.gradeLabel})` : ""}`}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">الحضور</p>
                        <p className="font-bold text-slate-700">
                          {s.attendancePercent == null ? "—" : `${s.attendancePercent}%`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400">
                      تاريخ التسجيل: <span className="font-bold text-slate-600">{formatDate(s.enrolledAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
