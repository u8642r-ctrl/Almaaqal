import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool from "../../../../lib/db";

/**
 * تنظيف التسجيلات غير المطابقة للقسم
 * يحذف فقط التسجيلات التي تكون المادة فيها مرتبطة بقسم محدد
 * لكن قسم الطالب لا يطابق قسم المادة.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== "admin") {
    return NextResponse.json({ error: "غير مصرح - يتطلب صلاحيات المدير" }, { status: 403 });
  }

  try {
    const mismatchedBefore = await pool.query(
      `SELECT COUNT(*)
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN courses c ON c.id = e.course_id
       JOIN departments d ON d.id = c.department_id
       WHERE c.department_id IS NOT NULL
         AND (s.department IS NULL OR d.name IS DISTINCT FROM s.department)`
    );

    const deleteResult = await pool.query(
      `DELETE FROM enrollments e
       USING students s, courses c, departments d
       WHERE e.student_id = s.id
         AND e.course_id = c.id
         AND c.department_id = d.id
         AND c.department_id IS NOT NULL
         AND (s.department IS NULL OR d.name IS DISTINCT FROM s.department)`
    );

    const mismatchedAfter = await pool.query(
      `SELECT COUNT(*)
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN courses c ON c.id = e.course_id
       JOIN departments d ON d.id = c.department_id
       WHERE c.department_id IS NOT NULL
         AND (s.department IS NULL OR d.name IS DISTINCT FROM s.department)`
    );

    return NextResponse.json({
      success: true,
      message: "تم تنظيف التسجيلات غير المطابقة للقسم",
      details: {
        mismatched_before: parseInt(mismatchedBefore.rows[0].count),
        deleted: deleteResult.rowCount || 0,
        mismatched_after: parseInt(mismatchedAfter.rows[0].count),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
