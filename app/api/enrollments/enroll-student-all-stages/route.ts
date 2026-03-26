import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool from "../../../../lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { student_id } = body;

    if (!student_id) {
      return NextResponse.json({ error: "student_id مطلوب" }, { status: 400 });
    }

    // جلب بيانات الطالب
    const studentResult = await pool.query(
      "SELECT id, name, stage, department, accessible_stages FROM students WHERE id = $1",
      [student_id]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }

    const student = studentResult.rows[0];

    // تحديد المراحل المتاحة - نريد جميع المراحل من 1 إلى المرحلة الحالية
    let accessibleStages: string[] = [];
    const currentStage = parseInt(student.stage || "1");
    accessibleStages = Array.from({ length: currentStage }, (_, i) => String(i + 1));

    // تحديث accessible_stages في قاعدة البيانات
    const accessibleStagesJson = JSON.stringify(accessibleStages);
    await pool.query(
      "UPDATE students SET accessible_stages = $1 WHERE id = $2",
      [accessibleStagesJson, student_id]
    );

    if (accessibleStages.length === 0) {
      return NextResponse.json({
        success: false,
        error: "لا توجد مراحل متاحة للطالب"
      }, { status: 400 });
    }

    // جلب المواد المتاحة للمراحل والقسم
    let coursesQuery = `
      SELECT id FROM courses
      WHERE stage = ANY($1::text[])
    `;
    let queryParams: any[] = [accessibleStages];

    if (student.department) {
      // إذا كان للطالب قسم، نسجله فقط في مواد قسمه
      coursesQuery += ` AND (teacher_id IN (SELECT id FROM teachers WHERE department = $2) OR teacher_id IS NULL)`;
      queryParams.push(student.department);
    }

    const coursesResult = await pool.query(coursesQuery, queryParams);

    let enrolledCount = 0;
    let skippedCount = 0;

    // تسجيل الطالب في كل مادة
    for (const course of coursesResult.rows) {
      try {
        await pool.query(
          `INSERT INTO enrollments (student_id, course_id, status)
           VALUES ($1, $2, 'active')
           ON CONFLICT (student_id, course_id) DO NOTHING`,
          [student_id, course.id]
        );
        enrolledCount++;
      } catch (err) {
        skippedCount++;
        console.error("خطأ في تسجيل المادة:", err);
      }
    }

    return NextResponse.json({
      success: true,
      student_name: student.name,
      total_enrolled: enrolledCount,
      total_skipped: skippedCount,
      accessible_stages: accessibleStages,
      total_courses_found: coursesResult.rows.length,
    });

  } catch (err: any) {
    console.error("Error enrolling student:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
