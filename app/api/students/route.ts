export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'رقم الطالب مطلوب' }), { status: 400 });
  try {
    // جلب بريد الطالب لحذف حساب الدخول
    const studentResult = await pool.query('SELECT email FROM students WHERE id = $1', [id]);
    const studentEmail = studentResult.rows[0]?.email;
    
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
    
    // حذف حساب تسجيل الدخول المرتبط
    if (studentEmail) {
      await pool.query('DELETE FROM users WHERE email = $1 AND role = $2', [studentEmail, 'student']);
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'DB error', details: err.message }), { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'رقم الطالب مطلوب' }), { status: 400 });
  try {
    const { name, email, phone, department, stage } = await req.json();
    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'الاسم والبريد الإلكتروني مطلوبان' }), { status: 400 });
    }

    // جلب البريد القديم
    const oldStudent = await pool.query('SELECT email FROM students WHERE id = $1', [id]);
    const oldEmail = oldStudent.rows[0]?.email;

    // تحديث جدول الطلاب
    await pool.query(
      'UPDATE students SET name = $1, email = $2, phone = $3, department = $4, stage = $5 WHERE id = $6',
      [name, email, phone || null, department || null, stage || null, id]
    );

    // تحديث جدول المستخدمين إذا تغير البريد الإلكتروني
    if (oldEmail && oldEmail !== email) {
      await pool.query(
        'UPDATE users SET email = $1, name = $2 WHERE email = $3 AND role = $4',
        [email, name, oldEmail, 'student']
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    let msg = 'DB error';
    if (err.code === '23505') msg = 'البريد الإلكتروني مستخدم مسبقاً';
    return new Response(JSON.stringify({ error: msg, details: err.message }), { status: 500 });
  }
}
import { NextRequest } from 'next/server';
import pool from '../../../lib/db';


export async function GET(req: NextRequest) {
  try {
    const result = await pool.query('SELECT id, name, email, phone, department, stage, created_at FROM students ORDER BY id DESC');
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'DB error', details: message }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, department, stage } = await req.json();
    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'الاسم والبريد الإلكتروني مطلوبان' }), { status: 400 });
    }
    // إنشاء سجل الطالب
    const result = await pool.query(
      'INSERT INTO students (name, email, phone, department, stage) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, department, stage, created_at',
      [name, email, phone || null, department || null, stage || null]
    );

    const studentId = result.rows[0].id;
    const studentStage = result.rows[0].stage;
    const studentDepartment = result.rows[0].department;

    // إنشاء حساب تسجيل الدخول إذا تم توفير كلمة المرور
    if (password) {
      await pool.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password = $2, name = $3',
        [email, password, name, 'student']
      );
    }

    // التسجيل التلقائي في كورسات المرحلة والقسم المناسبة
    try {
      // جلب الكورسات المطابقة للمرحلة والقسم
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
      // نكمل حتى لو فشل التسجيل
    }

    return new Response(JSON.stringify(result.rows[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    let msg = 'DB error';
    if (err.code === '23505') msg = 'البريد الإلكتروني مستخدم مسبقاً';
    return new Response(JSON.stringify({ error: msg, details: err.message }), { status: 500 });
  }
}
