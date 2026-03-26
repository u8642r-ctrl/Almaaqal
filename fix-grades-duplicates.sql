-- حذف السجلات المكررة في جدول grades مع الاحتفاظ بأحدث سجل
DELETE FROM grades a USING grades b
WHERE a.id < b.id
  AND a.student_id = b.student_id
  AND a.course_id = b.course_id
  AND a.semester = b.semester;

-- إضافة قيد UNIQUE إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grades_student_course_semester_unique'
  ) THEN
    ALTER TABLE grades ADD CONSTRAINT grades_student_course_semester_unique
    UNIQUE (student_id, course_id, semester);
  END IF;
END $$;
