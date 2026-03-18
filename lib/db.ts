import { Pool } from 'pg';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      }
);

let dbInitialized = false;

export async function initDatabase() {
  if (dbInitialized) return;

  try {
    // جدول المستخدمين (تسجيل الدخول)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // جدول الطلاب
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // جدول الأساتذة
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // جدول المواد الدراسية
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        description TEXT,
        teacher_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // جدول التسجيل في المواد (طالب-مادة)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, course_id)
      )
    `);

    // جدول الدرجات
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        grade DECIMAL(5,2),
        semester VARCHAR(50) DEFAULT '2025-2026',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // جدول الحضور
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'present',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, course_id, date)
      )
    `);

    // جدول الكليات
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faculties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // جدول الأقسام
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        faculty_id INTEGER REFERENCES faculties(id) ON DELETE CASCADE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إضافة أعمدة جديدة إذا لم تكن موجودة (للتوافق مع قواعد بيانات سابقة)
    const alterQueries = [
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS department VARCHAR(100)",
      "ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
      "ALTER TABLE teachers ADD COLUMN IF NOT EXISTS department VARCHAR(100)",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_id INTEGER",
    ];
    for (const q of alterQueries) {
      try { await pool.query(q); } catch { /* العمود موجود مسبقاً */ }
    }

    // إدخال المستخدمين الافتراضيين
    await pool.query(`
      INSERT INTO users (email, password, name, role) VALUES
        ('admin@almaqal.edu.iq', 'admin2001', 'مدير النظام', 'admin'),
        ('student@almaqal.edu.iq', '123456', 'أحمد محمد علي', 'student'),
        ('teacher@almaqal.edu.iq', '123456', 'د. حسين كاظم', 'teacher')
      ON CONFLICT (email) DO NOTHING
    `);

    // تحديث باسورد الأدمن
    await pool.query(`
      UPDATE users SET password = 'admin2001' WHERE email = 'admin@almaqal.edu.iq'
    `);

    // إدخال سجل الطالب الافتراضي
    await pool.query(`
      INSERT INTO students (name, email, phone, department) VALUES
        ('أحمد محمد علي', 'student@almaqal.edu.iq', '07801234567', 'علوم الحاسوب')
      ON CONFLICT (email) DO NOTHING
    `);

    // إدخال سجل الأستاذ الافتراضي
    await pool.query(`
      INSERT INTO teachers (name, email, phone, department) VALUES
        ('د. حسين كاظم', 'teacher@almaqal.edu.iq', '07701234567', 'علوم الحاسوب')
      ON CONFLICT (email) DO NOTHING
    `);

    // إدخال مواد دراسية للأستاذ الافتراضي
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      ['teacher@almaqal.edu.iq']
    );

    if (teacherResult.rows.length > 0) {
      const teacherId = teacherResult.rows[0].id;
      await pool.query(`
        INSERT INTO courses (name, code, description, teacher_id) VALUES
          ('برمجة الويب', 'CS101', 'مقرر أساسي في تطوير تطبيقات الويب', $1),
          ('قواعد البيانات', 'CS102', 'دراسة أنظمة إدارة قواعد البيانات', $1),
          ('هياكل البيانات', 'CS103', 'مقرر متقدم في تنظيم البيانات', $1)
        ON CONFLICT (code) DO NOTHING
      `, [teacherId]);
    }

    dbInitialized = true;
    console.log("✅ Database initialized successfully");
  } catch (err) {
    console.error("❌ Database init error:", err);
  }
}

export default pool;
