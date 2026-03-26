import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import pool, { initDatabase } from "../../../../../lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

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

    // الحصول على جميع الواجبات المعلقة للتصحيح لهذا المدرس
    const query = `
      SELECT
        cc.id as homework_id,
        cc.title as homework_title,
        cc.due_date,
        cc.max_grade,
        c.name as course_name,
        hg.id as submission_id,
        hg.student_id,
        s.name as student_name,
        s.email as student_email,
        hg.submitted_at,
        hg.submission_text,
        hg.grade,
        hg.feedback,
        CASE
          WHEN hg.submitted_at > cc.due_date THEN true
          ELSE false
        END AS is_late
      FROM course_contents cc
      JOIN courses c ON cc.course_id = c.id
      JOIN homework_grades hg ON cc.id = hg.content_id
      JOIN students s ON hg.student_id = s.id
      WHERE cc.teacher_id = $1
        AND cc.content_type = 'homework'
        AND hg.submitted_at IS NOT NULL
      ORDER BY hg.submitted_at DESC
    `;

    const result = await pool.query(query, [teacherId]);

    // تجميع البيانات حسب الواجب
    const pendingCorrections = result.rows.reduce((acc: any, row: any) => {
      const existingHomework = acc.find((item: any) => item.homework_id === row.homework_id);

      const submission = {
        submission_id: row.submission_id,
        student_id: row.student_id,
        student_name: row.student_name,
        student_email: row.student_email,
        submitted_at: row.submitted_at,
        submission_text: row.submission_text,
        is_late: row.is_late,
        homework_id: row.homework_id,
        grade: row.grade
      };

      if (existingHomework) {
        existingHomework.submissions.push(submission);
        if (row.grade === null) existingHomework.pending_count++;
      } else {
        acc.push({
          homework_id: row.homework_id,
          homework_title: row.homework_title,
          course_name: row.course_name,
          due_date: row.due_date,
          max_grade: row.max_grade,
          pending_count: row.grade === null ? 1 : 0,
          submissions: [submission]
        });
      }

      return acc;
    }, []);

    // إحصائيات عامة
    const totalPending = result.rows.filter((row: any) => row.grade === null).length;
    const lateSubmissions = result.rows.filter((row: any) => row.is_late && row.grade === null).length;
    const onTimeSubmissions = totalPending - lateSubmissions;

    return NextResponse.json({
      pendingCorrections,
      statistics: {
        totalPending,
        lateSubmissions,
        onTimeSubmissions,
        totalHomework: pendingCorrections.length
      }
    });

  } catch (error) {
    console.error("Error fetching pending corrections:", error);
    return NextResponse.json(
      { error: "فشل في جلب البيانات" },
      { status: 500 }
    );
  }
}