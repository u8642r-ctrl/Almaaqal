import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import pool, { initDatabase } from "../../../../../lib/db";

type LectureItem = {
  id: number;
  course_id: number;
  title: string;
  description: string;
  file_name: string | null;
  created_at: string;
  course_name: string;
  course_code: string;
  teacher_name: string;
  content_type_arabic: string;
};

type Course = {
  id: number;
  name: string;
  code: string;
  lectures: LectureItem[];
};

type Stage = {
  stage: string;
  stage_name: string;
  courses: Course[];
};

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

    // الحصول على تنسيق المراحل
    const stageNames: {[key: string]: string} = {
      '1': 'المرحلة الأولى',
      '2': 'المرحلة الثانية',
      '3': 'المرحلة الثالثة',
      '4': 'المرحلة الرابعة'
    };

    // جلب جميع المحاضرات مع تفاصيل الكورسات والمراحل
    const query = `
      SELECT
        cc.id, cc.course_id, cc.content_type, cc.title, cc.description,
        cc.due_date, cc.file_name, cc.created_at,
        c.name as course_name, c.code as course_code, c.stage,
        t.name as teacher_name,
        CASE
          WHEN cc.content_type = 'lecture' THEN 'محاضرة'
          WHEN cc.content_type = 'homework' THEN 'واجب'
          ELSE cc.content_type
        END as content_type_arabic
      FROM course_contents cc
      JOIN courses c ON cc.course_id = c.id
      JOIN teachers t ON cc.teacher_id = t.id
      JOIN enrollments e ON c.id = e.course_id
      WHERE e.student_id = $1 AND cc.content_type = 'lecture'
      ORDER BY c.stage ASC, c.name ASC, cc.created_at DESC
    `;

    const result = await pool.query(query, [studentId]);
    const lectures = result.rows;

    // تنظيم البيانات حسب المراحل والكورسات
    const stagesMap: {[key: string]: Stage} = {};

    lectures.forEach((lecture: any) => {
      const stage = lecture.stage || '1'; // افتراض المرحلة الأولى إذا لم تكن محددة
      const stageName = stageNames[stage] || `المرحلة ${stage}`;

      // إنشاء المرحلة إذا لم تكن موجودة
      if (!stagesMap[stage]) {
        stagesMap[stage] = {
          stage,
          stage_name: stageName,
          courses: []
        };
      }

      // البحث عن الكورس في هذه المرحلة
      let course = stagesMap[stage].courses.find(c => c.id === lecture.course_id);

      // إنشاء الكورس إذا لم يكن موجوداً
      if (!course) {
        course = {
          id: lecture.course_id,
          name: lecture.course_name,
          code: lecture.course_code,
          lectures: []
        };
        stagesMap[stage].courses.push(course);
      }

      // إضافة المحاضرة للكورس
      course.lectures.push({
        id: lecture.id,
        course_id: lecture.course_id,
        title: lecture.title,
        description: lecture.description,
        file_name: lecture.file_name,
        created_at: lecture.created_at,
        course_name: lecture.course_name,
        course_code: lecture.course_code,
        teacher_name: lecture.teacher_name,
        content_type_arabic: lecture.content_type_arabic
      });
    });

    // تحويل إلى مصفوفة مرتبة حسب المرحلة
    const stagesArray = Object.values(stagesMap).sort((a, b) =>
      parseInt(a.stage) - parseInt(b.stage)
    );

    return NextResponse.json(stagesArray);

  } catch (err: any) {
    console.error("Error fetching stages:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}