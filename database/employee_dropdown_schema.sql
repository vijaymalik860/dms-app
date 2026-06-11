-- ============================================================
-- DMS App - Employee Master Data & Dropdown Module Schema
-- Modules: master_field_types, master_dropdown_values, personnel
-- ============================================================

-- Enable UUID extension (Neon me pehle se hota hai, phir bhi safe)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────────────────────────
-- 1. DROPDOWN: FIELD TYPES TABLE
--    (Rank, Religion, Caste, Blood Group, Gender etc.)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_field_types (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name           TEXT NOT NULL UNIQUE,    -- internal key e.g. 'rank'
    display_name         TEXT NOT NULL,            -- shown in UI e.g. 'Rank'
    personnel_field_name TEXT,                     -- maps to personnel column
    helper_example       TEXT,                     -- e.g. 'Inspector, HC, Constable'
    is_active            BOOLEAN DEFAULT TRUE,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);

-- Seed: default field types for Haryana Police
INSERT INTO master_field_types (field_name, display_name, personnel_field_name, helper_example) VALUES
    ('rank',           'Rank',         'rank',           'Inspector, HC, Constable'),
    ('gender',         'Gender',       'gender',         'Male, Female, Other'),
    ('blood_group',    'Blood Group',  'blood_group',    'A+, B+, O+, AB+'),
    ('religion',       'Religion',     'religion',       'Hindu, Muslim, Sikh, Christian'),
    ('caste',          'Caste',        'caste',          'General, OBC, SC, ST'),
    ('cadre',          'Cadre',        'cadre',          'State, District, Special'),
    ('service_status', 'Service Status','service_status','Active, Suspended, Retired')
ON CONFLICT (field_name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 2. DROPDOWN: VALUES TABLE
--    (actual dropdown options linked to each field type)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_dropdown_values (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_type_id UUID NOT NULL REFERENCES master_field_types(id) ON DELETE CASCADE,
    value         TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(field_type_id, value)
);

-- Index for fast lookup by field_type_id
CREATE INDEX IF NOT EXISTS idx_dropdown_field_type ON master_dropdown_values(field_type_id);

-- Seed: Rank values
INSERT INTO master_dropdown_values (field_type_id, value, display_order)
SELECT id, unnest(ARRAY[
    'Director General of Police (DGP)',
    'Additional DGP (ADGP)',
    'Inspector General (IG)',
    'Deputy Inspector General (DIG)',
    'Senior Superintendent of Police (SSP)',
    'Superintendent of Police (SP)',
    'Additional SP (ASP)',
    'Deputy SP (DSP)',
    'Inspector',
    'Sub-Inspector (SI)',
    'Assistant Sub-Inspector (ASI)',
    'Head Constable (HC)',
    'Constable'
]), generate_series(1, 13)
FROM master_field_types WHERE field_name = 'rank'
ON CONFLICT (field_type_id, value) DO NOTHING;

-- Seed: Gender values
INSERT INTO master_dropdown_values (field_type_id, value, display_order)
SELECT id, unnest(ARRAY['Male','Female','Other']), generate_series(1,3)
FROM master_field_types WHERE field_name = 'gender'
ON CONFLICT (field_type_id, value) DO NOTHING;

-- Seed: Blood Group values
INSERT INTO master_dropdown_values (field_type_id, value, display_order)
SELECT id, unnest(ARRAY['A+','A-','B+','B-','O+','O-','AB+','AB-']), generate_series(1,8)
FROM master_field_types WHERE field_name = 'blood_group'
ON CONFLICT (field_type_id, value) DO NOTHING;

-- Seed: Religion values
INSERT INTO master_dropdown_values (field_type_id, value, display_order)
SELECT id, unnest(ARRAY['Hindu','Muslim','Sikh','Christian','Buddhist','Jain','Other']), generate_series(1,7)
FROM master_field_types WHERE field_name = 'religion'
ON CONFLICT (field_type_id, value) DO NOTHING;

-- Seed: Caste values
INSERT INTO master_dropdown_values (field_type_id, value, display_order)
SELECT id, unnest(ARRAY['General','OBC','SC','ST']), generate_series(1,4)
FROM master_field_types WHERE field_name = 'caste'
ON CONFLICT (field_type_id, value) DO NOTHING;

-- Seed: Cadre values
INSERT INTO master_dropdown_values (field_type_id, value, display_order)
SELECT id, unnest(ARRAY['State Cadre','District Cadre','Special Branch','Intelligence']), generate_series(1,4)
FROM master_field_types WHERE field_name = 'cadre'
ON CONFLICT (field_type_id, value) DO NOTHING;

-- Seed: Service Status values
INSERT INTO master_dropdown_values (field_type_id, value, display_order)
SELECT id, unnest(ARRAY['Active','Suspended','Deputation','Leave','Retired']), generate_series(1,5)
FROM master_field_types WHERE field_name = 'service_status'
ON CONFLICT (field_type_id, value) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 3. PERSONNEL (EMPLOYEE MASTER DATA) TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personnel (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    belt_number         TEXT,
    pay_code            TEXT UNIQUE,                   -- Unique identifier for bulk upsert
    full_name           TEXT NOT NULL,
    father_name         TEXT,
    photo_url           TEXT,                          -- relative path: uploads/personnel/filename.jpg
    date_of_birth       DATE,
    gender              TEXT,
    blood_group         TEXT,
    mobile_number       TEXT,
    religion            TEXT,
    caste               TEXT,
    rank                TEXT,
    cadre               TEXT,
    service_status      TEXT DEFAULT 'Active',
    node_id             INTEGER REFERENCES hierarchy_nodes(id) ON DELETE SET NULL,  -- hierarchy link
    date_of_enlistment  DATE,
    retirement_date     DATE,
    extra_fields        JSONB DEFAULT '{}',            -- flexible extra data
    is_deleted          BOOLEAN DEFAULT FALSE,
    created_by_user_id  UUID,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_personnel_pay_code    ON personnel(pay_code);
CREATE INDEX IF NOT EXISTS idx_personnel_node_id     ON personnel(node_id);
CREATE INDEX IF NOT EXISTS idx_personnel_is_deleted  ON personnel(is_deleted);
CREATE INDEX IF NOT EXISTS idx_personnel_rank        ON personnel(rank);


-- ─────────────────────────────────────────────────────────────
-- 4. HELPER VIEW: Personnel with Hierarchy info
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_personnel_full AS
SELECT
    p.id,
    p.belt_number,
    p.pay_code,
    p.full_name,
    p.father_name,
    p.photo_url,
    p.date_of_birth,
    p.gender,
    p.blood_group,
    p.mobile_number,
    p.religion,
    p.caste,
    p.rank,
    p.cadre,
    p.service_status,
    p.date_of_enlistment,
    p.retirement_date,
    p.extra_fields,
    p.is_deleted,
    p.created_at,
    p.updated_at,
    -- Hierarchy info
    hn.name     AS unit_name,
    hl.name     AS unit_level
FROM personnel p
LEFT JOIN hierarchy_nodes hn ON p.node_id = hn.id
LEFT JOIN hierarchy_levels hl ON hn.level_id = hl.id
WHERE p.is_deleted = FALSE;
