import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import pool, { initDatabase } from "../../../../../lib/db";

// جلب الطلاب الراسبين الذين يحتاجون لحمل مواد
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // التحقق من أن المستخدم أدمن
  const userResult = await pool.query(
    "SELECT role FROM users WHERE email = $1",
    [session.user.email]
  );

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    return NextResponse.json({ error: "غير مصرح - المستخدم ليس أدمن" }, { status: 403 });
  }

  try {
    await initDatabase();

    // جلب الطلاب الراسبين (درجة < 50) مع معلومات المادة
    const result = await pool.query(`
      SELECT
        s.id as student_id,
        s.name as student_name,
        s.email as student_email,
        s.stage as student_stage,
        c.id as course_id,
        c.name as course_name,
        c.code as course_code,
        c.stage as course_stage,
        g.grade,
        g.semester,
        e.is_carried_over,
        e.original_stage
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN courses c ON g.course_id = c.id
      JOIN enrollments e ON (e.student_id = s.id AND e.course_id = c.id)
      WHERE g.grade < 50
        AND g.semester = '2025-2026'
        AND e.is_carried_over = FALSE
      ORDER BY s.stage, s.name, c.name
    `);

    // تنظيم البيانات حسب الطالب
    const failedStudents: Record<string, any> = {};

    result.rows.forEach((row) => {
      const key = `${row.student_id}`;

      if (!failedStudents[key]) {
        failedStudents[key] = {
          student_id: row.student_id,
          student_name: row.student_name,
          student_email: row.student_email,
          student_stage: row.student_stage,
          failed_courses: []
        };
      }

      failedStudents[key].failed_courses.push({
        course_id: row.course_id,
        course_name: row.course_name,
        course_code: row.course_code,
        course_stage: row.course_stage,
        grade: row.grade,
        semester: row.semester
      });
    });

    return NextResponse.json({
      students: Object.values(failedStudents),
      total_students: Object.keys(failedStudents).length,
      total_courses: result.rows.length
    });

  } catch (err: any) {
    console.error("Error fetching failed students:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}