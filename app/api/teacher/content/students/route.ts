import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import pool, { initDatabase } from "../../../../../lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("course_id");
  const contentId = searchParams.get("content_id");

  if (!courseId) {
    return NextResponse.json({ error: "معرف المادة مطلوب" }, { status: 400 });
  }

  try {
    await initDatabase();

    // التحقق من أن المادة تخص هذا المدرس
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على المدرس" }, { status: 404 });
    }

    const teacherId = teacherResult.rows[0].id;

    const courseCheck = await pool.query(
      "SELECT id, name, code, stage FROM courses WHERE id = $1 AND teacher_id = $2",
      [courseId, teacherId]
    );

    if (courseCheck.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح - المادة غير مرتبطة بك" }, { status: 403 });
    }

    const courseInfo = courseCheck.rows[0];

    // جلب معلومات المحتوى
    let contentInfo = null;
    if (contentId) {
      const contentResult = await pool.query(
        "SELECT id, content_type, title, description, due_date, max_grade FROM course_contents WHERE id = $1 AND course_id = $2",
        [contentId, courseId]
      );
      if (contentResult.rows.length > 0) {
        contentInfo = contentResult.rows[0];
      }
    }

    // جلب الطلاب المسجلين مع درجاتهم ومعلومات الحمل
    let query: string;
    let params: any[];

    if (contentId) {
      // إذا كان هناك content_id، نجلب بيانات الواجب
      query = `
        SELECT
          s.id as student_id,
          s.name as student_name,
          s.email as student_email,
          s.stage as student_stage,
          e.id as enrollment_id,
          e.is_carried_over,
          e.original_stage,
          e.status as enrollment_status,
          g.id as grade_id,
          g.grade as current_grade,
          hg.id as homework_grade_id,
          hg.grade as homework_grade,
          hg.submission_text,
          hg.submitted_at,
          hg.feedback,
          hg.graded_at
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        LEFT JOIN grades g ON (g.student_id = s.id AND g.course_id = $1)
        LEFT JOIN homework_grades hg ON (hg.student_id = s.id AND hg.content_id = $2)
        WHERE e.course_id = $1
        ORDER BY e.is_carried_over DESC, s.name
      `;
      params = [courseId, contentId];
    } else {
      // إذا لم يكن هناك content_id، نجلب فقط الدرجات العامة
      query = `
        SELECT
          s.id as student_id,
          s.name as student_name,
          s.email as student_email,
          s.stage as student_stage,
          e.id as enrollment_id,
          e.is_carried_over,
          e.original_stage,
          e.status as enrollment_status,
          g.id as grade_id,
          g.grade as current_grade,
          NULL as homework_grade_id,
          NULL as homework_grade,
          NULL as submission_text,
          NULL as submitted_at,
          NULL as feedback,
          NULL as graded_at
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        LEFT JOIN grades g ON (g.student_id = s.id AND g.course_id = $1)
        WHERE e.course_id = $1
        ORDER BY e.is_carried_over DESC, s.name
      `;
      params = [courseId];
    }

    const result = await pool.query(query, params);

    return NextResponse.json({
      course: courseInfo,
      content: contentInfo,
      students: result.rows
    });
  } catch (err: any) {
    console.error("Error fetching course students data:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}