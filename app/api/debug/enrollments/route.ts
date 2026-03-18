import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool from "../../../../lib/db";

/**
 * API للتحقق من بيانات التسجيل - Debug
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== "admin") {
    return NextResponse.json({ error: "غير مصرح - يتطلب صلاحيات المدير" }, { status: 403 });
  }

  try {
    // 1. عدد الطلاب
    const studentsCount = await pool.query("SELECT COUNT(*) FROM students");

    // 2. عدد الطلاب الذين لديهم stage
    const studentsWithStage = await pool.query("SELECT COUNT(*) FROM students WHERE stage IS NOT NULL");

    // 3. عدد الطلاب الذين ليس لديهم stage
    const studentsWithoutStage = await pool.query("SELECT id, name, email, stage, department FROM students WHERE stage IS NULL LIMIT 10");

    // 4. عدد الكورسات
    const coursesCount = await pool.query("SELECT COUNT(*) FROM courses");

    // 5. عدد الكورسات التي لديها stage
    const coursesWithStage = await pool.query("SELECT COUNT(*) FROM courses WHERE stage IS NOT NULL");

    // 6. عدد الكورسات التي ليس لديها stage
    const coursesWithoutStage = await pool.query("SELECT id, name, code, stage, department_id FROM courses WHERE stage IS NULL LIMIT 10");

    // 7. عدد التسجيلات الكلي
    const enrollmentsCount = await pool.query("SELECT COUNT(*) FROM enrollments");

    // 8. أمثلة على التسجيلات
    const sampleEnrollments = await pool.query(`
      SELECT e.id, e.student_id, e.course_id,
             s.name as student_name, s.stage as student_stage,
             c.name as course_name, c.stage as course_stage
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN courses c ON e.course_id = c.id
      LIMIT 20
    `);

    return NextResponse.json({
      summary: {
        totalStudents: parseInt(studentsCount.rows[0].count),
        studentsWithStage: parseInt(studentsWithStage.rows[0].count),
        totalCourses: parseInt(coursesCount.rows[0].count),
        coursesWithStage: parseInt(coursesWithStage.rows[0].count),
        totalEnrollments: parseInt(enrollmentsCount.rows[0].count),
      },
      studentsWithoutStage: studentsWithoutStage.rows,
      coursesWithoutStage: coursesWithoutStage.rows,
      sampleEnrollments: sampleEnrollments.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
