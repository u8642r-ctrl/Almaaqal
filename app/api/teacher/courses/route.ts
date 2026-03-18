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
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    // توافق مع بيانات قديمة: إن لم يوجد بالإيميل نحاول بالاسم
    if (teacherResult.rows.length === 0 && session.user.name) {
      teacherResult = await pool.query(
        "SELECT id FROM teachers WHERE name = $1 ORDER BY id ASC LIMIT 1",
        [session.user.name]
      );

      // ربط سجل الأستاذ القديم بالإيميل الحالي
      if (teacherResult.rows.length > 0) {
        await pool.query(
          "UPDATE teachers SET email = $1 WHERE id = $2",
          [session.user.email, teacherResult.rows[0].id]
        );
      }
    }

    // إذا لم يوجد سجل أستاذ ننشئه تلقائياً
    if (teacherResult.rows.length === 0) {
      teacherResult = await pool.query(
        "INSERT INTO teachers (name, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [session.user.name || "تدريسي", session.user.email]
      );
    }

    // مزامنة الاسم دائماً لتقليل اختلافات الحسابات القديمة
    if (teacherResult.rows.length > 0 && session.user.name) {
      await pool.query(
        "UPDATE teachers SET name = $1 WHERE id = $2",
        [session.user.name, teacherResult.rows[0].id]
      );
    }

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
