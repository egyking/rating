
-- مخطط قاعدة بيانات مطور لنظام الجنوب (بدون موقع أو صور)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- جدول المفتشين
CREATE TABLE IF NOT EXISTS inspectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    department TEXT,
    role TEXT DEFAULT 'inspector', -- admin or inspector
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول بنود التقييم
CREATE TABLE IF NOT EXISTS evaluation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_item TEXT NOT NULL,
    sub_item TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    department TEXT,
    sub_types JSONB DEFAULT '[]'::jsonb,
    once_per_day BOOLEAN DEFAULT false,
    notes TEXT,
    questions JSONB DEFAULT '[]'::jsonb,
    linked_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول السجلات (تم حذف الموقع والصور)
CREATE TABLE IF NOT EXISTS evaluation_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
    inspector_name TEXT,
    item_id UUID REFERENCES evaluation_items(id) ON DELETE SET NULL,
    sub_item TEXT,
    main_item TEXT,
    sub_type TEXT,
    code TEXT,
    department TEXT,
    count INTEGER DEFAULT 1,
    notes TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- جدول المستهدفات
CREATE TABLE IF NOT EXISTS targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspector_id UUID REFERENCES inspectors(id) ON DELETE CASCADE,
    inspector_name TEXT,
    main_item TEXT NOT NULL DEFAULT 'جميع البنود',
    target_value INTEGER NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول العطلات
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_records_date_ins ON evaluation_records(date, inspector_id);
