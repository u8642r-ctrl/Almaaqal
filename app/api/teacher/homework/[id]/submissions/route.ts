import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import pool, { initDatabase } from "../../../../../../lib/db";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    await initDatabase();

    // الحصول على معرف المدرس
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على المدرس" }, { status: 404 });
    }

    const teacherId = teacherResult.rows[0].id;
    const homeworkId = params.id;

    // التحقق من أن الواجب يخص هذا المدرس
    const homeworkCheck = await pool.query(`
      SELECT cc.id, cc.title, cc.description, cc.due_date, cc.max_grade,
             c.name as course_name, c.code as course_code
      FROM course_contents cc
      JOIN courses c ON cc.course_id = c.id
      WHERE cc.id = $1 AND cc.teacher_id = $2 AND cc.content_type = 'homework'
    `, [homeworkId, teacherId]);

    if (homeworkCheck.rows.length === 0) {
      return NextResponse.json({ error: "الواجب غير موجود أو غير مرتبط بك" }, { status: 404 });
    }

    const homework = homeworkCheck.rows[0];

    // جلب تسليمات الطلاب
    const submissions = await pool.query(`
      SELECT hg.id, hg.submission_text, hg.submitted_at, hg.grade, hg.feedback,
             s.id as student_id, s.name as student_name, s.email as student_email,
             CASE
               WHEN hg.submitted_at IS NULL THEN 'لم يتم التسليم'
               WHEN hg.grade IS NULL THEN 'تم التسليم - في انتظار التصحيح'
               ELSE 'تم التصحيح'
             END as status,
             CASE
               WHEN hg.submitted_at IS NULL AND NOW() > cc.due_date THEN true
               ELSE false
             END as is_late
      FROM homework_grades hg
      JOIN students s ON hg.student_id = s.id
      JOIN course_contents cc ON hg.content_id = cc.id
      WHERE hg.content_id = $1
      ORDER BY
        CASE WHEN hg.submitted_at IS NULL THEN 1 ELSE 0 END,
        hg.submitted_at DESC,
        s.name
    `, [homeworkId]);

    // إحصائيات سريعة
    const totalStudents = submissions.rows.length;
    const submittedCount = submissions.rows.filter(s => s.submitted_at).length;
    const gradedCount = submissions.rows.filter(s => s.grade !== null).length;
    const lateSubmissions = submissions.rows.filter(s => s.is_late).length;

    return NextResponse.json({
      homework,
      submissions: submissions.rows,
      statistics: {
        totalStudents,
        submittedCount,
        gradedCount,
        pendingGrades: submittedCount - gradedCount,
        lateSubmissions,
        onTimeSubmissions: submittedCount - lateSubmissions
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}