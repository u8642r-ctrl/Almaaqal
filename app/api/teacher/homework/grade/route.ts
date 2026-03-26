import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import pool, { initDatabase } from "../../../../../lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    await initDatabase();

    // الحصول على معرف المدرس
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على المدرس" }, { status: 404 });
    }

    const teacherId = teacherResult.rows[0].id;

    const body = await req.json();
    const { homeworkGradeId, grade, feedback } = body;

    // التحقق من البيانات المطلوبة
    if (!homeworkGradeId || grade === undefined) {
      return NextResponse.json({ error: "بيانات ناقصة - الرجاء إدخال معرف التسليم والدرجة" }, { status: 400 });
    }

    // التحقق من أن التسليم موجود ويخص مادة للمدرس
    const submissionCheck = await pool.query(`
      SELECT hg.id, hg.content_id, hg.student_id,
             cc.max_grade,
             s.name as student_name,
             cc.title as homework_title,
             c.name as course_name
      FROM homework_grades hg
      JOIN course_contents cc ON hg.content_id = cc.id
      JOIN courses c ON cc.course_id = c.id
      JOIN students s ON hg.student_id = s.id
      WHERE hg.id = $1 AND cc.teacher_id = $2 AND cc.content_type = 'homework'
    `, [homeworkGradeId, teacherId]);

    if (submissionCheck.rows.length === 0) {
      return NextResponse.json({ error: "التسليم غير موجود أو غير مرتبط بك" }, { status: 404 });
    }

    const submission = submissionCheck.rows[0];
    const maxGrade = submission.max_grade || 100;

    // التحقق من صحة الدرجة مقارنة بالدرجة القصوى لهذا الواجب
    if (grade < 0 || grade > maxGrade) {
      return NextResponse.json({ error: `الدرجة يجب أن تكون بين 0 و ${maxGrade}` }, { status: 400 });
    }

    // تحديث الدرجة والتعليق
    const updateResult = await pool.query(`
      UPDATE homework_grades
      SET grade = $1, feedback = $2, graded_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, grade, feedback, graded_at
    `, [grade, feedback || null, homeworkGradeId]);

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: "فشل في حفظ الدرجة" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      grading: updateResult.rows[0],
      student: {
        name: submission.student_name,
        homework: submission.homework_title,
        course: submission.course_name
      },
      message: `تم تصحيح واجب "${submission.homework_title}" للطالب "${submission.student_name}" بنجاح`
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// API لتحديث الدرجة (PUT method)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    await initDatabase();

    // الحصول على معرف المدرس
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على المدرس" }, { status: 404 });
    }

    const teacherId = teacherResult.rows[0].id;

    const body = await req.json();
    const { homeworkGradeId, grade, feedback } = body;

    // التحقق من البيانات المطلوبة
    if (!homeworkGradeId) {
      return NextResponse.json({ error: "معرف التسليم مطلوب" }, { status: 400 });
    }

    // التحقق من صحة الدرجة إذا تم إرسالها
    if (grade !== undefined && (grade < 0 || grade > 100)) {
      return NextResponse.json({ error: "الدرجة يجب أن تكون بين 0 و 100" }, { status: 400 });
    }

    // التحقق من أن التسليم موجود ويخص مادة للمدرس
    const submissionCheck = await pool.query(`
      SELECT hg.id, s.name as student_name, cc.title as homework_title
      FROM homework_grades hg
      JOIN course_contents cc ON hg.content_id = cc.id
      JOIN students s ON hg.student_id = s.id
      WHERE hg.id = $1 AND cc.teacher_id = $2
    `, [homeworkGradeId, teacherId]);

    if (submissionCheck.rows.length === 0) {
      return NextResponse.json({ error: "التسليم غير موجود أو غير مرتبط بك" }, { status: 404 });
    }

    const submission = submissionCheck.rows[0];

    // إعداد الاستعلام الديناميكي
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (grade !== undefined) {
      updateFields.push(`grade = $${paramIndex}`);
      values.push(grade);
      paramIndex++;
    }

    if (feedback !== undefined) {
      updateFields.push(`feedback = $${paramIndex}`);
      values.push(feedback);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    }

    updateFields.push(`graded_at = CURRENT_TIMESTAMP`);
    values.push(homeworkGradeId);

    const updateQuery = `
      UPDATE homework_grades
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, grade, feedback, graded_at
    `;

    const updateResult = await pool.query(updateQuery, values);

    return NextResponse.json({
      success: true,
      grading: updateResult.rows[0],
      message: `تم تحديث تصحيح واجب "${submission.homework_title}" للطالب "${submission.student_name}" بنجاح`
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}