"use client";

import React, { useEffect, useState } from "react";

type Enrollment = {
  id: number;
  student_name: string;
  student_email: string;
  course_name: string;
  course_code: string;
  enrolled_at: string;
};

export default function AdminDebugEnrollmentsPage() {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/enrollments")
      .then((r) => r.json())
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-[#0f2744]">فحص التسجيلات</h1>
          <p className="text-slate-500 text-sm mt-1">عرض التسجيلات الحالية بين الطلاب والمواد</p>
        </div>

        <div className="card-pro overflow-hidden">
          {loading ? (
            <div className="p-8 text-slate-400">جاري التحميل...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-slate-400">لا توجد تسجيلات حالياً</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs">
                    <th className="p-4">#</th>
                    <th className="p-4">الطالب</th>
                    <th className="p-4">الإيميل</th>
                    <th className="p-4">المادة</th>
                    <th className="p-4">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="p-4 text-slate-400">{index + 1}</td>
                      <td className="p-4 font-bold text-slate-800">{row.student_name}</td>
                      <td className="p-4 text-sm text-slate-500">{row.student_email}</td>
                      <td className="p-4 text-slate-700">{row.course_name}</td>
                      <td className="p-4 text-slate-500 text-sm">{new Date(row.enrolled_at).toLocaleString("ar-IQ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
