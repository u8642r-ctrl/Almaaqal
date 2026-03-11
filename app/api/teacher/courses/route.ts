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
    // جلب سجل الأستاذ بالإيميل
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json([]);
    }

    const teacherId = teacherResult.rows[0].id;

    // جلب المواد التي يدرّسها الأستاذ مع عدد الطلاب المسجلين
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.description, c.created_at,
              COUNT(e.id) as student_count
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.course_id
       WHERE c.teacher_id = $1
       GROUP BY c.id
       ORDER BY c.name`,
      [teacherId]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
