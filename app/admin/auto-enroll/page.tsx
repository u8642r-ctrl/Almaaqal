"use client";

import React, { useEffect, useState } from "react";

export default function AdminAutoEnrollPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        fetch("/api/students").then((r) => r.json()),
        fetch("/api/courses").then((r) => r.json()),
      ]);

      setStudents(Array.isArray(studentsRes) ? studentsRes : []);
      setCourses(Array.isArray(coursesRes) ? coursesRes : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAutoEnrollAll = async () => {
    if (students.length === 0 || courses.length === 0) {
      setMessage("لا يوجد طلاب أو مواد");
      return;
    }

    setProcessing(true);
    setMessage("");

    try {
      let added = 0;
      let skipped = 0;

      for (const student of students) {
        for (const course of courses) {
          const response = await fetch("/api/enrollments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_id: student.id,
              course_id: course.id,
            }),
          });

          if (response.ok) {
            added += 1;
          } else {
            skipped += 1;
          }
        }
      }

      setMessage(`تمت العملية: ${added} تسجيل جديد، ${skipped} موجود مسبقاً`);
    } catch {
      setMessage("حدث خطأ أثناء التسجيل التلقائي");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-[#0f2744]">التسجيل التلقائي</h1>
          <p className="text-slate-500 text-sm mt-1">تسجيل كل الطلاب في كل المواد مرة واحدة</p>
        </div>

        <div className="card-pro p-4 md:p-6 mb-4">
          {loading ? (
            <p className="text-slate-400">جاري التحميل...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500">عدد الطلاب</p>
                <p className="text-2xl font-black text-[#2563eb]">{students.length}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500">عدد المواد</p>
                <p className="text-2xl font-black text-[#059669]">{courses.length}</p>
              </div>
            </div>
          )}
        </div>

        <div className="card-pro p-4 md:p-6">
          <button
            onClick={handleAutoEnrollAll}
            disabled={processing || loading}
            className="bg-[#0f2744] text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {processing ? "جارٍ التنفيذ..." : "تنفيذ التسجيل التلقائي"}
          </button>

          {message && (
            <p className="mt-4 text-sm font-bold text-[#059669]">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
