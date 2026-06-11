// src/components/Personnel/ExcelImport.jsx
// Full-page Excel/CSV import with 4-step stepper
// Step 1: Upload File | Step 2: Map Fields | Step 3: Validate | Step 4: Import
import { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, FileSpreadsheet, Upload, ChevronRight,
  CheckCircle, AlertTriangle, Download, RefreshCw, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import './personnel.css';

// ── DB Fields that can be mapped ─────────────────────────────
const DB_FIELDS = [
  { key: 'full_name',           label: 'Full Name *' },
  { key: 'belt_number',         label: 'Belt Number' },
  { key: 'pay_code',            label: 'Pay Code' },
  { key: 'father_name',         label: "Father's Name" },
  { key: 'date_of_birth',       label: 'Date of Birth' },
  { key: 'gender',              label: 'Gender' },
  { key: 'blood_group',         label: 'Blood Group' },
  { key: 'mobile_number',       label: 'Mobile Number' },
  { key: 'alternate_contact',   label: 'Alternate Contact' },
  { key: 'religion',            label: 'Religion' },
  { key: 'category',            label: 'Category / Caste' },
  { key: 'aadhar_number',       label: 'Aadhar Number' },
  { key: 'pan',                 label: 'PAN' },
  { key: 'village_town',        label: 'Village / Town' },
  { key: 'home_ps',             label: 'Home PS' },
  { key: 'home_district',       label: 'Home District' },
  { key: 'rank',                label: 'Rank' },
  { key: 'cadre',               label: 'Cadre' },
  { key: 'service_status',      label: 'Service Status' },
  { key: 'service_book_number', label: 'Service Book Number' },
  { key: 'date_of_enlistment',  label: 'Date of Enlistment' },
  { key: 'date_of_last_promotion', label: 'Date of Last Promotion' },
  { key: 'retirement_date',     label: 'Retirement Date' },
  { key: 'ps_duty_type',        label: 'PS Duty Type' },
  { key: 'company',             label: 'Company' },
  { key: 'r_batch',             label: 'R/Batch' },
  { key: 'remarks',             label: 'Remarks' },
];

const DATE_KEYS = new Set(['date_of_birth','date_of_enlistment','date_of_last_promotion','retirement_date','date_of_posting']);

// Auto-match: Excel column header → DB field key (best-guess)
function autoMatch(header) {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  const MAP = {
    fullname:'full_name', name:'full_name',
    belt:'belt_number', beltnumber:'belt_number', beltno:'belt_number', beltno:'belt_number',
    paycode:'pay_code', pay:'pay_code', payrollcode:'pay_code',
    fathername:'father_name', father:'father_name', fathersname:'father_name',
    dob:'date_of_birth', dateofbirth:'date_of_birth', birthdate:'date_of_birth', dateofbirth:'date_of_birth',
    gender:'gender', sex:'gender',
    bloodgroup:'blood_group', blood:'blood_group', bg:'blood_group',
    mobile:'mobile_number', mobilenumber:'mobile_number', phone:'mobile_number', contact:'mobile_number',
    alternatcontact:'alternate_contact', altcontact:'alternate_contact', altmobile:'alternate_contact',
    religion:'religion',
    category:'category', caste:'category', cat:'category',
    aadhar:'aadhar_number', aadharno:'aadhar_number', aadhaar:'aadhar_number', aadhaarnumber:'aadhar_number',
    pan:'pan', pannumber:'pan', panno:'pan',
    village:'village_town', town:'village_town', villagetown:'village_town',
    homeps:'home_ps', ps:'home_ps', policestation:'home_ps',
    homedistrict:'home_district', district:'home_district',
    rank:'rank', designation:'rank',
    cadre:'cadre',
    servicestatus:'service_status', status:'service_status', empstatus:'service_status',
    servicebooknumber:'service_book_number', servicebook:'service_book_number', sbno:'service_book_number',
    // ── D.O.E. / Date of Enlistment ──────────────────────────
    doe:'date_of_enlistment',
    doe1:'date_of_enlistment',
    enlistment:'date_of_enlistment', dateofenlistment:'date_of_enlistment',
    enlistmentdate:'date_of_enlistment', joindate:'date_of_enlistment',
    joiningdate:'date_of_enlistment', dateofjoining:'date_of_enlistment',
    doj:'date_of_enlistment',
    // ── Promotion / Retirement ────────────────────────────────
    lastpromotion:'date_of_last_promotion', promotiondate:'date_of_last_promotion',
    dateofpromotion:'date_of_last_promotion', dop:'date_of_last_promotion',
    retirement:'retirement_date', retirementdate:'retirement_date',
    dateofretirement:'retirement_date', dor:'retirement_date',
    // ── Duty ─────────────────────────────────────────────────
    psduttype:'ps_duty_type', dutytype:'ps_duty_type', duty:'ps_duty_type',
    company:'company',
    rbatch:'r_batch', batch:'r_batch',
    remarks:'remarks', remark:'remarks', note:'remarks',
  };
  return MAP[h] || '';
}

// ── Robust date parser — handles all Excel/string date formats ─
function parseDate(val) {
  if (val === undefined || val === null || val === '') return null;

  // JS Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split('T')[0];
  }

  // Excel serial number (e.g. 28856)
  if (typeof val === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(val);
      if (d && d.y > 1900)
        return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    } catch(_) {}
    return null;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Already ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD.MM.YY or DD.MM.YYYY  (e.g. "23.07.77" or "23.07.1977")
  const dotM = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotM) {
    let [, d, m, y] = dotM;
    if (y.length === 2) y = (parseInt(y) > 30 ? '19' : '20') + y;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // DD/MM/YY or DD/MM/YYYY  (e.g. "23/07/1977")
  const slashM = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashM) {
    let [, d, m, y] = slashM;
    if (y.length === 2) y = (parseInt(y) > 30 ? '19' : '20') + y;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // DD-MM-YYYY  (e.g. "23-07-1977")
  const dashM = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dashM) {
    let [, d, m, y] = dashM;
    if (y.length === 2) y = (parseInt(y) > 30 ? '19' : '20') + y;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // Try native Date parse as fallback
  try {
    const nd = new Date(str);
    if (!isNaN(nd.getTime())) return nd.toISOString().split('T')[0];
  } catch(_) {}

  return null; // unparseable — return null, skip
}

// ── Stepper component ─────────────────────────────────────────
function Stepper({ step }) {
  const steps = ['Upload File', 'Map Fields', 'Validate', 'Import'];
  return (
    <div className="ei-stepper">
      {steps.map((s, i) => {
        const num  = i + 1;
        const done = num < step;
        const curr = num === step;
        return (
          <div key={s} className="ei-step-wrap">
            <div className={`ei-step-circle ${done ? 'ei-step-done' : curr ? 'ei-step-curr' : 'ei-step-todo'}`}>
              {done ? <CheckCircle size={14} /> : num}
            </div>
            <span className={`ei-step-label ${curr ? 'ei-step-label-curr' : ''}`}>{s}</span>
            {i < steps.length - 1 && (
              <div className={`ei-step-line ${done ? 'ei-step-line-done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function ExcelImport({ onClose, onImported }) {
  const [step, setStep]           = useState(1);
  const [dragOver, setDragOver]   = useState(false);
  const [fileName, setFileName]   = useState('');
  const [headers, setHeaders]     = useState([]);   // Excel column names
  const [rawRows, setRawRows]     = useState([]);   // raw parsed rows (header→value)
  const [mapping, setMapping]     = useState({});   // excelCol → dbField
  const [validated, setValidated] = useState([]);   // cleaned records
  const [validErrors, setValidErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);
  const fileRef = useRef();

  // ── Step 1: Parse file ──────────────────────────────────────
  const parseFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) { alert('File mein data nahi mila'); return; }

        const hdrs = rows[0].map(h => String(h).trim());
        const data = rows.slice(1).filter(r => r.some(c => c)).map(r => {
          const obj = {};
          hdrs.forEach((h, j) => { obj[h] = r[j] !== undefined ? r[j] : ''; });
          return obj;
        });

        // Auto-mapping
        const autoMap = {};
        hdrs.forEach(h => { const m = autoMatch(h); if (m) autoMap[h] = m; });

        setHeaders(hdrs);
        setRawRows(data);
        setMapping(autoMap);
        setStep(2);
      } catch (err) { alert('File parse error: ' + err.message); }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  const handleFileInput = (e) => { if (e.target.files[0]) parseFile(e.target.files[0]); };

  // ── Step 2→3: Validate ──────────────────────────────────────
  const handleValidate = () => {
    const errs = [];
    const records = rawRows.map((row, i) => {
      const rec = {};
      // Apply mapping
      Object.entries(mapping).forEach(([excelCol, dbCol]) => {
        if (!dbCol) return;
        let val = row[excelCol];

        // Parse date fields using robust parser
        if (DATE_KEYS.has(dbCol)) {
          val = parseDate(val);
          if (val) rec[dbCol] = val;
          return;
        }

        if (val !== undefined && val !== null && val !== '') rec[dbCol] = String(val).trim();
      });

      if (!rec.full_name) {
        errs.push(`Row ${i + 2}: Full Name missing — row skipped`);
        return null;
      }
      return rec;
    }).filter(Boolean);

    setValidated(records);
    setValidErrors(errs);
    setStep(3);
  };

  // ── Step 4: Import ──────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    try {
      const res  = await fetch('/api/personnel/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: validated }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data);
      setStep(4);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally { setImporting(false); }
  };

  // ── Download template ───────────────────────────────────────
  const downloadTemplate = () => {
    const headers = DB_FIELDS.map(f => f.label.replace(' *',''));
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personnel');
    XLSX.writeFile(wb, 'personnel_import_template.xlsx');
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="pf-page">
      {/* Top nav */}
      <div className="pf-page-header">
        <button className="pf-back-btn" onClick={onClose}>
          <ArrowLeft size={16} /> Import Personnel
        </button>
      </div>

      <div className="pf-scroll-area">
        {/* Page title */}
        <div className="pf-page-title">
          <ArrowLeft size={18} onClick={onClose} style={{ cursor:'pointer' }} />
          <h2>Import Personnel from Excel / CSV</h2>
        </div>

        {/* Stepper */}
        <Stepper step={step} />

        {/* ══════════════════════════════════════════
            STEP 1: Upload File
        ══════════════════════════════════════════ */}
        {step === 1 && (
          <div className="ei-card">
            {/* Drag & Drop Zone */}
            <div
              className={`ei-dropzone ${dragOver ? 'ei-dropzone-active' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <FileSpreadsheet size={44} className="ei-drop-icon" />
              <div className="ei-drop-title">Drop your Excel or CSV file here</div>
              <div className="ei-drop-sub">or click to browse — Supports .xlsx, .xls, .csv</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={handleFileInput} style={{ display: 'none' }} />
            </div>

            <div className="ei-template-row">
              <button className="ei-btn-ghost" onClick={downloadTemplate}>
                <Download size={14} /> Sample Template Download
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 2: Map Fields
        ══════════════════════════════════════════ */}
        {step === 2 && (
          <div className="ei-card">
            <div className="ei-map-header">
              <div>
                <div className="ei-map-title">Column Mapping</div>
                <div className="ei-map-sub">
                  File: <strong>{fileName}</strong> — {rawRows.length} rows, {headers.length} columns detected
                </div>
              </div>
              <button className="ei-btn-ghost" onClick={() => { setStep(1); setFileName(''); }}>
                <RefreshCw size={13} /> Change File
              </button>
            </div>

            <div className="ei-map-grid">
              <div className="ei-map-grid-header">
                <span>Excel Column</span>
                <span>Sample Value</span>
                <span>Map to DB Field</span>
              </div>
              {headers.map(h => (
                <div key={h} className="ei-map-row">
                  <div className="ei-map-excel-col">{h}</div>
                  <div className="ei-map-sample">
                    {String(rawRows[0]?.[h] ?? '—').slice(0, 30)}
                  </div>
                  <select
                    className="ei-map-select"
                    value={mapping[h] || ''}
                    onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                  >
                    <option value="">— Skip —</option>
                    {DB_FIELDS.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="ei-footer">
              <button className="pf-btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="pf-btn-primary" onClick={handleValidate}>
                Validate Data <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 3: Validate
        ══════════════════════════════════════════ */}
        {step === 3 && (
          <div className="ei-card">
            <div className="ei-val-summary">
              <div className="ei-val-stat ei-val-ok">
                <CheckCircle size={18} />
                <span><strong>{validated.length}</strong> valid records</span>
              </div>
              {validErrors.length > 0 && (
                <div className="ei-val-stat ei-val-err">
                  <AlertTriangle size={18} />
                  <span><strong>{validErrors.length}</strong> rows skipped</span>
                </div>
              )}
            </div>

            {validErrors.length > 0 && (
              <div className="ei-error-list">
                {validErrors.map((e, i) => (
                  <div key={i} className="ei-error-item">
                    <X size={12} /> {e}
                  </div>
                ))}
              </div>
            )}

            {validated.length > 0 && (
              <div className="ei-preview-wrap">
                <table className="ei-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Full Name</th>
                      <th>Belt No.</th>
                      <th>Pay Code</th>
                      <th>Rank</th>
                      <th>Mobile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validated.slice(0, 50).map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{r.full_name || '—'}</td>
                        <td>{r.belt_number || '—'}</td>
                        <td>{r.pay_code || '—'}</td>
                        <td>{r.rank || '—'}</td>
                        <td>{r.mobile_number || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validated.length > 50 && (
                  <p className="ei-more-note">Sirf pehle 50 rows dikhaye gaye — sab {validated.length} import honge</p>
                )}
              </div>
            )}

            <div className="ei-footer">
              <button className="pf-btn-ghost" onClick={() => setStep(2)}>Back</button>
              <button
                className="pf-btn-primary"
                onClick={handleImport}
                disabled={validated.length === 0 || importing}
              >
                {importing ? 'Importing...' : `Import ${validated.length} Records`}
                {!importing && <ChevronRight size={15} />}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 4: Result
        ══════════════════════════════════════════ */}
        {step === 4 && result && (
          <div className="ei-card ei-result-card">
            <CheckCircle size={56} className="ei-result-icon" />
            <h3 className="ei-result-title">Import Successful!</h3>
            <p className="ei-result-sub">{result.message}</p>
            <div className="ei-result-stats">
              <div className="ei-stat-box ei-stat-green">
                <div className="ei-stat-num">{result.inserted}</div>
                <div className="ei-stat-lbl">Naye Records</div>
              </div>
              <div className="ei-stat-box ei-stat-blue">
                <div className="ei-stat-num">{result.updated}</div>
                <div className="ei-stat-lbl">Updated Records</div>
              </div>
            </div>
            <button className="pf-btn-primary" onClick={onImported} style={{ marginTop: 24 }}>
              Done — List Dekhein
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
