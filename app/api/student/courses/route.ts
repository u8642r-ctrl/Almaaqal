import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool from "../../../../lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    // جلب سجل الطالب بالإيميل
    const studentResult = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json([]);
    }

    const studentId = studentResult.rows[0].id;

    // جلب المواد المسجل فيها الطالب مع معلومات الأستاذ
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.description, c.stage, c.term,
              t.name as teacher_name, e.enrolled_at
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE e.student_id = $1
       ORDER BY c.stage, c.term, e.enrolled_at DESC`,
      [studentId]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
