"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function EditStudentProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    stage: "",
    accessible_stages: [] as string[],
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // حالات الكليات والأقسام
  const [faculties, setFaculties] = useState<{id: number; name: string}[]>([]);
  const [allDepartments, setAllDepartments] = useState<{id: number; name: string; faculty_id: number}[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");

  useEffect(() => {
    // جلب الكليات والأقسام
    fetch('/api/faculties').then(r => r.json()).then(d => setFaculties(Array.isArray(d) ? d : [])).catch(console.error);
    fetch('/api/departments').then(r => r.json()).then(d => setAllDepartments(Array.isArray(d) ? d : [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (!session?.user?.email) return;

    fetch("/api/student/profile")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setProfile(data);
          setFormData({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            department: data.department || "",
            stage: data.stage || "",
            accessible_stages: Array.isArray(data.accessible_stages) ? data.accessible_stages : (data.stage ? [data.stage] : []),
          });

          // تحديد الكلية تلقائياً بناءً على القسم الحالي
          if (data.department) {
            const dept = allDepartments.find(d => d.name === data.department);
            setSelectedFacultyId(dept ? String(dept.faculty_id) : "");
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session, allDepartments]);

  const handleAccessibleStageToggle = (stage: string) => {
    setFormData((prev) => {
      const newAccessibleStages = prev.accessible_stages.includes(stage)
        ? prev.accessible_stages.filter(s => s !== stage)
        : [...prev.accessible_stages, stage];

      return {
        ...prev,
        accessible_stages: newAccessibleStages,
      };
    });
    setError("");
    setSuccess("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          department: formData.department,
          stage: formData.stage,
          accessible_stages: formData.accessible_stages
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setProfile(data);
        setSuccess("تم تحديث البيانات بنجاح!");
      } else {
        setError(data.error || "حدث خطأ أثناء التحديث");
      }
    } catch (err) {
      setError("فشل الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-[#2563eb]/20 border-t-[#2563eb] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-semibold text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center hover:bg-slate-50 transition-all"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
                <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">تعديل البيانات</p>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">
                معلوماتي الشخصية
              </h1>
            </div>
          </div>
          <p className="text-slate-500 text-xs md:text-sm mt-1">عدّل بيانات حسابك</p>
        </div>

        {/* Form Card */}
        <div className="card-pro p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm font-semibold">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-600 text-sm font-semibold">
                {success}
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-sm font-bold text-[#0f2744] mb-2">
                الاسم الكامل *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none transition-all text-[#0f2744] font-semibold"
                placeholder="أدخل اسمك الكامل"
              />
            </div>

            {/* Email Field - Pre-filled and read-only */}
            <div>
              <label className="block text-sm font-bold text-[#0f2744] mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formData.email}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                placeholder="البريد الإلكتروني"
              />
              <p className="text-xs text-slate-400 mt-1">
                لا يمكن تعديل البريد الإلكتروني من هنا
              </p>
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-bold text-[#0f2744] mb-2">
                رقم الهاتف
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none transition-all text-[#0f2744] font-semibold"
                placeholder="رقم هاتفك (اختياري)"
                dir="ltr"
              />
            </div>

            {/* الكلية والقسم */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#0f2744] mb-2">
                  الكلية
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none transition-all text-[#0f2744] font-semibold"
                  value={selectedFacultyId}
                  onChange={(e) => {
                    setSelectedFacultyId(e.target.value);
                    setFormData(prev => ({ ...prev, department: "" }));
                  }}
                >
                  <option value="">-- اختر الكلية --</option>
                  {faculties.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#0f2744] mb-2">
                  القسم
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none transition-all text-[#0f2744] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={!selectedFacultyId}
                >
                  <option value="">-- اختر القسم --</option>
                  {allDepartments.filter(d => String(d.faculty_id) === selectedFacultyId).map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* المرحلة الدراسية */}
            <div>
              <label className="block text-sm font-bold text-[#0f2744] mb-2">
                المرحلة الدراسية
              </label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none transition-all text-[#0f2744] font-semibold"
                name="stage"
                value={formData.stage}
                onChange={handleChange}
              >
                <option value="">-- اختر المرحلة --</option>
                <option value="1">المرحلة الأولى</option>
                <option value="2">المرحلة الثانية</option>
                <option value="3">المرحلة الثالثة</option>
                <option value="4">المرحلة الرابعة</option>
              </select>
            </div>

            {/* المراحل المتاحة للوصول */}
            <div>
              <label className="block text-sm font-bold text-[#0f2744] mb-3">
                المراحل المتاحة للوصول
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["1", "2", "3", "4"].map((stageOption) => (
                  <label
                    key={stageOption}
                    className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={formData.accessible_stages.includes(stageOption)}
                      onChange={() => handleAccessibleStageToggle(stageOption)}
                      className="w-4 h-4 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb] focus:ring-2"
                    />
                    <span className="text-sm font-semibold text-[#0f2744]">
                      المرحلة {stageOption}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                اختر المراحل التي يمكن للطالب الوصول إليها (مفيد لطلاب المرحلة الرابعة للوصول إلى المراحل السابقة)
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-l from-[#2563eb] to-[#1d4ed8] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-[#0f2744] hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>

        {/* معلومات إضافية */}
        <div className="card-pro p-6">
          <h3 className="text-sm font-bold text-[#0f2744] mb-3">ملاحظات مهمة:</h3>
          <ul className="space-y-2 text-xs text-slate-600">
            <li>• تأكد من صحة بياناتك قبل الحفظ</li>
            <li>• سيتم تحديث هذه البيانات في جميع أنحاء النظام</li>
            <li>• المرحلة والقسم مهمان لتسجيلك في المواد المناسبة</li>
            <li>• لا يمكن تعديل البريد الإلكتروني من هذه الصفحة</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
