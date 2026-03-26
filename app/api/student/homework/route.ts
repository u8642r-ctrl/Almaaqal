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

    // جلب سجل الطالب بالإيميل
    const studentResult = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json([]);
    }

    const studentId = studentResult.rows[0].id;

    // الحصول على courseId من query parameters (اختياري)
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('course_id');
    const homeworkId = searchParams.get('homework_id');

    if (homeworkId) {
      // جلب تفاصيل واجب محدد مع حالة التسليم
      const result = await pool.query(`
        SELECT
          cc.id, cc.title, cc.description, cc.due_date, cc.file_name, cc.created_at,
          c.name as course_name, c.code as course_code,
          t.name as teacher_name,
          hg.submission_text, hg.submitted_at, hg.grade, hg.feedback, hg.file_name as student_file_name,
          CASE WHEN cc.file_name IS NOT NULL THEN true ELSE false END as has_file,
          CASE
            WHEN hg.submitted_at IS NULL THEN 'لم يتم التسليم'
            WHEN hg.grade IS NULL THEN 'تم التسليم - في انتظار التصحيح'
            ELSE 'تم التصحيح'
          END as submission_status,
          CASE
            WHEN hg.submitted_at IS NULL AND NOW() > cc.due_date THEN true
            ELSE false
          END as is_overdue,
          CASE
            WHEN NOW() > cc.due_date THEN true
            ELSE false
          END as is_past_due
        FROM course_contents cc
        JOIN courses c ON cc.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN homework_grades hg ON cc.id = hg.content_id AND hg.student_id = $2
        WHERE cc.id = $1 AND e.student_id = $2 AND cc.content_type = 'homework'
      `, [homeworkId, studentId]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "الواجب غير موجود" }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } else {
      // جلب قائمة الواجبات للطالب
      let query = `
        SELECT
          cc.id, cc.course_id, cc.title, cc.description, cc.due_date, cc.file_name, cc.created_at,
          c.name as course_name, c.code as course_code,
          t.name as teacher_name,
          hg.submission_text, hg.submitted_at, hg.grade, hg.feedback, hg.file_name as student_file_name,
          CASE WHEN cc.file_name IS NOT NULL THEN true ELSE false END as has_file,
          CASE
            WHEN hg.submitted_at IS NULL THEN 'لم يتم التسليم'
            WHEN hg.grade IS NULL THEN 'تم التسليم - في انتظار التصحيح'
            ELSE 'تم التصحيح'
          END as submission_status,
          CASE
            WHEN hg.submitted_at IS NULL AND NOW() > cc.due_date THEN true
            ELSE false
          END as is_overdue,
          CASE
            WHEN NOW() > cc.due_date THEN true
            ELSE false
          END as is_past_due
        FROM course_contents cc
        JOIN courses c ON cc.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN homework_grades hg ON cc.id = hg.content_id AND hg.student_id = $1
        WHERE cc.content_type = 'homework' AND e.student_id = $1
      `;

      const queryParams = [studentId];

      if (courseId) {
        query += ` AND c.id = $2`;
        queryParams.push(courseId);
      }

      query += ` ORDER BY cc.due_date ASC, cc.created_at DESC`;

      const result = await pool.query(query, queryParams);
      return NextResponse.json(result.rows);
    }

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

    // جلب سجل الطالب بالإيميل
    const studentResult = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على الطالب" }, { status: 404 });
    }

    const studentId = studentResult.rows[0].id;

    const formData = await req.formData();
    const homeworkId = formData.get('homeworkId') as string;
    const submissionText = formData.get('submissionText') as string;
    const file = formData.get('file') as File | null;

    // التحقق من البيانات المطلوبة
    if (!homeworkId || (!submissionText && !file)) {
      return NextResponse.json({ error: "معرف الواجب ونص التسليم أو الملف مطلوبان" }, { status: 400 });
    }

    // التحقق من أن الواجب موجود ومتاح للطالب
    const homeworkCheck = await pool.query(`
      SELECT cc.id, cc.title, cc.due_date, c.name as course_name
      FROM course_contents cc
      JOIN courses c ON cc.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      WHERE cc.id = $1 AND e.student_id = $2 AND cc.content_type = 'homework'
    `, [homeworkId, studentId]);

    if (homeworkCheck.rows.length === 0) {
      return NextResponse.json({ error: "الواجب غير موجود أو غير متاح لك" }, { status: 404 });
    }

    const homework = homeworkCheck.rows[0];

    // التحقق من موعد التسليم
    const dueDate = new Date(homework.due_date);
    const now = new Date();
    const isLate = now > dueDate;

    // التحقق من وجود تسليم سابق
    const existingSubmission = await pool.query(
      "SELECT id, submitted_at FROM homework_grades WHERE content_id = $1 AND student_id = $2",
      [homeworkId, studentId]
    );

    if (existingSubmission.rows.length === 0) {
      return NextResponse.json({ error: "سجل التسليم غير موجود" }, { status: 404 });
    }

    const submissionRecord = existingSubmission.rows[0];

    let fileName = null;
    let fileData = null;

    if (file && file.size > 0) {
      fileName = file.name;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileData = buffer.toString('base64');
    }

    let query = `
      UPDATE homework_grades
      SET submission_text = $1, submitted_at = CURRENT_TIMESTAMP
    `;
    const params: any[] = [submissionText || null];
    let paramIndex = 2;

    if (file && file.size > 0) {
      query += `, file_name = $${paramIndex++}, file_data = $${paramIndex++}`;
      params.push(fileName, fileData);
    }

    query += ` WHERE content_id = $${paramIndex++} AND student_id = $${paramIndex++} RETURNING id, submission_text, file_name, submitted_at`;
    params.push(homeworkId, studentId);

    // تحديث التسليم
    const updateResult = await pool.query(query, params);

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: "فشل في حفظ التسليم" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      submission: updateResult.rows[0],
      homework: {
        title: homework.title,
        course: homework.course_name
      },
      isLate,
      message: isLate
        ? `تم تسليم واجب "${homework.title}" متأخراً - الموعد النهائي كان ${dueDate.toLocaleDateString('ar-SA')}`
        : `تم تسليم واجب "${homework.title}" بنجاح`
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT لتحديث التسليم
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    await initDatabase();

    // جلب سجل الطالب بالإيميل
    const studentResult = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على الطالب" }, { status: 404 });
    }

    const studentId = studentResult.rows[0].id;

    const formData = await req.formData();
    const homeworkId = formData.get('homeworkId') as string;
    const submissionText = formData.get('submissionText') as string;
    const file = formData.get('file') as File | null;

    if (!homeworkId || (!submissionText && !file)) {
      return NextResponse.json({ error: "معرف الواجب ونص التسليم أو الملف مطلوبان" }, { status: 400 });
    }

    // التحقق من أن الواجب موجود ولم يتم تصحيحه بعد
    const submissionCheck = await pool.query(`
      SELECT hg.id, hg.grade, cc.title, cc.due_date, c.name as course_name
      FROM homework_grades hg
      JOIN course_contents cc ON hg.content_id = cc.id
      JOIN courses c ON cc.course_id = c.id
      WHERE hg.content_id = $1 AND hg.student_id = $2
    `, [homeworkId, studentId]);

    if (submissionCheck.rows.length === 0) {
      return NextResponse.json({ error: "التسليم غير موجود" }, { status: 404 });
    }

    const submission = submissionCheck.rows[0];

    if (submission.grade !== null) {
      return NextResponse.json({ error: "لا يمكن تعديل التسليم بعد التصحيح" }, { status: 400 });
    }

    let fileName = null;
    let fileData = null;

    if (file && file.size > 0) {
      fileName = file.name;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileData = buffer.toString('base64');
    }

    let query = `
      UPDATE homework_grades
      SET submission_text = $1, submitted_at = CURRENT_TIMESTAMP
    `;
    const params: any[] = [submissionText || null];
    let paramIndex = 2;

    if (file && file.size > 0) {
      query += `, file_name = $${paramIndex++}, file_data = $${paramIndex++}`;
      params.push(fileName, fileData);
    }

    query += ` WHERE content_id = $${paramIndex++} AND student_id = $${paramIndex++} RETURNING id, submission_text, file_name, submitted_at`;
    params.push(homeworkId, studentId);

    // تحديث التسليم
    const updateResult = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      submission: updateResult.rows[0],
      message: `تم تحديث تسليم واجب "${submission.title}" بنجاح`
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}