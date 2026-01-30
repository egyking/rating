
-- تنفيذ هذا الكود في SQL Editor بداخل Supabase لإصلاح الأخطاء المذكورة

-- 1. إضافة عمود metadata المفقود
ALTER TABLE evaluation_records 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. إضافة عمود answers المفقود (لضمان عدم حدوث خطأ مستقبلي)
ALTER TABLE evaluation_records 
ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;

-- 3. التأكد من أن حقل معرف المفتش يقبل القيمة الفارغة (للسماح للمدير بالإدخال)
ALTER TABLE evaluation_records 
ALTER COLUMN inspector_id DROP NOT NULL;

-- 4. تحديث جدول المستهدفات لدعم البحث بالبند الرئيسي
ALTER TABLE targets 
ADD COLUMN IF NOT EXISTS main_item TEXT NOT NULL DEFAULT 'جميع البنود';

-- 5. تحديث جدول بنود التقييم لدعم الأسئلة والبنود المرتبطة
ALTER TABLE evaluation_items 
ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS linked_items JSONB DEFAULT '[]'::jsonb;
