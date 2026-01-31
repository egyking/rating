
-- 1. جدول المفتشين
CREATE TABLE IF NOT EXISTS inspectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    password TEXT DEFAULT '123456',
    department TEXT DEFAULT 'الجنوب',
    active BOOLEAN DEFAULT true,
    role TEXT DEFAULT 'inspector',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول بنود التقييم (تحديث عمود الأسئلة ليكون JSONB)
CREATE TABLE IF NOT EXISTS evaluation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_item TEXT NOT NULL,
    main_item TEXT NOT NULL,
    code TEXT NOT NULL,
    department TEXT DEFAULT 'الجنوب',
    sub_types JSONB DEFAULT '[]'::jsonb, -- مصفوفة من النصوص
    once_per_day BOOLEAN DEFAULT false,
    questions JSONB DEFAULT '[]'::jsonb, -- مصفوفة من الكائنات تحتوي على (label, type, options, showIf)
    status TEXT DEFAULT 'approved', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول سجلات التقييم (حيث يتم حفظ الإجابات)
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
    answers JSONB DEFAULT '{}'::jsonb, -- الإجابات المولدة
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending'
);

-- 4. جدول المستهدفات
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

-- 5. جدول التنبيهات
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES inspectors(id) ON DELETE CASCADE,
    role_target TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
