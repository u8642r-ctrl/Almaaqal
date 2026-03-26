import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import pool, { initDatabase } from "../../../../../lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const email = session.user.email;

  try {
    await initDatabase();

    // الحصول على معرف الأستاذ
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json({});
    }

    const teacherId = teacherResult.rows[0].id;

    // جلب جميع البيانات في استعلام واحد
    const result = await pool.query(
      `SELECT
        s.id as student_id,
        s.name as student_name,
        s.stage as student_stage,
        c.id as course_id,
        c.name as course_name,
        c.stage as course_stage,
        g.id as grade_id,
        g.grade as current_grade,
        e.id as enrollment_id
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN grades g ON (g.student_id = s.id AND g.course_id = c.id)
       WHERE c.teacher_id = $1
       ORDER BY
         CAST(COALESCE(c.stage, '1') AS INTEGER),
         c.name,
         s.name`,
      [teacherId]
    );

    // تنظيم البيانات حسب المرحلة والمادة
    const organizedData: Record<string, Record<string, { course_id: number; course_name: string; students: any[] }>> = {};

    result.rows.forEach((row) => {
      const stage = row.course_stage || '1';
      const courseName = row.course_name;

      if (!organizedData[stage]) {
        organizedData[stage] = {};
      }

      if (!organizedData[stage][courseName]) {
        organizedData[stage][courseName] = {
          course_id: row.course_id,
          course_name: row.course_name,
          students: []
        };
      }

      organizedData[stage][courseName].students.push({
        student_id: row.student_id,
        student_name: row.student_name,
        student_stage: row.student_stage,
        grade_id: row.grade_id,
        current_grade: row.current_grade,
        enrollment_id: row.enrollment_id
      });
    });

    return NextResponse.json(organizedData);
  } catch (err: any) {
    console.error("Error fetching teacher grades data:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}