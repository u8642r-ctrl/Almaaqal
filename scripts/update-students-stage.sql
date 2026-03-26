-- تحديث الطلاب الذين ليس لديهم مرحلة محددة
-- سيتم تعيين المرحلة الأولى كقيمة افتراضية

UPDATE students
SET stage = '1'
WHERE stage IS NULL OR stage = '';

-- تحديث accessible_stages بناءً على المرحلة
UPDATE students
SET accessible_stages = CASE
  WHEN stage = '4' THEN '["1","2","3","4"]'
  WHEN stage = '3' THEN '["1","2","3"]'
  WHEN stage = '2' THEN '["1","2"]'
  WHEN stage = '1' THEN '["1"]'
  ELSE '["1"]'
END
WHERE accessible_stages IS NULL OR accessible_stages = '';
