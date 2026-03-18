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
    let teacherResult = await pool.query(
      "SELECT id, department FROM teachers WHERE email = $1",
      [session.user.email]
    );

    // إذا لم يوجد سجل أستاذ، ننشئه تلقائياً حتى تعمل واجهات التدريسي
    if (teacherResult.rows.length === 0) {
      const insertResult = await pool.query(
        "INSERT INTO teachers (name, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id, department",
        [session.user.name || "تدريسي", session.user.email]
      );
      teacherResult = insertResult;
    }

    if (teacherResult.rows.length === 0) {
      return NextResponse.json([]);
    }

    const teacherId = teacherResult.rows[0].id;
    const teacherDepartment = teacherResult.rows[0].department || null;

    // جلب المواد المسندة للتدريسي فقط
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.description, c.created_at
       FROM courses c
       WHERE c.teacher_id = $1
       ORDER BY c.name`,
      [teacherId]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
