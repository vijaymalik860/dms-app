// Hierarchy Data - Haryana Police Structure
// State → Range → District → Units → Sub-Units → Chowki
// Later: fetch from /api/hierarchy

export const hierarchyData = {
  id: 'HR',
  name: 'Haryana',
  level: 'State',
  children: [
    {
      id: 'HR-AMB-RNG',
      name: 'Ambala Range',
      level: 'Range',
      children: [
        {
          id: 'HR-AMB-DIST',
          name: 'Ambala',
          level: 'District',
          children: [
            {
              id: 'HR-AMB-UNIT-PS',
              name: 'Police Stations',
              level: 'Units',
              children: [
                { id: 'HR-AMB-PS-01', name: 'PS Ambala City',  level: 'Sub-Units', children: [
                  { id: 'HR-AMB-PS-01-CK-01', name: 'Chowki Balughat',      level: 'Chowki', children: [] },
                  { id: 'HR-AMB-PS-01-CK-02', name: 'Chowki Court Complex', level: 'Chowki', children: [] },
                ]},
                { id: 'HR-AMB-PS-02', name: 'PS Ambala Cantt', level: 'Sub-Units', children: [] },
              ]
            },
            {
              id: 'HR-AMB-UNIT-TRAFFIC',
              name: 'Traffic',
              level: 'Units',
              children: [
                { id: 'HR-AMB-TRF-01', name: 'Traffic City Zone', level: 'Sub-Units', children: [] }
              ]
            },
            {
              id: 'HR-AMB-UNIT-TEMP',
              name: 'Temp_Dep_Trg',
              level: 'Units',
              children: [
                { id: 'HR-AMB-TMP-01', name: 'Temporary Posting (with order)', level: 'Sub-Units', children: [] },
                { id: 'HR-AMB-TMP-02', name: 'Training Courses', level: 'Sub-Units', children: [] },
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Level config: colors and icons
export const levelConfig = {
  State:       { color: '#818cf8', bg: 'rgba(99,102,241,0.15)',   border: '#6366f1', icon: '🏛️' },
  Range:       { color: '#a78bfa', bg: 'rgba(139,92,246,0.15)',   border: '#8b5cf6', icon: '🗺️' },
  District:    { color: '#c4b5fd', bg: 'rgba(167,139,250,0.12)', border: '#a78bfa', icon: '🏢' },
  Units:       { color: '#e2e8f0', bg: 'rgba(226,232,240,0.08)', border: '#94a3b8', icon: '🛡️' },
  'Sub-Units': { color: '#fbcfe8', bg: 'rgba(251,207,232,0.10)', border: '#f472b6', icon: '🚔' },
  Chowki:      { color: '#f0abfc', bg: 'rgba(240,171,252,0.10)', border: '#d946ef', icon: '🚨' },
};

// Alias for initial state (used in HierarchyGraph)
export const initialHierarchyData = hierarchyData;
