import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

async function getTeacherBySession(sessionUser: { email?: string | null; name?: string | null }) {
  if (!sessionUser.email) return null;

  let result = await pool.query("SELECT id FROM teachers WHERE email = $1", [sessionUser.email]);

  if (result.rows.length === 0 && sessionUser.name) {
    const byName = await pool.query(
      "SELECT id FROM teachers WHERE name = $1 ORDER BY id ASC LIMIT 1",
      [sessionUser.name]
    );

    if (byName.rows.length > 0) {
      await pool.query("UPDATE teachers SET email = $1 WHERE id = $2", [sessionUser.email, byName.rows[0].id]);
      result = byName;
    }
  }

  if (result.rows.length === 0) {
    result = await pool.query(
      "INSERT INTO teachers (name, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      [sessionUser.name || "تدريسي", sessionUser.email]
    );
  }

  if (result.rows.length === 0) return null;
  return result.rows[0].id as number;
}

export async function GET(req: NextRequest) {
  await initDatabase();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const teacherId = await getTeacherBySession(session.user);
    if (!teacherId) return NextResponse.json([]);

    const { searchParams } = new URL(req.url);
    const homeworkId = searchParams.get("homework_id");

    if (!homeworkId) {
      const homeworks = await pool.query(
        `SELECT cc.id, cc.title, cc.due_date, cc.created_at,
                c.id AS course_id, c.name AS course_name
         FROM course_contents cc
         JOIN courses c ON c.id = cc.course_id
         WHERE cc.teacher_id = $1 AND cc.content_type = 'homework'
         ORDER BY cc.created_at DESC`,
        [teacherId]
      );

      return NextResponse.json(homeworks.rows);
    }

    const students = await pool.query(
      `SELECT s.id AS student_id, s.name AS student_name, s.email AS student_email,
              hg.grade, hg.feedback, hg.graded_at
       FROM course_contents cc
       JOIN courses c ON c.id = cc.course_id
       JOIN enrollments e ON e.course_id = c.id
       JOIN students s ON s.id = e.student_id
       LEFT JOIN homework_grades hg ON hg.content_id = cc.id AND hg.student_id = s.id
       WHERE cc.id = $1 AND cc.teacher_id = $2 AND cc.content_type = 'homework'
       ORDER BY s.name`,
      [homeworkId, teacherId]
    );

    return NextResponse.json(students.rows);
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
    const teacherId = await getTeacherBySession(session.user);
    if (!teacherId) {
      return NextResponse.json({ error: "تعذر تحميل بيانات التدريسي" }, { status: 404 });
    }

    const { content_id, student_id, grade, feedback } = await req.json();

    if (!content_id || !student_id || grade === undefined || grade === null) {
      return NextResponse.json({ error: "الواجب والطالب والدرجة مطلوبة" }, { status: 400 });
    }

    const ownsHomework = await pool.query(
      "SELECT id FROM course_contents WHERE id = $1 AND teacher_id = $2 AND content_type = 'homework'",
      [content_id, teacherId]
    );

    if (ownsHomework.rows.length === 0) {
      return NextResponse.json({ error: "لا يمكنك تصحيح هذا الواجب" }, { status: 403 });
    }

    const result = await pool.query(
      `INSERT INTO homework_grades (content_id, student_id, grade, feedback, graded_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (content_id, student_id)
       DO UPDATE SET
         grade = EXCLUDED.grade,
         feedback = EXCLUDED.feedback,
         graded_at = NOW()
       RETURNING *`,
      [content_id, student_id, grade, feedback || null]
    );

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
