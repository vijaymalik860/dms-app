-- ============================================================
-- DMS App - Hierarchy Module Database Schema
-- Structure: State → Range → District → Units → Sub-Units → Chowki
-- Updated: 6-level hierarchy matching frontend LEVEL_ORDER
-- ============================================================

-- 1. LEVELS TABLE
CREATE TABLE IF NOT EXISTS hierarchy_levels (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    level_order INT NOT NULL UNIQUE,
    color       VARCHAR(20),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Insert/Update all 6 levels
INSERT INTO hierarchy_levels (name, level_order, color) VALUES
    ('State',     1, '#6366f1'),
    ('Range',     2, '#8b5cf6'),
    ('District',  3, '#a78bfa'),
    ('Units',     4, '#94a3b8'),
    ('Sub-Units', 5, '#f472b6'),
    ('Chowki',    6, '#f0abfc')
ON CONFLICT (level_order) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color;


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


-- 3. SEED: Only State node (Ranges + Districts loaded via CSV import)
INSERT INTO hierarchy_nodes (name, code, level_id, parent_id) VALUES
    ('Haryana', 'HR-STATE', 1, NULL)
ON CONFLICT (code) DO NOTHING;


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
