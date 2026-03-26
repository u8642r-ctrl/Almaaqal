"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";

type LectureContent = {
  id: number;
  course_id: number;
  content_type: string;
  title: string;
  description: string;
  file_name: string | null;
  file_data: string | null;
  created_at: string;
  course_name: string;
  course_code: string;
  teacher_name: string;
  has_file: boolean;
};

export default function LectureDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const lectureId = params.id as string;

  const [lecture, setLecture] = useState<LectureContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!session?.user?.email || !lectureId) return;
    fetchLecture();
  }, [session, lectureId]);

  const fetchLecture = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/student/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: lectureId })
      });

      const data = await response.json();

      if (response.ok && data.content) {
        // Only allow lectures, not homework
        if (data.content.content_type !== 'lecture') {
          alert("هذا المحتوى ليس محاضرة");
          return;
        }
        setLecture(data.content);
      } else {
        alert(data.error || "فشل في جلب تفاصيل المحاضرة");
      }
    } catch (err) {
      console.error("Fetch lecture error:", err);
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!lecture?.file_data || !lecture?.file_name) {
      alert("لا يوجد ملف مرفق");
      return;
    }

    try {
      setDownloading(true);

      // Create blob from base64 data
      const byteCharacters = atob(lecture.file_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = lecture.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("خطأ في تحميل الملف");
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return { type: 'PDF', color: 'text-red-600 bg-red-50', icon: '📄' };
      case 'doc':
      case 'docx':
        return { type: 'Word', color: 'text-blue-600 bg-blue-50', icon: '📝' };
      case 'ppt':
      case 'pptx':
        return { type: 'PowerPoint', color: 'text-orange-600 bg-orange-50', icon: '📊' };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return { type: 'صورة', color: 'text-green-600 bg-green-50', icon: '🖼️' };
      default:
        return { type: 'ملف', color: 'text-gray-600 bg-gray-50', icon: '📁' };
    }
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

  if (!lecture) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="text-center">
          <span className="text-6xl mb-4 block opacity-30">❌</span>
          <p className="text-slate-400 font-bold text-lg">المحاضرة غير موجودة</p>
          <Link
            href="/student-dashboard/lectures"
            className="inline-block mt-4 bg-[#2563eb] text-white px-6 py-2 rounded-lg font-bold text-sm"
          >
            العودة للمحاضرات
          </Link>
        </div>
      </div>
    );
  }

  const fileType = lecture.file_name ? getFileType(lecture.file_name) : null;

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/student-dashboard/lectures"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
                <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">بوابة الطالب</p>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-[#0f2744] tracking-tight">تفاصيل المحاضرة</h1>
            </div>
          </div>
        </div>

        {/* Lecture Content */}
        <div className="card-pro p-6 md:p-8 animate-fade-in-up">
          {/* Course Info */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-[#2563eb]/5 rounded-xl border border-[#2563eb]/10">
            <div className="w-12 h-12 bg-[#2563eb]/20 text-[#2563eb] rounded-xl flex items-center justify-center font-bold">
              📚
            </div>
            <div>
              <h2 className="font-bold text-[#2563eb]">{lecture.course_name}</h2>
              <p className="text-sm text-slate-600">{lecture.course_code} • د. {lecture.teacher_name}</p>
            </div>
          </div>

          {/* Lecture Title */}
          <div className="mb-6">
            <h3 className="text-2xl md:text-3xl font-black text-[#0f2744] mb-2">{lecture.title}</h3>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18v2a3 3 0 01-3 3H6a3 3 0 01-3-3V7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17v2a3 3 0 003 3h12a3 3 0 003-3v-2" />
                </svg>
                محاضرة
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDate(lecture.created_at)}
              </div>
            </div>
          </div>

          {/* Description */}
          {lecture.description && (
            <div className="mb-8">
              <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                محتوى المحاضرة
              </h4>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{lecture.description}</p>
              </div>
            </div>
          )}

          {/* File Section */}
          {lecture.file_name && lecture.has_file && (
            <div className="border-t border-slate-100 pt-6">
              <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                الملف المرفق
              </h4>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-content center text-2xl ${fileType?.color}`}>
                      {fileType?.icon}
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-1">{lecture.file_name}</h5>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${fileType?.color}`}>
                          {fileType?.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={downloadFile}
                    disabled={downloading}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {downloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        جاري التحميل...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        تحميل الملف
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4">
            <Link
              href="/student-dashboard/lectures"
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              العودة للمحاضرات
            </Link>

            <button
              onClick={fetchLecture}
              className="bg-white border border-slate-200 hover:border-[#2563eb]/30 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              تحديث
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}