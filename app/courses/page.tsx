"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Course = {
  id: number;
  name: string;
  code: string;
  description: string;
  teacher_id?: number;
  teacher_name?: string;
  teacher_department?: string;
  stage?: string;
  term?: string;
  department_id?: number;
  department_name?: string;
  created_at: string;
};

type Teacher = {
  id: number;
  name: string;
  department?: string;
};

type Department = {
  id: number;
  name: string;
};

const stageOptions = [
  { value: "1", label: "المرحلة الأولى" },
  { value: "2", label: "المرحلة الثانية" },
  { value: "3", label: "المرحلة الثالثة" },
  { value: "4", label: "المرحلة الرابعة" },
];

const termOptions = [
  { value: "1", label: "الكورس الأول" },
  { value: "2", label: "الكورس الثاني" },
];

const stageBadgeColors: Record<string, string> = {
  "1": "from-purple-50 to-purple-100 border-purple-200",
  "2": "from-blue-50 to-blue-100 border-blue-200",
  "3": "from-emerald-50 to-emerald-100 border-emerald-200",
  "4": "from-amber-50 to-amber-100 border-amber-200",
};

const stageTextColors: Record<string, string> = {
  "1": "text-purple-700",
  "2": "text-blue-700",
  "3": "text-emerald-700",
  "4": "text-amber-700",
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, id: number | null}>({ show: false, id: null });
  const [showForm, setShowForm] = useState(false);
  const [expandedDept, setExpandedDept] = useState<number | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    stage: "1",
    term: "1",
    teacher_id: "",
    department_id: ""
  });
  const [editingCourse, setEditingCourse] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/courses").then(r => r.json()),
      fetch("/api/teachers").then(r => r.json()),
      fetch("/api/departments").then(r => r.json())
    ]).then(([coursesData, teachersData, departmentsData]) => {
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const res = await fetch(`/api/courses?id=${deleteModal.id}`, { method: "DELETE" });
      if (res.ok) {
        setCourses(courses.filter(c => c.id !== deleteModal.id));
        setToast({ message: "تم حذف المادة بنجاح", type: "success" });
      } else {
        setToast({ message: "فشل الحذف", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    } finally {
      setDeleteModal({ show: false, id: null });
    }
  };

  const handleEditCourse = async (e: React.FormEvent, courseId: number) => {
    e.preventDefault();
    if (!formData.name) {
      setToast({ message: "اسم المادة مطلوب", type: "error" });
      return;
    }
    try {
      const res = await fetch(`/api/courses?id=${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          stage: formData.stage,
          term: formData.term,
          teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
          department_id: formData.department_id ? parseInt(formData.department_id) : null
        })
      });
      if (res.ok) {
        const updatedRes = await fetch("/api/courses");
        const updatedCourses = await updatedRes.json();
        setCourses(updatedCourses);
        setEditingCourse(null);
        setFormData({ name: "", stage: "1", term: "1", teacher_id: "", department_id: "" });
        setToast({ message: "تم تحديث المادة بنجاح", type: "success" });
      } else {
        setToast({ message: "فشل في تحديث المادة", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    }
  };

  const openEditForm = (course: Course) => {
    setEditingCourse(course.id);
    setFormData({
      name: course.name,
      stage: course.stage || "1",
      term: course.term || "1",
      teacher_id: course.teacher_id?.toString() || "",
      department_id: course.department_id?.toString() || ""
    });
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setToast({ message: "اسم المادة مطلوب", type: "error" });
      return;
    }
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          stage: formData.stage,
          term: formData.term,
          teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
          department_id: formData.department_id ? parseInt(formData.department_id) : null
        })
      });
      if (res.ok) {
        const updatedRes = await fetch("/api/courses");
        const updatedCourses = await updatedRes.json();
        setCourses(updatedCourses);
        setFormData({ name: "", stage: "1", term: "1", teacher_id: "", department_id: "" });
        setShowForm(false);
        setToast({ message: "تم إضافة المادة بنجاح", type: "success" });
      } else {
        setToast({ message: "فشل في إضافة المادة", type: "error" });
      }
    } catch {
      setToast({ message: "خطأ في الاتصال", type: "error" });
    }
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

  // تجميع حسب قسم ثم مرحلة ثم كورس
  const deptWithCourses = departments.map(dept => ({
    ...dept,
    stages: stageOptions.map(stageOpt => ({
      ...stageOpt,
      terms: termOptions.map(termOpt => ({
        ...termOpt,
        courses: courses.filter(c => c.department_id === dept.id && c.stage === stageOpt.value && c.term === termOpt.value)
      })).filter(t => t.courses.length > 0)
    })).filter(s => s.terms.length > 0)
  })).filter(d => d.stages.length > 0);

  // قسم "بدون قسم"
  const noDeptCourses = courses.filter(c => !c.department_id);
  const noDeptWithStages = noDeptCourses.length > 0 ? [{
    id: 0,
    name: "بدون قسم",
    stages: stageOptions.map(stageOpt => ({
      ...stageOpt,
      terms: termOptions.map(termOpt => ({
        ...termOpt,
        courses: noDeptCourses.filter(c => c.stage === stageOpt.value && c.term === termOpt.value)
      })).filter(t => t.courses.length > 0)
    })).filter(s => s.terms.length > 0)
  }] : [];

  const selectedDept = formData.department_id
    ? departments.find(d => d.id === parseInt(formData.department_id))
    : null;

  const filteredTeachers = selectedDept
    ? teachers.filter(t => t.department === selectedDept.name)
    : teachers;

  const allDepts = [...deptWithCourses, ...noDeptWithStages];

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between gap-3 mb-4">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white transition-all hover:shadow-md" title="رجوع">
              <svg className="w-6 h-6 text-[#0f2744]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
              <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">الدليل الأكاديمي</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#059669] text-white rounded-xl font-bold text-sm hover:bg-[#047857] transition-colors shadow-lg shadow-emerald-200">
              {showForm ? "إلغاء" : "+ إضافة مادة"}
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">المواد الدراسية</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">اختر القسم → المرحلة → الكورس → المادة</p>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-6 md:p-8 mb-6 border border-slate-200 shadow-md">
            <h2 className="text-lg font-black text-[#0f2744] mb-4">إضافة مادة جديدة</h2>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#0f2744] mb-2">اسم المادة</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none" placeholder="أدخل اسم المادة" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#0f2744] mb-2">القسم</label>
                  <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value, teacher_id: "" })} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none">
                    <option value="">بدون قسم</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#0f2744] mb-2">الأستاذ</label>
                  <select value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none">
                    <option value="">بدون أستاذ</option>
                    {filteredTeachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#0f2744] mb-2">المرحلة</label>
                  <select value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none">
                    {stageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#0f2744] mb-2">الكورس</label>
                  <select value={formData.term} onChange={(e) => setFormData({ ...formData, term: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none">
                    {termOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-[#059669] text-white py-3 rounded-xl font-bold hover:bg-[#047857] transition-colors">إضافة المادة</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">إلغاء</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {allDepts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 font-semibold text-lg">لا توجد مواد</p>
            </div>
          ) : (
            allDepts.map((dept) => (
              <div key={dept.id} className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-white hover:border-slate-300 transition-all">
                <button onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)} className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#059669]/10 flex items-center justify-center text-[#059669]">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <h3 className="text-lg font-black text-[#0f2744]">{dept.name}</h3>
                      <p className="text-sm text-slate-500">{dept.stages.reduce((sum, s) => sum + s.terms.reduce((t, term) => t + term.courses.length, 0), 0)} مادة</p>
                    </div>
                  </div>
                  <svg className={`w-6 h-6 text-[#059669] transition-transform ${expandedDept === dept.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>

                {expandedDept === dept.id && (
                  <div className="border-t-2 border-slate-200 p-6 space-y-4 bg-slate-50">
                    {dept.stages.map((stage) => (
                      <div key={stage.value} className={`border-2 rounded-2xl overflow-hidden transition-all bg-gradient-to-r ${stageBadgeColors[stage.value]}`}>
                        <button onClick={() => setExpandedStage(expandedStage === `${dept.id}-${stage.value}` ? null : `${dept.id}-${stage.value}`)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-black/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-white/30 flex items-center justify-center ${stageTextColors[stage.value]}`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div>
                              <h4 className={`font-bold ${stageTextColors[stage.value]}`}>{stage.label}</h4>
                              <p className="text-xs text-slate-500">{stage.terms.reduce((sum, t) => sum + t.courses.length, 0)} مادة</p>
                            </div>
                          </div>
                          <svg className={`w-5 h-5 transition-transform ${expandedStage === `${dept.id}-${stage.value}` ? "rotate-180" : ""} ${stageTextColors[stage.value]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>

                        {expandedStage === `${dept.id}-${stage.value}` && (
                          <div className="border-t-2 border-current border-opacity-10 p-4 space-y-3 bg-white/40">
                            {stage.terms.map((term) => (
                              <div key={term.value}>
                                <button onClick={() => setExpandedTerm(expandedTerm === `${dept.id}-${stage.value}-${term.value}` ? null : `${dept.id}-${stage.value}-${term.value}`)} className="w-full px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-50 border-l-4 border-l-[#059669] rounded-lg hover:from-slate-200 hover:to-slate-100 transition-all flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-[#059669]/10 flex items-center justify-center text-[#059669]">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-[#0f2744] text-sm">{term.label}</h5>
                                      <p className="text-xs text-slate-500">{term.courses.length} مادة</p>
                                    </div>
                                  </div>
                                  <svg className={`w-4 h-4 text-[#059669] transition-transform ${expandedTerm === `${dept.id}-${stage.value}-${term.value}` ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                  </svg>
                                </button>

                                {expandedTerm === `${dept.id}-${stage.value}-${term.value}` && (
                                  <div className="mt-2 space-y-2 pr-3">
                                    {term.courses.map((course) => (
                                      <div key={course.id} className="p-4 bg-white rounded-lg border border-slate-200 hover:border-[#059669] hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <h6 className="font-bold text-[#0f2744]">{course.name}</h6>
                                            {course.teacher_name && (
                                              <span className="text-[10px] font-semibold text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded inline-block mt-2">
                                                {course.teacher_name}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex gap-1 flex-shrink-0">
                                            <button onClick={() => openEditForm(course)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                            </button>
                                            <button onClick={() => setDeleteModal({ show: true, id: course.id })} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
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
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {editingCourse && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black text-[#0f2744] mb-4">تعديل المادة</h3>
            <form onSubmit={(e) => handleEditCourse(e, editingCourse)} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#0f2744] mb-2">اسم المادة</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#0f2744] mb-2">القسم</label>
                <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value, teacher_id: "" })} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none">
                  <option value="">بدون قسم</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#0f2744] mb-2">الأستاذ</label>
                <select value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none">
                  <option value="">بدون أستاذ</option>
                  {filteredTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#0f2744] mb-2">المرحلة</label>
                  <select value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none">
                    {stageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#0f2744] mb-2">الكورس</label>
                  <select value={formData.term} onChange={(e) => setFormData({ ...formData, term: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none">
                    {termOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-[#059669] text-white py-3 rounded-xl font-bold hover:bg-[#047857] transition-colors">حفظ</button>
                <button type="button" onClick={() => { setEditingCourse(null); setFormData({ name: "", stage: "1", term: "1", teacher_id: "", department_id: "" }); }} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-center mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 text-center text-sm mb-6">هل أنت متأكد من حذف هذه المادة؟</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-colors">حذف</button>
              <button onClick={() => setDeleteModal({ show: false, id: null })} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:bottom-6 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm z-[70] ${toast.type === "success" ? "bg-slate-900" : "bg-red-500"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
