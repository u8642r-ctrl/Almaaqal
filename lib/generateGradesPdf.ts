import jsPDF from 'jspdf';

// ── Grade helpers ───────────────────────────────────────────────────────────
function getGradeLabel(value: number): string {
  if (value >= 90) return 'امتياز';
  if (value >= 80) return 'جيد جداً';
  if (value >= 70) return 'جيد';
  if (value >= 60) return 'متوسط';
  if (value >= 50) return 'مقبول';
  return 'راسب';
}

function getGradeColor(value: number): string {
  if (value >= 90) return '#059669';
  if (value >= 80) return '#2563eb';
  if (value >= 70) return '#4f46e5';
  if (value >= 60) return '#d97706';
  if (value >= 50) return '#ea580c';
  return '#dc2626';
}

function getGradeBg(value: number): string {
  if (value >= 90) return '#ecfdf5';
  if (value >= 80) return '#eff6ff';
  if (value >= 70) return '#eef2ff';
  if (value >= 60) return '#fffbeb';
  if (value >= 50) return '#fff7ed';
  return '#fef2f2';
}

function formatDate(): string {
  return new Date().toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

export function getTermDisplayName(termKey: string): string {
  const termNames: Record<string, string> = {
    'كورس_اول': 'الكورس الأول',
    'كورس_ثاني': 'الكورس الثاني',
    'fall': 'الكورس الأول',
    'spring': 'الكورس الثاني',
    'summer': 'الفصل الصيفي',
  };
  return termNames[termKey] || termKey;
}

// ── Core HTML-to-PDF engine ─────────────────────────────────────────────────
async function generatePdfFromHtml(
  htmlContent: string,
  orientation: 'portrait' | 'landscape',
  fileName: string,
  containerWidth: number = 1100
) {
  // Create a temporary container and attach it to the DOM
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: ${containerWidth}px;
    background: white;
    z-index: -1;
    font-family: Tahoma, 'Segoe UI', Arial, sans-serif;
  `;
  document.body.appendChild(container);

  // Give the browser time to lay out text
  await new Promise(r => setTimeout(r, 300));

  // Dynamically import html2canvas (client-side only)
  const { default: html2canvas } = await import('html2canvas');

  const canvas = await html2canvas(container, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  document.body.removeChild(container);

  // Build the PDF from the captured canvas image
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const iw = pw;
  const ih = (canvas.height * iw) / canvas.width;

  if (ih <= ph) {
    // Fits on one page
    pdf.addImage(canvas.toDataURL('image/png', 0.95), 'PNG', 0, 0, iw, ih);
  } else {
    // Multi-page: slice the canvas into page-sized strips
    const ratio = canvas.width / iw;
    const pagePxH = ph * ratio;
    let y = 0;
    const pageCanvas = document.createElement('canvas');
    const ctx = pageCanvas.getContext('2d')!;

    while (y < canvas.height) {
      const sliceH = Math.min(pagePxH, canvas.height - y);
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceH;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      if (y > 0) pdf.addPage();
      pdf.addImage(
        pageCanvas.toDataURL('image/png', 0.95),
        'PNG', 0, 0, iw,
        (sliceH * iw) / canvas.width
      );
      y += pagePxH;
    }
  }

  pdf.save(fileName);
}

// ── Teacher PDF ─────────────────────────────────────────────────────────────
export interface TeacherPdfStudent {
  student_name: string;
  student_stage: string;
  is_carried_over: boolean;
  current_grade: number | null;
}

export interface TeacherPdfOptions {
  courseName: string;
  stage: string;
  termLabel: string;
  teacherName?: string;
  students: TeacherPdfStudent[];
}

export async function generateTeacherGradesPdf(options: TeacherPdfOptions) {
  const { courseName, stage, termLabel, teacherName, students } = options;

  const total = students.length;
  const graded = students.filter(s => s.current_grade !== null);
  const passed = graded.filter(s => (s.current_grade ?? 0) >= 50);
  const failed = graded.filter(s => (s.current_grade ?? 0) < 50);
  const avg = graded.length
    ? (graded.reduce((s, st) => s + (st.current_grade ?? 0), 0) / graded.length).toFixed(1)
    : '--';

  const rows = students.map((s, i) => {
    const grade = s.current_grade;
    const gradeStr = grade !== null ? String(grade) : '--';
    const rating = grade !== null ? getGradeLabel(grade) : 'لم يُقيّم';
    const color = grade !== null ? getGradeColor(grade) : '#94a3b8';
    const bg = grade !== null ? getGradeBg(grade) : '#f8fafc';
    const status = s.is_carried_over
      ? '<span style="color:#d97706;font-weight:bold;">محمّل</span>'
      : grade !== null
        ? grade >= 50
          ? '<span style="color:#059669;font-weight:bold;">ناجح</span>'
          : '<span style="color:#dc2626;font-weight:bold;">راسب</span>'
        : '<span style="color:#94a3b8;">لم يُقيّم</span>';
    const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';

    return `
      <tr style="background:${rowBg};border-bottom:1px solid #e2e8f0;">
        <td style="padding:12px 10px;text-align:center;color:#64748b;font-size:13px;">${i + 1}</td>
        <td style="padding:12px 10px;text-align:right;font-weight:600;color:#0f172a;font-size:14px;">${s.student_name}${s.is_carried_over ? ' <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:10px;margin-right:6px;">محمّل</span>' : ''}</td>
        <td style="padding:12px 10px;text-align:center;color:#475569;font-size:13px;">${stage}</td>
        <td style="padding:12px 10px;text-align:center;font-weight:bold;font-size:16px;color:${color};">${gradeStr}</td>
        <td style="padding:12px 10px;text-align:center;">
          <span style="background:${bg};color:${color};padding:4px 14px;border-radius:20px;font-size:12px;font-weight:bold;border:1px solid ${color}20;">${rating}</span>
        </td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;">${status}</td>
      </tr>`;
  }).join('');

  const html = `
    <div dir="rtl" style="padding:30px 35px;font-family:Tahoma,'Segoe UI',Arial,sans-serif;color:#0f172a;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0f2744 0%,#1a3a5c 100%);color:white;padding:28px 30px;border-radius:16px;margin-bottom:24px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-30px;left:-30px;width:120px;height:120px;background:rgba(200,164,78,0.1);border-radius:50%;"></div>
        <div style="position:absolute;bottom:-20px;right:-20px;width:80px;height:80px;background:rgba(200,164,78,0.08);border-radius:50%;"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <h1 style="font-size:24px;margin:0 0 8px;font-weight:bold;">كشف درجات الطلاب</h1>
            <div style="height:3px;width:60px;background:#c8a44e;border-radius:2px;margin-bottom:12px;"></div>
            <p style="color:#c8a44e;margin:0 0 4px;font-size:16px;font-weight:bold;">${courseName}</p>
            <p style="color:rgba(255,255,255,0.7);margin:0 0 2px;font-size:13px;">المرحلة الدراسية: ${stage} | ${termLabel}</p>
            ${teacherName ? `<p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">التدريسي: ${teacherName}</p>` : ''}
          </div>
          <div style="text-align:left;color:rgba(255,255,255,0.6);font-size:12px;">
            <p style="margin:0;">${formatDate()}</p>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div style="display:flex;gap:14px;margin-bottom:24px;">
        <div style="flex:1;background:#f8fafc;border:2px solid #2563eb;border-radius:14px;padding:18px 10px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#2563eb;">${total}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">إجمالي الطلاب</div>
        </div>
        <div style="flex:1;background:#f8fafc;border:2px solid #059669;border-radius:14px;padding:18px 10px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#059669;">${passed.length}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">ناجح</div>
        </div>
        <div style="flex:1;background:#f8fafc;border:2px solid #dc2626;border-radius:14px;padding:18px 10px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#dc2626;">${failed.length}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">راسب</div>
        </div>
        <div style="flex:1;background:#f8fafc;border:2px solid #c8a44e;border-radius:14px;padding:18px 10px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#c8a44e;">${avg}${avg !== '--' ? '%' : ''}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">المعدل العام</div>
        </div>
      </div>

      <!-- Table -->
      <div style="border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#0f2744;">
              <th style="padding:14px 10px;color:white;font-size:13px;font-weight:bold;text-align:center;width:50px;">ت</th>
              <th style="padding:14px 10px;color:white;font-size:13px;font-weight:bold;text-align:right;">اسم الطالب</th>
              <th style="padding:14px 10px;color:white;font-size:13px;font-weight:bold;text-align:center;width:80px;">المرحلة</th>
              <th style="padding:14px 10px;color:white;font-size:13px;font-weight:bold;text-align:center;width:80px;">الدرجة</th>
              <th style="padding:14px 10px;color:white;font-size:13px;font-weight:bold;text-align:center;width:120px;">التقدير</th>
              <th style="padding:14px 10px;color:white;font-size:13px;font-weight:bold;text-align:center;width:100px;">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;border-top:2px solid #c8a44e;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">تم إنشاء هذا التقرير بشكل آلي • نظام إدارة الجامعة</p>
        <p style="color:#94a3b8;font-size:11px;margin:0;">${formatDate()}</p>
      </div>
    </div>
  `;

  const fileName = `كشف_درجات_${courseName.replace(/\s+/g, '_')}_المرحلة_${stage}.pdf`;
  await generatePdfFromHtml(html, 'landscape', fileName, 1100);
}

// ── Student PDF ─────────────────────────────────────────────────────────────
export interface StudentPdfCourse {
  name: string;
  stage: string;
  grade: number | null;
}

export interface StudentPdfOptions {
  studentName: string;
  currentStage: string;
  termLabel: string;
  courses: StudentPdfCourse[];
  average: number;
}

export async function generateStudentGradesPdf(options: StudentPdfOptions) {
  const { studentName, currentStage, termLabel, courses, average } = options;

  const totalCourses = courses.length;
  const gradedCourses = courses.filter(c => c.grade !== null);
  const passedCourses = gradedCourses.filter(c => (c.grade ?? 0) >= 50);
  const avgStr = average > 0 ? `${average.toFixed(1)}%` : '--';

  const rows = courses.map((c, i) => {
    const grade = c.grade;
    const gradeStr = grade !== null ? String(grade) : '--';
    const rating = grade !== null ? getGradeLabel(grade) : 'لم تُرصد';
    const color = grade !== null ? getGradeColor(grade) : '#94a3b8';
    const bg = grade !== null ? getGradeBg(grade) : '#f8fafc';
    const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';

    return `
      <tr style="background:${rowBg};border-bottom:1px solid #e2e8f0;">
        <td style="padding:14px 12px;text-align:center;color:#64748b;font-size:13px;">${i + 1}</td>
        <td style="padding:14px 12px;text-align:right;font-weight:600;color:#0f172a;font-size:15px;">${c.name}</td>
        <td style="padding:14px 12px;text-align:center;font-weight:bold;font-size:18px;color:${color};">${gradeStr}</td>
        <td style="padding:14px 12px;text-align:center;">
          <span style="background:${bg};color:${color};padding:5px 16px;border-radius:20px;font-size:13px;font-weight:bold;border:1px solid ${color}20;">${rating}</span>
        </td>
      </tr>`;
  }).join('');

  const html = `
    <div dir="rtl" style="padding:30px 35px;font-family:Tahoma,'Segoe UI',Arial,sans-serif;color:#0f172a;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0f2744 0%,#1a3a5c 100%);color:white;padding:28px 30px;border-radius:16px;margin-bottom:24px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-30px;left:-30px;width:120px;height:120px;background:rgba(200,164,78,0.1);border-radius:50%;"></div>
        <div style="position:absolute;bottom:-20px;right:-20px;width:80px;height:80px;background:rgba(200,164,78,0.08);border-radius:50%;"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <h1 style="font-size:24px;margin:0 0 8px;font-weight:bold;">السجل الأكاديمي</h1>
            <div style="height:3px;width:60px;background:#c8a44e;border-radius:2px;margin-bottom:12px;"></div>
            <p style="color:#c8a44e;margin:0 0 4px;font-size:16px;font-weight:bold;">${studentName}</p>
            <p style="color:rgba(255,255,255,0.7);margin:0;font-size:13px;">المرحلة الدراسية: ${currentStage} | ${termLabel}</p>
          </div>
          <div style="text-align:left;color:rgba(255,255,255,0.6);font-size:12px;">
            <p style="margin:0;">${formatDate()}</p>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div style="display:flex;gap:14px;margin-bottom:24px;">
        <div style="flex:1;background:#f8fafc;border:2px solid #2563eb;border-radius:14px;padding:18px 10px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#2563eb;">${totalCourses}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">المواد المسجلة</div>
        </div>
        <div style="flex:1;background:#f8fafc;border:2px solid #059669;border-radius:14px;padding:18px 10px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#059669;">${passedCourses.length}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">المواد المرصودة</div>
        </div>
        <div style="flex:1;background:#f8fafc;border:2px solid #c8a44e;border-radius:14px;padding:18px 10px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#c8a44e;">${avgStr}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">المعدل العام</div>
        </div>
      </div>

      <!-- Table -->
      <div style="border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#0f2744;">
              <th style="padding:14px 12px;color:white;font-size:13px;font-weight:bold;text-align:center;width:50px;">ت</th>
              <th style="padding:14px 12px;color:white;font-size:13px;font-weight:bold;text-align:right;">اسم المادة</th>
              <th style="padding:14px 12px;color:white;font-size:13px;font-weight:bold;text-align:center;width:90px;">الدرجة</th>
              <th style="padding:14px 12px;color:white;font-size:13px;font-weight:bold;text-align:center;width:130px;">التقدير</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;border-top:2px solid #c8a44e;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">تم إنشاء هذا التقرير بشكل آلي • نظام إدارة الجامعة</p>
        <p style="color:#94a3b8;font-size:11px;margin:0;">${formatDate()}</p>
      </div>
    </div>
  `;

  const fileName = `السجل_الاكاديمي_${studentName.replace(/\s+/g, '_')}.pdf`;
  await generatePdfFromHtml(html, 'portrait', fileName, 800);
}
