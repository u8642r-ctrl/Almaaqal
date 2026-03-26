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
    // جلب جميع الطلاب
    const studentsResult = await pool.query(
      "SELECT id, name, stage, department FROM students ORDER BY name"
    );

    if (studentsResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: "لا يوجد طلاب للتسجيل"
      }, { status: 400 });
    }

    const students = studentsResult.rows;
    let totalEnrolledStudents = 0;
    let totalEnrolledCourses = 0;
    let results = [];

    // معالجة كل طالب على حدة
    for (const student of students) {
      try {
        // تحديد المراحل المتاحة - جميع المراحل من 1 إلى المرحلة الحالية
        const currentStage = parseInt(student.stage || "1");
        const accessibleStages = Array.from({ length: currentStage }, (_, i) => String(i + 1));

        // تحديث accessible_stages في قاعدة البيانات
        const accessibleStagesJson = JSON.stringify(accessibleStages);
        await pool.query(
          "UPDATE students SET accessible_stages = $1 WHERE id = $2",
          [accessibleStagesJson, student.id]
        );

        // جلب المواد المتاحة للمراحل والقسم
        let coursesQuery = `
          SELECT id, name FROM courses
          WHERE stage = ANY($1::text[])
        `;
        let queryParams: any[] = [accessibleStages];

        if (student.department) {
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
              [student.id, course.id]
            );
            enrolledCount++;
          } catch (err) {
            skippedCount++;
            console.error(`خطأ في تسجيل الطالب ${student.name} في مادة ${course.name}:`, err);
          }
        }

        if (enrolledCount > 0) {
          totalEnrolledStudents++;
        }
        totalEnrolledCourses += enrolledCount;

        results.push({
          student_id: student.id,
          student_name: student.name,
          stage: student.stage,
          department: student.department,
          enrolled_courses: enrolledCount,
          skipped_courses: skippedCount,
          accessible_stages: accessibleStages,
          success: true
        });

      } catch (err: any) {
        console.error(`خطأ في معالجة الطالب ${student.name}:`, err);
        results.push({
          student_id: student.id,
          student_name: student.name,
          stage: student.stage,
          department: student.department,
          enrolled_courses: 0,
          skipped_courses: 0,
          accessible_stages: [],
          error: err.message,
          success: false
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم تسجيل ${totalEnrolledStudents} طالب في ${totalEnrolledCourses} مادة إجمالاً`,
      total_students_processed: students.length,
      total_enrolled_students: totalEnrolledStudents,
      total_enrolled_courses: totalEnrolledCourses,
      results: results
    });

  } catch (err: any) {
    console.error("Error enrolling all students:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}