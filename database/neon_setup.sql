-- ============================================================
-- DMS App — Neon PostgreSQL Setup Script
-- Run this in: Neon Console → SQL Editor
-- Structure: State → Range → District → PS → Chowki
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
    ('PS',       4, '#c4b5fd'),   -- must match frontend LEVEL_ORDER array
    ('Chowki',   5, '#f0abfc')
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
    ('Rohtak Range',   'HR-ROH-RNG', 2, (SELECT id FROM hierarchy_nodes WHERE code='HR')),
    ('Hisar Range',    'HR-HIS-RNG', 2, (SELECT id FROM hierarchy_nodes WHERE code='HR')),
    ('Gurugram Range', 'HR-GGN-RNG', 2, (SELECT id FROM hierarchy_nodes WHERE code='HR'))
ON CONFLICT DO NOTHING;

-- Level 3: Districts (Ambala Range)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Ambala District',     'HR-AMB-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-RNG')),
    ('Kurukshetra District','HR-KRK-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-RNG')),
    ('Yamunanagar District','HR-YNR-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-RNG')),
    ('Panchkula District',  'HR-PKL-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-RNG'))
ON CONFLICT DO NOTHING;

-- Level 3: Districts (Rohtak Range)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Rohtak District',  'HR-ROH-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-ROH-RNG')),
    ('Jhajjar District', 'HR-JJR-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-ROH-RNG')),
    ('Sonipat District', 'HR-SNP-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-ROH-RNG'))
ON CONFLICT DO NOTHING;

-- Level 3: Districts (Hisar Range)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Hisar District', 'HR-HIS-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-HIS-RNG')),
    ('Sirsa District', 'HR-SRH-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-HIS-RNG'))
ON CONFLICT DO NOTHING;

-- Level 3: Districts (Gurugram Range)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Gurugram District',  'HR-GGN-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-GGN-RNG')),
    ('Faridabad District', 'HR-FBD-DIST', 3, (SELECT id FROM hierarchy_nodes WHERE code='HR-GGN-RNG'))
ON CONFLICT DO NOTHING;

-- Level 4: Police Stations (Ambala District)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('PS Ambala City',  'HR-AMB-PS-01', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST')),
    ('PS Ambala Cantt', 'HR-AMB-PS-02', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST')),
    ('PS Baldev Nagar', 'HR-AMB-PS-03', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST')),
    ('PS Mullana',      'HR-AMB-PS-04', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-DIST'))
ON CONFLICT DO NOTHING;

-- Level 4: Police Stations (Kurukshetra District)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('PS Thanesar', 'HR-KRK-PS-01', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-KRK-DIST')),
    ('PS Pehowa',   'HR-KRK-PS-02', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-KRK-DIST')),
    ('PS Shahabad', 'HR-KRK-PS-03', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-KRK-DIST'))
ON CONFLICT DO NOTHING;

-- Level 4: Police Stations (Rohtak District)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('PS City Rohtak',  'HR-ROH-PS-01', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-ROH-DIST')),
    ('PS Delhi Bypass', 'HR-ROH-PS-02', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-ROH-DIST')),
    ('PS Asthal Bohar', 'HR-ROH-PS-03', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-ROH-DIST'))
ON CONFLICT DO NOTHING;

-- Level 4: Police Stations (Gurugram District)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('PS DLF Phase-1', 'HR-GGN-PS-01', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-GGN-DIST')),
    ('PS Sohna Road',  'HR-GGN-PS-02', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-GGN-DIST')),
    ('PS Cyber City',  'HR-GGN-PS-03', 4, (SELECT id FROM hierarchy_nodes WHERE code='HR-GGN-DIST'))
ON CONFLICT DO NOTHING;

-- Level 5: Chowki (under PS Ambala City)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Chowki Balughat',      'HR-AMB-PS-01-CK-01', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-PS-01')),
    ('Chowki Court Complex', 'HR-AMB-PS-01-CK-02', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-PS-01')),
    ('Chowki Bus Stand',     'HR-AMB-PS-01-CK-03', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-AMB-PS-01'))
ON CONFLICT DO NOTHING;

-- Level 5: Chowki (under PS Thanesar)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Chowki Pipli',        'HR-KRK-PS-01-CK-01', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-KRK-PS-01')),
    ('Chowki Railway Road', 'HR-KRK-PS-01-CK-02', 5, (SELECT id FROM hierarchy_nodes WHERE code='HR-KRK-PS-01'))
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
SELECT level_name, COUNT(*) as total FROM vw_hierarchy_full GROUP BY level_name, level_order ORDER BY level_order;
