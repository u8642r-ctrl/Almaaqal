"use client";

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError("فشل تسجيل الدخول: يرجى التحقق من البريد الإلكتروني وكلمة المرور");
      setLoading(false);
    } else {
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role;
      
      if (role === 'student') {
        router.push("/student-dashboard");
      } else if (role === 'teacher') {
        router.push("/teacher-dashboard");
      } else {
        router.push("/admin-dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-pattern relative overflow-hidden" dir="rtl">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#1a3a5c]/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#c8a44e]/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[#1a3a5c]/3 to-[#c8a44e]/3 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-[440px] relative z-10 animate-fade-in-up">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_80px_rgba(15,39,68,0.12)] border border-white/60 overflow-hidden">
          
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-[#0f2744] via-[#1a3a5c] to-[#0f2744] p-10 text-center overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c8a44e]/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#c8a44e]/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-white/10 backdrop-blur-sm border-2 border-[#c8a44e]/30 flex items-center justify-center p-2 animate-pulse-glow">
                <Image 
                  src="/logo.webp" 
                  alt="شعار جامعة المعقل" 
                  width={80} 
                  height={80} 
                  className="rounded-full object-contain"
                  priority
                />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">جامعة المعقل</h1>
              <p className="text-[#c8a44e] text-sm font-semibold mt-2">Al-Maaqal University</p>
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#c8a44e] to-transparent mx-auto mt-4"></div>
              <p className="text-blue-200/70 text-xs mt-3">النظام الإلكتروني لإدارة الشؤون الأكاديمية</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {error && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium animate-fade-in">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 pr-1">البريد الإلكتروني</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </span>
                <input 
                  type="email" 
                  required
                  className="w-full pr-12 pl-4 py-3.5 bg-[#f0f4f8] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]/40 focus:bg-white outline-none transition-all font-medium text-slate-800 text-sm"
                  placeholder="user@almaqal.edu.iq"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 pr-1">كلمة المرور</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </span>
                <input 
                  type="password" 
                  required
                  className="w-full pr-12 pl-4 py-3.5 bg-[#f0f4f8] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]/40 focus:bg-white outline-none transition-all font-medium text-slate-800 text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              disabled={loading} 
              className="w-full bg-gradient-to-l from-[#0f2744] to-[#1a3a5c] text-white py-3.5 rounded-xl font-bold hover:from-[#1a3a5c] hover:to-[#0f2744] transition-all shadow-lg shadow-[#0f2744]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-l from-[#c8a44e]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
              <span className="relative">{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
            </button>

            <div className="pt-5 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 font-semibold text-center mb-3">بيانات الدخول التجريبية</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-[#c8a44e]/30 hover:bg-[#c8a44e]/5 transition-all cursor-pointer group" onClick={() => {setEmail('admin@almaqal.edu.iq'); setPassword('admin2001'); setError('')}}>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#1a3a5c]/10 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-[#1a3a5c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </span>
                    <span className="font-bold text-slate-700">المدير</span>
                  </div>
                  <div className="text-left" dir="ltr">
                    <div className="font-mono text-slate-500 font-semibold text-[11px]">admin@almaqal.edu.iq</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-[#2563eb]/20 hover:bg-[#2563eb]/5 transition-all cursor-pointer group" onClick={() => {setEmail('student@almaqal.edu.iq'); setPassword('123456'); setError('')}}>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                    </span>
                    <span className="font-bold text-slate-700">الطالب</span>
                  </div>
                  <div className="text-left" dir="ltr">
                    <div className="font-mono text-slate-500 font-semibold text-[11px]">student@almaqal.edu.iq</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-[#059669]/20 hover:bg-[#059669]/5 transition-all cursor-pointer group" onClick={() => {setEmail('teacher@almaqal.edu.iq'); setPassword('123456'); setError('')}}>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#059669]/10 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    </span>
                    <span className="font-bold text-slate-700">التدريسي</span>
                  </div>
                  <div className="text-left" dir="ltr">
                    <div className="font-mono text-slate-500 font-semibold text-[11px]">teacher@almaqal.edu.iq</div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-[10px] text-slate-300">&copy; {new Date().getFullYear()} جامعة المعقل - جميع الحقوق محفوظة</p>
          </div>
        </div>
      </div>
    </div>
  );
}