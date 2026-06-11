-- ============================================================
-- DMS App - Personnel Table Migration
-- Naye columns add karo jo form ke sections mein hain
-- Safe: IF NOT EXISTS / ALTER TABLE
-- ============================================================

-- ── Section 1: Personal Details (new columns) ──────────────
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS alternate_contact    TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS aadhar_number        TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS pan                  TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS village_town         TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS home_ps              TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS home_district        TEXT;
-- category already exists as "caste" — rename it
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS category             TEXT;

-- ── Section 2: Education & Training ───────────────────────
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS graduation_degree       TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS subject_graduation      TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS post_graduation_degree  TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS subject_post_graduation TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS swat_awt_course         TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS special_course          TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS promotion_type          TEXT;

-- ── Section 3: Service Details (new columns) ───────────────
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS service_book_number     TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS date_of_last_promotion  DATE;
-- service_type for future
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS service_type            TEXT;

-- ── Section 4: Posting & Location ─────────────────────────
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS state_id             INTEGER;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS range_id             INTEGER;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS district_id          INTEGER;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS unit_type            TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS current_unit_id      INTEGER;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS current_sub_unit_id  INTEGER;

-- ── Section 5: Duty & Role ────────────────────────────────
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS ps_duty_type         TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS company              TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS date_of_posting      DATE;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS r_batch              TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS t_duty_order         TEXT;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS remarks              TEXT;

-- ── Indexes for common queries ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_personnel_state    ON personnel(state_id);
CREATE INDEX IF NOT EXISTS idx_personnel_district ON personnel(district_id);
CREATE INDEX IF NOT EXISTS idx_personnel_unit     ON personnel(current_unit_id);

-- ── Update view to include new columns ────────────────────
DROP VIEW IF EXISTS vw_personnel_full;
CREATE VIEW vw_personnel_full AS
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
    p.alternate_contact,
    p.religion,
    p.caste,
    p.category,
    p.aadhar_number,
    p.pan,
    p.village_town,
    p.home_ps,
    p.home_district,
    p.rank,
    p.cadre,
    p.service_status,
    p.service_book_number,
    p.service_type,
    p.date_of_enlistment,
    p.date_of_last_promotion,
    p.retirement_date,
    p.graduation_degree,
    p.subject_graduation,
    p.post_graduation_degree,
    p.subject_post_graduation,
    p.swat_awt_course,
    p.special_course,
    p.promotion_type,
    p.state_id,
    p.range_id,
    p.district_id,
    p.unit_type,
    p.current_unit_id,
    p.current_sub_unit_id,
    p.ps_duty_type,
    p.company,
    p.date_of_posting,
    p.r_batch,
    p.t_duty_order,
    p.remarks,
    p.extra_fields,
    p.is_deleted,
    p.created_at,
    p.updated_at,
    -- Hierarchy info
    hn.name  AS unit_name,
    hl.name  AS unit_level
FROM personnel p
LEFT JOIN hierarchy_nodes hn ON p.node_id = hn.id
LEFT JOIN hierarchy_levels hl ON hn.level_id = hl.id
WHERE p.is_deleted = FALSE;

SELECT 'Migration complete ✅' AS status;
