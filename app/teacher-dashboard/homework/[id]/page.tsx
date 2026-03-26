"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Homework = {
  id: number;
  title: string;
  description: string;
  due_date: string;
  max_grade: number;
  course_name: string;
  course_code: string;
};

type Submission = {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  submission_text: string | null;
  submitted_at: string | null;
  grade: number | null;
  feedback: string | null;
  status: string;
  is_late: boolean;
};

type Statistics = {
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  pendingGrades: number;
  lateSubmissions: number;
  onTimeSubmissions: number;
};

export default function HomeworkSubmissionsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const homeworkId = params.id as string;

  const [homework, setHomework] = useState<Homework | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  // Grading state
  const [gradingSubmission, setGradingSubmission] = useState<number | null>(null);
  const [tempGrade, setTempGrade] = useState("");
  const [tempFeedback, setTempFeedback] = useState("");

  // Filter state
  const [filter, setFilter] = useState("all"); // all, submitted, not_submitted, graded, pending

  useEffect(() => {
    if (!session?.user?.email || !homeworkId) return;
    fetchSubmissions();
  }, [session, homeworkId]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/homework/${homeworkId}/submissions`);
      const data = await response.json();

      if (response.ok) {
        setHomework(data.homework);
        setSubmissions(data.submissions);
        setStatistics(data.statistics);
      } else {
        alert(data.error || "فشل في جلب التسليمات");
      }
    } catch (err) {
      console.error("Fetch submissions error:", err);
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const startGrading = (submission: Submission) => {
    setGradingSubmission(submission.id);
    setTempGrade(submission.grade?.toString() || "");
    setTempFeedback(submission.feedback || "");
  };

  const saveGrade = async () => {
    if (!gradingSubmission || tempGrade === "") {
      alert("الرجاء إدخال الدرجة");
      return;
    }

    if (!homework) {
      alert("معلومات الواجب غير متوفرة");
      return;
    }

    const grade = parseFloat(tempGrade);
    if (grade < 0 || grade > homework.max_grade) {
      alert(`الدرجة يجب أن تكون بين 0 و ${homework.max_grade}`);
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
        // Update submissions locally
        setSubmissions(prev =>
          prev.map(sub =>
            sub.id === gradingSubmission
              ? { ...sub, grade: grade, feedback: tempFeedback, status: "تم التصحيح" }
              : sub
          )
        );

        // Update statistics
        if (statistics) {
          setStatistics(prev => prev ? {
            ...prev,
            gradedCount: prev.gradedCount + 1,
            pendingGrades: prev.pendingGrades - 1
          } : null);
        }

        setGradingSubmission(null);
        setTempGrade("");
        setTempFeedback("");
        alert(data.message || "تم حفظ الدرجة بنجاح");
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

  const filteredSubmissions = submissions.filter(sub => {
    switch (filter) {
      case "submitted":
        return sub.submitted_at !== null;
      case "not_submitted":
        return sub.submitted_at === null;
      case "graded":
        return sub.grade !== null;
      case "pending":
        return sub.submitted_at !== null && sub.grade === null;
      default:
        return true;
    }
  });

  const getFilterButtonClass = (filterValue: string) => {
    return filter === filterValue
      ? "bg-[#059669] text-white"
      : "bg-white text-slate-600 border border-slate-200 hover:border-[#059669]/30";
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

  if (!homework) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="text-center">
          <p className="text-slate-400 font-bold text-lg">الواجب غير موجود</p>
          <Link
            href="/teacher-dashboard/homework"
            className="inline-block mt-4 bg-[#059669] text-white px-6 py-2 rounded-lg font-bold text-sm"
          >
            العودة للواجبات
          </Link>
        </div>
      </div>
    );
  }

  const isOverdue = new Date(homework.due_date) < new Date();

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/teacher-dashboard/homework"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
                <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">بوابة التدريسي</p>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-[#0f2744] tracking-tight">{homework.title}</h1>
              <div className="flex items-center gap-4 mt-1 text-xs md:text-sm">
                <span className="text-slate-500">{homework.course_name}</span>
                <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                  الموعد النهائي: {formatDate(homework.due_date)}
                </span>
                {isOverdue && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold text-xs">
                    انتهى الموعد
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mb-6 animate-fade-in-up stagger-1">
            <div className="card-pro p-4 text-center">
              <div className="text-2xl font-black text-slate-700">{statistics.totalStudents}</div>
              <div className="text-xs text-slate-500 font-bold">إجمالي الطلاب</div>
            </div>
            <div className="card-pro p-4 text-center">
              <div className="text-2xl font-black text-[#059669]">{statistics.submittedCount}</div>
              <div className="text-xs text-slate-500 font-bold">تم التسليم</div>
            </div>
            <div className="card-pro p-4 text-center">
              <div className="text-2xl font-black text-blue-600">{statistics.gradedCount}</div>
              <div className="text-xs text-slate-500 font-bold">تم التصحيح</div>
            </div>
            <div className="card-pro p-4 text-center">
              <div className="text-2xl font-black text-orange-600">{statistics.pendingGrades}</div>
              <div className="text-xs text-slate-500 font-bold">معلق للتصحيح</div>
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

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6 animate-fade-in-up stagger-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${getFilterButtonClass("all")}`}
          >
            جميع الطلاب ({submissions.length})
          </button>
          <button
            onClick={() => setFilter("submitted")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${getFilterButtonClass("submitted")}`}
          >
            تم التسليم ({statistics?.submittedCount || 0})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${getFilterButtonClass("pending")}`}
          >
            يحتاج تصحيح ({statistics?.pendingGrades || 0})
          </button>
          <button
            onClick={() => setFilter("graded")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${getFilterButtonClass("graded")}`}
          >
            تم التصحيح ({statistics?.gradedCount || 0})
          </button>
          <button
            onClick={() => setFilter("not_submitted")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${getFilterButtonClass("not_submitted")}`}
          >
            لم يُسلم ({(statistics?.totalStudents || 0) - (statistics?.submittedCount || 0)})
          </button>
        </div>

        {/* Submissions List */}
        <div className="card-pro overflow-hidden animate-fade-in-up stagger-3">
          {filteredSubmissions.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-4xl mb-4 block opacity-30">📝</span>
              <p className="text-slate-400 font-bold">لا توجد نتائج للفلتر المحدد</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredSubmissions.map((submission, index) => (
                <div
                  key={submission.id}
                  className={`p-4 md:p-6 hover:bg-slate-50/80 transition-all ${
                    submission.is_late ? 'bg-red-50/50' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Student Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          submission.grade !== null
                            ? 'bg-green-50 text-green-600'
                            : submission.submitted_at
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {submission.student_name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800">{submission.student_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                              submission.grade !== null
                                ? 'bg-green-100 text-green-700'
                                : submission.submitted_at
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {submission.status}
                            </span>
                            {submission.is_late && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                                متأخر
                              </span>
                            )}
                            {submission.submitted_at && (
                              <span className="text-xs text-slate-400">
                                تُسلم في: {formatDate(submission.submitted_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Submission Content */}
                      {submission.submission_text && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{submission.submission_text}</p>
                        </div>
                      )}

                      {/* Current Grade and Feedback */}
                      {submission.grade !== null && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-green-700">الدرجة: {submission.grade}/{homework.max_grade}</span>
                          </div>
                          {submission.feedback && (
                            <p className="text-sm text-green-700">{submission.feedback}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Grading Section */}
                    {submission.submitted_at && (
                      <div className="lg:w-80 flex-shrink-0">
                        {gradingSubmission === submission.id ? (
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
                          // Grade Display/Edit Button
                          <div className="text-center">
                            {submission.grade !== null ? (
                              <div className="space-y-2">
                                <div className="text-3xl font-black text-[#059669]">{submission.grade}</div>
                                <div className="text-sm text-slate-500">درجة من {homework.max_grade}</div>
                                <button
                                  onClick={() => startGrading(submission)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                                >
                                  تعديل الدرجة
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startGrading(submission)}
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}