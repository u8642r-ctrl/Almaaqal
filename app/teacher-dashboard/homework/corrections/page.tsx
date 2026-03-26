"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Submission = {
  submission_id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  submitted_at: string;
  submission_text: string;
  is_late: boolean;
  homework_id: number;  // إضافة معرف الواجب لكل تسليم
  grade?: number | null;
};

type PendingHomework = {
  homework_id: number;
  homework_title: string;
  course_name: string;
  due_date: string;
  max_grade: number;
  pending_count: number;
  submissions: Submission[];
};

type Statistics = {
  totalPending: number;
  lateSubmissions: number;
  onTimeSubmissions: number;
  totalHomework: number;
};

export default function HomeworkCorrectionsPage() {
  const { data: session } = useSession();
  const [pendingCorrections, setPendingCorrections] = useState<PendingHomework[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedHomework, setExpandedHomework] = useState<number | null>(null);

  // Grading state
  const [gradingSubmission, setGradingSubmission] = useState<number | null>(null);
  const [tempGrade, setTempGrade] = useState("");
  const [tempFeedback, setTempFeedback] = useState("");

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchPendingCorrections();
  }, [session]);

  const fetchPendingCorrections = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/teacher/homework/pending-corrections");
      const data = await response.json();

      if (response.ok) {
        setPendingCorrections(data.pendingCorrections || []);
        setStatistics(data.statistics || null);
      } else {
        alert(data.error || "فشل في جلب البيانات");
      }
    } catch (err) {
      console.error("Fetch pending corrections error:", err);
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const startGrading = (submissionId: number, homeworkId: number) => {
    setGradingSubmission(submissionId);
    setTempGrade("");
    setTempFeedback("");
  };

  const saveGrade = async () => {
    if (!gradingSubmission || tempGrade === "") {
      alert("الرجاء إدخال الدرجة");
      return;
    }

    // العثور على الواجب المطابق للحصول على الدرجة القصوى
    const currentHomework = pendingCorrections.find(hw =>
      hw.submissions.some(sub => sub.submission_id === gradingSubmission)
    );

    const maxGrade = currentHomework?.max_grade || 100;
    const grade = parseFloat(tempGrade);

    if (grade < 0 || grade > maxGrade) {
      alert(`الدرجة يجب أن تكون بين 0 و ${maxGrade}`);
      return;
    }

    try {
      const response = await fetch("/api/teacher/homework/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeworkGradeId: gradingSubmission,
          grade: grade,
          feedback: tempFeedback,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "تم حفظ الدرجة بنجاح");
        setGradingSubmission(null);
        setTempGrade("");
        setTempFeedback("");
        // إعادة تحميل البيانات
        fetchPendingCorrections();
      } else {
        alert(data.error || "فشل في حفظ الدرجة");
      }
    } catch (err) {
      console.error("Save grade error:", err);
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

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
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
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">بوابة التدريسي</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">تصحيح الواجبات</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">مركز تصحيح جميع الواجبات المعلقة من كافة المواد</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up stagger-1">
          <button
            onClick={fetchPendingCorrections}
            className="btn-secondary bg-white border border-slate-200 hover:border-[#059669]/30 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث
          </button>
          <Link
            href="/teacher-dashboard/homework"
            className="btn-secondary bg-white border border-slate-200 hover:border-[#059669]/30 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            إدارة الواجبات
          </Link>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 animate-fade-in-up stagger-1">
            <div className="card-pro p-4 text-center">
              <div className="text-2xl font-black text-orange-600">{statistics.totalPending}</div>
              <div className="text-xs text-slate-500 font-bold">إجمالي المعلق</div>
            </div>
            <div className="card-pro p-4 text-center">
              <div className="text-2xl font-black text-[#059669]">{statistics.totalHomework}</div>
              <div className="text-xs text-slate-500 font-bold">واجبات تحتاج تصحيح</div>
            </div>
            <div className="card-pro p-4 text-center">
              <div className="text-2xl font-black text-green-600">{statistics.onTimeSubmissions}</div>
              <div className="text-xs text-slate-500 font-bold">في الموعد</div>
            </div>
            <div className="card-pro p-4 text-center">
              <div className="text-2xl font-black text-red-600">{statistics.lateSubmissions}</div>
              <div className="text-xs text-slate-500 font-bold">متأخر</div>
            </div>
          </div>
        )}

        {/* Pending Corrections */}
        <div className="space-y-4 animate-fade-in-up stagger-2">
          {pendingCorrections.length === 0 ? (
            <div className="card-pro py-32 text-center">
              <span className="text-6xl mb-4 block opacity-30">✅</span>
              <p className="text-slate-400 font-bold text-lg">ممتاز! لا توجد واجبات معلقة للتصحيح</p>
              <p className="text-slate-300 text-sm mt-2">
                جميع الواجبات المسلمة تم تصحيحها
              </p>
            </div>
          ) : (
            pendingCorrections.map((homework) => (
              <div key={homework.homework_id} className="card-pro overflow-hidden">
                {/* Homework Header */}
                <div
                  className="p-4 md:p-6 border-b border-slate-50 cursor-pointer hover:bg-slate-50/80 transition-all"
                  onClick={() => setExpandedHomework(expandedHomework === homework.homework_id ? null : homework.homework_id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg">{homework.homework_title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span className="text-[#059669] bg-[#059669]/10 px-2 py-1 rounded-full font-bold">
                          {homework.course_name}
                        </span>
                        <span className={`font-bold ${isOverdue(homework.due_date) ? 'text-red-600' : 'text-slate-500'}`}>
                          الموعد النهائي: {formatDate(homework.due_date)}
                        </span>
                        {isOverdue(homework.due_date) && (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold text-xs">
                            انتهى الموعد
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-black text-orange-600">{homework.pending_count}</div>
                        <div className="text-xs text-slate-500 font-bold">يحتاج تصحيح</div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${
                          expandedHomework === homework.homework_id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Submissions List */}
                {expandedHomework === homework.homework_id && (
                  <div className="divide-y divide-slate-50">
                    {homework.submissions.map((submission) => (
                      <div
                        key={submission.submission_id}
                        className={`p-4 md:p-6 hover:bg-slate-50/80 transition-all ${
                          submission.is_late ? 'bg-red-50/30' : ''
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row gap-4">
                          {/* Student Info */}
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {submission.student_name?.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-800">{submission.student_name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                              {submission.grade !== null && submission.grade !== undefined ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                                  مصحح ({submission.grade})
                                </span>
                              ) : submission.submitted_at ? (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                                  تم التسليم
                                </span>
                              ) : (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
                                  لم يتم التسليم
                                </span>
                              )}
                                  {submission.is_late && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                                      متأخر
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-400">
                                    {formatDate(submission.submitted_at)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Submission Content */}
                            {submission.submission_text && (
                              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{submission.submission_text}</p>
                              </div>
                            )}
                          </div>

                          {/* Grading Section */}
                          <div className="lg:w-80 flex-shrink-0">
                            {gradingSubmission === submission.submission_id ? (
                              // Grading Form
                              <div className="border border-[#059669]/20 bg-[#059669]/5 p-4 rounded-xl">
                                <h4 className="font-bold text-[#059669] mb-3">تصحيح الواجب</h4>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">الدرجة (0-{homework.max_grade})</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={homework.max_grade}
                                      value={tempGrade}
                                      onChange={(e) => setTempGrade(e.target.value)}
                                      className="w-full p-2 border border-slate-200 rounded-lg focus:border-[#059669] text-center font-bold"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات للطالب</label>
                                    <textarea
                                      value={tempFeedback}
                                      onChange={(e) => setTempFeedback(e.target.value)}
                                      className="w-full p-2 border border-slate-200 rounded-lg focus:border-[#059669] text-sm resize-none"
                                      rows={3}
                                      placeholder="ملاحظات اختيارية..."
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={saveGrade}
                                      className="flex-1 bg-[#059669] hover:bg-[#047857] text-white py-2 px-3 rounded-lg font-bold text-sm transition-colors"
                                    >
                                      حفظ
                                    </button>
                                    <button
                                      onClick={() => setGradingSubmission(null)}
                                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition-colors"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center">
                            {submission.grade !== null && submission.grade !== undefined ? (
                              <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                                <p className="text-sm font-bold text-green-700">تم رصد الدرجة: {submission.grade} / {homework.max_grade}</p>
                                <button onClick={() => startGrading(submission.submission_id, homework.homework_id)} className="text-xs text-[#059669] hover:underline mt-2 font-bold">تعديل التصحيح</button>
                              </div>
                            ) : (
                                <button
                                  onClick={() => startGrading(submission.submission_id, homework.homework_id)}
                                  className="bg-[#059669] hover:bg-[#047857] text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 mx-auto"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  تصحيح الواجب
                                </button>
                            )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}