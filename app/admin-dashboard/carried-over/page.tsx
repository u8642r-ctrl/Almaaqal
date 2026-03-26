"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface FailedCourse {
  course_id: number;
  course_name: string;
  course_code: string;
  course_stage: string;
  grade: number;
  semester: string;
}

interface FailedStudent {
  student_id: number;
  student_name: string;
  student_email: string;
  student_stage: string;
  failed_courses: FailedCourse[];
}

interface FailedStudentsData {
  students: FailedStudent[];
  total_students: number;
  total_courses: number;
}

export default function CarriedOverManagementPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<FailedStudentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchFailedStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/carried-over/failed-students');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        showToast("خطأ في جلب البيانات", "error");
      }
    } catch (err) {
      showToast("خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  const processAllStudents = async () => {
    if (!confirm(`هل أنت متأكد من معالجة جميع الطلاب الراسبين (${data?.total_students} طالب)؟\nسيتم تسجيلهم تلقائياً في المواد المحملة.`)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/admin/carried-over/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_process_all: true })
      });

      if (response.ok) {
        const result = await response.json();
        showToast(result.message, "success");
        fetchFailedStudents(); // تحديث القائمة
      } else {
        const error = await response.json();
        showToast(`خطأ: ${error.error}`, "error");
      }
    } catch (err) {
      showToast("خطأ في الاتصال بالخادم", "error");
    } finally {
      setProcessing(false);
    }
  };

  const processSingleStudent = async (student_id: number, course_id: number) => {
    if (!confirm('هل أنت متأكد من تسجيل هذا الطالب في المادة المحملة؟')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/carried-over/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id, course_id })
      });

      if (response.ok) {
        showToast("تم تسجيل الطالب في المادة المحملة بنجاح", "success");
        fetchFailedStudents(); // تحديث القائمة
      } else {
        const error = await response.json();
        showToast(`خطأ: ${error.error}`, "error");
      }
    } catch (err) {
      showToast("خطأ في الاتصال بالخادم", "error");
    }
  };

  useEffect(() => {
    if (session) {
      fetchFailedStudents();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إدارة المواد المحملة</h1>
              <p className="text-gray-600 mt-1">الطلاب الراسبين الذين يحتاجون لحمل مواد</p>
            </div>
            {data && data.total_students > 0 && (
              <button
                onClick={processAllStudents}
                disabled={processing}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 rtl:space-x-reverse"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>جاري المعالجة...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>معالجة جميع الطلاب ({data.total_students})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Toast notification */}
        {toast && (
          <div className={`mb-6 p-4 rounded-md ${
            toast.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
            toast.type === 'error' ? 'bg-red-100 border-red-400 text-red-700' :
            'bg-blue-100 border-blue-400 text-blue-700'
          } border`}>
            {toast.message}
          </div>
        )}

        {/* Statistics */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">عدد الطلاب الراسبين</p>
                  <p className="text-3xl font-bold mt-2">{data.total_students}</p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">عدد المواد المحملة</p>
                  <p className="text-3xl font-bold mt-2">{data.total_courses}</p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">متوسط المواد للطالب</p>
                  <p className="text-3xl font-bold mt-2">
                    {data.total_students > 0 ? (data.total_courses / data.total_students).toFixed(1) : 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students list */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            {data && data.students.length > 0 ? (
              <div className="space-y-4">
                {data.students.map((student) => (
                  <div key={student.student_id} className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
                    {/* Student header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {student.student_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{student.student_name}</h3>
                          <p className="text-sm text-gray-600">{student.student_email}</p>
                          <p className="text-xs text-red-600 font-medium">المرحلة {student.student_stage}</p>
                        </div>
                      </div>
                      <div className="text-center bg-red-100 rounded-lg px-4 py-2">
                        <div className="text-2xl font-bold text-red-700">{student.failed_courses.length}</div>
                        <div className="text-xs text-red-600">مادة راسبة</div>
                      </div>
                    </div>

                    {/* Failed courses */}
                    <div className="space-y-2">
                      {student.failed_courses.map((course) => (
                        <div key={course.course_id} className="bg-white border border-red-200 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                              </svg>
                              <div>
                                <h4 className="font-semibold text-gray-900">{course.course_name}</h4>
                                <p className="text-xs text-gray-500">{course.course_code} - المرحلة {course.course_stage}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <div className="text-center px-3 py-1 bg-red-100 rounded-full">
                              <span className="text-sm font-bold text-red-700">الدرجة: {course.grade}</span>
                            </div>
                            <button
                              onClick={() => processSingleStudent(student.student_id, course.course_id)}
                              className="px-3 py-1 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
                            >
                              تحميل
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">لا يوجد طلاب راسبين</h3>
                <p className="text-gray-600">جميع الطلاب ناجحون أو تم معالجة المواد المحملة بالفعل</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}