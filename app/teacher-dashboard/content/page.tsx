"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type ContentItem = {
  id: number;
  course_id: number;
  content_type: string;
  title: string;
  description: string;
  file_name: string | null;
  created_at: string;
  course_name: string;
  course_code: string;
  max_grade?: number | null;
  stage?: string;
};

export default function TeacherContentPage() {
  const { data: session } = useSession();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type NavStep = 'stages' | 'types' | 'list';
  const [nav, setNav] = useState<{ step: NavStep, stage?: string, type?: string }>({ step: 'stages' });

  useEffect(() => {
    if (!session?.user?.email) return;

    fetchContent();
  }, [session]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/teacher/content");
      const data = await response.json();

      if (response.ok) {
        setContent(Array.isArray(data) ? data : []);
        setError(null);
      } else {
        setError(data.error || "حدث خطأ في جلب المحتوى");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = async (contentId: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المحتوى؟")) return;

    try {
      const response = await fetch(`/api/teacher/content?id=${contentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setContent(content.filter(item => item.id !== contentId));
        alert("تم حذف المحتوى بنجاح");
      } else {
        const data = await response.json();
        alert(data.error || "فشل في حذف المحتوى");
      }
    } catch (err) {
      alert("خطأ في الاتصال بالخادم");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const availableStages = Array.from(new Set(content.map(c => c.stage || '1'))).sort((a, b) => parseInt(a) - parseInt(b));
  const stageContent = content.filter(c => (c.stage || '1') === nav.stage);
  const lecturesCount = stageContent.filter(c => c.content_type === 'lecture').length;
  const homeworkCount = stageContent.filter(c => c.content_type === 'homework').length;
  const filteredContent = content.filter(c => (c.stage || '1') === nav.stage && c.content_type === nav.type);

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">بوابة التدريسي</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">إدارة المحتوى التعليمي</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">رفع وإدارة المحاضرات والمواد التعليمية</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up stagger-1">
          <Link
            href="/teacher-dashboard/content/upload"
            className="btn-primary bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065f46] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            رفع محتوى جديد
          </Link>
          <button
            onClick={fetchContent}
            className="btn-secondary bg-white border border-slate-200 hover:border-[#059669]/30 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 animate-fade-in-up">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.82 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Breadcrumb Navigation */}
        {content.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 text-sm font-semibold animate-fade-in-up">
            <button
              onClick={() => setNav({ step: 'stages' })}
              className={`transition-colors ${nav.step === 'stages' ? 'text-[#0f2744] bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200' : 'text-slate-500 hover:text-[#0f2744] px-2 py-2'}`}
            >
              المراحل الدراسية
            </button>

            {nav.stage && (
              <>
                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <button
                  onClick={() => setNav({ step: 'types', stage: nav.stage })}
                  className={`transition-colors ${nav.step === 'types' ? 'text-[#0f2744] bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200' : 'text-slate-500 hover:text-[#0f2744] px-2 py-2'}`}
                >
                  المرحلة {nav.stage}
                </button>
              </>
            )}

            {nav.type && (
              <>
                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-[#0f2744] bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                  {nav.type === 'lecture' ? 'المحاضرات' : 'الواجبات'}
                </span>
              </>
            )}
          </div>
        )}

        {/* Dynamic Content Area */}
          {content.length === 0 ? (
            <div className="card-pro overflow-hidden animate-fade-in-up stagger-2">
            <div className="py-32 text-center">
              <span className="text-6xl mb-4 block opacity-30">📚</span>
              <p className="text-slate-400 font-bold text-lg">لا يوجد محتوى تعليمي بعد</p>
              <p className="text-slate-300 text-sm mt-2">
                ابدأ برفع المحاضرات والمواد التعليمية لطلابك
              </p>
              <Link
                href="/teacher-dashboard/content/upload"
                className="inline-block mt-4 bg-[#059669] hover:bg-[#047857] text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                رفع محتوى جديد
              </Link>
            </div>
            </div>
          ) : nav.step === 'stages' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in-up">
              {availableStages.map(stage => (
                <div
                  key={stage}
                  onClick={() => setNav({ step: 'types', stage })}
                  className="group cursor-pointer bg-gradient-to-b from-[#0f2744] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#0f2744] border border-[#c8a44e]/20 rounded-2xl p-6 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-black/20 border border-[#c8a44e]/30 group-hover:border-[#c8a44e]/60 rounded-full flex items-center justify-center transition-colors">
                      <span className="text-[#c8a44e] text-xl font-bold">{stage}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">المرحلة {stage}</h3>
                    <p className="text-sm text-white/70">{content.filter(c => (c.stage || '1') === stage).length} عنصر تعليمي</p>
                  </div>
                </div>
              ))}
            </div>
          ) : nav.step === 'types' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 animate-fade-in-up">
              {/* Lectures Option */}
              <div
                onClick={() => setNav({ ...nav, step: 'list', type: 'lecture' })}
                className="group cursor-pointer bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v14a2 2 0 002 2h6a2 2 0 002-2V4m-7 7h2m-2 4h2" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">المحاضرات</h3>
                  <p className="text-slate-500 text-sm">{lecturesCount} محاضرة مضافة</p>
                </div>
              </div>
              {/* Homework Option */}
              <div
                onClick={() => setNav({ ...nav, step: 'list', type: 'homework' })}
                className="group cursor-pointer bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg flex items-center gap-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">الواجبات الدراسية</h3>
                  <p className="text-slate-500 text-sm">{homeworkCount} واجب مضاف</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-pro overflow-hidden animate-fade-in-up">
              {filteredContent.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                  </div>
                  <p className="text-slate-500 font-bold text-lg">لا يوجد {nav.type === 'lecture' ? 'محاضرات' : 'واجبات'} في هذه المرحلة</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredContent.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 md:p-6 hover:bg-slate-50/80 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 md:gap-4 flex-1">
                      {/* Content Type Icon */}
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-base flex-shrink-0 ${
                        item.content_type === 'lecture'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-purple-50 text-purple-600'
                      }`}>
                        {item.content_type === 'lecture' ? (
                          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v14a2 2 0 002 2h6a2 2 0 002-2V4m-7 7h2m-2 4h2" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-sm md:text-base">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {item.course_code}
                          </span>
                          <span className="text-xs text-slate-500">{item.course_name}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                        )}

                        {/* File Info */}
                        {item.file_name && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {item.file_name}
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            item.content_type === 'lecture'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.content_type === 'lecture' ? 'محاضرة' : 'واجب'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* زر تصحيح الواجبات يظهر فقط إذا كان المحتوى واجب */}
                      {item.content_type === 'homework' && (
                        <Link
                          href="/teacher-dashboard/homework/corrections"
                          className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          title="الذهاب لصفحة تصحيح الواجب"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          تصحيح
                        </Link>
                      )}
                      
                      {/* زر التعديل */}
                      <Link
                        href={`/teacher-dashboard/content/upload?edit=${item.id}`}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="تعديل المحتوى"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>

                      <button
                        onClick={() => handleDeleteContent(item.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="حذف"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
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