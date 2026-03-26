"use client";

import React, { useEffect, useState, useMemo } from 'react';

// تعريف نوع بيانات الأستاذ
type Teacher = {
  id: number;
  name: string;
  email: string;
  phone: string;
  department: string;
  created_at: string;
};

export default function TeachersPage() {
  // ---------------------------------------------------------
  // الحالات (States)
  // ---------------------------------------------------------
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // حالات الكليات والأقسام
  const [faculties, setFaculties] = useState<{id: number; name: string}[]>([]);
  const [allDepartments, setAllDepartments] = useState<{id: number; name: string; faculty_id: number}[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [editSelectedFacultyId, setEditSelectedFacultyId] = useState<string>("");

  // حالات الإشعارات والنوافذ المنبثقة
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, id: number | null}>({ show: false, id: null });

  const [search, setSearch] = useState("");
  
  // حالات الترتيب وتقسيم الصفحات
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Teacher; direction: 'asc' | 'desc' } | null>(null);

  // ---------------------------------------------------------
  // الدوال (Functions)
  // ---------------------------------------------------------
  const fetchTeachers = () => {
    setLoading(true);
    fetch('/api/teachers')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        setTeachers(data);
        setLoading(false);
      })
      .catch(() => {
        setError('فشل في جلب البيانات من الخادم');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTeachers();
    fetch('/api/faculties').then(r => r.json()).then(d => setFaculties(Array.isArray(d) ? d : []));
    fetch('/api/departments').then(r => r.json()).then(d => setAllDepartments(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, department, password })
      });
      
      if (res.ok) {
        setName(""); setEmail(""); setPhone(""); setDepartment(""); setPassword(""); setSelectedFacultyId("");
        setShowForm(false);
        fetchTeachers();
        setToast({ message: "تم إضافة الأستاذ بنجاح", type: 'success' });
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
      await fetch(`/api/teachers?id=${deleteModal.id}`, { method: 'DELETE' });
      fetchTeachers();
      setToast({ message: "تم حذف السجل بنجاح", type: 'success' });
    } catch {
      setToast({ message: "تعذر الحذف، يرجى المحاولة لاحقاً", type: 'error' });
    } finally {
      setDeleteModal({ show: false, id: null });
    }
  };

  const startEdit = (teacher: Teacher) => {
    setEditId(teacher.id);
    setEditName(teacher.name);
    setEditEmail(teacher.email);
    setEditPhone(teacher.phone || "");
    setEditDepartment(teacher.department || "");
    setEditPassword(""); // باسورد فارغ - سيتم تحديثه فقط إذا أدخل الأدمن قيمة جديدة
    const dept = allDepartments.find(d => d.name === teacher.department);
    setEditSelectedFacultyId(dept ? String(dept.faculty_id) : "");
  };

  const handleEdit = async () => {
    if (!editName || !editEmail) return;
    setEditLoading(true);
    try {
      const payload: any = {
        name: editName,
        email: editEmail,
        phone: editPhone,
        department: editDepartment
      };

      // إضافة الباسورد فقط إذا تم إدخاله
      if (editPassword && editPassword.trim()) {
        payload.password = editPassword;
      }

      await fetch(`/api/teachers?id=${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setEditId(null);
      fetchTeachers();
      setToast({ message: "تم تحديث البيانات بنجاح", type: 'success' });
    } catch {
      setToast({ message: "فشل التعديل", type: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    (t.phone && t.phone.includes(search)) ||
    (t.department && t.department.toLowerCase().includes(search.toLowerCase()))
  );

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedTeachers.length / itemsPerPage);
  const paginatedTeachers = sortedTeachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: keyof Teacher) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans selection:bg-green-100 overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-8 gap-4 md:gap-6 animate-fade-in-up">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
              <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">لوحة التحكم</p>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">أعضاء هيئة التدريس</h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">إدارة بيانات الأساتذة والمحاضرين في الجامعة</p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="group flex items-center justify-center gap-2 md:gap-3 bg-gradient-to-l from-[#0f2744] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#0f2744] text-white px-4 md:px-7 py-2.5 md:py-3.5 rounded-xl text-sm md:text-base font-bold shadow-lg shadow-[#0f2744]/15 transition-all active:scale-[0.98] w-full md:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            إضافة أستاذ جديد
          </button>
        </div>

        {/* Stats Banner */}
        {(() => {
          const deptCount = new Set(teachers.map(t => t.department).filter(Boolean)).size;
          const recentCount = teachers.filter(t => {
            const d = new Date(t.created_at);
            const now = new Date();
            return (now.getTime() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
          }).length;
          return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
          {/* Total Teachers */}
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-1 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#059669]/60 via-[#059669] to-[#059669]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#059669]/5 rounded-full blur-2xl group-hover:bg-[#059669]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#059669]/20 to-[#059669]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#059669]/10 text-[#059669] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">نشط</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{teachers.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">إجمالي الأساتذة</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#059669]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#059669] to-[#059669]/60 rounded-full" style={{width: '80%'}}></div>
              </div>
            </div>
          </div>
          {/* Departments */}
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-2 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2563eb]/60 via-[#2563eb] to-[#2563eb]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#2563eb]/5 rounded-full blur-2xl group-hover:bg-[#2563eb]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#2563eb]/20 to-[#2563eb]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#2563eb]/10 text-[#2563eb] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">أقسام</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{deptCount}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">الأقسام المسجلة</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#2563eb]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#2563eb] to-[#2563eb]/60 rounded-full" style={{width: deptCount > 0 ? '55%' : '0%'}}></div>
              </div>
            </div>
          </div>
          {/* Recent */}
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
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">إضافة هذا الشهر</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#c8a44e]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#c8a44e] to-[#c8a44e]/60 rounded-full" style={{width: teachers.length > 0 ? `${Math.min((recentCount / teachers.length) * 100, 100)}%` : '0%'}}></div>
              </div>
            </div>
          </div>
          {/* Search Results */}
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
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{filteredTeachers.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">نتائج العرض الحالي</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#7c3aed]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-[#7c3aed] to-[#7c3aed]/60 rounded-full" style={{width: teachers.length > 0 ? `${(filteredTeachers.length / teachers.length) * 100}%` : '0%'}}></div>
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
                placeholder="بحث بالاسم، القسم، أو البريد..."
                className="w-full pr-12 pl-4 md:pl-6 py-3 md:py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500/20 focus:bg-white outline-none transition-all text-xs md:text-sm font-medium placeholder:text-slate-400 shadow-inner"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            
            <button onClick={fetchTeachers} className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-green-600 font-bold text-sm transition-colors">
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
                   <div className="absolute inset-0 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-400 font-bold mt-6 tracking-wide">جاري التحميل...</p>
              </div>
            ) : error ? (
              <div className="p-20 text-center text-red-500 font-bold">{error}</div>
            ) : filteredTeachers.length === 0 ? (
              <div className="py-32 text-center text-slate-400 font-medium">لا توجد سجلات مطابقة</div>
            ) : (
              <>
              {/* Desktop Table */}
              <table className="hidden md:table w-full text-right border-collapse">
                <thead>
                  <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="p-6 cursor-pointer hover:text-green-600" onClick={() => handleSort('name')}>الاسم</th>
                    <th className="p-6 cursor-pointer hover:text-green-600" onClick={() => handleSort('department')}>القسم</th>
                    <th className="p-6 cursor-pointer hover:text-green-600" onClick={() => handleSort('phone')}>الهاتف</th>
                    <th className="p-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50">
                  {paginatedTeachers.map((teacher) => (
                    <tr key={teacher.id} className="group hover:bg-slate-50/80 transition-all">
                      <td className="p-6">
                        {editId === teacher.id ? (
                          <div className="space-y-2">
                            <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="الاسم" />
                            <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="البريد" />
                            <input
                              type="password"
                              value={editPassword}
                              onChange={e => setEditPassword(e.target.value)}
                              className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs outline-none"
                              placeholder="كلمة مرور جديدة (اختياري)"
                            />
                            <p className="text-[10px] text-amber-600 font-medium">💡 اترك فارغاً لعدم تغيير الباسورد</p>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-800">{teacher.name}</div>
                            <div className="text-xs text-slate-400">{teacher.email}</div>
                          </div>
                        )}
                      </td>
                      <td className="p-6">
                        {editId === teacher.id ? (
                          <div className="space-y-1.5">
                            <select
                              className="w-full px-3 py-2 border rounded-xl text-xs text-slate-700 bg-white outline-none focus:ring-2 focus:ring-green-500/20"
                              value={editSelectedFacultyId}
                              onChange={e => { setEditSelectedFacultyId(e.target.value); setEditDepartment(""); }}
                            >
                              <option value="">-- الكلية --</option>
                              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            <select
                              className="w-full px-3 py-2 border rounded-xl text-xs text-slate-700 bg-white outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50"
                              value={editDepartment}
                              onChange={e => setEditDepartment(e.target.value)}
                              disabled={!editSelectedFacultyId}
                            >
                              <option value="">-- القسم --</option>
                              {allDepartments.filter(d => String(d.faculty_id) === editSelectedFacultyId).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-slate-600">{teacher.department || '-'}</span>
                        )}
                      </td>
                      <td className="p-6">
                        {editId === teacher.id ? (
                          <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" />
                        ) : (
                          <span className="text-sm text-slate-500" dir="ltr">{teacher.phone || '-'}</span>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex justify-center gap-2">
                          {editId === teacher.id ? (
                            <>
                              <button onClick={handleEdit} className="text-green-600 font-bold text-xs">حفظ</button>
                              <button onClick={() => setEditId(null)} className="text-slate-400 font-bold text-xs">إلغاء</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(teacher)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /></svg>
                              </button>
                              <button onClick={() => promptDelete(teacher.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
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
                {paginatedTeachers.map((teacher) => (
                  <div key={teacher.id} className="p-4 hover:bg-slate-50/80 transition-all">
                    {editId === teacher.id ? (
                      <div className="space-y-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 bg-white border border-green-200 rounded-xl text-sm font-bold outline-none" placeholder="الاسم" />
                        <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-3 py-2 bg-white border border-green-200 rounded-xl text-xs outline-none" placeholder="البريد" />
                        <input
                          type="password"
                          value={editPassword}
                          onChange={e => setEditPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs outline-none"
                          placeholder="كلمة مرور جديدة (اختياري)"
                        />
                        <p className="text-[10px] text-amber-600 font-medium">💡 اترك فارغاً لعدم تغيير الباسورد</p>
                        <select className="w-full px-3 py-2 bg-white border border-green-200 rounded-xl text-xs outline-none text-slate-700" value={editSelectedFacultyId} onChange={e => { setEditSelectedFacultyId(e.target.value); setEditDepartment(""); }}>
                          <option value="">-- الكلية --</option>
                          {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <select className="w-full px-3 py-2 bg-white border border-green-200 rounded-xl text-xs outline-none text-slate-700 disabled:opacity-50" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} disabled={!editSelectedFacultyId}>
                          <option value="">-- القسم --</option>
                          {allDepartments.filter(d => String(d.faculty_id) === editSelectedFacultyId).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                        <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full px-3 py-2 bg-white border border-green-200 rounded-xl text-xs outline-none" placeholder="الهاتف" />
                        <div className="flex gap-2">
                          <button onClick={handleEdit} className="flex-1 bg-green-600 text-white py-2 rounded-xl text-xs font-bold">حفظ</button>
                          <button onClick={() => setEditId(null)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold">إلغاء</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-800 font-bold text-sm">{teacher.name}</span>
                          <p className="text-slate-400 text-xs truncate">{teacher.email}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                            {teacher.department && <span>{teacher.department}</span>}
                            {teacher.phone && <span dir="ltr">{teacher.phone}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(teacher)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl">
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /></svg>
                          </button>
                          <button onClick={() => promptDelete(teacher.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
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
            
            {/* Pagination */}
            {!loading && !error && filteredTeachers.length > 0 && (
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
              <div className="hidden md:block absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full -mr-16 -mt-16 opacity-20 blur-3xl"></div>
              <h3 className="text-xl md:text-2xl font-black text-white relative z-10">إضافة أستاذ جديد</h3>
            </div>
            <form onSubmit={handleAddTeacher} className="p-5 md:p-8 space-y-4">
              <input type="text" placeholder="الاسم الكامل" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-green-500/20 text-sm" value={name} onChange={e => setName(e.target.value)} required />
              <input type="email" placeholder="البريد الإلكتروني" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-green-500/20 text-sm" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="كلمة المرور للحساب" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-green-500/20 text-sm" value={password} onChange={e => setPassword(e.target.value)} required minLength={4} />
              <input type="tel" placeholder="رقم الهاتف" className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-green-500/20 text-sm" value={phone} onChange={e => setPhone(e.target.value)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1.5">الكلية</label>
                  <select className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-green-500/20 text-sm text-slate-700" value={selectedFacultyId} onChange={e => { setSelectedFacultyId(e.target.value); setDepartment(""); }}>
                    <option value="">-- اختر الكلية --</option>
                    {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-1.5">القسم</label>
                  <select className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-green-500/20 text-sm text-slate-700 disabled:opacity-50" value={department} onChange={e => setDepartment(e.target.value)} disabled={!selectedFacultyId}>
                    <option value="">-- اختر القسم --</option>
                    {allDepartments.filter(d => String(d.faculty_id) === selectedFacultyId).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              {formError && <div className="text-red-500 text-xs font-bold text-center">{formError}</div>}
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={formLoading} className="flex-1 bg-gradient-to-l from-[#0f2744] to-[#1a3a5c] text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all">حفظ البيانات</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors">إلغاء</button>
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

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:bottom-6 px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl text-white font-bold text-sm md:text-base z-[70] ${toast.type === 'success' ? 'bg-slate-900' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}