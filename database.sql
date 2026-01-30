
-- 1. إضافة عمود metadata المفقود لجدول السجلات
ALTER TABLE evaluation_records 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. إضافة عمود answers المفقود
ALTER TABLE evaluation_records 
ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;

-- 3. السماح لعمود معرف المفتش بقبول قيم فارغة (لأن المدير ليس مفتشاً مسجلاً)
ALTER TABLE evaluation_records 
ALTER COLUMN inspector_id DROP NOT NULL;

-- 4. تحديث جدول المستهدفات لدعم التصنيف الرئيسي
ALTER TABLE targets 
ADD COLUMN IF NOT EXISTS main_item TEXT NOT NULL DEFAULT 'جميع البنود';
