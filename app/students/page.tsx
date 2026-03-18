"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// تعريف نوع بيانات الطالب
type Student = {
  id: number;
  name: string;
  email: string;
  phone: string;
  department: string;
  stage?: string;
  created_at: string;
};

export default function StudentsPage() {
  const router = useRouter();
  // ---------------------------------------------------------
  // الحالات (States)
  // ---------------------------------------------------------
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [stage, setStage] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editStage, setEditStage] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // حالات الكليات والأقسام
  const [faculties, setFaculties] = useState<{id: number; name: string}[]>([]);
  const [allDepartments, setAllDepartments] = useState<{id: number; name: string; faculty_id: number}[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [editSelectedFacultyId, setEditSelectedFacultyId] = useState<string>("");

  // حالات إضافية للتحسينات (Toast & Modal)
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, id: number | null}>({ show: false, id: null });

  const [search, setSearch] = useState("");
  
  // حالات الترتيب وتقسيم الصفحات (Pagination & Sorting)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // عدد الطلاب في كل صفحة
  const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: 'asc' | 'desc' } | null>(null);

  // ---------------------------------------------------------
  // الدوال (Functions)
  // ---------------------------------------------------------
  const fetchStudents = () => {
    setLoading(true);
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => {
        setStudents(data);
        setLoading(false);
      })
      .catch(() => {
        setError('فشل في جلب البيانات من الخادم');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStudents();
    fetch('/api/faculties').then(r => r.json()).then(d => setFaculties(Array.isArray(d) ? d : []));
    fetch('/api/departments').then(r => r.json()).then(d => setAllDepartments(Array.isArray(d) ? d : []));
  }, []);

  // إخفاء الإشعار تلقائياً
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, department, stage, password })
      });

      if (res.ok) {
        const newStudent = await res.json();

        // تسجيل الطالب تلقائياً في المواد الخاصة بمرحلته
        if (stage) {
          await fetch('/api/enrollments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: newStudent.id, auto_enroll: true })
          });
        }

        setName("");
        setEmail("");
        setPhone("");
        setDepartment("");
        setStage("");
        setPassword("");
        setSelectedFacultyId("");
        setShowForm(false);
        fetchStudents();
        setToast({ message: "تم إضافة الطالب بنجاح والتسجيل في المواد تلقائياً", type: 'success' });
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

  const handleOpenForm = () => {
    setShowForm(true);
    // توليد بريد إلكتروني تلقائي بناءً على عدد الطلاب
    const nextNumber = students.length + 1;
    setEmail(`student${nextNumber}@almaqal.edu.iq`);
    setName("");
    setPhone("");
    setDepartment("");
    setPassword("");
    setSelectedFacultyId("");
  };

  // فتح نافذة تأكيد الحذف
  const promptDelete = (id: number) => {
    setDeleteModal({ show: true, id });
  };

  // تنفيذ الحذف
  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await fetch(`/api/students?id=${deleteModal.id}`, { method: 'DELETE' });
      fetchStudents();
      setToast({ message: "تم حذف السجل بنجاح", type: 'success' });
    } catch {
      setToast({ message: "تعذر الحذف، يرجى المحاولة لاحقاً", type: 'error' });
    } finally {
      setDeleteModal({ show: false, id: null });
    }
  };

  const startEdit = (student: Student) => {
    setEditId(student.id);
    setEditName(student.name);
    setEditEmail(student.email);
    setEditPhone(student.phone || "");
    setEditDepartment(student.department || "");
    setEditStage(student.stage || "");
    // تحديد الكلية تلقائياً بناءً على القسم الحالي
    const dept = allDepartments.find(d => d.name === student.department);
    setEditSelectedFacultyId(dept ? String(dept.faculty_id) : "");
  };

  const handleEdit = async () => {
    if (!editName || !editEmail) return;
    setEditLoading(true);
    try {
      await fetch(`/api/students?id=${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, department: editDepartment, stage: editStage })
      });
      setEditId(null);
      fetchStudents();
      setToast({ message: "تم تحديث البيانات بنجاح", type: 'success' });
    } catch {
      setToast({ message: "فشل التعديل", type: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  // منطق البحث والترتيب والتقسيم
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone && s.phone.includes(search)) ||
    (s.department && s.department.toLowerCase().includes(search.toLowerCase()))
  );

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue == null || bValue == null) return 0;
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage);
  const paginatedStudents = sortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: keyof Student) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans selection:bg-blue-100 overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-8 gap-4 md:gap-6 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-white transition-all hover:shadow-md"
              title="رجوع"
            >
              <svg
                className="w-6 h-6 text-[#0f2744]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
                <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">لوحة التحكم</p>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">سجل الطلاب</h1>
              <p className="text-slate-500 text-xs md:text-sm mt-1">إدارة شاملة لبيانات الطلاب المسجلين في النظام الجامعي</p>
            </div>
          </div>
          <button
            onClick={handleOpenForm}
            className="group flex items-center justify-center gap-2 md:gap-3 bg-gradient-to-l from-[#0f2744] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#0f2744] text-white px-4 md:px-7 py-2.5 md:py-3.5 rounded-xl text-sm md:text-base font-bold shadow-lg shadow-[#0f2744]/15 transition-all active:scale-[0.98] w-full md:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            إضافة سجل جديد
          </button>
        </div>

        {/* Info Banner / Stats */}
        {(() => {
          const deptCount = new Set(students.map(s => s.department).filter(Boolean)).size;
          const recentCount = students.filter(s => {
            const d = new Date(s.created_at);
            const now = new Date();
            return (now.getTime() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
          }).length;
          return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
          {/* Total Students */}
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-1 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2563eb]/60 via-[#2563eb] to-[#2563eb]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#2563eb]/5 rounded-full blur-2xl group-hover:bg-[#2563eb]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#2563eb]/20 to-[#2563eb]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#2563eb]/10 text-[#2563eb] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">نشط</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{students.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">إجمالي الطلاب</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#2563eb]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#2563eb] to-[#2563eb]/60 rounded-full" style={{width: '85%'}}></div>
              </div>
            </div>
          </div>
          {/* Departments */}
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-2 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#059669]/60 via-[#059669] to-[#059669]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#059669]/5 rounded-full blur-2xl group-hover:bg-[#059669]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#059669]/20 to-[#059669]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#059669]/10 text-[#059669] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">أقسام</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{deptCount}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">الأقسام المسجلة</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#059669]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#059669] to-[#059669]/60 rounded-full" style={{width: deptCount > 0 ? '60%' : '0%'}}></div>
              </div>
            </div>
          </div>
          {/* Recent Registrations */}
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-3 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c8a44e]/60 via-[#c8a44e] to-[#c8a44e]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#c8a44e]/5 rounded-full blur-2xl group-hover:bg-[#c8a44e]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#c8a44e]/20 to-[#c8a44e]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#c8a44e]/10 text-[#c8a44e] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">جديد</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{recentCount}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">تسجيل هذا الشهر</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#c8a44e]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#c8a44e] to-[#c8a44e]/60 rounded-full" style={{width: students.length > 0 ? `${Math.min((recentCount / students.length) * 100, 100)}%` : '0%'}}></div>
              </div>
            </div>
          </div>
          {/* Filtered Results */}
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-4 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7c3aed]/60 via-[#7c3aed] to-[#7c3aed]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#7c3aed]/5 rounded-full blur-2xl group-hover:bg-[#7c3aed]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#7c3aed]/20 to-[#7c3aed]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#7c3aed]/10 text-[#7c3aed] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">بحث</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{filteredStudents.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">نتائج العرض الحالي</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#7c3aed]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#7c3aed] to-[#7c3aed]/60 rounded-full" style={{width: students.length > 0 ? `${(filteredStudents.length / students.length) * 100}%` : '0%'}}></div>
              </div>
            </div>
          </div>
        </div>
          );
        })()}

        <div className="card-pro overflow-hidden">
          {/* Enhanced Toolbar */}
          <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row gap-3 md:gap-6 items-center justify-between">
            <div className="relative w-full md:max-w-[450px]">
              <span className="absolute inset-y-0 right-4 flex items-center text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="البحث بالاسم، البريد، أو المعرف..."
                className="w-full pr-12 pl-4 md:pl-6 py-3 md:py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition-all text-xs md:text-sm font-medium placeholder:text-slate-400 shadow-inner"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setCurrentPage(1); // العودة للصفحة الأولى عند البحث
                }}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchStudents} 
                className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                تحديث القائمة
              </button>
            </div>
          </div>

          {/* Professional Table Design */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="relative w-16 h-16">
                   <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-400 font-bold mt-6 tracking-wide">جاري جلب السجلات...</p>
              </div>
            ) : error ? (
              <div className="p-20 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 text-red-500 rounded-3xl mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{error}</h3>
                <button onClick={fetchStudents} className="text-blue-600 font-bold hover:text-blue-700 transition-colors">إعادة المحاولة</button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-32 text-center">
                <div className="text-slate-300 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-slate-400 font-medium text-lg">لا توجد بيانات مطابقة لعملية البحث</p>
              </div>
            ) : (
              <>
              {/* Desktop Table - hidden on mobile */}
              <table className="hidden md:table w-full text-right border-collapse">
                <thead>
                  <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="p-6 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('id')}>
                      المعرف {sortConfig?.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-6 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('name')}>
                      بيانات الطالب {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-6 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('department')}>
                      القسم {sortConfig?.key === 'department' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-6 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('stage')}>
                      المرحلة {sortConfig?.key === 'stage' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-6 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('phone')}>
                      الهاتف {sortConfig?.key === 'phone' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-6 text-center cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('created_at')}>
                      تاريخ القيد {sortConfig?.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50">
                  {paginatedStudents.map((student) => (
                    <tr key={student.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                      <td className="p-6">
                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold">
                          {student.id}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          {editId === student.id ? (
                            <div className="space-y-2 max-w-xs">
                              <input 
                                value={editName} 
                                onChange={e => setEditName(e.target.value)} 
                                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-bold"
                                placeholder="الاسم الكامل"
                              />
                              <input 
                                value={editEmail} 
                                onChange={e => setEditEmail(e.target.value)} 
                                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-xs"
                                placeholder="البريد الإلكتروني"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="text-slate-800 font-bold group-hover:text-blue-700 transition-colors">{student.name}</span>
                              <span className="text-slate-400 text-xs mt-0.5">{student.email}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        {editId === student.id ? (
                          <div className="space-y-1.5">
                            <select
                              className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-700"
                              value={editSelectedFacultyId}
                              onChange={e => { setEditSelectedFacultyId(e.target.value); setEditDepartment(""); }}
                            >
                              <option value="">-- الكلية --</option>
                              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            <select
                              className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-700 disabled:opacity-50"
                              value={editDepartment}
                              onChange={e => setEditDepartment(e.target.value)}
                              disabled={!editSelectedFacultyId}
                            >
                              <option value="">-- القسم --</option>
                              {allDepartments.filter(d => String(d.faculty_id) === editSelectedFacultyId).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-medium text-sm">{student.department || '-'}</span>
                        )}
                      </td>
                      <td className="p-6">
                        {editId === student.id ? (
                          <select
                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-700"
                            value={editStage}
                            onChange={e => setEditStage(e.target.value)}
                          >
                            <option value="">-- المرحلة --</option>
                            <option value="1">المرحلة الأولى</option>
                            <option value="2">المرحلة الثانية</option>
                            <option value="3">المرحلة الثالثة</option>
                            <option value="4">المرحلة الرابعة</option>
                          </select>
                        ) : (
                          <span className="text-slate-600 font-medium text-sm">
                            {student.stage ? `المرحلة ${student.stage}` : '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-6">
                        {editId === student.id ? (
                          <input 
                            value={editPhone} 
                            onChange={e => setEditPhone(e.target.value)} 
                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                            placeholder="رقم الهاتف"
                          />
                        ) : (
                          <span className="text-slate-500 text-sm" dir="ltr">{student.phone || '-'}</span>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        <span className="text-slate-500 text-sm font-medium">
                          {new Date(student.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center items-center gap-3">
                          {editId === student.id ? (
                            <div className="flex gap-2">
                              <button onClick={handleEdit} disabled={editLoading} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 text-xs font-bold">
                                {editLoading ? '...' : 'حفظ'}
                              </button>
                              <button onClick={() => setEditId(null)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-200 transition text-xs font-bold">
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => startEdit(student)} 
                                className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                                title="تعديل البيانات"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => promptDelete(student.id)} 
                                className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                                title="حذف السجل"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View - shown only on mobile */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedStudents.map((student) => (
                  <div key={student.id} className="p-4 hover:bg-slate-50/80 transition-all">
                    {editId === student.id ? (
                      <div className="space-y-3">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="الاسم" />
                        <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="البريد" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1 col-span-2">
                            <select className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs outline-none text-slate-700" value={editSelectedFacultyId} onChange={e => { setEditSelectedFacultyId(e.target.value); setEditDepartment(""); }}>
                              <option value="">-- الكلية --</option>
                              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            <select className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs outline-none text-slate-700 disabled:opacity-50" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} disabled={!editSelectedFacultyId}>
                              <option value="">-- القسم --</option>
                              {allDepartments.filter(d => String(d.faculty_id) === editSelectedFacultyId).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                          </div>
                          <select className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs outline-none text-slate-700 col-span-2" value={editStage} onChange={e => setEditStage(e.target.value)}>
                            <option value="">-- المرحلة --</option>
                            <option value="1">المرحلة الأولى</option>
                            <option value="2">المرحلة الثانية</option>
                            <option value="3">المرحلة الثالثة</option>
                            <option value="4">المرحلة الرابعة</option>
                          </select>
                          <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs outline-none col-span-2" placeholder="الهاتف" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleEdit} disabled={editLoading} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold">{editLoading ? '...' : 'حفظ'}</button>
                          <button onClick={() => setEditId(null)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold">إلغاء</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">#{student.id}</span>
                            <span className="text-slate-800 font-bold text-sm truncate">{student.name}</span>
                          </div>
                          <p className="text-slate-400 text-xs truncate">{student.email}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                            {student.department && <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>{student.department}</span>}
                            {student.phone && <span dir="ltr">{student.phone}</span>}
                            <span>{new Date(student.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(student)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                          </button>
                          <button onClick={() => promptDelete(student.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </>
            )}
            
            {/* Pagination Controls */}
            {!loading && !error && filteredStudents.length > 0 && (
              <div className="p-3 md:p-6 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 bg-slate-50/30">
                <span className="text-xs font-bold text-slate-400">
                  عرض {((currentPage - 1) * itemsPerPage) + 1} إلى {Math.min(currentPage * itemsPerPage, sortedStudents.length)} من أصل {sortedStudents.length} سجل
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    السابق
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Simple logic to show first few pages, for full logic more code is needed
                      const p = i + 1; 
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${currentPage === p ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Modal for Adding Students */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up max-h-[95vh] overflow-y-auto">
            <div className="relative h-32 bg-slate-900 flex items-center justify-center p-8 overflow-hidden">
               {/* Decorative Element */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full -mr-16 -mt-16 opacity-20 blur-3xl"></div>
               <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full -ml-12 -mb-12 opacity-20 blur-2xl"></div>
               
               <div className="relative z-10 text-center">
                  <h3 className="text-2xl font-black text-white">تسجيل طالب جديد</h3>
                  <p className="text-slate-400 text-xs mt-1 font-bold uppercase tracking-widest">إدخال البيانات الأساسية</p>
               </div>
               
               <button 
                  onClick={() => setShowForm(false)} 
                  className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors"
               >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="p-5 md:p-10 space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider pr-1">الاسم الثلاثي</label>
                <input
                  type="text"
                  placeholder="أدخل اسم الطالب الكامل"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold placeholder:text-slate-300 shadow-inner"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider pr-1">البريد الجامعي</label>
                <input
                  type="email"
                  placeholder="name@university.edu"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold placeholder:text-slate-300 shadow-inner"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider pr-1">كلمة المرور للحساب</label>
                <input
                  type="password"
                  placeholder="كلمة المرور لتسجيل الدخول"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold placeholder:text-slate-300 shadow-inner"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={4}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider pr-1">رقم الهاتف</label>
                <input
                  type="tel"
                  placeholder="07XXXXXXXX"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold placeholder:text-slate-300 shadow-inner text-sm"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider pr-1">الكلية</label>
                  <select
                    className="w-full p-3 md:p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-sm text-slate-700"
                    value={selectedFacultyId}
                    onChange={e => { setSelectedFacultyId(e.target.value); setDepartment(""); }}
                  >
                    <option value="">-- اختر الكلية --</option>
                    {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider pr-1">القسم</label>
                  <select
                    className="w-full p-3 md:p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-sm text-slate-700 disabled:opacity-50"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    disabled={!selectedFacultyId}
                  >
                    <option value="">-- اختر القسم --</option>
                    {allDepartments.filter(d => String(d.faculty_id) === selectedFacultyId).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider pr-1">المرحلة</label>
                  <select
                    className="w-full p-3 md:p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-sm text-slate-700"
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
              </div>
              
              {formError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  type="submit" 
                  className="w-full bg-slate-900 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-200 transition-all disabled:opacity-50 active:scale-95" 
                  disabled={formLoading}
                >
                  {formLoading ? 'جاري الحفظ والارشفة...' : 'إتمام عملية التسجيل'}
                </button>
                <button 
                  type="button" 
                  className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-all" 
                  onClick={() => setShowForm(false)}
                >
                  صرف النظر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-fade-in-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">تأكيد الحذف</h3>
              <p className="text-slate-500 font-medium text-sm mb-6">هل أنت متأكد من رغبتك في حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-red-200">نعم، احذف</button>
                <button onClick={() => setDeleteModal({ show: false, id: null })} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:bottom-6 px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl text-white font-bold flex items-center gap-2 md:gap-3 text-sm md:text-base z-[70] ${toast.type === 'success' ? 'bg-slate-900' : 'bg-red-500'}`}>
          {toast.type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}