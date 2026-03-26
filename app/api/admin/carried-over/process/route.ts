import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import pool, { initDatabase } from "../../../../../lib/db";

// تسجيل الطلاب في المواد المحملة تلقائياً
export async function POST(req: NextRequest) {
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

    const { student_id, course_id, auto_process_all } = await req.json();

    if (auto_process_all) {
      // معالجة جميع الطلاب الراسبين تلقائياً

      // 1. جلب جميع الطلاب الراسبين
      const failedStudents = await pool.query(`
        SELECT DISTINCT
          s.id as student_id,
          s.stage as student_stage,
          s.accessible_stages,
          c.id as course_id,
          c.stage as course_stage,
          e.id as enrollment_id
        FROM grades g
        JOIN students s ON g.student_id = s.id
        JOIN courses c ON g.course_id = c.id
        JOIN enrollments e ON (e.student_id = s.id AND e.course_id = c.id)
        WHERE g.grade < 50
          AND g.semester = '2025-2026'
          AND e.is_carried_over = FALSE
      `);

      let processedCount = 0;
      const errors = [];

      for (const student of failedStudents.rows) {
        try {
          // تحديث التسجيل الحالي ليكون محمل
          await pool.query(`
            UPDATE enrollments
            SET is_carried_over = TRUE,
                original_stage = $1,
                status = 'carried_over'
            WHERE id = $2
          `, [student.course_stage, student.enrollment_id]);

          // تحديث المراحل المتاحة للطالب (إضافة المرحلة الأقل)
          const courseStageStr = student.course_stage.toString();
          const accessibleStages = student.accessible_stages || [student.student_stage.toString()];

          if (!accessibleStages.includes(courseStageStr)) {
            accessibleStages.push(courseStageStr);
          }
          
          await pool.query(`
            UPDATE students
            SET accessible_stages = $1
            WHERE id = $2
          `, [JSON.stringify(accessibleStages), student.student_id]);

          processedCount++;
        } catch (err: any) {
          errors.push({
            student_id: student.student_id,
            course_id: student.course_id,
            error: err.message
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `تم معالجة ${processedCount} تسجيل بنجاح`,
        processed: processedCount,
        total: failedStudents.rows.length,
        errors: errors
      });

    } else if (student_id && course_id) {
      // معالجة طالب واحد فقط

      // الحصول على معلومات الطالب والمادة
      const studentInfo = await pool.query(
        "SELECT stage, accessible_stages FROM students WHERE id = $1",
        [student_id]
      );

      const courseInfo = await pool.query(
        "SELECT stage FROM courses WHERE id = $1",
        [course_id]
      );

      if (studentInfo.rows.length === 0 || courseInfo.rows.length === 0) {
        return NextResponse.json({ error: "الطالب أو المادة غير موجود" }, { status: 404 });
      }

      const studentStage = studentInfo.rows[0].stage;
      const courseStage = courseInfo.rows[0].stage;
      const accessibleStages = studentInfo.rows[0].accessible_stages || [studentStage.toString()];

      if (!accessibleStages.includes(courseStage.toString())) {
        accessibleStages.push(courseStage.toString());
      }

      // البحث عن التسجيل الحالي
      const enrollment = await pool.query(
        "SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2",
        [student_id, course_id]
      );

      if (enrollment.rows.length === 0) {
        return NextResponse.json({ error: "التسجيل غير موجود" }, { status: 404 });
      }

      // تحديث التسجيل ليكون محمل
      await pool.query(`
        UPDATE enrollments
        SET is_carried_over = TRUE,
            original_stage = $1,
            status = 'carried_over'
        WHERE id = $2
      `, [courseStage, enrollment.rows[0].id]);

      // تحديث المراحل المتاحة للطالب
      await pool.query(`
        UPDATE students
        SET accessible_stages = $1
        WHERE id = $2
      `, [JSON.stringify(accessibleStages), student_id]);

      return NextResponse.json({
        success: true,
        message: "تم تسجيل الطالب في المادة المحملة بنجاح"
      });

    } else {
      return NextResponse.json({ error: "معرّف الطالب والمادة مطلوبة، أو استخدم auto_process_all" }, { status: 400 });
    }

  } catch (err: any) {
    console.error("Error processing carried over enrollment:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}