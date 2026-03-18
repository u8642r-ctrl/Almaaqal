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

export async function initDatabase(force = false) {
  if (dbInitialized && !force) return;

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

    // جدول المحتوى التعليمي (محاضرات / واجبات)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_contents (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
        content_type VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        due_date TIMESTAMP NULL,
        file_name VARCHAR(255),
        file_data LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // جدول تصحيح الواجبات ودرجاتها
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homework_grades (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES course_contents(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        submission_text TEXT,
        submitted_at TIMESTAMP NULL,
        grade DECIMAL(5,2),
        feedback TEXT,
        graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(content_id, student_id)
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
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS stage VARCHAR(10)",
      "ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
      "ALTER TABLE teachers ADD COLUMN IF NOT EXISTS department VARCHAR(100)",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_id INTEGER",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS stage VARCHAR(10)",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS term VARCHAR(10)",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS department_id INTEGER",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS accessible_stages TEXT",
      "ALTER TABLE grades ADD COLUMN IF NOT EXISTS pass_type VARCHAR(20) DEFAULT 'first_round'",
      "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS is_carried_over BOOLEAN DEFAULT FALSE",
      "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS original_stage VARCHAR(10)",
      "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'",
    ];
    for (const q of alterQueries) {
      try { await pool.query(q); } catch { /* العمود موجود مسبقاً */ }
    }

    // تحديث البيانات الموجودة: تعيين accessible_stages للطلاب لتشمل جميع المراحل من 1 إلى مرحلتهم الحالية
    try {
      await pool.query(`
        UPDATE students
        SET accessible_stages = CASE
          WHEN stage = '4' THEN '["1","2","3","4"]'
          WHEN stage = '3' THEN '["1","2","3"]'
          WHEN stage = '2' THEN '["1","2"]'
          WHEN stage = '1' THEN '["1"]'
          ELSE '["1","2","3","4"]'
        END
        WHERE accessible_stages IS NULL OR accessible_stages = '' OR accessible_stages = '[]'
      `);
    } catch (err) {
      console.log("تحديث accessible_stages فشل، سيتم تجاهلها:", err);
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

    dbInitialized = true;
    console.log("✅ Database initialized successfully");
  } catch (err) {
    console.error("❌ Database init error:", err);
  }
}

export default pool;
