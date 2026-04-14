"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { generateAttendancePdf } from "@/lib/generateGradesPdf";

type Course = { id: number; name: string; code: string };
type LectureSession = {
  id: number;
  course_id: number;
  session_code: string;
  course_name: string;
  course_code: string;
  date: string;
  expires_at: string;
  is_active: boolean;
};
type AttendanceRecord = {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  status: string;
  recorded_at: string;
  date?: string;
};

export default function TeacherAttendancePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState("");
  const [activeSession, setActiveSession] = useState<LectureSession | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [duration, setDuration] = useState(90);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  // Scanner state
  const [attendanceMode, setAttendanceMode] = useState<'qr' | 'scan'>('qr');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; studentName?: string } | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanProcessing, setScanProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<any>(null);
  const cooldownRef = useRef<boolean>(false);
  const lastScannedRef = useRef<string>('');

  // History state
  const [historyCourse, setHistoryCourse] = useState<number | null>(null);
  const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearched, setHistorySearched] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        let res = await fetch("/api/teacher/courses");
        if (res.ok) {
          const data = await res.json();
          setCourses(Array.isArray(data) ? data : []);
        } else {
          res = await fetch("/api/courses");
          if (res.ok) {
            const data = await res.json();
            setCourses(Array.isArray(data) ? data : []);
          }
        }
      } catch { console.error("فشل جلب المواد"); }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!activeSession) { setTimeLeft(""); return; }
    const expiresTime = new Date(activeSession.expires_at).getTime();
    const tick = () => {
      const remaining = expiresTime - Date.now();
      if (remaining <= 0) { setTimeLeft("انتهت الصلاحية"); setActiveSession(null); return true; }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
      return false;
    };
    if (tick()) return;
    const interval = setInterval(() => { if (tick()) clearInterval(interval); }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchRecords = useCallback(async () => {
    if (!selectedCourse) return;
    const today = new Date().toISOString().split("T")[0];
    try {
      const res = await fetch(`/api/attendance?course_id=${selectedCourse}&date=${today}`);
      if (res.ok) { const data = await res.json(); setTodayRecords(Array.isArray(data) ? data : []); }
    } catch { /* ignore */ }
  }, [selectedCourse]);

  useEffect(() => {
    if (!activeSession) return;
    fetchRecords();
    const interval = setInterval(fetchRecords, 5000);
    return () => clearInterval(interval);
  }, [activeSession, fetchRecords]);

  useEffect(() => {
    return () => { if (readerRef.current) { try { readerRef.current.reset(); } catch {} readerRef.current = null; } };
  }, []);

  useEffect(() => {
    if (attendanceMode !== 'scan' || !activeSession) {
      if (readerRef.current) { try { readerRef.current.reset(); } catch {} readerRef.current = null; }
      setIsScanning(false);
    }
  }, [attendanceMode, activeSession]);

  useEffect(() => {
    if (scanResult) { const timer = setTimeout(() => setScanResult(null), 3500); return () => clearTimeout(timer); }
  }, [scanResult]);

  useEffect(() => {
    if (!selectedCourse) return;
    const checkActive = async () => {
      try {
        const res = await fetch(`/api/attendance/sessions?course_id=${selectedCourse}`);
        if (res.ok) {
          const data = await res.json();
          const active = Array.isArray(data) ? data.find((s: LectureSession) => s.is_active && new Date(s.expires_at) > new Date()) : null;
          setActiveSession(active || null);
        }
      } catch { /* ignore */ }
    };
    checkActive();
    fetchRecords();
  }, [selectedCourse, fetchRecords]);

  // Fetch history
  const fetchHistory = async () => {
    if (!historyCourse) return;
    setHistoryLoading(true);
    setHistorySearched(true);
    try {
      let url = `/api/attendance?course_id=${historyCourse}`;
      if (historyDate) url += `&date=${historyDate}`;
      const res = await fetch(url);
      if (res.ok) { const data = await res.json(); setHistoryRecords(Array.isArray(data) ? data : []); }
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  };

  // Download PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const downloadPdf = async () => {
    if (historyRecords.length === 0) return;
    const courseName = courses.find(c => c.id === historyCourse)?.name || "المادة";
    setIsGeneratingPdf(true);
    try {
      await generateAttendancePdf({
        courseName,
        date: historyDate,
        records: historyRecords.map(r => ({
          student_name: r.student_name,
          status: r.status,
          recorded_at: r.recorded_at,
        })),
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const startSession = async () => {
    if (!selectedCourse) return;
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: selectedCourse, duration_minutes: duration }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
        setToast({ message: "تم إنشاء جلسة المحاضرة بنجاح!", type: "success" });
      } else {
        const data = await res.json();
        setToast({ message: data.error || "فشل إنشاء الجلسة", type: "error" });
      }
    } catch { setToast({ message: "فشل الاتصال بالخادم", type: "error" }); }
    finally { setLoading(false); }
  };

  const endSession = async () => {
    if (!activeSession) return;
    if (readerRef.current) { try { readerRef.current.reset(); } catch {} readerRef.current = null; }
    setIsScanning(false);
    try {
      await fetch(`/api/attendance/sessions?id=${activeSession.id}`, { method: "DELETE" });
      setActiveSession(null);
      setAttendanceMode('qr');
      setToast({ message: "تم إنهاء الجلسة", type: "success" });
    } catch { setToast({ message: "فشل إنهاء الجلسة", type: "error" }); }
  };

  const startScanner = async () => {
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setIsScanning(true);
      lastScannedRef.current = '';
      cooldownRef.current = false;
      await reader.decodeFromVideoDevice(null, videoRef.current!, (result, _error) => {
        if (result && !cooldownRef.current) {
          const barcodeValue = result.getText();
          if (barcodeValue !== lastScannedRef.current) {
            lastScannedRef.current = barcodeValue;
            cooldownRef.current = true;
            handleBarcodeScanned(barcodeValue);
            setTimeout(() => { cooldownRef.current = false; lastScannedRef.current = ''; }, 3000);
          }
        }
      });
    } catch (err) {
      console.error('Scanner error:', err);
      setToast({ message: 'فشل تشغيل الكاميرا - تأكد من إعطاء صلاحية الكاميرا', type: 'error' });
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (readerRef.current) { try { readerRef.current.reset(); } catch {} readerRef.current = null; }
    setIsScanning(false);
  };

  const handleBarcodeScanned = async (barcodeValue: string) => {
    const match = barcodeValue.match(/^STU-(\d+)$/i);
    if (!match) { setScanResult({ success: false, message: `باركود غير صالح: ${barcodeValue}` }); return; }
    const studentId = parseInt(match[1]);
    if (todayRecords.some(r => r.student_id === studentId)) {
      const existing = todayRecords.find(r => r.student_id === studentId);
      setScanResult({ success: false, message: `${existing?.student_name || 'الطالب'} مسجّل حضوره مسبقاً`, studentName: existing?.student_name });
      return;
    }
    setScanProcessing(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, course_id: activeSession!.course_id }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult({ success: true, message: `تم تسجيل حضور ${data.student_name || 'الطالب'}`, studentName: data.student_name });
        fetchRecords();
      } else {
        const data = await res.json();
        setScanResult({ success: false, message: data.error || 'فشل تسجيل الحضور' });
      }
    } catch { setScanResult({ success: false, message: 'فشل الاتصال بالخادم' }); }
    finally { setScanProcessing(false); }
  };

  const handleManualSubmit = () => {
    const value = manualBarcode.trim();
    if (!value) return;
    const barcode = value.match(/^\d+$/) ? `STU-${value}` : value;
    handleBarcodeScanned(barcode);
    setManualBarcode('');
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden" dir="rtl">
      <div className="w-full max-w-5xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#059669] to-[#c8a44e] rounded-full"></div>
            <p className="text-[10px] md:text-xs font-bold text-[#059669]/60 uppercase tracking-widest">لوحة الأستاذ</p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">تسجيل الحضور</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">أنشئ جلسة محاضرة واستخدم رمز QR أو امسح بطاقات الباركود للطلاب لتسجيل حضورهم</p>
        </div>

        {/* Course Selection */}
        <div className="card-pro p-4 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500">اختر المادة</label>
              <select
                className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500/20 text-sm"
                value={selectedCourse || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedCourse(id || null);
                  setActiveSession(null);
                  const c = courses.find((co) => co.id === id);
                  setSelectedCourseName(c?.name || "");
                }}
              >
                <option value="">-- اختر مادة --</option>
                {courses.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            {!activeSession && selectedCourse && (
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500">مدة الجلسة (دقيقة)</label>
                <select
                  className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-teal-500/20 text-sm"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  <option value={30}>30 دقيقة</option>
                  <option value={45}>45 دقيقة</option>
                  <option value={60}>60 دقيقة</option>
                  <option value={90}>90 دقيقة</option>
                  <option value={120}>120 دقيقة</option>
                </select>
              </div>
            )}
          </div>
          {selectedCourse && !activeSession && (
            <button
              onClick={startSession}
              disabled={loading}
              className="mt-4 md:mt-6 w-full bg-teal-600 hover:bg-teal-700 text-white py-4 md:py-5 rounded-2xl font-black text-base md:text-lg shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "جاري الإنشاء..." : "🚀 بدء المحاضرة وإنشاء باركود الحضور"}
            </button>
          )}
        </div>

        {/* Active Session */}
        {activeSession && (
          <>
            <div className="bg-gradient-to-br from-[#0f2744] to-[#1a3a5c] rounded-2xl p-4 sm:p-6 md:p-10 shadow-2xl text-white relative overflow-hidden">
              <div className="hidden md:block absolute top-0 left-0 w-96 h-96 bg-teal-400 rounded-full -ml-48 -mt-48 opacity-10 blur-3xl"></div>
              <div className="hidden md:block absolute bottom-0 right-0 w-64 h-64 bg-emerald-400 rounded-full mr-[-8rem] mb-[-8rem] opacity-10 blur-3xl"></div>
              <div className="relative z-10 space-y-6">
                {/* Tab Bar */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-1.5 flex gap-2 max-w-md mx-auto">
                  <button onClick={() => setAttendanceMode('qr')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${attendanceMode === 'qr' ? 'bg-white text-[#0f2744] shadow-lg' : 'text-white/60 hover:text-white/80'}`}>📱 عرض رمز QR</button>
                  <button onClick={() => setAttendanceMode('scan')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${attendanceMode === 'scan' ? 'bg-white text-[#0f2744] shadow-lg' : 'text-white/60 hover:text-white/80'}`}>📷 مسح بطاقة الطالب</button>
                </div>

                {/* QR Mode */}
                {attendanceMode === 'qr' && (
                  <div className="text-center space-y-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-black">محاضرة {selectedCourseName}</h2>
                      <p className="text-teal-200 mt-2 text-xs md:text-sm">اعرض هذا الباركود على الشاشة ليقوم الطلاب بمسحه من حساباتهم</p>
                    </div>
                    <div className="bg-white rounded-3xl p-3 md:p-8 shadow-2xl w-full max-w-[260px] sm:max-w-sm mx-auto">
                      <QRCodeSVG value={activeSession.session_code} size={280} level="H" includeMargin={true} bgColor="#ffffff" fgColor="#000000" style={{ width: '100%', height: 'auto', display: 'block' }} />
                      <div className="mt-2 md:mt-3 text-center font-mono font-bold text-slate-700 text-sm md:text-lg tracking-widest">{activeSession.session_code}</div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-teal-200 text-sm">أو يمكن للطالب إدخال الرمز يدوياً:</p>
                      <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-2xl py-3 px-4 md:py-4 md:px-8 inline-block">
                        <span className="text-2xl md:text-4xl font-black font-mono tracking-[0.15em] md:tracking-[0.3em] text-white">{activeSession.session_code}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scan Mode */}
                {attendanceMode === 'scan' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-black">محاضرة {selectedCourseName}</h2>
                      <p className="text-teal-200 mt-2 text-xs md:text-sm">امسح بطاقة الباركود الخاصة بالطالب لتسجيل حضوره</p>
                    </div>
                    {scanResult && (
                      <div className={`p-4 rounded-2xl font-bold text-center text-lg animate-fade-in-up ${scanResult.success ? 'bg-green-500/20 border-2 border-green-400/40 text-green-200' : 'bg-amber-500/20 border-2 border-amber-400/40 text-amber-200'}`}>
                        {scanResult.success ? '✅' : '⚠️'} {scanResult.message}
                      </div>
                    )}
                    <div className="relative bg-black/40 rounded-2xl overflow-hidden max-w-lg mx-auto" style={{ aspectRatio: '4/3' }}>
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                      {!isScanning && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60">
                          <div className="text-6xl">📷</div>
                          <button onClick={startScanner} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98]">تشغيل الكاميرا</button>
                        </div>
                      )}
                      {isScanning && (
                        <>
                          <div className="absolute inset-4 border-2 border-teal-400/60 rounded-xl pointer-events-none">
                            <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse" />
                          </div>
                          <div className="absolute top-3 left-3 bg-green-500 w-3 h-3 rounded-full animate-pulse" />
                          <button onClick={stopScanner} className="absolute bottom-3 left-3 bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">⏹ إيقاف</button>
                        </>
                      )}
                      {scanProcessing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-bold animate-pulse">جاري التسجيل...</div>
                        </div>
                      )}
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 max-w-lg mx-auto">
                      <p className="text-teal-200 text-sm font-bold mb-3 text-center">أو أدخل رقم الطالب يدوياً</p>
                      <div className="flex gap-3" dir="ltr">
                        <input type="text" value={manualBarcode} onChange={(e) => setManualBarcode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()} placeholder="مثال: 5 أو STU-5" className="flex-1 px-4 py-3 bg-white/20 text-white placeholder-white/40 rounded-xl outline-none font-bold text-center font-mono" />
                        <button onClick={handleManualSubmit} disabled={!manualBarcode.trim() || scanProcessing} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 active:scale-[0.98]">تسجيل</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Session Info + End */}
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-8 text-xs md:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-200">⏰ الوقت المتبقي:</span>
                    <span className={`font-black text-lg ${timeLeft === "انتهت الصلاحية" ? "text-red-300" : "text-white"}`}>{timeLeft}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-teal-200">👥 عدد الحاضرين:</span>
                    <span className="font-black text-lg text-white">{todayRecords.filter(r => r.status === "present").length}</span>
                  </div>
                </div>
                <div className="text-center">
                  <button onClick={endSession} className="bg-red-500/20 hover:bg-red-500 text-white px-8 py-3 rounded-2xl font-bold transition-all border border-red-400/30">⬛ إنهاء المحاضرة</button>
                </div>
              </div>
            </div>

            {/* Live attendance list */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="p-4 md:p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900">الطلاب الحاضرون</h2>
                  <p className="text-xs md:text-sm text-slate-400 mt-1">{todayRecords.length} طالب سجّل حضوره</p>
                </div>
                <button onClick={fetchRecords} className="text-teal-600 bg-teal-50 px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-100 transition-colors">🔄 تحديث</button>
              </div>
              {todayRecords.length === 0 ? (
                <div className="py-20 text-center text-slate-300 font-medium">
                  <div className="text-5xl mb-4">⏳</div>
                  في انتظار تسجيل الطلاب لحضورهم...
                </div>
              ) : (
                <>
                  <table className="w-full text-right hidden md:table">
                    <thead>
                      <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                        <th className="p-6">#</th>
                        <th className="p-6">الطالب</th>
                        <th className="p-6">الحالة</th>
                        <th className="p-6">وقت التسجيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {todayRecords.map((record, idx) => (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-all">
                          <td className="p-6 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-6 font-bold text-slate-800">{record.student_name}</td>
                          <td className="p-6"><span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-bold">حاضر ✓</span></td>
                          <td className="p-6 text-sm text-slate-500">{new Date(record.recorded_at).toLocaleTimeString("ar-IQ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="md:hidden divide-y divide-slate-100">
                    {todayRecords.map((record, idx) => (
                      <div key={record.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-400 text-xs font-bold">#{idx + 1}</span>
                          <span className="font-bold text-slate-800 text-sm truncate">{record.student_name}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">حاضر ✓</span>
                          <span className="text-xs text-slate-400">{new Date(record.recorded_at).toLocaleTimeString("ar-IQ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════
            سجل الحضور التاريخي
        ══════════════════════════════════════════ */}
        <div className="card-pro overflow-hidden animate-fade-in-up">

          {/* Section Header */}
          <div className="bg-gradient-to-l from-[#0f2744] to-[#1a3a5c] p-4 md:p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c8a44e]/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#c8a44e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-white">سجل الحضور</h2>
              <p className="text-white/50 text-xs mt-0.5">عرض وتنزيل سجلات الحضور حسب المادة والتاريخ</p>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-4">

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">المادة</label>
                <select
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#0f2744]/20 text-sm"
                  value={historyCourse || ""}
                  onChange={(e) => setHistoryCourse(Number(e.target.value) || null)}
                >
                  <option value="">-- اختر مادة --</option>
                  {courses.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">التاريخ</label>
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#0f2744]/20 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchHistory}
                  disabled={!historyCourse || historyLoading}
                  className="w-full py-3 bg-[#0f2744] hover:bg-[#1a3a5c] text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {historyLoading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  }
                  عرض السجل
                </button>
              </div>
            </div>

            {/* Results */}
            {historyRecords.length > 0 && (
              <div className="space-y-3">
                {/* Summary bar + Download button */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-600">إجمالي الحاضرين:</span>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-black">
                      {historyRecords.filter(r => r.status === 'present').length} طالب
                    </span>
                  </div>
                  <button
                    onClick={downloadPdf}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0f2744] hover:bg-[#1a3a5c] text-white font-bold rounded-xl text-sm transition-all hover:shadow-md active:scale-95 disabled:opacity-60"
                  >
                    {isGeneratingPdf ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {isGeneratingPdf ? "جاري الإنشاء..." : "تنزيل PDF"}
                  </button>
                </div>

                {/* Desktop Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-right hidden md:table">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider border-b border-slate-100">
                        <th className="px-4 py-3 w-12">#</th>
                        <th className="px-4 py-3">اسم الطالب</th>
                        <th className="px-4 py-3">الحالة</th>
                        <th className="px-4 py-3">وقت التسجيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {historyRecords.map((record, idx) => (
                        <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-400 font-bold text-sm">{idx + 1}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{record.student_name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${record.status === 'present' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              {record.status === 'present' ? 'حاضر ✓' : 'غائب'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{new Date(record.recorded_at).toLocaleTimeString("ar-IQ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {historyRecords.map((record, idx) => (
                      <div key={record.id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-400 text-xs font-bold flex-shrink-0">#{idx + 1}</span>
                          <span className="font-bold text-slate-800 text-sm truncate">{record.student_name}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0 mr-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${record.status === 'present' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {record.status === 'present' ? 'حاضر ✓' : 'غائب'}
                          </span>
                          <span className="text-[10px] text-slate-400">{new Date(record.recorded_at).toLocaleTimeString("ar-IQ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Empty state after search */}
            {historySearched && historyRecords.length === 0 && !historyLoading && (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3 opacity-30">📋</div>
                <p className="text-slate-400 font-bold text-sm">لا توجد سجلات حضور لهذه المادة في التاريخ المحدد</p>
              </div>
            )}

            {/* Placeholder before search */}
            {!historySearched && (
              <div className="py-8 text-center">
                <p className="text-slate-300 font-bold text-sm">اختر المادة والتاريخ ثم اضغط &quot;عرض السجل&quot;</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:bottom-6 px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl text-white font-bold text-sm md:text-base z-[70] ${toast.type === "success" ? "bg-slate-900" : "bg-red-500"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
