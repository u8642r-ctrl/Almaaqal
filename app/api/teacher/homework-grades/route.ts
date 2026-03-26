import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    await initDatabase();

    // التحقق من أن المستخدم هو مدرس
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح - المستخدم ليس مدرساً" }, { status: 403 });
    }

    const teacherId = teacherResult.rows[0].id;

    const { content_id, student_id, grade, feedback } = await req.json();

    if (!content_id || !student_id || grade === undefined) {
      return NextResponse.json({ error: "معرّف المحتوى ومعرّف الطالب والدرجة مطلوبة" }, { status: 400 });
    }

    // التحقق من أن المحتوى يخص هذا المدرس
    const contentCheck = await pool.query(
      "SELECT id FROM course_contents WHERE id = $1 AND teacher_id = $2",
      [content_id, teacherId]
    );

    if (contentCheck.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح - المحتوى غير مرتبط بك" }, { status: 403 });
    }

    // إدخال أو تحديث درجة الواجب
    const result = await pool.query(`
      INSERT INTO homework_grades (content_id, student_id, grade, feedback, graded_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (content_id, student_id)
      DO UPDATE SET
        grade = EXCLUDED.grade,
        feedback = EXCLUDED.feedback,
        graded_at = CURRENT_TIMESTAMP
      RETURNING id, grade, feedback, graded_at
    `, [content_id, student_id, grade, feedback || null]);

    return NextResponse.json({
      success: true,
      homework_grade: result.rows[0],
      message: "تم حفظ درجة الواجب بنجاح"
    }, { status: 201 });

  } catch (err: any) {
    console.error("Error saving homework grade:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const contentId = searchParams.get("content_id");
  const studentId = searchParams.get("student_id");

  try {
    await initDatabase();

    // التحقق من أن المستخدم هو مدرس
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح - المستخدم ليس مدرساً" }, { status: 403 });
    }

    const teacherId = teacherResult.rows[0].id;

    let query = `
      SELECT hg.id, hg.content_id, hg.student_id, hg.grade, hg.feedback,
             hg.submission_text, hg.submitted_at, hg.graded_at,
             s.name as student_name, s.email as student_email,
             cc.title as content_title, cc.content_type
      FROM homework_grades hg
      JOIN students s ON hg.student_id = s.id
      JOIN course_contents cc ON hg.content_id = cc.id
      WHERE cc.teacher_id = $1
    `;

    const params = [teacherId];

    if (contentId) {
      params.push(contentId);
      query += ` AND hg.content_id = $${params.length}`;
    }

    if (studentId) {
      params.push(studentId);
      query += ` AND hg.student_id = $${params.length}`;
    }

    query += " ORDER BY hg.graded_at DESC";

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);

  } catch (err: any) {
    console.error("Error fetching homework grades:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const gradeId = searchParams.get("id");

  if (!gradeId) {
    return NextResponse.json({ error: "معرّف الدرجة مطلوب" }, { status: 400 });
  }

  try {
    await initDatabase();

    // التحقق من أن المستخدم هو مدرس وله صلاحية تعديل هذه الدرجة
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح - المستخدم ليس مدرساً" }, { status: 403 });
    }

    const teacherId = teacherResult.rows[0].id;

    // التحقق من أن الدرجة تخص هذا المدرس
    const gradeCheck = await pool.query(`
      SELECT hg.id
      FROM homework_grades hg
      JOIN course_contents cc ON hg.content_id = cc.id
      WHERE hg.id = $1 AND cc.teacher_id = $2
    `, [gradeId, teacherId]);

    if (gradeCheck.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح - الدرجة غير مرتبطة بك" }, { status: 403 });
    }

    const { grade, feedback } = await req.json();

    if (grade === undefined) {
      return NextResponse.json({ error: "الدرجة مطلوبة" }, { status: 400 });
    }

    await pool.query(
      "UPDATE homework_grades SET grade = $1, feedback = $2, graded_at = CURRENT_TIMESTAMP WHERE id = $3",
      [grade, feedback || null, gradeId]
    );

    return NextResponse.json({
      success: true,
      message: "تم تحديث درجة الواجب بنجاح"
    });

  } catch (err: any) {
    console.error("Error updating homework grade:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const gradeId = searchParams.get("id");

  if (!gradeId) {
    return NextResponse.json({ error: "معرّف الدرجة مطلوب" }, { status: 400 });
  }

  try {
    await initDatabase();

    // التحقق من أن المستخدم هو مدرس وله صلاحية حذف هذه الدرجة
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح - المستخدم ليس مدرساً" }, { status: 403 });
    }

    const teacherId = teacherResult.rows[0].id;

    // التحقق من أن الدرجة تخص هذا المدرس
    const gradeCheck = await pool.query(`
      SELECT hg.id
      FROM homework_grades hg
      JOIN course_contents cc ON hg.content_id = cc.id
      WHERE hg.id = $1 AND cc.teacher_id = $2
    `, [gradeId, teacherId]);

    if (gradeCheck.rows.length === 0) {
      return NextResponse.json({ error: "غير مصرح - الدرجة غير مرتبطة بك" }, { status: 403 });
    }

    await pool.query("DELETE FROM homework_grades WHERE id = $1", [gradeId]);

    return NextResponse.json({
      success: true,
      message: "تم حذف درجة الواجب بنجاح"
    });

  } catch (err: any) {
    console.error("Error deleting homework grade:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}