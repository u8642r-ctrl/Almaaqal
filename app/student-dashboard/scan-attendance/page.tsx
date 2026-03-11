"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useZxing } from "react-zxing";

// مكوّن منفصل للكاميرا حتى لا يتأثر الـ hook بالشروط
function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const scannedRef = useRef(false);
  const { ref } = useZxing({
    onResult(result) {
      if (scannedRef.current) return;
      scannedRef.current = true;
      const text = result.getText();
      if (navigator.vibrate) navigator.vibrate(200);
      onScan(text);
    },
    onError() {
      // أخطاء عادية أثناء البحث - تجاهل
    },
    constraints: {
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">📷 الكاميرا نشطة</h2>
        <button
          onClick={onClose}
          className="bg-red-500/20 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all border border-red-400/30"
        >
          ✕ إغلاق
        </button>
      </div>
      <p className="text-blue-200 text-sm text-center">وجّه الكاميرا نحو الباركود المعروض على شاشة الأستاذ</p>
      <div className="rounded-2xl overflow-hidden bg-black/30 border-2 border-white/20 relative">
        <video ref={ref} className="w-full" style={{ minHeight: 260, objectFit: "cover" }} playsInline muted />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[80%] h-[40%] border-2 border-white/60 rounded-xl relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-center">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-green-300 text-sm font-bold">جاري البحث عن باركود...</span>
      </div>
    </div>
  );
}

export default function StudentScanPage() {
  const { data: session } = useSession();
  const [sessionCode, setSessionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    courseName?: string;
    teacherName?: string;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scannedRef = useRef(false);

  // fetch student data
  useEffect(() => {
    const fetchStudentId = async () => {
      try {
        const res = await fetch("/api/student/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            setStudentId(data.id);
            setProfileLoading(false);
            return;
          }
        }
      } catch { /* ignore */ }

      const userId = (session?.user as any)?.id;
      if (userId) {
        setStudentId(Number(userId));
      }
      setProfileLoading(false);
    };

    if (session) {
      fetchStudentId();
    }
  }, [session]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // direct scan handler
  const handleScanDirect = useCallback(async (code: string) => {
    const scanCode = code.trim();
    if (!scanCode) {
      setToast({ message: "الرجاء إدخال رمز المحاضرة", type: "error" });
      return;
    }
    if (!studentId) {
      setToast({ message: "لم يتم التعرف على حساب الطالب. تأكد من تسجيل الدخول كطالب.", type: "error" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const sessionRes = await fetch(`/api/attendance/sessions?code=${encodeURIComponent(scanCode)}`);
      if (!sessionRes.ok) {
        const err = await sessionRes.json();
        setResult({ success: false, message: err.error || "رمز الجلسة غير صالح أو منتهي الصلاحية" });
        setLoading(false);
        scannedRef.current = false;
        return;
      }

      const sessionData = await sessionRes.json();

      const attendanceRes = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          course_id: sessionData.course_id,
          status: "present",
        }),
      });

      const attendanceData = await attendanceRes.json();

      if (attendanceRes.ok) {
        setResult({
          success: true,
          message: "تم تسجيل حضورك بنجاح! ✅",
          courseName: sessionData.course_name,
          teacherName: sessionData.teacher_name,
        });
        setToast({ message: "تم تسجيل الحضور بنجاح!", type: "success" });
        setSessionCode("");
        setCameraOpen(false);
      } else {
        setResult({
          success: false,
          message: attendanceData.error || "فشل تسجيل الحضور",
          courseName: sessionData.course_name,
        });
        scannedRef.current = false;
      }
    } catch {
      setResult({ success: false, message: "فشل الاتصال بالخادم" });
      scannedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const handleManualSubmit = useCallback(async () => {
    await handleScanDirect(sessionCode);
  }, [sessionCode, handleScanDirect]);

  const startCamera = useCallback(() => {
    setCameraError("");
    setResult(null);
    scannedRef.current = false;
    setCameraOpen(true);
  }, []);

  const stopCamera = useCallback(() => {
    setCameraOpen(false);
    setCameraError("");
    scannedRef.current = false;
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleManualSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6">
        <div className="text-center animate-fade-in-up">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#2563eb] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#2563eb]/60 uppercase tracking-widest">لوحة الطالب</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">تسجيل الحضور</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">امسح باركود المحاضرة بالكاميرا أو أدخل الرمز يدوياً</p>
        </div>

        <div className="bg-gradient-to-br from-[#0f2744] to-[#1a3a5c] rounded-2xl p-6 md:p-10 shadow-2xl text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full -ml-48 -mt-48 opacity-10 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-400 rounded-full mr-[-8rem] mb-[-8rem] opacity-10 blur-3xl"></div>

          <div className="relative z-10 space-y-6">
            {!cameraOpen ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl border-2 border-white/20 mb-2">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black">مسح باركود المحاضرة</h2>
                <p className="text-blue-200 text-sm">افتح الكاميرا وصوّبها على شاشة الأستاذ لمسح الباركود</p>
                <button onClick={startCamera} className="w-full bg-white text-blue-700 py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-50 transition-all active:scale-[0.98]">
                  📷 فتح الكاميرا للمسح
                </button>
                {cameraError && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-4 text-sm text-red-100">
                    ⚠️ {cameraError}
                  </div>
                )}
              </div>
            ) : (
              <BarcodeScanner
                onScan={(code) => {
                  setSessionCode(code);
                  handleScanDirect(code);
                }}
                onClose={stopCamera}
              />
            )}

            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-white/20"></div>
              <span className="text-blue-200 text-xs font-bold">أو أدخل الرمز يدوياً</span>
              <div className="flex-1 h-px bg-white/20"></div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input ref={inputRef} type="text" className="w-full pr-6 pl-6 py-5 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-2xl text-white text-xl font-bold text-center font-mono tracking-widest placeholder:text-blue-200 placeholder:text-base placeholder:tracking-normal placeholder:font-sans outline-none focus:border-white/60 focus:bg-white/15 transition-all" placeholder="مثال: LEC-1-ABC123" value={sessionCode} onChange={(e) => setSessionCode(e.target.value.toUpperCase())} onKeyDown={handleKeyDown} dir="ltr" />
              </div>
              <button onClick={handleManualSubmit} disabled={loading || !sessionCode.trim()} className="w-full bg-white/15 backdrop-blur-sm border-2 border-white/30 text-white py-4 rounded-2xl font-black text-base shadow-xl hover:bg-white/25 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    جاري التسجيل...
                  </span>
                ) : (
                  "📋 تسجيل الحضور بالرمز"
                )}
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div className={`rounded-[2rem] p-8 shadow-lg border-2 text-center space-y-4 transition-all ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="text-6xl">{result.success ? "✅" : "❌"}</div>
            <h3 className={`text-2xl font-black ${result.success ? "text-green-700" : "text-red-700"}`}>{result.message}</h3>
            {result.courseName && (
              <div className="space-y-1">
                <p className="text-slate-600 font-bold">المادة: <span className="text-slate-900">{result.courseName}</span></p>
                {result.teacherName && (<p className="text-slate-600 font-bold">الأستاذ: <span className="text-slate-900">{result.teacherName}</span></p>)}
              </div>
            )}
            {result.success && (<p className="text-green-600 text-sm font-bold">📅 {new Date().toLocaleDateString("ar-IQ")} - ⏰ {new Date().toLocaleTimeString("ar-IQ")}</p>)}
          </div>
        )}

        <div className="card-pro p-8">
          <h3 className="text-lg font-black text-slate-900 mb-4">📖 كيفية تسجيل الحضور</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-black text-sm shrink-0">1</div>
              <p className="text-slate-600 font-medium">يقوم الأستاذ بإنشاء جلسة محاضرة وعرض الباركود على الشاشة</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-black text-sm shrink-0">2</div>
              <p className="text-slate-600 font-medium">اضغط &quot;فتح الكاميرا&quot; ووجّه كاميرا هاتفك نحو شاشة الأستاذ</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-black text-sm shrink-0">3</div>
              <p className="text-slate-600 font-medium">سيتم قراءة الباركود وتسجيل حضورك تلقائياً خلال ثوان</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-black text-sm shrink-0">💡</div>
              <p className="text-slate-600 font-medium">يمكنك أيضاً إدخال رمز المحاضرة يدوياً إذا لم تتمكن من مسح الباركود</p>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-6 right-6 md:left-auto md:right-auto md:w-auto px-6 py-4 rounded-2xl shadow-2xl text-white font-bold z-[70] text-center ${toast.type === "success" ? "bg-slate-900" : "bg-red-500"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
