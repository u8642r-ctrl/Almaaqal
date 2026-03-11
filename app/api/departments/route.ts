import { NextRequest } from 'next/server';
import pool from '../../../lib/db';
import { initDatabase } from '../../../lib/db';

export async function GET(req: NextRequest) {
  await initDatabase();
  const { searchParams } = new URL(req.url);
  const facultyId = searchParams.get('faculty_id');
  try {
    let query: string;
    let params: any[];
    if (facultyId) {
      query = `SELECT d.*, f.name AS faculty_name FROM departments d
               LEFT JOIN faculties f ON f.id = d.faculty_id
               WHERE d.faculty_id = $1 ORDER BY d.id DESC`;
      params = [facultyId];
    } else {
      query = `SELECT d.*, f.name AS faculty_name FROM departments d
               LEFT JOIN faculties f ON f.id = d.faculty_id
               ORDER BY d.id DESC`;
      params = [];
    }
    const result = await pool.query(query, params);
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
    const { name, code, faculty_id, description } = await req.json();
    if (!name || !code || !faculty_id) {
      return new Response(JSON.stringify({ error: 'اسم القسم والرمز والكلية مطلوبة' }), { status: 400 });
    }
    const result = await pool.query(
      'INSERT INTO departments (name, code, faculty_id, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, code.toUpperCase(), faculty_id, description || null]
    );
    return new Response(JSON.stringify(result.rows[0]), { status: 201 });
  } catch (err: any) {
    let msg = 'DB error';
    if (err.code === '23505') msg = 'رمز القسم مستخدم مسبقاً';
    return new Response(JSON.stringify({ error: msg, details: err.message }), { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'رقم القسم مطلوب' }), { status: 400 });
  try {
    const { name, code, faculty_id, description } = await req.json();
    if (!name || !code || !faculty_id) {
      return new Response(JSON.stringify({ error: 'اسم القسم والرمز والكلية مطلوبة' }), { status: 400 });
    }
    await pool.query(
      'UPDATE departments SET name = $1, code = $2, faculty_id = $3, description = $4 WHERE id = $5',
      [name, code.toUpperCase(), faculty_id, description || null, id]
    );
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    let msg = 'DB error';
    if (err.code === '23505') msg = 'رمز القسم مستخدم مسبقاً';
    return new Response(JSON.stringify({ error: msg, details: err.message }), { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'رقم القسم مطلوب' }), { status: 400 });
  try {
    await pool.query('DELETE FROM departments WHERE id = $1', [id]);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'DB error', details: err.message }), { status: 500 });
  }
}
