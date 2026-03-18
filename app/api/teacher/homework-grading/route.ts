import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

async function getTeacherIdBySessionEmail(email: string) {
  const teacherResult = await pool.query("SELECT id FROM teachers WHERE email = $1", [email]);
  if (teacherResult.rows.length === 0) return null;
  return teacherResult.rows[0].id as number;
}

export async function GET(req: NextRequest) {
  await initDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const teacherId = await getTeacherIdBySessionEmail(session.user.email);
    if (!teacherId) return NextResponse.json({ homeworks: [], students: [] });

    const { searchParams } = new URL(req.url);
    const homeworkId = searchParams.get("homework_id");

    const homeworksResult = await pool.query(
      `SELECT cc.id, cc.course_id, cc.title, cc.description, cc.due_date, cc.created_at,
              c.name AS course_name, c.code AS course_code
       FROM course_contents cc
       JOIN courses c ON c.id = cc.course_id
       WHERE cc.teacher_id = $1
         AND cc.content_type = 'homework'
       ORDER BY cc.created_at DESC`,
      [teacherId]
    );

    if (!homeworkId) {
      return NextResponse.json({ homeworks: homeworksResult.rows, students: [] });
    }

    const homeworkResult = await pool.query(
      `SELECT cc.id, cc.course_id
       FROM course_contents cc
       WHERE cc.id = $1 AND cc.teacher_id = $2 AND cc.content_type = 'homework'`,
      [homeworkId, teacherId]
    );

    if (homeworkResult.rows.length === 0) {
      return NextResponse.json({ error: "الواجب غير موجود" }, { status: 404 });
    }

    const courseId = homeworkResult.rows[0].course_id;

    const studentsResult = await pool.query(
      `SELECT s.id AS student_id,
              s.name AS student_name,
              s.email AS student_email,
              s.stage AS student_stage,
              s.department AS student_department,
              hg.id AS grade_id,
              hg.submission_text,
              hg.submitted_at,
              hg.grade,
              hg.feedback,
              hg.graded_at
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN homework_grades hg ON hg.student_id = s.id AND hg.content_id = $1
       WHERE e.course_id = $2
       ORDER BY s.name ASC`,
      [homeworkId, courseId]
    );

    return NextResponse.json({
      homeworks: homeworksResult.rows,
      students: studentsResult.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await initDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const teacherId = await getTeacherIdBySessionEmail(session.user.email);
    if (!teacherId) {
      return NextResponse.json({ error: "لم يتم العثور على بيانات الأستاذ" }, { status: 404 });
    }

    const { homework_id, student_id, grade, feedback } = await req.json();

    if (!homework_id || !student_id || grade === undefined) {
      return NextResponse.json(
        { error: "معرف الواجب والطالب والدرجة مطلوبة" },
        { status: 400 }
      );
    }

    const parsedGrade = Number(grade);
    if (Number.isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 100) {
      return NextResponse.json({ error: "الدرجة يجب أن تكون بين 0 و 100" }, { status: 400 });
    }

    const ownershipResult = await pool.query(
      `SELECT cc.id, cc.course_id
       FROM course_contents cc
       WHERE cc.id = $1 AND cc.teacher_id = $2 AND cc.content_type = 'homework'`,
      [homework_id, teacherId]
    );

    if (ownershipResult.rows.length === 0) {
      return NextResponse.json({ error: "لا يمكنك تعديل هذا الواجب" }, { status: 403 });
    }

    const courseId = ownershipResult.rows[0].course_id;

    const enrollmentResult = await pool.query(
      "SELECT id FROM enrollments WHERE course_id = $1 AND student_id = $2",
      [courseId, student_id]
    );

    if (enrollmentResult.rows.length === 0) {
      return NextResponse.json({ error: "الطالب غير مسجل في المادة" }, { status: 400 });
    }

    const upsertResult = await pool.query(
      `INSERT INTO homework_grades (content_id, student_id, grade, feedback, graded_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (content_id, student_id)
       DO UPDATE SET
         grade = EXCLUDED.grade,
         feedback = EXCLUDED.feedback,
         graded_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [homework_id, student_id, parsedGrade, feedback || null]
    );

    return NextResponse.json(upsertResult.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
