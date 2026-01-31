
-- 1. جدول المفتشين (تحديث ليشمل كلمة المرور)
CREATE TABLE IF NOT EXISTS inspectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    password TEXT DEFAULT '123456', -- كلمة مرور افتراضية
    department TEXT DEFAULT 'الجنوب',
    active BOOLEAN DEFAULT true,
    role TEXT DEFAULT 'inspector',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. باقي الجداول تبقى كما هي لضمان استمرارية البيانات
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

CREATE TABLE IF NOT EXISTS evaluation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE NOT NULL,
    inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
    inspector_name TEXT NOT NULL,
    item_id UUID REFERENCES evaluation_items(id) ON DELETE SET NULL,
    sub_item TEXT NOT NULL,
    main_item TEXT NOT NULL,
    sub_type TEXT,
    code TEXT NOT NULL,
    department TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    notes TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspector_id UUID REFERENCES inspectors(id) ON DELETE CASCADE,
    inspector_name TEXT NOT NULL,
    main_item TEXT NOT NULL DEFAULT 'جميع البنود',
    target_value INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
