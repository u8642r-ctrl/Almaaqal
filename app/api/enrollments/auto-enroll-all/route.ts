import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool from "../../../../lib/db";

/**
 * تسجيل جميع الطلاب تلقائياً في جميع الكورسات
 * POST /api/enrollments/auto-enroll-all
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // التحقق من أن المستخدم أدمن
  const userRole = (session.user as any)?.role;
  if (userRole !== "admin") {
    return NextResponse.json({ error: "غير مصرح - يتطلب صلاحيات المدير" }, { status: 403 });
  }

  try {
    // جلب جميع الطلاب مع معلومات المرحلة والقسم
    const studentsResult = await pool.query("SELECT id, stage, department FROM students");
    const students = studentsResult.rows;

    // جلب جميع الكورسات مع معلومات المرحلة والقسم
    const coursesResult = await pool.query(`
      SELECT c.id, c.stage, d.name as department_name
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
    `);
    const courses = coursesResult.rows;

    if (students.length === 0) {
      return NextResponse.json({ error: "لا يوجد طلاب في النظام" }, { status: 400 });
    }

    if (courses.length === 0) {
      return NextResponse.json({ error: "لا يوجد كورسات في النظام" }, { status: 400 });
    }

    // تسجيل الطلاب في الكورسات المطابقة للمرحلة والقسم
    let enrolledCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      for (const course of courses) {
        // التحقق من المطابقة
        let isMatch = true;

        // مطابقة المرحلة
        if (course.stage && student.stage) {
          isMatch = isMatch && (course.stage === student.stage);
        } else if (course.stage && !student.stage) {
          // الكورس له مرحلة لكن الطالب لا، تخطي
          isMatch = false;
        }

        // مطابقة القسم
        if (course.department_name && student.department) {
          isMatch = isMatch && (course.department_name === student.department);
        } else if (course.department_name && !student.department) {
          // الكورس له قسم لكن الطالب لا، تخطي
          isMatch = false;
        }

        if (isMatch) {
          try {
            await pool.query(
              `INSERT INTO enrollments (student_id, course_id)
               VALUES ($1, $2)
               ON CONFLICT (student_id, course_id) DO NOTHING`,
              [student.id, course.id]
            );
            enrolledCount++;
          } catch (e) {
            skippedCount++;
          }
        }
      }
    }

    // حساب عدد التسجيلات الفعلية
    const totalResult = await pool.query("SELECT COUNT(*) FROM enrollments");
    const totalEnrollments = parseInt(totalResult.rows[0].count);

    return NextResponse.json({
      success: true,
      message: `تم تسجيل الطلاب في الكورسات المطابقة لمرحلتهم وقسمهم`,
      details: {
        totalStudents: students.length,
        totalCourses: courses.length,
        totalEnrollments: totalEnrollments,
        note: "تم التسجيل بناءً على مطابقة المرحلة والقسم",
      },
    });
  } catch (err: any) {
    console.error("Auto-enroll error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء التسجيل التلقائي", details: err.message },
      { status: 500 }
    );
  }
}
