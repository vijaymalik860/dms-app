// Hierarchy Data - Haryana Police Structure
// State → Range → District → Police Station → Chowki/Police Post
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
            { id: 'HR-AMB-PS-01', name: 'PS Ambala City',  level: 'PS', children: [
              { id: 'HR-AMB-PS-01-CK-01', name: 'Chowki Balughat',      level: 'Chowki', children: [] },
              { id: 'HR-AMB-PS-01-CK-02', name: 'Chowki Court Complex', level: 'Chowki', children: [] },
              { id: 'HR-AMB-PS-01-CK-03', name: 'Chowki Bus Stand',     level: 'Chowki', children: [] },
            ]},
            { id: 'HR-AMB-PS-02', name: 'PS Ambala Cantt', level: 'PS', children: [] },
            { id: 'HR-AMB-PS-03', name: 'PS Baldev Nagar', level: 'PS', children: [] },
            { id: 'HR-AMB-PS-04', name: 'PS Mullana',      level: 'PS', children: [] },
          ]
        },
        {
          id: 'HR-KRK-DIST',
          name: 'Kurukshetra',
          level: 'District',
          children: [
            { id: 'HR-KRK-PS-01', name: 'PS Thanesar', level: 'PS', children: [] },
            { id: 'HR-KRK-PS-02', name: 'PS Pehowa',   level: 'PS', children: [] },
            { id: 'HR-KRK-PS-03', name: 'PS Shahabad', level: 'PS', children: [] },
          ]
        },
        {
          id: 'HR-YNR-DIST',
          name: 'Yamunanagar',
          level: 'District',
          children: [
            { id: 'HR-YNR-PS-01', name: 'PS Jagadhri',     level: 'PS', children: [] },
            { id: 'HR-YNR-PS-02', name: 'PS Bilaspur',     level: 'PS', children: [] },
          ]
        },
        {
          id: 'HR-PKL-DIST',
          name: 'Panchkula',
          level: 'District',
          children: [
            { id: 'HR-PKL-PS-01', name: 'PS Sector-5',   level: 'PS', children: [] },
            { id: 'HR-PKL-PS-02', name: 'PS Kalka',      level: 'PS', children: [] },
          ]
        },
      ]
    },
    {
      id: 'HR-ROH-RNG',
      name: 'Rohtak Range',
      level: 'Range',
      children: [
        {
          id: 'HR-ROH-DIST',
          name: 'Rohtak',
          level: 'District',
          children: [
            { id: 'HR-ROH-PS-01', name: 'PS City Rohtak',  level: 'PS', children: [] },
            { id: 'HR-ROH-PS-02', name: 'PS Delhi Bypass', level: 'PS', children: [] },
            { id: 'HR-ROH-PS-03', name: 'PS Asthal Bohar', level: 'PS', children: [] },
          ]
        },
        {
          id: 'HR-JJR-DIST',
          name: 'Jhajjar',
          level: 'District',
          children: [
            { id: 'HR-JJR-PS-01', name: 'PS Jhajjar',  level: 'PS', children: [] },
            { id: 'HR-JJR-PS-02', name: 'PS Bahadurgarh', level: 'PS', children: [] },
          ]
        },
        {
          id: 'HR-SNP-DIST',
          name: 'Sonipat',
          level: 'District',
          children: [
            { id: 'HR-SNP-PS-01', name: 'PS Sonipat City', level: 'PS', children: [] },
            { id: 'HR-SNP-PS-02', name: 'PS Ganaur',       level: 'PS', children: [] },
          ]
        },
      ]
    },
    {
      id: 'HR-HIS-RNG',
      name: 'Hisar Range',
      level: 'Range',
      children: [
        {
          id: 'HR-HIS-DIST',
          name: 'Hisar',
          level: 'District',
          children: [
            { id: 'HR-HIS-PS-01', name: 'PS City Hisar', level: 'PS', children: [] },
            { id: 'HR-HIS-PS-02', name: 'PS Urban',      level: 'PS', children: [] },
          ]
        },
        {
          id: 'HR-SRH-DIST',
          name: 'Sirsa',
          level: 'District',
          children: [
            { id: 'HR-SRH-PS-01', name: 'PS Sirsa City', level: 'PS', children: [] },
            { id: 'HR-SRH-PS-02', name: 'PS Rania',      level: 'PS', children: [] },
          ]
        },
      ]
    },
    {
      id: 'HR-GGN-RNG',
      name: 'Gurugram Range',
      level: 'Range',
      children: [
        {
          id: 'HR-GGN-DIST',
          name: 'Gurugram',
          level: 'District',
          children: [
            { id: 'HR-GGN-PS-01', name: 'PS DLF Phase-1', level: 'PS', children: [] },
            { id: 'HR-GGN-PS-02', name: 'PS Sohna Road',  level: 'PS', children: [] },
            { id: 'HR-GGN-PS-03', name: 'PS Cyber City',  level: 'PS', children: [] },
          ]
        },
        {
          id: 'HR-FBD-DIST',
          name: 'Faridabad',
          level: 'District',
          children: [
            { id: 'HR-FBD-PS-01', name: 'PS NIT Faridabad', level: 'PS', children: [] },
            { id: 'HR-FBD-PS-02', name: 'PS Badkhal',       level: 'PS', children: [] },
          ]
        },
      ]
    },
  ]
};

// Level config: colors and icons
export const levelConfig = {
  State:    { color: '#818cf8', bg: 'rgba(99,102,241,0.15)',   border: '#6366f1', icon: '🏛️' },
  Range:    { color: '#a78bfa', bg: 'rgba(139,92,246,0.15)',   border: '#8b5cf6', icon: '🗺️' },
  District: { color: '#c4b5fd', bg: 'rgba(167,139,250,0.12)', border: '#a78bfa', icon: '🏢' },
  PS:       { color: '#e2e8f0', bg: 'rgba(226,232,240,0.08)', border: '#94a3b8', icon: '🚔' },
  Chowki:   { color: '#f0abfc', bg: 'rgba(240,171,252,0.10)', border: '#d946ef', icon: '🚨' },
};

// Alias for initial state (used in HierarchyGraph)
export const initialHierarchyData = hierarchyData;
