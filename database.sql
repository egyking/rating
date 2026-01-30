
-- 1. جدول المفتشين
CREATE TABLE IF NOT EXISTS inspectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    department TEXT DEFAULT 'الجنوب',
    active BOOLEAN DEFAULT true,
    role TEXT DEFAULT 'inspector',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول بنود التقييم
CREATE TABLE IF NOT EXISTS evaluation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_item TEXT NOT NULL,
    main_item TEXT NOT NULL,
    code TEXT NOT NULL,
    department TEXT DEFAULT 'الجنوب',
    sub_types JSONB DEFAULT '[]'::jsonb,
    once_per_day BOOLEAN DEFAULT false,
    questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول العطلات
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. تعديل جدول السجلات لإضافة الأعمدة المطلوبة
ALTER TABLE evaluation_records 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE evaluation_records 
ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;

ALTER TABLE evaluation_records 
ALTER COLUMN inspector_id DROP NOT NULL;

-- 5. تحديث جدول المستهدفات
ALTER TABLE targets 
ADD COLUMN IF NOT EXISTS main_item TEXT NOT NULL DEFAULT 'جميع البنود';
