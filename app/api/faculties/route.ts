import { NextRequest } from 'next/server';
import pool from '../../../lib/db';
import { initDatabase } from '../../../lib/db';

export async function GET() {
  await initDatabase();
  try {
    const result = await pool.query(
      `SELECT f.id, f.name, f.code, f.description, f.created_at,
              COUNT(d.id)::int AS departments_count
       FROM faculties f
       LEFT JOIN departments d ON d.faculty_id = f.id
       GROUP BY f.id
       ORDER BY f.id DESC`
    );
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'DB error', details: err.message }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await initDatabase();
  try {
    const { name, code, description } = await req.json();
    if (!name || !code) {
      return new Response(JSON.stringify({ error: 'اسم الكلية والرمز مطلوبان' }), { status: 400 });
    }
    const result = await pool.query(
      'INSERT INTO faculties (name, code, description) VALUES ($1, $2, $3) RETURNING *',
      [name, code.toUpperCase(), description || null]
    );
    return new Response(JSON.stringify(result.rows[0]), { status: 201 });
  } catch (err: any) {
    let msg = 'DB error';
    if (err.code === '23505') msg = 'رمز الكلية مستخدم مسبقاً';
    return new Response(JSON.stringify({ error: msg, details: err.message }), { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'رقم الكلية مطلوب' }), { status: 400 });
  try {
    const { name, code, description } = await req.json();
    if (!name || !code) {
      return new Response(JSON.stringify({ error: 'اسم الكلية والرمز مطلوبان' }), { status: 400 });
    }
    await pool.query(
      'UPDATE faculties SET name = $1, code = $2, description = $3 WHERE id = $4',
      [name, code.toUpperCase(), description || null, id]
    );
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    let msg = 'DB error';
    if (err.code === '23505') msg = 'رمز الكلية مستخدم مسبقاً';
    return new Response(JSON.stringify({ error: msg, details: err.message }), { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'رقم الكلية مطلوب' }), { status: 400 });
  try {
    await pool.query('DELETE FROM faculties WHERE id = $1', [id]);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'DB error', details: err.message }), { status: 500 });
  }
}
