"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface CourseContent {
  content_id: number;
  content_type: 'lecture' | 'homework';
  content_title: string;
  content_description: string;
  due_date: string | null;
  created_at: string;
  submitted_count: number;
}

interface Course {
  course_id: number;
  course_name: string;
  course_code: string;
  enrolled_count: number;
  contents: CourseContent[];
}

interface Stage {
  stage: string;
  courses: { [courseId: string]: Course };
}

interface HierarchyData {
  [stage: string]: Stage;
}

interface CourseStudent {
  student_id: number;
  student_name: string;
  student_email: string;
  student_stage: string;
  enrollment_id: number;
  is_carried_over: boolean;
  original_stage: string | null;
  enrollment_status: string;
  grade_id: number | null;
  current_grade: number | null;
  homework_grade_id: number | null;
  homework_grade: number | null;
  submission_text: string | null;
  submitted_at: string | null;
  feedback: string | null;
  graded_at: string | null;
}

interface CourseInfo {
  id: number;
  name: string;
  code: string;
  stage: string;
}

interface ContentInfo {
  id: number;
  content_type: 'lecture' | 'homework';
  title: string;
  description: string;
  due_date: string | null;
  max_grade: number;
}

interface CourseStudentsData {
  course: CourseInfo;
  content: ContentInfo | null;
  students: CourseStudent[];
}

type NavigationStep = 'stages' | 'courses' | 'evaluation';

interface NavigationState {
  step: NavigationStep;
  selectedStage?: string;
  selectedCourse?: Course;
  selectedContent?: CourseContent;
}

export default function TeacherGradesPage() {
  const { data: session } = useSession();
  const [hierarchyData, setHierarchyData] = useState<HierarchyData>({});
  const [courseStudentsData, setCourseStudentsData] = useState<CourseStudentsData | null>(null);
  const [navigation, setNavigation] = useState<NavigationState>({ step: 'stages' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" | "info" } | null>(null);

  // Toast notification
  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch hierarchy data
  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teacher/content/hierarchy');
      if (response.ok) {
        const data = await response.json();
        setHierarchyData(data);
      } else {
        showToast("خطأ في جلب البيانات", "error");
      }
    } catch (err) {
      showToast("خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch course students data
  const fetchCourseStudents = async (courseId: number) => {
    try {
      setLoading(true);
      let url = `/api/teacher/content/students?course_id=${courseId}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCourseStudentsData(data);
      } else {
        showToast("خطأ في جلب بيانات الطلاب", "error");
      }
    } catch (err) {
      showToast("خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  // Save grade
  const saveGrade = async (studentId: number, courseId: number, grade: number) => {
    const key = `${studentId}-${courseId}-course`;
    try {
      setSaving(prev => ({ ...prev, [key]: true }));

        // Save course grade
        const response = await fetch('/api/grades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            course_id: courseId,
            grade: grade
          })
        });

        if (response.ok) {
          showToast("تم حفظ الدرجة بنجاح", "success");
          // Refresh data
          if (navigation.selectedCourse) {
            fetchCourseStudents(navigation.selectedCourse.course_id);
          }
        } else {
          const errorData = await response.json();
          console.error('Grade save error:', errorData);
          showToast(`خطأ في حفظ الدرجة: ${errorData.error || 'خطأ غير معروف'}`, "error");
        }
    } catch (err) {
      showToast("خطأ في الاتصال بالخادم", "error");
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  // Delete grade
  const deleteGrade = async (gradeId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدرجة؟')) {
      return;
    }

    try {
        const response = await fetch(`/api/grades?id=${gradeId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          showToast("تم حذف الدرجة بنجاح", "success");
          if (navigation.selectedCourse) {
            fetchCourseStudents(navigation.selectedCourse.course_id);
          }
        } else {
          showToast("خطأ في حذف الدرجة", "error");
        }
    } catch (err) {
      showToast("خطأ في الاتصال بالخادم", "error");
    }
  };

  // Navigation functions
  const goToStages = () => {
    setNavigation({ step: 'stages' });
    setCourseStudentsData(null);
  };

  const goToStage = (stage: string) => {
    setNavigation({ step: 'courses', selectedStage: stage });
    setCourseStudentsData(null);
  };

  const goToCourse = (course: Course) => {
    setNavigation(prev => ({ ...prev, step: 'evaluation', selectedCourse: course }));
    fetchCourseStudents(course.course_id);
  };

  useEffect(() => {
    if (session) {
      fetchHierarchy();
    }
  }, [session]);

  if (loading && navigation.step === 'stages') {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">إدارة الدرجات والتقييم</h1>

          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={goToStages}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                navigation.step === 'stages'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              المراحل
            </button>

            {navigation.selectedStage && (
              <>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => goToStage(navigation.selectedStage!)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    navigation.step === 'courses'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  المرحلة {navigation.selectedStage}
                </button>
              </>
            )}

            {navigation.selectedCourse && (
              <>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => goToCourse(navigation.selectedCourse!)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    navigation.step === 'evaluation'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  {navigation.selectedCourse.course_name}
                </button>
              </>
            )}

          </nav>
        </div>

        {/* Toast notification */}
        {toast && (
          <div className={`mb-6 p-4 rounded-md ${
            toast.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
            toast.type === 'error' ? 'bg-red-100 border-red-400 text-red-700' :
            toast.type === 'warning' ? 'bg-yellow-100 border-yellow-400 text-yellow-700' :
            'bg-blue-100 border-blue-400 text-blue-700'
          } border`}>
            {toast.message}
          </div>
        )}

        {/* Main content */}
        {navigation.step === 'stages' && (
          <StagesView
            hierarchyData={hierarchyData}
            goToStage={goToStage}
          />
        )}

        {navigation.step === 'courses' && navigation.selectedStage && (
          <CoursesView
            stage={navigation.selectedStage}
            courses={hierarchyData[navigation.selectedStage]?.courses || {}}
            goToCourse={goToCourse}
          />
        )}

        {navigation.step === 'contents' && navigation.selectedCourse && (
          <ContentsView
            course={navigation.selectedCourse}
            goToContent={goToContent}
            goToGeneralEvaluation={goToGeneralEvaluation}
          />
        )}

        {navigation.step === 'evaluation' && courseStudentsData && (
          <EvaluationView
            courseStudentsData={courseStudentsData}
            saving={saving}
            saveGrade={saveGrade}
            deleteGrade={deleteGrade}
            selectedContent={navigation.selectedContent}
          />
        )}
      </div>
    </div>
  );
}

// Stages view component
function StagesView({ hierarchyData, goToStage }: { hierarchyData: HierarchyData; goToStage: (stage: string) => void }) {
  const stages = Object.keys(hierarchyData).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">اختر المرحلة</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stages.map((stage) => {
          const stageData = hierarchyData[stage];
          const coursesCount = Object.keys(stageData.courses).length;
          const totalStudents = Object.values(stageData.courses).reduce((sum, course) => sum + course.enrolled_count, 0);

          return (
            <div
              key={stage}
              onClick={() => goToStage(stage)}
              className="group cursor-pointer bg-gradient-to-b from-[#0f2744] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#0f2744] border border-[#c8a44e]/20 rounded-lg p-6 transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-black/20 border border-[#c8a44e]/30 group-hover:border-[#c8a44e]/60 rounded-full flex items-center justify-center transition-colors">
                  <span className="text-[#c8a44e] text-xl font-bold">{stage}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">المرحلة {stage}</h3>
                <p className="text-sm text-white/70">{coursesCount} مادة دراسية</p>
              </div>
            </div>
          );
        })}
      </div>

      {stages.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد مراحل متاحة</h3>
          <p className="text-gray-600">لم يتم العثور على مواد دراسية مرتبطة بحسابك</p>
        </div>
      )}
    </div>
  );
}

// Courses view component
function CoursesView({
  stage,
  courses,
  goToCourse
}: {
  stage: string;
  courses: { [courseId: string]: Course };
  goToCourse: (course: Course) => void
}) {
  const coursesArray = Object.values(courses);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-8">
        اختر المادة من المرحلة {stage}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coursesArray.map((course) => (
          <button
            key={course.course_id}
            onClick={() => goToCourse(course)}
            className="w-full bg-gradient-to-l from-[#0f2744] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#0f2744] text-white p-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-between border border-[#c8a44e]/20"
          >
            <div className="text-right">
              <div className="text-lg font-bold">{course.course_name}</div>
            </div>
          </button>
        ))}
      </div>

      {coursesArray.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد مواد دراسية</h3>
          <p className="text-gray-600">لا توجد مواد دراسية لهذه المرحلة</p>
        </div>
      )}
    </div>
  );
}

// Evaluation view component
function EvaluationView({
  courseStudentsData,
  saving,
  saveGrade,
  deleteGrade
}: {
  courseStudentsData: CourseStudentsData;
  saving: Record<string, boolean>;
  saveGrade: (studentId: number, courseId: number, grade: number) => void;
  deleteGrade: (gradeId: number) => void;
}) {
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [savedGrades, setSavedGrades] = useState<Set<string>>(new Set());

  // Grade mappings
  const gradeOptions = [
    { label: 'امتياز', value: 90 },
    { label: 'جيد جدا', value: 80 },
    { label: 'جيد', value: 70 },
    { label: 'متوسط', value: 60 },
    { label: 'مقبول', value: 50 },
    { label: 'راسب', value: 0 }
  ];

  const getGradeLabel = (gradeValue: number) => {
    if (gradeValue >= 90) return 'امتياز';
    if (gradeValue >= 80) return 'جيد جدا';
    if (gradeValue >= 70) return 'جيد';
    if (gradeValue >= 60) return 'متوسط';
    if (gradeValue >= 50) return 'مقبول';
    return 'راسب';
  };

  const handleGradeChange = (studentId: number, grade: string) => {
    const key = `${studentId}-course`;
    setGrades(prev => ({ ...prev, [key]: grade }));
  };

  const handleSaveGrade = async (student: CourseStudent) => {
    const key = `${student.student_id}-course`;
    const gradeValue = parseFloat(grades[key]);

    if (!isNaN(gradeValue) && gradeValue >= 0 && gradeValue <= 100) {
      await saveGrade(
        student.student_id,
        courseStudentsData.course.id,
        gradeValue
      );

      // Mark this grade as saved
      setSavedGrades(prev => new Set([...prev, key]));

      // Clear the input after successful save
      setGrades(prev => {
        const newGrades = { ...prev };
        delete newGrades[key];
        return newGrades;
      });
    }
  };

  const handleDeleteGrade = async (gradeId: number) => {
    await deleteGrade(gradeId);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <h2 className="text-xl font-semibold">
          {`تقييم المادة: ${courseStudentsData.course.name}`}
        </h2>
        <p className="text-blue-100 mt-1">
          المرحلة {courseStudentsData.course.stage}
        </p>
      </div>

      {/* Students list */}
      <div className="p-6">
        {courseStudentsData.students.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">لا يوجد طلاب مسجلين</h3>
            <p className="text-gray-600">لا يوجد طلاب مسجلين في هذه المادة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courseStudentsData.students.map((student) => {
              const key = `${student.student_id}-course`;
              const currentGrade = student.current_grade;
              const gradeId = student.grade_id;
              const isSaving = saving[`${student.student_id}-${courseStudentsData.course.id}-course`];
              const hasSaved = savedGrades.has(key);

              return (
                <div key={`${student.student_id}-${key}`} className={`border rounded-lg p-4 ${
                  student.is_carried_over
                    ? 'border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50'
                    : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          student.is_carried_over
                            ? 'bg-orange-100'
                            : 'bg-blue-100'
                        }`}>
                          <span className={`font-semibold text-sm ${
                            student.is_carried_over
                              ? 'text-orange-600'
                              : 'text-blue-600'
                          }`}>
                            {student.student_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <h3 className="font-semibold text-gray-900">{student.student_name}</h3>
                            {student.is_carried_over && (
                              <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full font-medium">
                                {student.original_stage && student.original_stage !== student.student_stage
                                  ? `محمل من ${student.original_stage}`
                                  : 'محمل'
                                }
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{student.student_email}</p>
                          <p className="text-xs text-gray-500">
                            المرحلة {student.student_stage}
                            {student.is_carried_over && (
                              <span className="text-orange-600 font-medium mr-2">
                                (أصلاً: المرحلة {student.original_stage})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      {/* Current grade display */}
                      {currentGrade !== null && (
                        <div className={`text-center px-3 py-2 rounded-lg border ${student.is_carried_over ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-200'}`}>
                          <div className={`text-xs mb-1 ${student.is_carried_over ? 'text-orange-600' : 'text-gray-500'}`}>التقدير الحالي</div>
                          <div className={`text-base font-bold ${student.is_carried_over ? 'text-orange-700' : 'text-green-700'}`}>
                            {getGradeLabel(currentGrade)}
                          </div>
                          <div className={`text-xs mt-1 ${student.is_carried_over ? 'text-orange-600' : 'text-gray-500'}`}>({currentGrade})</div>
                        </div>
                      )}

                      {/* Grade selection */}
                      {!hasSaved && !gradeId && (
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <select
                            value={grades[key] || ''}
                            onChange={(e) => handleGradeChange(student.student_id, e.target.value)}
                            className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
                              student.is_carried_over ? 'border-orange-400 text-orange-900' : 'border-gray-300'
                            }`}
                          >
                            <option value="">اختر التقدير</option>
                            {gradeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSaveGrade(student)}
                            disabled={!grades[key] || isSaving}
                            className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-1 rtl:space-x-reverse ${
                              !grades[key] || isSaving
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : student.is_carried_over
                                  ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isSaving ? (
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>حفظ</span>
                              </div>
                            ) : (
                              <span>{student.is_carried_over ? 'حفظ درجة التحميل' : 'حفظ'}</span>
                            )}
                          </button>
                        </div>
                      )}

                      {gradeId && (
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <div className={`px-4 py-2 rounded-md font-medium flex items-center space-x-2 rtl:space-x-reverse ${
                            student.is_carried_over ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-700'
                          }`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>{student.is_carried_over ? 'درجة التحميل محفوظة' : 'محفوظ'}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteGrade(gradeId)}
                            className={`px-3 py-2 text-white rounded-md font-medium transition-colors flex items-center space-x-1 rtl:space-x-reverse ${
                              student.is_carried_over ? 'bg-orange-600 hover:bg-orange-700 shadow-sm' : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {student.is_carried_over ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              )}
                            </svg>
                            <span>{student.is_carried_over ? 'تعديل التحميل' : 'حذف'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}