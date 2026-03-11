"use client";

import React, { useEffect, useState, useCallback } from "react";

type Faculty = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  departments_count: number;
  created_at: string;
};

type Department = {
  id: number;
  name: string;
  code: string;
  faculty_id: number;
  faculty_name?: string;
  description: string | null;
  created_at: string;
};

export default function FacultiesPage() {
  // ─── Faculties State ───────────────────────────────────────────────
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Faculty Form State ────────────────────────────────────────────
  const [showFacultyForm, setShowFacultyForm] = useState(false);
  const [fName, setFName] = useState("");
  const [fCode, setFCode] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fFormError, setFFormError] = useState<string | null>(null);
  const [fFormLoading, setFFormLoading] = useState(false);

  // ─── Faculty Edit State ────────────────────────────────────────────
  const [editFacultyId, setEditFacultyId] = useState<number | null>(null);
  const [editFName, setEditFName] = useState("");
  const [editFCode, setEditFCode] = useState("");
  const [editFDesc, setEditFDesc] = useState("");
  const [editFLoading, setEditFLoading] = useState(false);

  // ─── Departments State ─────────────────────────────────────────────
  const [expandedFaculty, setExpandedFaculty] = useState<number | null>(null);
  const [departmentsMap, setDepartmentsMap] = useState<Record<number, Department[]>>({});
  const [deptLoading, setDeptLoading] = useState<number | null>(null);

  // ─── Department Form State ─────────────────────────────────────────
  const [showDeptForm, setShowDeptForm] = useState<number | null>(null);
  const [dName, setDName] = useState("");
  const [dCode, setDCode] = useState("");
  const [dDesc, setDDesc] = useState("");
  const [dFormError, setDFormError] = useState<string | null>(null);
  const [dFormLoading, setDFormLoading] = useState(false);

  // ─── Department Edit State ─────────────────────────────────────────
  const [editDeptId, setEditDeptId] = useState<number | null>(null);
  const [editDName, setEditDName] = useState("");
  const [editDCode, setEditDCode] = useState("");
  const [editDDesc, setEditDDesc] = useState("");
  const [editDLoading, setEditDLoading] = useState(false);

  // ─── Toast & Delete Modals ─────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteFacultyModal, setDeleteFacultyModal] = useState<{ show: boolean; id: number | null }>({ show: false, id: null });
  const [deleteDeptModal, setDeleteDeptModal] = useState<{ show: boolean; id: number | null; facultyId: number | null }>({ show: false, id: null, facultyId: null });

  // ─── Search ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ─── Helpers ───────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFaculties = useCallback(() => {
    setLoading(true);
    fetch("/api/faculties")
      .then((r) => r.json())
      .then((data) => {
        setFaculties(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("فشل في جلب البيانات");
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchFaculties(); }, [fetchFaculties]);

  const fetchDepartments = (facultyId: number) => {
    setDeptLoading(facultyId);
    fetch(`/api/departments?faculty_id=${facultyId}`)
      .then((r) => r.json())
      .then((data) => {
        setDepartmentsMap((prev) => ({ ...prev, [facultyId]: Array.isArray(data) ? data : [] }));
        setDeptLoading(null);
      })
      .catch(() => setDeptLoading(null));
  };

  const toggleFaculty = (id: number) => {
    if (expandedFaculty === id) {
      setExpandedFaculty(null);
      setShowDeptForm(null);
    } else {
      setExpandedFaculty(id);
      setShowDeptForm(null);
      if (!departmentsMap[id]) fetchDepartments(id);
    }
  };

  // ─── Faculty CRUD ──────────────────────────────────────────────────
  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFFormError(null);
    if (!fName.trim() || !fCode.trim()) { setFFormError("اسم الكلية والرمز مطلوبان"); return; }
    setFFormLoading(true);
    const res = await fetch("/api/faculties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fName, code: fCode, description: fDesc }),
    });
    const data = await res.json();
    setFFormLoading(false);
    if (!res.ok) { setFFormError(data.error || "حدث خطأ"); return; }
    showToast("تمت إضافة الكلية بنجاح", "success");
    setShowFacultyForm(false); setFName(""); setFCode(""); setFDesc("");
    fetchFaculties();
  };

  const startEditFaculty = (f: Faculty) => {
    setEditFacultyId(f.id);
    setEditFName(f.name);
    setEditFCode(f.code);
    setEditFDesc(f.description || "");
  };

  const handleEditFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFacultyId) return;
    setEditFLoading(true);
    const res = await fetch(`/api/faculties?id=${editFacultyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editFName, code: editFCode, description: editFDesc }),
    });
    const data = await res.json();
    setEditFLoading(false);
    if (!res.ok) { showToast(data.error || "حدث خطأ", "error"); return; }
    showToast("تم تعديل الكلية بنجاح", "success");
    setEditFacultyId(null);
    fetchFaculties();
  };

  const handleDeleteFaculty = async () => {
    if (!deleteFacultyModal.id) return;
    const res = await fetch(`/api/faculties?id=${deleteFacultyModal.id}`, { method: "DELETE" });
    setDeleteFacultyModal({ show: false, id: null });
    if (!res.ok) { showToast("فشل حذف الكلية", "error"); return; }
    showToast("تم حذف الكلية بنجاح", "success");
    setExpandedFaculty(null);
    fetchFaculties();
  };

  // ─── Department CRUD ───────────────────────────────────────────────
  const handleAddDept = async (e: React.FormEvent, facultyId: number) => {
    e.preventDefault();
    setDFormError(null);
    if (!dName.trim() || !dCode.trim()) { setDFormError("اسم القسم والرمز مطلوبان"); return; }
    setDFormLoading(true);
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: dName, code: dCode, faculty_id: facultyId, description: dDesc }),
    });
    const data = await res.json();
    setDFormLoading(false);
    if (!res.ok) { setDFormError(data.error || "حدث خطأ"); return; }
    showToast("تمت إضافة القسم بنجاح", "success");
    setShowDeptForm(null); setDName(""); setDCode(""); setDDesc("");
    fetchDepartments(facultyId);
    fetchFaculties();
  };

  const startEditDept = (d: Department) => {
    setEditDeptId(d.id);
    setEditDName(d.name);
    setEditDCode(d.code);
    setEditDDesc(d.description || "");
  };

  const handleEditDept = async (e: React.FormEvent, facultyId: number) => {
    e.preventDefault();
    if (!editDeptId) return;
    setEditDLoading(true);
    const res = await fetch(`/api/departments?id=${editDeptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editDName, code: editDCode, faculty_id: facultyId, description: editDDesc }),
    });
    const data = await res.json();
    setEditDLoading(false);
    if (!res.ok) { showToast(data.error || "حدث خطأ", "error"); return; }
    showToast("تم تعديل القسم بنجاح", "success");
    setEditDeptId(null);
    fetchDepartments(facultyId);
  };

  const handleDeleteDept = async () => {
    if (!deleteDeptModal.id || !deleteDeptModal.facultyId) return;
    const { id, facultyId } = deleteDeptModal;
    const res = await fetch(`/api/departments?id=${id}`, { method: "DELETE" });
    setDeleteDeptModal({ show: false, id: null, facultyId: null });
    if (!res.ok) { showToast("فشل حذف القسم", "error"); return; }
    showToast("تم حذف القسم بنجاح", "success");
    fetchDepartments(facultyId);
    fetchFaculties();
  };

  const filtered = faculties.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl text-white text-sm font-bold flex items-center gap-2 animate-fade-in-up transition-all ${toast.type === "success" ? "bg-[#059669]" : "bg-red-500"}`}>
          {toast.type === "success" ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Delete Faculty Modal */}
      {deleteFacultyModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-fade-in-up">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-lg font-black text-[#0f2744]">تأكيد الحذف</h3>
              <p className="text-slate-500 text-sm text-center">سيتم حذف الكلية وجميع أقسامها. هل أنت متأكد؟</p>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={handleDeleteFaculty} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-sm">حذف</button>
                <button onClick={() => setDeleteFacultyModal({ show: false, id: null })} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dept Modal */}
      {deleteDeptModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-fade-in-up">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-lg font-black text-[#0f2744]">تأكيد حذف القسم</h3>
              <p className="text-slate-500 text-sm text-center">هل أنت متأكد من حذف هذا القسم؟</p>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={handleDeleteDept} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-sm">حذف</button>
                <button onClick={() => setDeleteDeptModal({ show: false, id: null, facultyId: null })} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#1a3a5c] to-[#e07b39] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#1a3a5c]/50 uppercase tracking-widest">الهيكل الأكاديمي</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">إدارة الكليات والأقسام</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">إضافة الكليات وتعيين الأقسام الخاصة بكل كلية وربطها بباقي مكونات النظام</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:gap-5 mb-6 md:mb-8">
          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-1 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#e07b39]/60 via-[#e07b39] to-[#e07b39]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#e07b39]/5 rounded-full blur-2xl group-hover:bg-[#e07b39]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#e07b39]/20 to-[#e07b39]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#e07b39]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#e07b39]/10 text-[#e07b39] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">نشط</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">{loading ? "..." : faculties.length}</h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">إجمالي الكليات</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#e07b39]/10 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-l from-[#e07b39] to-[#e07b39]/60 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="card-pro relative overflow-hidden p-3 sm:p-4 md:p-6 animate-fade-in-up stagger-2 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0891b2]/60 via-[#0891b2] to-[#0891b2]/60"></div>
            <div className="hidden md:block absolute -top-6 -left-6 w-24 h-24 bg-[#0891b2]/5 rounded-full blur-2xl group-hover:bg-[#0891b2]/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#0891b2]/20 to-[#0891b2]/5 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-[#0891b2]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <span className="text-[8px] md:text-[10px] font-bold bg-[#0891b2]/10 text-[#0891b2] px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg">نشط</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-[#0f2744] tabular-nums">
                {loading ? "..." : faculties.reduce((s, f) => s + (f.departments_count || 0), 0)}
              </h3>
              <p className="text-slate-400 font-semibold text-[11px] md:text-sm mt-1">إجمالي الأقسام</p>
              <div className="w-full h-1 md:h-1.5 mt-2 md:mt-4 bg-[#0891b2]/10 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-l from-[#0891b2] to-[#0891b2]/60 rounded-full"></div>
              </div>
            </div>
          </div>

        </div>

        {/* Main Panel */}
        <div className="card-pro p-4 md:p-6 animate-fade-in-up stagger-4">
          {/* Panel Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h2 className="text-base font-black text-[#0f2744] flex items-center gap-2">
              <svg className="w-5 h-5 text-[#e07b39]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
              قائمة الكليات
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative">
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  className="w-full sm:w-52 pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b39]/30 bg-white"
                  placeholder="بحث عن كلية..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {/* Add Faculty Button */}
              <button
                onClick={() => { setShowFacultyForm((v) => !v); setFFormError(null); }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-[#e07b39] to-[#c8a44e] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                إضافة كلية
              </button>
            </div>
          </div>

          {/* Add Faculty Form */}
          {showFacultyForm && (
            <form onSubmit={handleAddFaculty} className="mb-5 p-4 bg-[#fff8f0] border border-[#e07b39]/20 rounded-2xl animate-fade-in-up">
              <h3 className="text-sm font-black text-[#0f2744] mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#e07b39]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                إضافة كلية جديدة
              </h3>
              {fFormError && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold">{fFormError}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">اسم الكلية *</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b39]/30" placeholder="مثال: كلية الهندسة" value={fName} onChange={(e) => setFName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">رمز الكلية *</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b39]/30" placeholder="مثال: ENG" value={fCode} onChange={(e) => setFCode(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b39]/30" placeholder="وصف اختياري" value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="submit" disabled={fFormLoading} className="px-5 py-2 bg-[#e07b39] hover:bg-[#c8612a] text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60">
                  {fFormLoading ? "جارٍ الحفظ..." : "حفظ الكلية"}
                </button>
                <button type="button" onClick={() => setShowFacultyForm(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">إلغاء</button>
              </div>
            </form>
          )}

          {/* Faculty List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#e07b39]/30 border-t-[#e07b39] rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 font-bold">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
              </div>
              <p className="text-slate-400 font-bold text-sm">لا توجد كليات مسجلة</p>
              <p className="text-slate-300 text-xs mt-1">اضغط على "إضافة كلية" لإنشاء أول كلية</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((faculty) => (
                <div key={faculty.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                  {/* Faculty Row */}
                  {editFacultyId === faculty.id ? (
                    <form onSubmit={handleEditFaculty} className="p-4 bg-[#fff8f0] border-b border-[#e07b39]/20">
                      <h4 className="text-xs font-black text-[#0f2744] mb-3">تعديل بيانات الكلية</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">الاسم *</label>
                          <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b39]/30" value={editFName} onChange={(e) => setEditFName(e.target.value)} required />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">الرمز *</label>
                          <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b39]/30" value={editFCode} onChange={(e) => setEditFCode(e.target.value)} required />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                          <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b39]/30" value={editFDesc} onChange={(e) => setEditFDesc(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button type="submit" disabled={editFLoading} className="px-4 py-2 bg-[#e07b39] hover:bg-[#c8612a] text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-60">
                          {editFLoading ? "جارٍ الحفظ..." : "حفظ"}
                        </button>
                        <button type="button" onClick={() => setEditFacultyId(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">إلغاء</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3 p-4">
                      {/* Icon */}
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-[#e07b39]/20 to-[#e07b39]/5 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-[#e07b39]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-[#0f2744] text-sm md:text-base">{faculty.name}</p>
                          <span className="text-[10px] font-bold bg-[#e07b39]/10 text-[#e07b39] px-2 py-0.5 rounded-lg">{faculty.code}</span>
                        </div>
                        {faculty.description && <p className="text-slate-400 text-xs mt-0.5 truncate">{faculty.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <svg className="w-3 h-3 text-[#0891b2]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            {faculty.departments_count} قسم
                          </span>
                          <span className="text-[10px] text-slate-300">|</span>
                          <span className="text-[10px] text-slate-400">{faculty.id}#</span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => toggleFaculty(faculty.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${expandedFaculty === faculty.id ? "bg-[#0891b2]/10 text-[#0891b2]" : "bg-slate-100 hover:bg-[#0891b2]/10 text-slate-600 hover:text-[#0891b2]"}`}
                        >
                          <svg className={`w-3.5 h-3.5 transition-transform ${expandedFaculty === faculty.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          <span className="hidden sm:inline">الأقسام</span>
                        </button>
                        <button
                          onClick={() => startEditFaculty(faculty)}
                          className="w-8 h-8 rounded-xl bg-[#2563eb]/10 hover:bg-[#2563eb]/20 text-[#2563eb] flex items-center justify-center transition-colors"
                          title="تعديل"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          onClick={() => setDeleteFacultyModal({ show: true, id: faculty.id })}
                          className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                          title="حذف"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Departments Panel */}
                  {expandedFaculty === faculty.id && (
                    <div className="border-t border-slate-100 bg-[#f8fafc] p-4 animate-fade-in-up">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-black text-[#0f2744] flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-[#0891b2]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          أقسام {faculty.name}
                        </h4>
                        <button
                          onClick={() => { setShowDeptForm(showDeptForm === faculty.id ? null : faculty.id); setDFormError(null); setDName(""); setDCode(""); setDDesc(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-l from-[#0891b2] to-[#0369a1] text-white font-bold rounded-xl text-xs hover:opacity-90 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          إضافة قسم
                        </button>
                      </div>

                      {/* Add Dept Form */}
                      {showDeptForm === faculty.id && (
                        <form onSubmit={(e) => handleAddDept(e, faculty.id)} className="mb-3 p-3 bg-white border border-[#0891b2]/20 rounded-xl animate-fade-in-up">
                          {dFormError && <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-bold">{dFormError}</div>}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">اسم القسم *</label>
                              <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0891b2]/30" placeholder="مثال: قسم الحاسوب" value={dName} onChange={(e) => setDName(e.target.value)} required />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">رمز القسم *</label>
                              <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0891b2]/30" placeholder="مثال: CS" value={dCode} onChange={(e) => setDCode(e.target.value)} required />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                              <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0891b2]/30" placeholder="وصف اختياري" value={dDesc} onChange={(e) => setDDesc(e.target.value)} />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button type="submit" disabled={dFormLoading} className="px-4 py-1.5 bg-[#0891b2] hover:bg-[#0369a1] text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-60">
                              {dFormLoading ? "جارٍ الحفظ..." : "حفظ القسم"}
                            </button>
                            <button type="button" onClick={() => setShowDeptForm(null)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs">إلغاء</button>
                          </div>
                        </form>
                      )}

                      {/* Dept List */}
                      {deptLoading === faculty.id ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="w-6 h-6 border-4 border-[#0891b2]/30 border-t-[#0891b2] rounded-full animate-spin"></div>
                        </div>
                      ) : (departmentsMap[faculty.id] || []).length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-slate-400 text-xs font-bold">لا توجد أقسام لهذه الكلية حتى الآن</p>
                          <p className="text-slate-300 text-[10px] mt-0.5">اضغط على "إضافة قسم" لإنشاء قسم جديد</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(departmentsMap[faculty.id] || []).map((dept) => (
                            <div key={dept.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                              {editDeptId === dept.id ? (
                                <form onSubmit={(e) => handleEditDept(e, faculty.id)} className="p-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">الاسم *</label>
                                      <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0891b2]/30" value={editDName} onChange={(e) => setEditDName(e.target.value)} required />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">الرمز *</label>
                                      <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0891b2]/30" value={editDCode} onChange={(e) => setEditDCode(e.target.value)} required />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                                      <input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0891b2]/30" value={editDDesc} onChange={(e) => setEditDDesc(e.target.value)} />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button type="submit" disabled={editDLoading} className="px-4 py-1.5 bg-[#0891b2] text-white font-bold rounded-xl text-xs disabled:opacity-60">
                                      {editDLoading ? "جارٍ الحفظ..." : "حفظ"}
                                    </button>
                                    <button type="button" onClick={() => setEditDeptId(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs">إلغاء</button>
                                  </div>
                                </form>
                              ) : (
                                <div className="flex items-center gap-3 p-3">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0891b2]/20 to-[#0891b2]/5 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-[#0891b2]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-bold text-[#0f2744] text-xs md:text-sm">{dept.name}</p>
                                      <span className="text-[9px] font-bold bg-[#0891b2]/10 text-[#0891b2] px-1.5 py-0.5 rounded-lg">{dept.code}</span>
                                    </div>
                                    {dept.description && <p className="text-slate-400 text-[10px] mt-0.5 truncate">{dept.description}</p>}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                      onClick={() => startEditDept(dept)}
                                      className="w-7 h-7 rounded-xl bg-[#2563eb]/10 hover:bg-[#2563eb]/20 text-[#2563eb] flex items-center justify-center transition-colors"
                                      title="تعديل"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button
                                      onClick={() => setDeleteDeptModal({ show: true, id: dept.id, facultyId: faculty.id })}
                                      className="w-7 h-7 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                                      title="حذف"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
