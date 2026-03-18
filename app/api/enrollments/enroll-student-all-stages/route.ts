import { NextResponse } from "next/server";
import pool, { initDatabase } from "../../../../lib/db";

export async function POST(req: Request) {
  await initDatabase();

  try {
    const { student_id } = await req.json();

    if (!student_id) {
      return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 });
    }

    // الحصول على بيانات الطالب
    const studentResult = await pool.query(
      "SELECT id, name, stage, department FROM students WHERE id = $1",
      [student_id]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على الطالب" }, { status: 404 });
    }

    const student = studentResult.rows[0];
    const currentStage = parseInt(student.stage) || 4;
    const studentDepartment = student.department || null;

    // إنشاء قائمة بجميع المراحل من 1 إلى المرحلة الحالية
    const allStages = Array.from({ length: currentStage }, (_, i) => String(i + 1));

    let totalEnrolled = 0;
    const matchedStages = new Set<string>();

    // لكل مرحلة، سجل الطالب في المواد المطابقة للقسم (مع المواد العامة)
    for (const stage of allStages) {
      const coursesQuery = `
        SELECT c.id, c.name, c.code, c.stage, c.term, d.name AS department_name
        FROM courses c
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.stage = $1
          AND (
            c.department_id IS NULL
            OR ($2::text IS NOT NULL AND d.name = $2)
          )
      `;

      const coursesResult = await pool.query(coursesQuery, [stage, studentDepartment]);

      if (coursesResult.rows.length > 0) {
        matchedStages.add(stage);
      }

      for (const course of coursesResult.rows) {
        try {
          const enrollResult = await pool.query(
            `INSERT INTO enrollments (student_id, course_id)
             VALUES ($1, $2)
             ON CONFLICT (student_id, course_id) DO NOTHING`,
            [student.id, course.id]
          );

          if (enrollResult.rowCount && enrollResult.rowCount > 0) {
            totalEnrolled++;
          }
        } catch (err) {
          console.log(`تخطي تسجيل المادة ${course.id}:`, err);
        }
      }
    }

    // تحديث accessible_stages للطالب
    const filteredStages = Array.from(matchedStages);
    const accessibleStagesJson = JSON.stringify(filteredStages);
    await pool.query(
      "UPDATE students SET accessible_stages = $1 WHERE id = $2",
      [accessibleStagesJson, student.id]
    );

    return NextResponse.json({
      success: true,
      message: `تم تسجيل الطالب في ${totalEnrolled} مادة من ${filteredStages.length} مراحل مطابقة للقسم`,
      student_name: student.name,
      stages: filteredStages,
      student_department: studentDepartment,
      total_enrolled: totalEnrolled
    });

  } catch (err: any) {
    console.error('Enroll student all stages error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
