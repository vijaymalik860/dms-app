-- ============================================================
-- DMS App — Neon PostgreSQL Setup Script
-- Run this in: Neon Console → SQL Editor
-- Structure: State → Range → District → Units → Sub-Units → Chowki
-- ============================================================

-- 1. LEVELS TABLE
CREATE TABLE IF NOT EXISTS hierarchy_levels (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    level_order INT NOT NULL,
    color       VARCHAR(20),
    created_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO hierarchy_levels (name, level_order, color) VALUES
    ('State',    1, '#6366f1'),
    ('Range',    2, '#8b5cf6'),
    ('District', 3, '#a78bfa'),
    ('Units',    4, '#94a3b8'),   -- level 4: Police Stations, Traffic, Security, etc.
    ('Sub-Units',5, '#f472b6'),   -- level 5: Actual PS names, Training Wings, etc.
    ('Chowki',   6, '#f0abfc')    -- level 6: Chowkis
ON CONFLICT DO NOTHING;


-- 2. HIERARCHY NODES TABLE
CREATE TABLE IF NOT EXISTS hierarchy_nodes (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    code        VARCHAR(50) UNIQUE,
    level_id    INT REFERENCES hierarchy_levels(id) ON DELETE RESTRICT,
    parent_id   INT REFERENCES hierarchy_nodes(id) ON DELETE CASCADE,
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    pos_x       FLOAT DEFAULT 0,
    pos_y       FLOAT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_parent ON hierarchy_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_level  ON hierarchy_nodes(level_id);


-- 3. SEED DATA

-- Level 1: State
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Haryana', 'HR', 1, NULL)
ON CONFLICT DO NOTHING;

-- Level 2: Ranges
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Ambala Range',   'HR-AMB-RNG', 2, (SELECT id FROM hierarchy_nodes WHERE code='HR')),
    ('Rohtak Range',   'HR-ROH-RNG', 2, (SELECT id FROM hierarchy_nodes WHERE code='HR'))
ON CONFLICT DO NOTHING;

-- Level 3: Districts (Ambala Range)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Ambala District',     'HR-AMB-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-RNG')),
    ('Kurukshetra District','HR-KRK-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-RNG'))
ON CONFLICT DO NOTHING;

-- Level 4: Units (Ambala District)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Police Stations',      'HR-AMB-UNIT-PS',   4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST')),
    ('Traffic',              'HR-AMB-UNIT-TRF',  4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST')),
    ('Special Staffs',       'HR-AMB-UNIT-SPL',  4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST')),
    ('Court',                'HR-AMB-UNIT-CRT',  4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST')),
    ('Administrative Units', 'HR-AMB-UNIT-ADM',  4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST')),
    ('Security',             'HR-AMB-UNIT-SEC',  4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST')),
    ('Temp_Dep_Trg',         'HR-AMB-UNIT-TMP',  4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST'))
ON CONFLICT DO NOTHING;

-- Level 5: Sub-Units (under Police Stations -> Ambala District)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('PS Ambala City',  'HR-AMB-PS-01', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-UNIT-PS')),
    ('PS Ambala Cantt', 'HR-AMB-PS-02', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-UNIT-PS')),
    ('PS Baldev Nagar', 'HR-AMB-PS-03', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-UNIT-PS')),
    ('PS Mullana',      'HR-AMB-PS-04', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-UNIT-PS'))
ON CONFLICT DO NOTHING;

-- Level 5: Sub-Units (under Temp_Dep_Trg -> Ambala District)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Temporary Posting (with order)',    'HR-AMB-TMP-01', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-UNIT-TMP')),
    ('Temporary Posting (without order)', 'HR-AMB-TMP-02', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-UNIT-TMP')),
    ('Training Courses',                  'HR-AMB-TMP-03', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-UNIT-TMP'))
ON CONFLICT DO NOTHING;

-- Level 6: Chowki (under PS Ambala City)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Chowki Balughat',      'HR-AMB-PS-01-CK-01', 6, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-PS-01')),
    ('Chowki Court Complex', 'HR-AMB-PS-01-CK-02', 6, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-PS-01')),
    ('Chowki Bus Stand',     'HR-AMB-PS-01-CK-03', 6, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-PS-01'))
ON CONFLICT DO NOTHING;


-- 4. HELPER VIEW
CREATE OR REPLACE VIEW vw_hierarchy_full AS
SELECT
    n.id,
    n.name,
    n.code,
    n.parent_id,
    n.is_active,
    l.name        AS level_name,
    l.level_order,
    l.color,
    p.name        AS parent_name,
    p.code        AS parent_code
FROM hierarchy_nodes n
JOIN hierarchy_levels l ON n.level_id = l.id
LEFT JOIN hierarchy_nodes p ON n.parent_id = p.id
ORDER BY l.level_order, n.name;

-- Verify:
-- SELECT level_name, COUNT(*) as total FROM vw_hierarchy_full GROUP BY level_name, level_order ORDER BY level_order;
