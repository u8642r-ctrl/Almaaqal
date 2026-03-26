import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool from "../../../../lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const studentResult = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      // No student found for the session email
      return NextResponse.json({ stages: [], summary: {} });
    }

    const studentId = studentResult.rows[0].id;

    // Correctly fetch all enrollments and LEFT JOIN grades
    const result = await pool.query(
      `SELECT
          e.id as enrollment_id,
          c.id as course_id, c.name as course_name, c.code as course_code,
          c.stage, c.term, c.description as course_description,
          t.name as teacher_name,
          g.id as grade_id, g.grade, g.semester, g.created_at, g.pass_type,
          e.is_carried_over, e.status as enrollment_status
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       LEFT JOIN grades g ON e.course_id = g.course_id AND e.student_id = g.student_id
       WHERE e.student_id = $1
       ORDER BY c.stage ASC, c.term ASC, c.name ASC, g.created_at DESC`,
      [studentId]
    );

    // Organize data by stages and courses
    const groupedData: any = {};
    let totalGrades = 0;
    let gradeSum = 0;

    result.rows.forEach((row) => {
      const stage = row.stage || '1';
      if (!groupedData[stage]) {
        groupedData[stage] = {};
      }

      const courseKey = row.course_id;
      if (!groupedData[stage][courseKey]) {
        groupedData[stage][courseKey] = {
          id: row.course_id,
          name: row.course_name,
          code: row.course_code,
          stage: row.stage,
          term: row.term,
          description: row.course_description,
          teacher_name: row.teacher_name,
          is_carried_over: row.is_carried_over,
          enrollment_status: row.enrollment_status,
          grades: []
        };
      }

      if (row.grade_id) { // If a grade exists for this entry
        groupedData[stage][courseKey].grades.push({
          id: row.grade_id,
          grade: row.grade,
          semester: row.semester,
          pass_type: row.pass_type,
          created_at: row.created_at
        });

        // For summary calculation
        if (row.grade !== null && row.grade !== undefined) {
          totalGrades++;
          gradeSum += parseFloat(row.grade) || 0;
        }
      }
    });
    
    // Add a message for courses without grades
    Object.values(groupedData).forEach((stage: any) => {
      Object.values(stage).forEach((course: any) => {
        if (course.grades.length === 0) {
          course.grades.push({
            id: `no-grade-${course.id}`,
            grade: 'لم تسجل درجة بعد',
            semester: course.term,
            pass_type: 'pending',
            created_at: new Date().toISOString()
          });
        }
      });
    });

    const stages = Object.keys(groupedData).map(stageName => ({
      stage: stageName,
      courses: Object.values(groupedData[stageName])
    }));

    return NextResponse.json({
      stages,
      summary: {
        totalCourses: result.rows.map(r => r.course_id).filter((v, i, a) => a.indexOf(v) === i).length,
        totalGrades,
        averageGrade: totalGrades > 0 ? (gradeSum / totalGrades).toFixed(2) : '0.00'
      }
    });

  } catch (err: any) {
    console.error("Error fetching student grades:", err);
    return NextResponse.json({ error: "فشل في جلب البيانات: " + err.message }, { status: 500 });
  }
}

