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

    // جلب المراحل والمواد والمحتوى
    const result = await pool.query(
      `SELECT
        c.id as course_id,
        c.name as course_name,
        c.code as course_code,
        c.stage as course_stage,
        cc.id as content_id,
        cc.content_type,
        cc.title as content_title,
        cc.description as content_description,
        cc.due_date,
        cc.created_at as content_created_at,
        COUNT(DISTINCT e.student_id) as enrolled_count,
        COUNT(DISTINCT hg.student_id) as submitted_count
       FROM courses c
       LEFT JOIN course_contents cc ON c.id = cc.course_id
       LEFT JOIN enrollments e ON c.id = e.course_id
       LEFT JOIN homework_grades hg ON (cc.id = hg.content_id AND cc.content_type = 'homework')
       WHERE c.teacher_id = $1
       GROUP BY c.id, c.name, c.code, c.stage, cc.id, cc.content_type, cc.title, cc.description, cc.due_date, cc.created_at
       ORDER BY
         CAST(COALESCE(c.stage, '1') AS INTEGER),
         c.name,
         cc.created_at DESC`,
      [teacherId]
    );

    // تنظيم البيانات هرمياً: مرحلة -> مادة -> محتوى
    const hierarchy: Record<string, any> = {};

    result.rows.forEach((row) => {
      const stage = row.course_stage || '1';
      const courseId = row.course_id;
      const courseName = row.course_name;

      // إنشاء المرحلة إذا لم تكن موجودة
      if (!hierarchy[stage]) {
        hierarchy[stage] = {
          stage: stage,
          courses: {}
        };
      }

      // إنشاء المادة إذا لم تكن موجودة
      if (!hierarchy[stage].courses[courseId]) {
        hierarchy[stage].courses[courseId] = {
          course_id: courseId,
          course_name: courseName,
          course_code: row.course_code,
          enrolled_count: row.enrolled_count,
          contents: []
        };
      }

      // إضافة المحتوى إذا كان موجوداً
      if (row.content_id) {
        const existingContent = hierarchy[stage].courses[courseId].contents.find(
          (content: any) => content.content_id === row.content_id
        );

        if (!existingContent) {
          hierarchy[stage].courses[courseId].contents.push({
            content_id: row.content_id,
            content_type: row.content_type,
            content_title: row.content_title,
            content_description: row.content_description,
            due_date: row.due_date,
            created_at: row.content_created_at,
            submitted_count: row.submitted_count || 0
          });
        }
      }
    });

    return NextResponse.json(hierarchy);
  } catch (err: any) {
    console.error("Error fetching teacher hierarchy data:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}