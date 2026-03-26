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
    const { name, email, phone, department, stage, password } = await req.json();
    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'الاسم والبريد الإلكتروني مطلوبان' }), { status: 400 });
    }

    // الحصول على الإيميل القديم
    const oldStudentResult = await pool.query('SELECT email FROM students WHERE id = $1', [id]);
    const oldEmail = oldStudentResult.rows[0]?.email;

    // تحديث بيانات الطالب
    await pool.query(
      'UPDATE students SET name = $1, email = $2, phone = $3, department = $4, stage = $5 WHERE id = $6',
      [name, email, phone || null, department || null, stage || null, id]
    );

    // تحديث حساب تسجيل الدخول
    if (oldEmail) {
      // الحصول على الباسورد القديم قبل أي تغيير
      const userResult = await pool.query(
        'SELECT password FROM users WHERE email = $1 AND role = $2',
        [oldEmail, 'student']
      );
      const oldPassword = userResult.rows[0]?.password || '123456';

      // تحديد الباسورد النهائي - إذا تم إدخال باسورد جديد نستخدمه، وإلا نحتفظ بالقديم
      const finalPassword = password && password.trim() ? password.trim() : oldPassword;

      // حذف الحساب القديم إذا تغير الإيميل
      if (oldEmail !== email) {
        await pool.query('DELETE FROM users WHERE email = $1 AND role = $2', [oldEmail, 'student']);
      }

      // إنشاء أو تحديث حساب المستخدم
      await pool.query(
        `INSERT INTO users (email, password, name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email)
         DO UPDATE SET password = $2, name = $3`,
        [email, finalPassword, name, 'student']
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
    // إنشاء حساب تسجيل الدخول إذا تم توفير كلمة المرور
    if (password) {
      await pool.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password = $2, name = $3',
        [email, password, name, 'student']
      );
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
