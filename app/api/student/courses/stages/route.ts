import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import pool, { initDatabase } from "../../../../../lib/db";

type CourseItem = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  teacher_name: string | null;
  enrolled_at: string;
  term: string | null;
  stage: string;
  is_carried_over: boolean;
  original_stage: string | null;
  grade: number | null;
  grade_description: string;
  is_ghost?: boolean;
};

type Term = {
  term: string;
  term_name: string;
  courses: CourseItem[];
  total_courses: number;
};

type Stage = {
  stage: string;
  stage_name: string;
  terms: Term[];
  total_courses: number;
};

function getGradeDescription(grade: number | null): string {
    if (grade === null || grade === undefined) return "لم تسجل بعد";
    if (grade < 50) return "راسب";
    if (grade < 60) return "مقبول";
    if (grade < 70) return "متوسط";
    if (grade < 80) return "جيد";
    if (grade < 90) return "جيد جداً";
    return "امتياز";
}

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

    const termNames: {[key: string]: string} = {
      'كورس_اول': 'الكورس الأول',
      'كورس_ثاني': 'الكورس الثاني',
      'fall': 'الكورس الأول',
      'spring': 'الكورس الثاني',
      'summer': 'الفصل الصيفي'
    };

    // جلب المواد المسجل فيها الطالب مع معلومات الأستاذ ومعلومات التحميل
    const query = `
      -- Part 1: All courses, with carried-over ones appearing in the next stage
      SELECT c.id, c.name, c.code, c.description, c.stage as course_stage, c.term,
             t.name as teacher_name, e.enrolled_at,
             e.is_carried_over, e.original_stage, e.status,
             s.stage as current_student_stage,
             g.grade,
             FALSE as is_ghost,
             CASE
               WHEN e.is_carried_over = TRUE THEN (c.stage::integer + 1)::text
               ELSE c.stage
             END as display_stage,
             CASE
               WHEN e.is_carried_over = TRUE THEN e.original_stage
               ELSE c.stage
             END as original_course_stage
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN students s ON e.student_id = s.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN (
        SELECT DISTINCT ON (student_id, course_id) student_id, course_id, grade
        FROM grades
        ORDER BY student_id, course_id, id DESC
      ) g ON e.student_id = g.student_id AND g.course_id = c.id
      WHERE e.student_id = $1 AND e.status IN ('active', 'carried_over')

      UNION ALL

      -- Part 2: The "ghost" image of carried-over courses in their original stage
      SELECT c.id, c.name, c.code, c.description, c.stage as course_stage, c.term,
             t.name as teacher_name, e.enrolled_at,
             FALSE as is_carried_over, -- Pretend it's not carried over
             c.stage as original_stage, -- The original stage is the course's stage
             e.status, -- Keep original status
             s.stage as current_student_stage,
             g.grade,
             TRUE as is_ghost,
             c.stage as display_stage, -- Display in original stage
             c.stage as original_course_stage -- The original stage is the course's stage
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN students s ON e.student_id = s.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN (
        SELECT DISTINCT ON (student_id, course_id) student_id, course_id, grade
        FROM grades
        ORDER BY student_id, course_id, id DESC
      ) g ON e.student_id = g.student_id AND g.course_id = c.id
      WHERE e.student_id = $1 AND e.is_carried_over = TRUE -- Only for carried over courses
      ORDER BY display_stage ASC, term ASC, name ASC
    `;

    const result = await pool.query(query, [studentId]);
    const courses = result.rows;

    // تنظيم البيانات حسب المراحل والكورسات
    const stagesMap: {[key: string]: Stage} = {};

    courses.forEach((course: any) => {
      const stage = course.display_stage || '1'; // المرحلة للعرض (محملة أو أصلية)
      const stageName = stageNames[stage] || `المرحلة ${stage}`;
      const term = course.term || 'كورس_اول'; // افتراض الكورس الأول إذا لم يكن محدد
      const termName = termNames[term] || term;

      // إنشاء المرحلة إذا لم تكن موجودة
      if (!stagesMap[stage]) {
        stagesMap[stage] = {
          stage,
          stage_name: stageName,
          terms: [],
          total_courses: 0
        };
      }

      // البحث عن الكورس في المرحلة أو إنشاءه
      let termObj = stagesMap[stage].terms.find(t => t.term === term);
      if (!termObj) {
        termObj = {
          term,
          term_name: termName,
          courses: [],
          total_courses: 0
        };
        stagesMap[stage].terms.push(termObj);
      }

      // منع تكرار المادة إذا كانت موجودة مسبقاً (لتفادي أي تكرار ناتج عن مشاكل قاعدة البيانات)
      const isDuplicate = termObj.courses.some((c: any) => c.id === course.id && c.is_ghost === course.is_ghost);
      
      if (!isDuplicate) {
        // تحديد التقدير النهائي بناءً على تقييم الأستاذ أو مرحلة المادة
        let description = getGradeDescription(course.grade);
        if (course.is_ghost) {
          description = "راسب"; // المادة في مرحلتها الأصلية تظهر دائماً راسب كأمر واقع
        }

        // إضافة الكورس للكورس المناسب
        termObj.courses.push({
          id: course.id,
          name: course.name,
          code: course.code,
          description: course.description,
          teacher_name: course.teacher_name,
          enrolled_at: course.enrolled_at,
          term: course.term,
          stage: course.display_stage, // المرحلة التي ستظهر فيها
          is_carried_over: course.is_carried_over,
          is_ghost: course.is_ghost,
          original_stage: course.is_carried_over ? course.original_stage : course.course_stage, // المرحلة الأصلية
          grade: course.grade,
          grade_description: description
        });

        termObj.total_courses++;
        stagesMap[stage].total_courses++;
      }
    });

    // ترتيب الكورسات داخل كل مرحلة
    Object.values(stagesMap).forEach(stage => {
      stage.terms.sort((a, b) => {
        const order: {[key: string]: number} = {
          'كورس_اول': 1, 'fall': 1,
          'كورس_ثاني': 2, 'spring': 2,
          'summer': 3
        };
        return (order[a.term] || 0) - (order[b.term] || 0);
      });
    });

    // تحويل إلى مصفوفة مرتبة حسب المرحلة
    const stagesArray = Object.values(stagesMap).sort((a, b) =>
      parseInt(a.stage) - parseInt(b.stage)
    );

    // حساب عدد المواد الفريدة لتجنب تكرار العداد بسبب النسخ الوهمية أو تعدد سجلات الدرجات
    const uniqueCourseIds = new Set(courses.map((c: any) => c.id));
    const activeCourseIds = new Set(
      courses.filter((c: any) => c.status === 'active' || c.status === 'carried_over').map((c: any) => c.id)
    );

    return NextResponse.json({
      stages: stagesArray,
      summary: {
        total_stages: stagesArray.length,
        total_courses: uniqueCourseIds.size,
        active_courses: activeCourseIds.size
      }
    });

  } catch (err: any) {
    console.error("Error fetching courses by stages:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}