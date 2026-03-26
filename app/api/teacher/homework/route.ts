import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

export async function GET(req: NextRequest) {
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

    // جلب الواجبات مع إحصائيات التسليمات
    const result = await pool.query(`
      SELECT cc.id, cc.course_id, cc.title, cc.description, cc.due_date, cc.max_grade,
             cc.file_name, cc.created_at,
             c.name as course_name, c.code as course_code,
             COUNT(hg.id) as total_submissions,
             COUNT(CASE WHEN hg.grade IS NOT NULL THEN 1 END) as graded_submissions
      FROM course_contents cc
      JOIN courses c ON cc.course_id = c.id
      LEFT JOIN homework_grades hg ON cc.id = hg.content_id
      WHERE cc.teacher_id = $1 AND cc.content_type = 'homework'
      GROUP BY cc.id, c.name, c.code
      ORDER BY cc.created_at DESC
    `, [teacherId]);

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    const formData = await req.formData();
    const courseId = formData.get('courseId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const dueDate = formData.get('dueDate') as string;
    const maxGrade = formData.get('maxGrade') as string;
    const stage = formData.get('stage') as string;
    const file = formData.get('file') as File | null;

    // التحقق من البيانات المطلوبة
    if (!courseId || !title || !dueDate || !maxGrade || !stage) {
      return NextResponse.json({ error: "بيانات ناقصة - الرجاء إدخال المادة والعنوان وموعد التسليم والدرجة القصوى والمرحلة" }, { status: 400 });
    }

    // التحقق من صحة الدرجة القصوى
    const maxGradeNum = parseInt(maxGrade);
    if (isNaN(maxGradeNum) || maxGradeNum <= 0 || maxGradeNum > 1000) {
      return NextResponse.json({ error: "الدرجة القصوى يجب أن تكون رقماً بين 1 و 1000" }, { status: 400 });
    }

    // التحقق من أن المادة تخص هذا المدرس
    const courseCheck = await pool.query(
      "SELECT id FROM courses WHERE id = $1 AND teacher_id = $2",
      [courseId, teacherId]
    );

    if (courseCheck.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح - المادة غير مرتبطة بك" }, { status: 403 });
    }

    // التحقق من أن موعد التسليم في المستقبل
    const dueDateObj = new Date(dueDate);
    if (dueDateObj <= new Date()) {
      return NextResponse.json({ error: "موعد التسليم يجب أن يكون في المستقبل" }, { status: 400 });
    }

    let fileName = null;
    let fileData = null;

    // معالجة ملف التعليمات (اختياري)
    if (file) {
      // التحقق من نوع الملف
      const allowedTypes = ['application/pdf', 'application/msword',
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'application/vnd.ms-powerpoint',
                           'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "نوع الملف غير مدعوم - الملفات المقبولة: PDF, Word, PowerPoint" }, { status: 400 });
      }

      // التحقق من حجم الملف (10MB للواجبات)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json({ error: "حجم الملف يجب أن يكون أقل من 10MB" }, { status: 400 });
      }

      fileName = file.name;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileData = buffer.toString('base64');
    }

    // إنشاء الواجب
    const insertResult = await pool.query(`
      INSERT INTO course_contents (course_id, teacher_id, content_type, title, description, due_date, max_grade, stage, file_name, file_data)
      VALUES ($1, $2, 'homework', $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
    `, [
      courseId,
      teacherId,
      title,
      description,
      dueDate,
      maxGradeNum,
      stage,
      fileName,
      fileData
    ]);

    // إنشاء سجلات فارغة لجميع الطلاب المسجلين في المادة
    await pool.query(`
      INSERT INTO homework_grades (content_id, student_id)
      SELECT $1, e.student_id
      FROM enrollments e
      WHERE e.course_id = $2
    `, [insertResult.rows[0].id, courseId]);

    return NextResponse.json({
      success: true,
      homework: insertResult.rows[0],
      message: 'تم إنشاء الواجب بنجاح وتم تبليغ جميع الطلاب المسجلين'
    }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}