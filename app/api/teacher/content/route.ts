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

    // جلب المحتوى التعليمي للمدرس
    const result = await pool.query(`
      SELECT cc.id, cc.course_id, cc.content_type, cc.title, cc.description,
             cc.due_date, cc.file_name, cc.created_at, cc.max_grade, cc.stage,
             c.name as course_name, c.code as course_code
      FROM course_contents cc
      JOIN courses c ON cc.course_id = c.id
      WHERE cc.teacher_id = $1
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

    // معالجة البيانات المرسلة
    const formData = await req.formData();
    const courseId = formData.get('courseId') as string;
    const contentType = formData.get('contentType') as string; // 'lecture' or 'homework'
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const stage = formData.get('stage') as string;
    const dueDate = formData.get('dueDate') as string; // للواجبات فقط
    const maxGrade = formData.get('maxGrade') as string; // الدرجة القصوى للواجب
    const file = formData.get('file') as File | null;

    // التحقق من البيانات المطلوبة
    if (!courseId || !contentType || !title || !stage) {
      return NextResponse.json({ error: "بيانات ناقصة - الرجاء إدخال جميع الحقول المطلوبة" }, { status: 400 });
    }

    // التحقق من أن المادة تخص هذا المدرس
    const courseCheck = await pool.query(
      "SELECT id FROM courses WHERE id = $1 AND teacher_id = $2",
      [courseId, teacherId]
    );

    if (courseCheck.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح - المادة غير مرتبطة بك" }, { status: 403 });
    }

    let fileName = null;
    let fileData = null;

    // معالجة الملف إذا كان موجوداً
    if (file) {
      // التحقق من نوع الملف
      const allowedTypes = ['application/pdf', 'application/msword',
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'application/vnd.ms-powerpoint',
                           'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                           'image/jpeg', 'image/png', 'image/gif'];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });
      }

      // التحقق من حجم الملف (50MB للمحاضرات، 10MB للواجبات)
      const maxSize = contentType === 'lecture' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxSizeMB = contentType === 'lecture' ? 50 : 10;
        return NextResponse.json({ error: `حجم الملف يجب أن يكون أقل من ${maxSizeMB}MB` }, { status: 400 });
      }

      fileName = file.name;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileData = buffer.toString('base64');
    }

    // إدخال المحتوى في قاعدة البيانات
    const insertResult = await pool.query(`
      INSERT INTO course_contents (course_id, teacher_id, content_type, title, description, due_date, stage, file_name, file_data, max_grade)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at
    `, [
      courseId,
      teacherId,
      contentType,
      title,
      description,
      dueDate || null,
      stage,
      fileName,
      fileData,
      maxGrade ? parseInt(maxGrade) : null
    ]);

    // إذا كان نوع المحتوى "واجب"، قم بإنشاء سجلات للطلاب فوراً ليظهر عندهم
    if (contentType === 'homework') {
      await pool.query(`
        INSERT INTO homework_grades (content_id, student_id)
        SELECT $1, e.student_id
        FROM enrollments e
        WHERE e.course_id = $2
      `, [insertResult.rows[0].id, courseId]);
    }

    return NextResponse.json({
      success: true,
      content: insertResult.rows[0],
      message: contentType === 'lecture' ? 'تم رفع المحاضرة بنجاح' : 'تم إنشاء الواجب بنجاح'
    }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "معرّف المحتوى مطلوب" }, { status: 400 });
  }

  try {
    await initDatabase();
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const teacherId = teacherResult.rows[0].id;

    // حذف درجات الواجب المرتبطة به أولاً لتجنب مشكلة الـ Foreign Key
    await pool.query("DELETE FROM homework_grades WHERE content_id = $1", [id]);
    
    // حذف المحتوى
    const deleteResult = await pool.query(
      "DELETE FROM course_contents WHERE id = $1 AND teacher_id = $2 RETURNING id",
      [id, teacherId]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: "المحتوى غير موجود أو لا تملك صلاحية حذفه" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}