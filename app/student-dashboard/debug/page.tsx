"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function DebugPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbFixing, setDbFixing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const fixDatabase = async () => {
    setDbFixing(true);
    try {
      const response = await fetch("/api/debug/reinit-db", { method: "POST" });
      const result = await response.json();
      if (result.success) {
        alert("✅ " + result.message + "\n\nسيتم إعادة تحميل الصفحة...");
        window.location.reload();
      } else {
        alert("❌ فشل في إصلاح قاعدة البيانات: " + result.error);
      }
    } catch (error) {
      alert("❌ خطأ في الاتصال: " + error);
    }
    setDbFixing(false);
  };

  const enrollAllStages = async () => {
    setEnrolling(true);
    try {
      const response = await fetch("/api/student/enroll-all-stages", { method: "POST" });
      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}\n\nالمراحل: ${result.stages.join(", ")}\n\nسيتم إعادة تحميل الصفحة...`);
        window.location.reload();
      } else {
        alert("❌ فشل في التسجيل: " + result.error);
      }
    } catch (error) {
      alert("❌ خطأ في الاتصال: " + error);
    }
    setEnrolling(false);
  };

  useEffect(() => {
    if (!session?.user?.email) return;

    Promise.all([
      fetch("/api/student/profile").then(r => r.json()),
      fetch("/api/student/academic-data").then(r => r.json()),
      fetch("/api/student/courses").then(r => r.json()),
      fetch("/api/student/transcript").then(r => r.json()),
    ]).then(([profile, academicData, courses, transcript]) => {
      setData({
        profile,
        academicData,
        courses,
        transcript,
        session: session.user
      });
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [session]);

  if (loading) {
    return <div className="p-8">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-mono" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">تشخيص بيانات الطالب</h1>

      {/* Fix Database Button */}
      {data?.profile?.error?.includes("accessible_stages") && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="font-bold text-red-600 mb-2">🔧 مشكلة في قاعدة البيانات</h2>
          <p className="text-red-600 mb-3">العمود accessible_stages غير موجود. اضغط على الزر أدناه لإصلاح قاعدة البيانات:</p>
          <button
            onClick={fixDatabase}
            disabled={dbFixing}
            className="bg-red-600 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
          >
            {dbFixing ? "جاري الإصلاح..." : "🔧 إصلاح قاعدة البيانات"}
          </button>
        </div>
      )}

      {/* Enroll All Stages Button */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="font-bold text-blue-700 mb-2">📚 تسجيل في جميع المراحل</h2>
        <p className="text-blue-600 mb-3">
          اضغط هنا لتسجيل الطالب في مواد جميع المراحل (من المرحلة 1 إلى المرحلة {data?.profile?.stage || "4"})
        </p>
        <button
          onClick={enrollAllStages}
          disabled={enrolling}
          className="bg-blue-600 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
        >
          {enrolling ? "جاري التسجيل..." : "📚 تسجيل في جميع المراحل"}
        </button>
      </div>

      <div className="grid gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-bold text-lg mb-2">معلومات الجلسة</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(data?.session, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-bold text-lg mb-2">ملف الطالب</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(data?.profile, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-bold text-lg mb-2">البيانات الأكاديمية</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(data?.academicData, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-bold text-lg mb-2">المواد المسجلة</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(data?.courses, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-bold text-lg mb-2">الكشف الأكاديمي</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(data?.transcript, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}