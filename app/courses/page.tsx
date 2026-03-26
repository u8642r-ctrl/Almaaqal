"use client";

import React, { useEffect, useState, useMemo } from 'react';

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
  faculty_id: number;
};

type Student = {
  id: number;
  name: string;
  email: string;
};

export default function CoursesPage() {
  // ---------------------------------------------------------
  // الحالات (States)
  // ---------------------------------------------------------
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [stage, setStage] = useState("");
  const [term, setTerm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editStage, setEditStage] = useState("");
  const [editTerm, setEditTerm] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // حالات الأقسام وتصفية الأساتذة
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");

  // حالات تسجيل الطلاب بالمواد
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrollModal, setEnrollModal] = useState<{show: boolean, courseId: number | null, courseName: string}>({ show: false, courseId: null, courseName: '' });
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);

  // حالات الإشعارات والنوافذ المنبثقة
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, id: number | null}>({ show: false, id: null });

  const [search, setSearch] = useState("");
  
  // حالات الترتيب وتقسيم الصفحات
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Course; direction: 'asc' | 'desc' } | null>(null);

  // ---------------------------------------------------------
  // الدوال (Functions)
  // ---------------------------------------------------------
  const fetchCourses = () => {
    setLoading(true);
    fetch('/api/courses')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        setCourses(data);
        setLoading(false);
      })
      .catch(() => {
        setError('فشل في جلب البيانات من الخادم');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCourses();
    
    // جلب قائمة الأساتذة لملء القائمة المنسدلة
    fetch('/api/teachers')
      .then((res) => res.json())
      .then((data) => setTeachers(Array.isArray(data) ? data : []))
      .catch(() => console.error('Failed to fetch teachers'));

    // جلب الأقسام
    fetch('/api/departments')
      .then((res) => res.json())
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => console.error('Failed to fetch departments'));
    
    // جلب قائمة الطلاب
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => setAllStudents(Array.isArray(data) ? data : []))
      .catch(() => console.error('Failed to fetch students'));
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: courseName,
          code,
          description,
          teacher_id: teacherId || null,
          stage: stage || null,
          term: term || null
        })
      });

      if (res.ok) {
        setCourseName(""); setCode(""); setDescription(""); setTeacherId(""); setSelectedDept(""); setStage(""); setTerm("");
        setShowForm(false);
        fetchCourses();
        setToast({ message: "تم إضافة المادة بنجاح", type: 'success' });
      } else {
        const data = await res.json();
        setFormError(data.error || 'حدث خطأ أثناء الإضافة');
      }
    } catch {
      setFormError('فشل الاتصال بالخادم');
    } finally {
      setFormLoading(false);
    }
  };

  const promptDelete = (id: number) => {
    setDeleteModal({ show: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await fetch(`/api/courses?id=${deleteModal.id}`, { method: 'DELETE' });
      fetchCourses();
      setToast({ message: "تم حذف السجل بنجاح", type: 'success' });
    } catch {
      setToast({ message: "تعذر الحذف، يرجى المحاولة لاحقاً", type: 'error' });
    } finally {
      setDeleteModal({ show: false, id: null });
    }
  };

  const startEdit = (course: Course) => {
    setEditId(course.id);
    setEditName(course.name);
    setEditCode(course.code);
    setEditDescription(course.description || "");
    setEditTeacherId(course.teacher_id ? course.teacher_id.toString() : "");
    setEditStage(course.stage || "");
    setEditTerm(course.term || "");
  };

  const handleEdit = async () => {
    if (!editName || !editCode) return;
    setEditLoading(true);
    try {
      await fetch(`/api/courses?id=${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          code: editCode,
          description: editDescription,
          teacher_id: editTeacherId || null,
          stage: editStage || null,
          term: editTerm || null
        })
      });
      setEditId(null);
      fetchCourses();
      setToast({ message: "تم تحديث البيانات بنجاح", type: 'success' });
    } catch {
      setToast({ message: "فشل التعديل", type: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  // فتح نافذة تسجيل الطلاب في المادة
  const openEnrollModal = async (courseId: number, cName: string) => {
    setEnrollModal({ show: true, courseId, courseName: cName });
    setEnrollLoading(true);
    try {
      const res = await fetch(`/api/enrollments?course_id=${courseId}`);
      const data = await res.json();
      setEnrolledStudents(Array.isArray(data) ? data : []);
    } catch {
      setEnrolledStudents([]);
    }
    setEnrollLoading(false);
  };

  // تسجيل طالب في مادة
  const enrollStudent = async () => {
    if (!enrollStudentId || !enrollModal.courseId) return;
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: Number(enrollStudentId), course_id: enrollModal.courseId })
      });
      if (res.ok) {
        setEnrollStudentId("");
        setToast({ message: "تم تسجيل الطالب بنجاح", type: 'success' });
        // إعادة تحميل القائمة
        const refreshRes = await fetch(`/api/enrollments?course_id=${enrollModal.courseId}`);
        const refreshData = await refreshRes.json();
        setEnrolledStudents(Array.isArray(refreshData) ? refreshData : []);
      } else {
        const data = await res.json();
        setToast({ message: data.error || "فشل التسجيل", type: 'error' });
      }
    } catch {
      setToast({ message: "فشل الاتصال بالخادم", type: 'error' });
    }
  };

  // إلغاء تسجيل طالب
  const unenrollStudent = async (enrollmentId: number) => {
    try {
      await fetch(`/api/enrollments?id=${enrollmentId}`, { method: 'DELETE' });
      setToast({ message: "تم إلغاء التسجيل", type: 'success' });
      const refreshRes = await fetch(`/api/enrollments?course_id=${enrollModal.courseId}`);
      const refreshData = await refreshRes.json();
      setEnrolledStudents(Array.isArray(refreshData) ? refreshData : []);
    } catch {
      setToast({ message: "فشل إلغاء التسجيل", type: 'error' });
    }
  };

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
    (c.teacher_name && c.teacher_name.toLowerCase().includes(search.toLowerCase()))
  );

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key] ?? '';
    const bValue = b[sortConfig.key] ?? '';
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedCourses.length / itemsPerPage);
  const paginatedCourses = sortedCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: keyof Course) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans selection:bg-purple-100 overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-8 gap-4 md:gap-6 animate-fade-in-up">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#7c3aed] to-[#c8a44e] rounded-full"></div>
              <p className="text-[10px] md:text-xs font-bold text-[#7c3aed]/60 uppercase tracking-widest">لوحة التحكم</p>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">المواد الدراسية</h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">إدارة المقررات والمناهج الدراسية</p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="group flex items-center justify-center gap-2 md:gap-3 bg-gradient-to-l from-[#0f2744] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#0f2744] text-white px-4 md:px-7 py-2.5 md:py-3.5 rounded-xl text-sm md:text-base font-bold shadow-lg shadow-[#0f2744]/15 transition-all active:scale-[0.98] w-full md:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            إضافة مادة جديدة
          </button>
        </div>

        {/* Stats Banner */}
        {(() => {
          const assignedCount = courses.filter(c => c.teacher_id).length;
          const uniqueTeachers = new Set(courses.map(c => c.teacher_id).filter(Boolean)).size;
          return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
          {/* Total Courses */}
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-1 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7c3aed]/60 via-[#7c3aed] to-[#7c3aed]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#7c3aed]/5 rounded-full blur-2xl group-hover:bg-[#7c3aed]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#7c3aed]/20 to-[#7c3aed]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#7c3aed]/10 text-[#7c3aed] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">مقرر</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{courses.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">إجمالي المواد</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#7c3aed]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#7c3aed] to-[#7c3aed]/60 rounded-full" style={{width: '90%'}}></div>
              </div>
            </div>
          </div>
          {/* Assigned */}
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-2 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#059669]/60 via-[#059669] to-[#059669]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#059669]/5 rounded-full blur-2xl group-hover:bg-[#059669]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#059669]/20 to-[#059669]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#059669]/10 text-[#059669] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">معيّن</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{assignedCount}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">مواد لها أستاذ</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#059669]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#059669] to-[#059669]/60 rounded-full" style={{width: courses.length > 0 ? `${(assignedCount / courses.length) * 100}%` : '0%'}}></div>
              </div>
            </div>
          </div>
          {/* Unique Teachers */}
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-3 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2563eb]/60 via-[#2563eb] to-[#2563eb]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#2563eb]/5 rounded-full blur-2xl group-hover:bg-[#2563eb]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#2563eb]/20 to-[#2563eb]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#2563eb]/10 text-[#2563eb] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">أساتذة</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{uniqueTeachers}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">أستاذ معيّن</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#2563eb]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#2563eb] to-[#2563eb]/60 rounded-full" style={{width: uniqueTeachers > 0 ? '65%' : '0%'}}></div>
              </div>
            </div>
          </div>
          {/* Search Results */}
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-4 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c8a44e]/60 via-[#c8a44e] to-[#c8a44e]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#c8a44e]/5 rounded-full blur-2xl group-hover:bg-[#c8a44e]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#c8a44e]/20 to-[#c8a44e]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#c8a44e]/10 text-[#c8a44e] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">بحث</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{filteredCourses.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">نتائج العرض الحالي</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#c8a44e]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#c8a44e] to-[#c8a44e]/60 rounded-full" style={{width: courses.length > 0 ? `${(filteredCourses.length / courses.length) * 100}%` : '0%'}}></div>
              </div>
            </div>
          </div>
        </div>
          );
        })()}

        <div className="card-pro overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row gap-3 md:gap-6 items-center justify-between">
            <div className="relative w-full md:max-w-[450px]">
              <span className="absolute inset-y-0 right-4 flex items-center text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="بحث باسم المادة أو الرمز..."
                className="w-full pr-12 pl-4 md:pl-6 py-3 md:py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/20 focus:bg-white outline-none transition-all text-xs md:text-sm font-medium placeholder:text-slate-400 shadow-inner"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            
            <button onClick={fetchCourses} className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-purple-600 font-bold text-sm transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              تحديث
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="relative w-16 h-16">
                   <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-400 font-bold mt-6 tracking-wide">جاري التحميل...</p>
              </div>
            ) : error ? (
              <div className="p-20 text-center text-red-500 font-bold">{error}</div>
            ) : filteredCourses.length === 0 ? (
              <div className="py-32 text-center text-slate-400 font-medium">لا توجد سجلات مطابقة</div>
            ) : (
              <>
              {/* Desktop Table */}
              <table className="hidden md:table w-full text-right border-collapse">
                <thead>
                  <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="p-6 cursor-pointer hover:text-purple-600" onClick={() => handleSort('name')}>اسم المادة</th>
                    <th className="p-6 cursor-pointer hover:text-purple-600" onClick={() => handleSort('teacher_name')}>أستاذ المادة</th>
                    <th className="p-6 cursor-pointer hover:text-purple-600">القسم</th>
                    <th className="p-6 cursor-pointer hover:text-purple-600" onClick={() => handleSort('stage')}>المرحلة</th>
                    <th className="p-6 cursor-pointer hover:text-purple-600" onClick={() => handleSort('term')}>الكورس</th>
                    <th className="p-6 text-center">الطلاب</th>
                    <th className="p-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50">
                  {paginatedCourses.map((course) => (
                    <tr key={course.id} className="group hover:bg-slate-50/80 transition-all">
                      <td className="p-6">
                        {editId === course.id ? (
                          <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm font-bold" placeholder="اسم المادة" />
                        ) : (
                          <div className="font-bold text-slate-800">{course.name}</div>
                        )}
                      </td>
                      <td className="p-6">
                        {editId === course.id ? (
                          <select 
                            value={editTeacherId} 
                            onChange={e => setEditTeacherId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                          >
                            <option value="">اختر الأستاذ</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm font-bold text-slate-700">{course.teacher_name || teachers.find(t => t.id === course.teacher_id)?.name || '-'}</span>
                        )}
                      </td>
                      <td className="p-6">
                        {editId === course.id ? (
                          <span className="text-xs text-slate-400">-</span>
                        ) : (
                          <span className="text-sm font-medium text-[#0891b2]">
                            {course.teacher_department || teachers.find(t => t.id === course.teacher_id)?.department || '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-6">
                        {editId === course.id ? (
                          <select
                            value={editStage}
                            onChange={e => setEditStage(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                          >
                            <option value="">-</option>
                            <option value="1">المرحلة الأولى</option>
                            <option value="2">المرحلة الثانية</option>
                            <option value="3">المرحلة الثالثة</option>
                            <option value="4">المرحلة الرابعة</option>
                          </select>
                        ) : (
                          <span className="text-sm font-bold text-slate-700">
                            {course.stage ? `المرحلة ${course.stage}` : '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-6">
                        {editId === course.id ? (
                          <select
                            value={editTerm}
                            onChange={e => setEditTerm(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                          >
                            <option value="">-</option>
                            <option value="كورس_اول">الكورس الأول</option>
                            <option value="كورس_ثاني">الكورس الثاني</option>
                          </select>
                        ) : (
                          <span className="text-sm font-bold text-slate-700">
                            {course.term === 'كورس_اول' ? 'الكورس الأول' : course.term === 'كورس_ثاني' ? 'الكورس الثاني' : '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        <button 
                          onClick={() => openEnrollModal(course.id, course.name)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>
                          تسجيل طلاب
                        </button>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex justify-center gap-2">
                          {editId === course.id ? (
                            <>
                              <button onClick={handleEdit} className="text-purple-600 font-bold text-xs">حفظ</button>
                              <button onClick={() => setEditId(null)} className="text-slate-400 font-bold text-xs">إلغاء</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(course)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /></svg>
                              </button>
                              <button onClick={() => promptDelete(course.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedCourses.map((course) => (
                  <div key={course.id} className="p-4 hover:bg-slate-50/80 transition-all">
                    {editId === course.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input value={editCode} onChange={e => setEditCode(e.target.value)} className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono outline-none" placeholder="CS101" />
                          <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold outline-none" placeholder="اسم المادة" />
                        </div>
                        <select value={editTeacherId} onChange={e => setEditTeacherId(e.target.value)} className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs outline-none">
                          <option value="">اختر الأستاذ</option>
                          {teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={handleEdit} className="flex-1 bg-purple-600 text-white py-2 rounded-xl text-xs font-bold">حفظ</button>
                          <button onClick={() => setEditId(null)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold">إلغاء</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-slate-800 font-bold text-sm">{course.name}</span>
                            </div>
                            <p className="text-slate-500 text-[11px] mt-1">الأستاذ: {course.teacher_name || teachers.find(t => t.id === course.teacher_id)?.name || '-'}</p>
                            {(course.teacher_department || teachers.find(t => t.id === course.teacher_id)?.department) && (
                              <p className="text-[11px] text-[#0891b2] font-bold mt-0.5">القسم: {course.teacher_department || teachers.find(t => t.id === course.teacher_id)?.department}</p>
                            )}
                            {course.stage && (
                              <p className="text-[11px] text-purple-600 font-bold mt-0.5">المرحلة: {course.stage}</p>
                            )}
                            {course.term && (
                              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">الكورس: {course.term === 'كورس_اول' ? 'الأول' : 'الثاني'}</p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => startEdit(course)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl">
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /></svg>
                            </button>
                            <button onClick={() => promptDelete(course.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <button 
                            onClick={() => openEnrollModal(course.id, course.name)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>
                            تسجيل طلاب
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </>
            )}
            
            {/* Pagination */}
            {!loading && !error && filteredCourses.length > 0 && (
              <div className="p-3 md:p-6 border-t border-slate-50 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">صفحة {currentPage} من {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-lg border text-xs font-bold disabled:opacity-50">السابق</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg border text-xs font-bold disabled:opacity-50">التالي</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up max-h-[95vh] overflow-y-auto">
            <div className="bg-slate-900 p-6 md:p-8 text-center relative overflow-hidden">
              <div className="hidden md:block absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full -mr-16 -mt-16 opacity-20 blur-3xl"></div>
              <h3 className="text-xl md:text-2xl font-black text-white relative z-10">إضافة مادة جديدة</h3>
            </div>
            <form onSubmit={handleAddCourse} className="p-5 md:p-8 space-y-4">
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">اسم المادة</label>
                 <input type="text" placeholder="مثال: مقدمة في البرمجة" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-purple-500/20 text-sm" value={courseName} onChange={e => setCourseName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">رمز المادة (Code)</label>
                 <input type="text" placeholder="مثال: CS101" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-purple-500/20 text-sm" value={code} onChange={e => setCode(e.target.value)} required />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">القسم</label>
                 <select
                    className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-purple-500/20 text-sm text-slate-700"
                    value={selectedDept}
                    onChange={e => { setSelectedDept(e.target.value); setTeacherId(""); }}
                 >
                    <option value="">-- اختر القسم أولاً --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">أستاذ المادة</label>
                 <select 
                    className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-purple-500/20 text-sm text-slate-700 disabled:opacity-50"
                    value={teacherId}
                    onChange={e => setTeacherId(e.target.value)}
                    disabled={!selectedDept}
                 >
                    <option value="">{selectedDept ? 'اختر الأستاذ المسؤول' : 'حدد القسم أولاً'}</option>
                    {teachers
                      .filter(t => !selectedDept || t.department === selectedDept)
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))
                    }
                 </select>
                 {selectedDept && teachers.filter(t => t.department === selectedDept).length === 0 && (
                   <p className="text-xs text-amber-500 font-bold">لا يوجد أساتذة مسجلون في هذا القسم حتى الآن</p>
                 )}
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">المرحلة الدراسية</label>
                 <select
                    className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-purple-500/20 text-sm text-slate-700"
                    value={stage}
                    onChange={e => setStage(e.target.value)}
                 >
                    <option value="">-- اختر المرحلة --</option>
                    <option value="1">المرحلة الأولى</option>
                    <option value="2">المرحلة الثانية</option>
                    <option value="3">المرحلة الثالثة</option>
                    <option value="4">المرحلة الرابعة</option>
                 </select>
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400">الكورس الدراسي</label>
                 <select
                    className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-purple-500/20 text-sm text-slate-700"
                    value={term}
                    onChange={e => setTerm(e.target.value)}
                 >
                    <option value="">-- اختر الكورس --</option>
                    <option value="كورس_اول">الكورس الأول</option>
                    <option value="كورس_ثاني">الكورس الثاني</option>
                 </select>
              </div>


              {formError && <div className="text-red-500 text-xs font-bold text-center">{formError}</div>}
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={formLoading} className="flex-1 bg-gradient-to-l from-[#0f2744] to-[#1a3a5c] text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all">حفظ المادة</button>
                <button type="button" onClick={() => { setShowForm(false); setSelectedDept(""); setTeacherId(""); }} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-black text-center mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 text-center text-sm mb-6">هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold">حذف</button>
              <button onClick={() => setDeleteModal({ show: false, id: null })} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {enrollModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up max-h-[95vh] overflow-y-auto">
            <div className="bg-emerald-700 p-6 md:p-8 text-center relative overflow-hidden">
              <div className="hidden md:block absolute top-0 right-0 w-32 h-32 bg-emerald-400 rounded-full -mr-16 -mt-16 opacity-20 blur-3xl"></div>
              <h3 className="text-lg md:text-2xl font-black text-white relative z-10">تسجيل طلاب في: {enrollModal.courseName}</h3>
            </div>
            <div className="p-5 md:p-8 space-y-4 md:space-y-6">
              {/* إضافة طالب */}
              <div className="flex gap-3">
                <select
                  className="flex-1 p-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  value={enrollStudentId}
                  onChange={e => setEnrollStudentId(e.target.value)}
                >
                  <option value="">اختر طالب للتسجيل...</option>
                  {allStudents
                    .filter(s => !enrolledStudents.some(es => es.student_id === s.id))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {s.email}</option>
                    ))}
                </select>
                <button
                  onClick={enrollStudent}
                  disabled={!enrollStudentId}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  تسجيل
                </button>
              </div>

              {/* قائمة الطلاب المسجلين */}
              <div>
                <h4 className="text-sm font-black text-slate-500 mb-3">الطلاب المسجلون ({enrolledStudents.length})</h4>
                {enrollLoading ? (
                  <div className="text-center py-8 text-slate-400 font-bold text-sm">جاري التحميل...</div>
                ) : enrolledStudents.length === 0 ? (
                  <div className="text-center py-8 text-slate-300 font-medium text-sm">لا يوجد طلاب مسجلون في هذه المادة</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {enrolledStudents.map((es: any) => (
                      <div key={es.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                          <span className="font-bold text-slate-800 text-sm">{es.student_name || es.name}</span>
                          {es.student_email && <span className="text-xs text-slate-400 mr-2">({es.student_email})</span>}
                        </div>
                        <button
                          onClick={() => unenrollStudent(es.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          title="إلغاء التسجيل"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => { setEnrollModal({ show: false, courseId: null, courseName: '' }); setEnrolledStudents([]); setEnrollStudentId(''); }}
                className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:bottom-6 px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl text-white font-bold text-sm md:text-base z-[70] ${toast.type === 'success' ? 'bg-slate-900' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
