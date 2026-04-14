import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Grade label helper ──────────────────────────────────────────────────────
function getGradeLabel(value: number): string {
  if (value >= 90) return 'امتياز';
  if (value >= 80) return 'جيد جداً';
  if (value >= 70) return 'جيد';
  if (value >= 60) return 'متوسط';
  if (value >= 50) return 'مقبول';
  return 'راسب';
}

function getGradeColor(value: number): [number, number, number] {
  if (value >= 90) return [5, 150, 105];   // emerald
  if (value >= 80) return [37, 99, 235];    // blue
  if (value >= 70) return [79, 70, 229];    // indigo
  if (value >= 60) return [217, 119, 6];    // amber
  if (value >= 50) return [234, 88, 12];    // orange
  return [220, 38, 38];                      // red
}

// reverse text for RTL rendering in jsPDF (which doesn't natively support RTL)
function reverseText(text: string): string {
  return text.split('').reverse().join('');
}

// ── Shared drawing helpers ──────────────────────────────────────────────────
function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top gradient bar
  doc.setFillColor(15, 39, 68);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Gold accent line
  doc.setFillColor(200, 164, 78);
  doc.rect(0, 38, pageWidth, 3, 'F');

  // University name
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('University Grading System', pageWidth / 2, 16, { align: 'center' });

  // Title
  doc.setFontSize(12);
  doc.setTextColor(200, 164, 78);
  doc.text(title, pageWidth / 2, 27, { align: 'center' });

  // Subtitle
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(subtitle, pageWidth / 2, 34, { align: 'center' });
}

function drawFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(200, 164, 78);
    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

    // Date
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text(dateStr, 15, pageHeight - 9);

    // Page number
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 15, pageHeight - 9, {
      align: 'right',
    });
  }
}

// ── Teacher PDF ─────────────────────────────────────────────────────────────
export interface TeacherPdfStudent {
  student_name: string;
  student_email: string;
  student_stage: string;
  is_carried_over: boolean;
  current_grade: number | null;
}

export interface TeacherPdfOptions {
  courseName: string;
  courseCode?: string;
  stage: string;
  teacherName?: string;
  students: TeacherPdfStudent[];
}

export function generateTeacherGradesPdf(options: TeacherPdfOptions) {
  const { courseName, courseCode, stage, teacherName, students } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  drawHeader(
    doc,
    `Grades Report — ${courseName}${courseCode ? ` (${courseCode})` : ''}`,
    `Stage: ${stage}${teacherName ? `  |  Teacher: ${teacherName}` : ''}`
  );

  // Summary cards row
  const y = 48;
  const cardW = 55;
  const cardH = 20;
  const gap = 10;
  const startX = (doc.internal.pageSize.getWidth() - (cardW * 4 + gap * 3)) / 2;

  const totalStudents = students.length;
  const gradedStudents = students.filter(s => s.current_grade !== null);
  const passed = gradedStudents.filter(s => (s.current_grade ?? 0) >= 50);
  const avgGrade = gradedStudents.length
    ? (gradedStudents.reduce((s, st) => s + (st.current_grade ?? 0), 0) / gradedStudents.length).toFixed(1)
    : '--';

  const cards = [
    { label: 'Total Students', value: String(totalStudents), color: [37, 99, 235] as [number, number, number] },
    { label: 'Graded', value: String(gradedStudents.length), color: [5, 150, 105] as [number, number, number] },
    { label: 'Passed', value: String(passed.length), color: [79, 70, 229] as [number, number, number] },
    { label: 'Average', value: String(avgGrade), color: [200, 164, 78] as [number, number, number] },
  ];

  cards.forEach((card, idx) => {
    const cx = startX + idx * (cardW + gap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, 'F');
    doc.setDrawColor(...card.color);
    doc.setLineWidth(0.6);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, 'S');
    // Value
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, cx + cardW / 2, y + 9, { align: 'center' });
    // Label
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cx + cardW / 2, y + 16, { align: 'center' });
  });

  // Table
  const tableHead = [['#', 'Student Name', 'Email', 'Stage', 'Grade', 'Rating', 'Status']];

  const tableBody = students.map((student, idx) => {
    const grade = student.current_grade;
    const gradeStr = grade !== null ? String(grade) : '--';
    const rating = grade !== null ? getGradeLabel(grade) : '--';
    const status = student.is_carried_over ? 'Carried Over' : (grade !== null ? (grade >= 50 ? 'Pass' : 'Fail') : 'Not Graded');
    return [
      String(idx + 1),
      student.student_name,
      student.student_email,
      student.student_stage,
      gradeStr,
      rating,
      status,
    ];
  });

  autoTable(doc, {
    startY: y + cardH + 8,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      halign: 'center',
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [15, 39, 68],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 50, halign: 'left' },
      2: { cellWidth: 55, halign: 'left' },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 30 },
      6: { cellWidth: 28 },
    },
    didParseCell: (data) => {
      // Color the grade column
      if (data.section === 'body' && data.column.index === 4) {
        const rawGrade = students[data.row.index]?.current_grade;
        if (rawGrade !== null && rawGrade !== undefined) {
          data.cell.styles.textColor = getGradeColor(rawGrade);
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Color the status column
      if (data.section === 'body' && data.column.index === 6) {
        const rawGrade = students[data.row.index]?.current_grade;
        if (rawGrade !== null && rawGrade !== undefined) {
          if (rawGrade >= 50) {
            data.cell.styles.textColor = [5, 150, 105];
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
          data.cell.styles.fontStyle = 'bold';
        }
        // Carried over
        if (students[data.row.index]?.is_carried_over) {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  drawFooter(doc);

  // Download
  const fileName = `Grades_${courseName.replace(/\s+/g, '_')}_Stage_${stage}.pdf`;
  doc.save(fileName);
}

// ── Student PDF ─────────────────────────────────────────────────────────────
export interface StudentPdfCourse {
  name: string;
  code: string;
  stage: string;
  term?: string;
  credit_hours: number;
  grade: number | null;
}

export interface StudentPdfOptions {
  studentName: string;
  studentEmail?: string;
  currentStage: string;
  courses: StudentPdfCourse[];
  average: number;
}

export function generateStudentGradesPdf(options: StudentPdfOptions) {
  const { studentName, studentEmail, currentStage, courses, average } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  drawHeader(
    doc,
    'Academic Transcript',
    `Student: ${studentName}${studentEmail ? `  |  ${studentEmail}` : ''}  |  Stage: ${currentStage}`
  );

  // Summary cards
  const y = 50;
  const cardW = 50;
  const cardH = 22;
  const gap = 12;
  const totalCards = 3;
  const startX = (pageWidth - (cardW * totalCards + gap * (totalCards - 1))) / 2;

  const totalCourses = courses.length;
  const gradedCourses = courses.filter(c => c.grade !== null);
  const avgStr = average > 0 ? `${average.toFixed(1)}%` : '--';

  const cards = [
    { label: 'Total Courses', value: String(totalCourses), color: [37, 99, 235] as [number, number, number] },
    { label: 'Graded', value: String(gradedCourses.length), color: [5, 150, 105] as [number, number, number] },
    { label: 'Average', value: avgStr, color: [200, 164, 78] as [number, number, number] },
  ];

  cards.forEach((card, idx) => {
    const cx = startX + idx * (cardW + gap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, 'F');
    doc.setDrawColor(...card.color);
    doc.setLineWidth(0.6);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, 'S');
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, cx + cardW / 2, y + 10, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cx + cardW / 2, y + 18, { align: 'center' });
  });

  // Term mapping
  const termNames: Record<string, string> = {
    'كورس_اول': 'First Term',
    'كورس_ثاني': 'Second Term',
    'fall': 'First Term',
    'spring': 'Second Term',
    'summer': 'Summer Term',
  };

  // Table
  const tableHead = [['#', 'Course Name', 'Course Code', 'Term', 'Credit Hours', 'Grade', 'Rating']];

  const tableBody = courses.map((course, idx) => {
    const gradeStr = course.grade !== null ? String(course.grade) : '--';
    const rating = course.grade !== null ? getGradeLabel(course.grade) : 'Not Graded';
    const termKey = course.term || 'كورس_اول';
    const termLabel = termNames[termKey] || termKey;
    return [
      String(idx + 1),
      course.name,
      course.code,
      termLabel,
      String(course.credit_hours || 0),
      gradeStr,
      rating,
    ];
  });

  autoTable(doc, {
    startY: y + cardH + 10,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      halign: 'center',
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [15, 39, 68],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 45, halign: 'left' },
      2: { cellWidth: 25 },
      3: { cellWidth: 28 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const rawGrade = courses[data.row.index]?.grade;
        if (rawGrade !== null && rawGrade !== undefined) {
          data.cell.styles.textColor = getGradeColor(rawGrade);
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (data.section === 'body' && data.column.index === 6) {
        const rawGrade = courses[data.row.index]?.grade;
        if (rawGrade !== null && rawGrade !== undefined) {
          data.cell.styles.textColor = getGradeColor(rawGrade);
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  drawFooter(doc);

  const fileName = `Transcript_${studentName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
