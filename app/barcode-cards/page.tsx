"use client";

import React, { useEffect, useState, useRef } from "react";
import JsBarcode from "jsbarcode";

type Student = {
  id: number;
  name: string;
  email: string;
  department: string;
};

// مكون باركود حقيقي باستخدام JsBarcode (Code 128)
function BarcodeCanvas({ value, width = 200, height = 60 }: { value: string; width?: number; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 1.5,
        height: height - 20,
        displayValue: true,
        fontSize: 12,
        font: "monospace",
        fontOptions: "bold",
        textMargin: 4,
        margin: 5,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch (err) {
      console.error("Barcode generation error:", err);
    }
  }, [value, width, height]);

  return <svg ref={svgRef} className="mx-auto" style={{ maxWidth: width }} />;
}

export default function BarcodeCardsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => {
        setStudents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStudent = (id: number) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudents(newSet);
  };

  const selectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const studentsToPrint = students.filter((s) => selectedStudents.has(s.id));

  const handlePrint = () => {
    if (studentsToPrint.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const cardsHtml = studentsToPrint.map((student) => `
      <div class="card">
        <div class="uni-name">جامعة المعقل</div>
        <div class="card-title">بطاقة تسجيل الحضور</div>
        <div class="student-name">${student.name}</div>
        <div class="student-dept">${student.department || "—"}</div>
        <svg id="barcode-${student.id}" class="barcode-svg"></svg>
      </div>
    `).join("");

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>بطاقات الباركود - جامعة المعقل</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; direction: rtl; background: white; }
            .cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .card { border: 2px solid #334155; border-radius: 16px; padding: 16px; text-align: center; break-inside: avoid; page-break-inside: avoid; background: white; }
            .uni-name { font-size: 13px; font-weight: 900; color: #d97706; margin-bottom: 3px; }
            .card-title { font-size: 9px; color: #64748b; margin-bottom: 10px; }
            .student-name { font-size: 15px; font-weight: 900; color: #1e293b; margin-bottom: 3px; }
            .student-dept { font-size: 10px; color: #64748b; margin-bottom: 10px; }
            .barcode-svg { max-width: 100%; display: block; margin: 0 auto; }
            @media print {
              body { padding: 10px; }
              .cards-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
              .card { break-inside: avoid; }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"><\/script>
        </head>
        <body>
          <div class="cards-grid">${cardsHtml}</div>
          <script>
            window.onload = function() {
              ${studentsToPrint.map((s) => `
                try { JsBarcode('#barcode-${s.id}', 'STU-${s.id}', { format:'CODE128', width:1.8, height:50, displayValue:true, fontSize:11, fontOptions:'bold', textMargin:3, margin:4, background:'#ffffff', lineColor:'#000000' }); } catch(e){}
              `).join("")}
              setTimeout(function(){ window.print(); window.close(); }, 600);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] bg-pattern overflow-x-hidden p-3 sm:p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in-up">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 md:h-6 bg-gradient-to-b from-[#c8a44e] to-[#1a3a5c] rounded-full"></div>
              <p className="text-[10px] md:text-xs font-bold text-[#c8a44e]/70 uppercase tracking-widest">إدارة النظام</p>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#0f2744] tracking-tight">بطاقات باركود الطلاب</h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">إنشاء وطباعة بطاقات باركود للطلاب — يستخدمها الأستاذ لمسح حضور الطلاب من صفحة تسجيل الحضور</p>
          </div>
          {selectedStudents.size > 0 && (
            <button
              onClick={handlePrint}
              className="w-full md:w-auto flex items-center justify-center gap-3 bg-gradient-to-l from-[#0f2744] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#0f2744] text-white px-4 md:px-7 py-2.5 md:py-3.5 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] text-sm md:text-base"
            >
              🖨️ طباعة {selectedStudents.size} بطاقة
            </button>
          )}
        </div>

        {/* Usage Info */}
        <div className="card-pro p-4 md:p-6 bg-gradient-to-l from-teal-50 to-white border-r-4 border-teal-500">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">💡</div>
            <div>
              <h3 className="font-black text-slate-800 mb-1">كيف تعمل بطاقات الباركود؟</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                اطبع بطاقات الباركود ووزّعها على الطلاب. عند تسجيل الحضور، يفتح الأستاذ صفحة 
                <span className="font-bold text-teal-700"> تسجيل الحضور </span>
                ويختار وضع <span className="font-bold text-teal-700">"مسح بطاقة الطالب"</span> ثم يمسح بطاقة كل طالب بالكاميرا لتسجيل حضوره تلقائياً.
              </p>
            </div>
          </div>
        </div>

        {/* Selection Panel */}
        <div className="card-pro overflow-hidden">
          <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-96">
              <span className="absolute inset-y-0 right-4 flex items-center text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="بحث عن طالب..."
                className="w-full pr-12 pl-4 md:pl-6 py-3 md:py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-amber-500/20 text-sm placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={selectAll}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors"
            >
              {selectedStudents.size === filteredStudents.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 font-bold">جاري التحميل...</div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedStudents.has(student.id)
                      ? "border-amber-500 bg-amber-50 shadow-md"
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        selectedStudents.has(student.id)
                          ? "bg-amber-500 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {selectedStudents.has(student.id) ? "✓" : student.id}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                      <p className="text-xs text-slate-400">STU-{student.id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        {studentsToPrint.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900">معاينة البطاقات</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentsToPrint.map((student) => (
                <div
                  key={student.id}
                  className="bg-white border-2 border-slate-200 rounded-[1.5rem] p-6 text-center hover:shadow-lg transition-shadow"
                >
                  <div className="text-[#c8a44e] font-black text-sm mb-1">جامعة المعقل</div>
                  <div className="text-[10px] text-slate-400 mb-4">بطاقة تسجيل الحضور</div>
                  <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center text-2xl">
                    🎓
                  </div>
                  <div className="font-black text-lg text-slate-900 mb-1">{student.name}</div>
                  <div className="text-xs text-slate-400 mb-4">{student.department || "—"}</div>
                  <BarcodeCanvas value={`STU-${student.id}`} width={200} height={65} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
