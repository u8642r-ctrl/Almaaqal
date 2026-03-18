import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

export async function GET() {
  await initDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    let result = await pool.query(
      "SELECT id, name, email, phone, department, stage, accessible_stages, created_at FROM students WHERE email = $1",
      [session.user.email]
    );

    // إذا لم يوجد سجل في جدول الطلاب، ننشئ واحد تلقائياً
    if (result.rows.length === 0) {
      const userName = session.user.name || "طالب";
      const insertResult = await pool.query(
        "INSERT INTO students (name, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = $1 RETURNING id, name, email, phone, department, stage, accessible_stages, created_at",
        [userName, session.user.email]
      );
      if (insertResult.rows.length > 0) {
        const studentId = insertResult.rows[0].id;
        const studentStage = insertResult.rows[0].stage;
        const studentDepartment = insertResult.rows[0].department;

        // التسجيل التلقائي في الكورسات المطابقة للمرحلة والقسم (إذا كانت محددة)
        if (studentStage || studentDepartment) {
          try {
            let coursesQuery = 'SELECT c.id FROM courses c LEFT JOIN departments d ON c.department_id = d.id WHERE 1=1';
            const params: any[] = [];

            // مطابقة المرحلة إذا كانت محددة
            if (studentStage) {
              params.push(studentStage);
              coursesQuery += ` AND (c.stage = $${params.length} OR c.stage IS NULL)`;
            }

            // مطابقة القسم إذا كان محدد
            if (studentDepartment) {
              params.push(studentDepartment);
              coursesQuery += ` AND (d.name = $${params.length} OR c.department_id IS NULL)`;
            }

            const coursesResult = await pool.query(coursesQuery, params);
            for (const course of coursesResult.rows) {
              await pool.query(
                'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) ON CONFLICT (student_id, course_id) DO NOTHING',
                [studentId, course.id]
              );
            }
          } catch (enrollErr) {
            console.log('تحذير: فشل التسجيل التلقائي في الكورسات:', enrollErr);
          }
        }

        return NextResponse.json(insertResult.rows[0]);
      }
      return NextResponse.json({ error: "لم يتم العثور على بيانات الطالب" }, { status: 404 });
    }

    const student = result.rows[0];

    // تحويل accessible_stages من JSON إلى array إذا كان موجود
    if (student.accessible_stages && typeof student.accessible_stages === 'string') {
      try {
        student.accessible_stages = JSON.parse(student.accessible_stages);
      } catch (e) {
        student.accessible_stages = [];
      }
    } else if (!student.accessible_stages) {
      // إذا لم يكن هناك accessible_stages، نعرض جميع المراحل من 1 إلى المرحلة الحالية
      const currentStage = parseInt(student.stage) || 4;
      student.accessible_stages = Array.from({ length: currentStage }, (_, i) => String(i + 1));
    }

    return NextResponse.json(student);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: any) {
  await initDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const { name, phone, department, stage, accessible_stages } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }

    // تحويل accessible_stages إلى JSON إذا كان array
    let accessibleStagesJson = null;
    if (accessible_stages && Array.isArray(accessible_stages)) {
      accessibleStagesJson = JSON.stringify(accessible_stages);
    }

    // تحديث بيانات الطالب
    const result = await pool.query(
      "UPDATE students SET name = $1, phone = $2, department = $3, stage = $4, accessible_stages = $5 WHERE email = $6 RETURNING id, name, email, phone, department, stage, accessible_stages, created_at",
      [name, phone || null, department || null, stage || null, accessibleStagesJson, session.user.email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على بيانات الطالب" }, { status: 404 });
    }

    // تحديث اسم المستخدم في جدول users أيضاً
    try {
      await pool.query(
        "UPDATE users SET name = $1 WHERE email = $2 AND role = 'student'",
        [name, session.user.email]
      );
    } catch (userUpdateErr) {
      console.log('تحذير: فشل تحديث اسم المستخدم:', userUpdateErr);
    }

    const student = result.rows[0];

    // تحويل accessible_stages من JSON إلى array
    if (student.accessible_stages && typeof student.accessible_stages === 'string') {
      try {
        student.accessible_stages = JSON.parse(student.accessible_stages);
      } catch (e) {
        student.accessible_stages = [];
      }
    }

    return NextResponse.json(student);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
