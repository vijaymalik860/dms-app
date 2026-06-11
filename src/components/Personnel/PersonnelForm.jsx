// src/components/Personnel/PersonnelForm.jsx
// Full-page form with 5 sections matching original project screenshots
import { useState, useEffect } from 'react';
import { ArrowLeft, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import './personnel.css';

const GRAD_OPTIONS = [
  '10th / Matric', '12th / Inter', 'Diploma', 'Graduation (B.A./B.Sc./B.Com)',
  'Post Graduation (M.A./M.Sc./M.Com)', 'B.Tech / B.E.', 'M.Tech / M.E.',
  'LLB', 'PhD', 'Other',
];

export default function PersonnelForm({ record, onClose, onSaved }) {
  const isEdit = Boolean(record);

  // ── Dropdowns from API ──────────────────────────────────────
  const [dd, setDd] = useState({
    rank: [], gender: [], blood_group: [], religion: [],
    category: [], service_status: [], ps_duty_type: [],
  });

  // ── Hierarchy for Posting section ──────────────────────────
  const [allNodes, setAllNodes] = useState([]);
  const [states, setStates]     = useState([]);
  const [ranges, setRanges]     = useState([]);
  const [districts, setDistricts] = useState([]);
  const [units, setUnits]       = useState([]);
  const [subUnits, setSubUnits] = useState([]);

  // ── Form state ─────────────────────────────────────────────
  const blank = {
    // 1. Personal Details
    full_name: '', father_name: '', date_of_birth: '',
    gender: '', blood_group: '', mobile_number: '', alternate_contact: '',
    pay_code: '', religion: '', category: '',
    aadhar_number: '', pan: '',
    village_town: '', home_ps: '', home_district: '',
    // 2. Education & Training
    graduation_degree: '', subject_graduation: '',
    post_graduation_degree: '', subject_post_graduation: '',
    swat_awt_course: '', special_course: '', promotion_type: '',
    // 3. Service Details
    rank: '', belt_number: '', service_status: 'Active',
    service_book_number: '', date_of_enlistment: '',
    date_of_last_promotion: '', retirement_date: '',
    // 4. Posting & Location
    state_id: '', range_id: '', district_id: '',
    unit_type: '', current_unit_id: '', current_sub_unit_id: '',
    // 5. Duty & Role
    ps_duty_type: '', company: '', date_of_posting: '',
    r_batch: '', t_duty_order: '', remarks: '',
  };

  const [form, setForm]           = useState(blank);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(false);

  // ── Load dropdowns + nodes ──────────────────────────────────
  useEffect(() => {
    fetch('/api/dropdowns').then(r => r.json()).then(data => {
      if (!data.success) return;
      const map = {};
      data.data.forEach(ft => { map[ft.field_name] = ft.values.map(v => v.value); });
      setDd(prev => ({ ...prev, ...map }));
    }).catch(() => {});

    fetch('/api/hierarchy/nodes').then(r => r.json()).then(data => {
      if (!data.success) return;
      const nodes = data.data || [];
      setAllNodes(nodes);
      setStates(nodes.filter(n => n.level_order === 1));
    }).catch(() => {});

  }, []);

  // ── Pre-fill on edit ────────────────────────────────────────
  useEffect(() => {
    if (!record) return;
    const ef = record.extra_fields || {};
    setForm({
      full_name:              record.full_name || '',
      father_name:            record.father_name || '',
      date_of_birth:          record.date_of_birth?.split('T')[0] || '',
      gender:                 record.gender || '',
      blood_group:            record.blood_group || '',
      mobile_number:          record.mobile_number || '',
      alternate_contact:      record.alternate_contact || ef.alternate_contact || '',
      pay_code:               record.pay_code || '',
      religion:               record.religion || '',
      category:               record.category || record.caste || '',
      aadhar_number:          record.aadhar_number || ef.aadhar_number || '',
      pan:                    record.pan || ef.pan || '',
      village_town:           record.village_town || ef.village_town || '',
      home_ps:                record.home_ps || ef.home_ps || '',
      home_district:          record.home_district || ef.home_district || '',
      graduation_degree:      record.graduation_degree || ef.graduation_degree || '',
      subject_graduation:     record.subject_graduation || ef.subject_graduation || '',
      post_graduation_degree: record.post_graduation_degree || ef.post_graduation_degree || '',
      subject_post_graduation:record.subject_post_graduation || ef.subject_post_graduation || '',
      swat_awt_course:        record.swat_awt_course || ef.swat_awt_course || '',
      special_course:         record.special_course || ef.special_course || '',
      promotion_type:         record.promotion_type || ef.promotion_type || '',
      rank:                   record.rank || '',
      belt_number:            record.belt_number || '',
      service_status:         record.service_status || 'Active',
      service_book_number:    record.service_book_number || ef.service_book_number || '',
      date_of_enlistment:     record.date_of_enlistment?.split('T')[0] || '',
      date_of_last_promotion: record.date_of_last_promotion?.split('T')[0] || ef.date_of_last_promotion || '',
      retirement_date:        record.retirement_date?.split('T')[0] || '',
      state_id:               record.state_id || ef.state_id || '',
      range_id:               record.range_id || ef.range_id || '',
      district_id:            record.district_id || ef.district_id || '',
      unit_type:              record.unit_type || ef.unit_type || '',
      current_unit_id:        record.current_unit_id || ef.current_unit_id || '',
      current_sub_unit_id:    record.current_sub_unit_id || ef.current_sub_unit_id || '',
      ps_duty_type:           record.ps_duty_type || ef.ps_duty_type || '',
      company:                record.company || ef.company || '',
      date_of_posting:        record.date_of_posting?.split('T')[0] || ef.date_of_posting || '',
      r_batch:                record.r_batch || ef.r_batch || '',
      t_duty_order:           record.t_duty_order || ef.t_duty_order || '',
      remarks:                record.remarks || ef.remarks || '',
    });
    if (record.photo_url) setPhotoPreview(`/${record.photo_url}`);
  }, [record]);

  // ── Cascade: state → ranges ─────────────────────────────────
  useEffect(() => {
    if (!form.state_id) { setRanges([]); setDistricts([]); setUnits([]); setSubUnits([]); return; }
    setRanges(allNodes.filter(n => n.level_order === 2 && String(n.parent_id) === String(form.state_id)));
    setDistricts([]); setUnits([]); setSubUnits([]);
  }, [form.state_id, allNodes]);

  useEffect(() => {
    if (!form.range_id) { setDistricts([]); setUnits([]); setSubUnits([]); return; }
    setDistricts(allNodes.filter(n => n.level_order === 3 && String(n.parent_id) === String(form.range_id)));
    setUnits([]); setSubUnits([]);
  }, [form.range_id, allNodes]);

  useEffect(() => {
    if (!form.district_id) { setUnits([]); setSubUnits([]); return; }
    setUnits(allNodes.filter(n => n.level_order === 4 && String(n.parent_id) === String(form.district_id)));
    setSubUnits([]);
  }, [form.district_id, allNodes]);

  useEffect(() => {
    if (!form.current_unit_id) { setSubUnits([]); return; }
    setSubUnits(allNodes.filter(n => n.level_order === 5 && String(n.parent_id) === String(form.current_unit_id)));
  }, [form.current_unit_id, allNodes]);

  // ── Handlers ────────────────────────────────────────────────
  const ch = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handlePhotoChange = e => {
    const f = e.target.files[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { setError('Full Name required hai'); return; }
    setError(null); setSaving(true);
    try {
      const fd = new FormData();

      // Append all form fields directly
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });

      // node_id = current_unit_id for hierarchy link
      if (form.current_unit_id) fd.append('node_id', form.current_unit_id);

      // category → also save as caste for backward compat
      if (form.category) fd.append('caste', form.category);

      if (photoFile) fd.append('photo', photoFile);

      const url    = isEdit ? `/api/personnel/${record.id}` : '/api/personnel';
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, body: fd });
      const data   = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess(true);
      setTimeout(() => onSaved(), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };


  // ── Reusable field components ───────────────────────────────
  const In = ({ label, name, type = 'text', placeholder = '', required = false }) => (
    <div className="pf-group">
      <label className="pf-label">{label}{required && ' *'}</label>
      <input type={type} name={name} className="pf-input" value={form[name]}
        onChange={ch} placeholder={placeholder} />
    </div>
  );

  const Sel = ({ label, name, options = [], placeholder = 'Select', disabled = false }) => (
    <div className="pf-group">
      <label className="pf-label">{label}</label>
      <select name={name} className="pf-select" value={form[name]} onChange={ch} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map(o => {
          const val = typeof o === 'object' ? o.id : o;
          const lbl = typeof o === 'object' ? o.name : o;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
    </div>
  );

  const Ta = ({ label, name, rows = 3 }) => (
    <div className="pf-group">
      <label className="pf-label">{label}</label>
      <textarea name={name} className="pf-input pf-textarea" rows={rows}
        value={form[name]} onChange={ch} />
    </div>
  );

  return (
    <div className="pf-page">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="pf-page-header">
        <button className="pf-back-btn" onClick={onClose}>
          <ArrowLeft size={16} /> Personnel Master
        </button>
      </div>

      <div className="pf-scroll-area">
        <div className="pf-page-title">
          <ArrowLeft size={18} onClick={onClose} style={{ cursor: 'pointer' }} />
          <h2>{isEdit ? 'Edit Personnel' : 'Add Personnel'}</h2>
        </div>

        {/* ── Error / Success ──────────────────────────── */}
        {error && (
          <div className="pf-alert pf-alert-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {success && (
          <div className="pf-alert pf-alert-success">
            <CheckCircle size={15} /> Saved successfully!
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            SECTION 1: Personal Details
        ═══════════════════════════════════════════════ */}
        <div className="pf-section">
          <div className="pf-section-title">1. Personal Details</div>

          {/* Photo + Full Name + Father Name row */}
          <div className="pf-photo-row">
            <div className="pf-photo-block">
              <label className="pf-photo-label">
                <div className="pf-photo-box">
                  {photoPreview
                    ? <img src={photoPreview} alt="Preview" className="pf-photo-img" />
                    : <Camera size={28} color="#64748b" />}
                </div>
                <span className="pf-upload-text">Upload Photo</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </label>
            </div>
            <div className="pf-photo-fields">
              <In label="Full Name" name="full_name" required placeholder="" />
              <In label="Father's Name" name="father_name" placeholder="" />
            </div>
          </div>

          {/* Row: DOB, Gender, Blood Group, Mobile, Alternate */}
          <div className="pf-grid-5">
            <In label="Date of Birth" name="date_of_birth" type="date" />
            <Sel label="Gender" name="gender" options={dd.gender} />
            <Sel label="Blood Group" name="blood_group" options={dd.blood_group} />
            <In label="Mobile Number" name="mobile_number" required />
            <In label="Alternate Contact" name="alternate_contact" />
          </div>

          {/* Row: Pay Code, Religion, Category, Aadhar, PAN */}
          <div className="pf-grid-5">
            <div className="pf-group">
              <label className="pf-label">Pay Code <span className="pf-hint">(Auto-fills from Mobile)</span></label>
              <input type="text" name="pay_code" className="pf-input" value={form.pay_code} onChange={ch} />
            </div>
            <Sel label="Religion" name="religion" options={dd.religion} />
            <Sel label="Category" name="category" options={dd.category.length ? dd.category : ['General','OBC','SC','ST']} />
            <In label="Aadhar Number" name="aadhar_number" placeholder="XXXX-XXXX-XXXX" />
            <In label="PAN" name="pan" />
          </div>

          {/* Row: Village, Home PS, Home District */}
          <div className="pf-grid-3">
            <In label="Village / Town" name="village_town" />
            <In label="Police Station (Home / Native)" name="home_ps" />
            <In label="Home District (Origin)" name="home_district" />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 2: Education & Training
        ═══════════════════════════════════════════════ */}
        <div className="pf-section">
          <div className="pf-section-title">2. Education &amp; Training</div>

          <div className="pf-grid-5">
            <Sel label="Graduation Degree or Below" name="graduation_degree" options={GRAD_OPTIONS} />
            <div className="pf-group">
              <label className="pf-label">Subject (Graduation)</label>
              <input type="text" name="subject_graduation" className="pf-input"
                value={form.subject_graduation} onChange={ch} placeholder="e.g. Physics, Hindi" />
              <span className="pf-field-hint">Comma separated</span>
            </div>
            <Sel label="Post Graduation Degree or Above" name="post_graduation_degree"
              options={['M.A.','M.Sc.','M.Com','M.Tech','MBA','LLM','PhD','Other']} />
            <div className="pf-group">
              <label className="pf-label">Subject (Post Graduation)</label>
              <input type="text" name="subject_post_graduation" className="pf-input"
                value={form.subject_post_graduation} onChange={ch} placeholder="e.g. Economics, IT" />
              <span className="pf-field-hint">Comma separated</span>
            </div>
            <In label="SWAT/AWT Course" name="swat_awt_course" />
          </div>

          <div className="pf-grid-2">
            <In label="Special Course" name="special_course" />
            <In label="Promotion Type" name="promotion_type" />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 3: Service Details
        ═══════════════════════════════════════════════ */}
        <div className="pf-section">
          <div className="pf-section-title">3. Service Details</div>

          <div className="pf-grid-5">
            <Sel label="Rank *" name="rank" options={dd.rank} />
            <In label="Belt Number" name="belt_number" />
            <Sel label="Service Status" name="service_status" options={dd.service_status.length ? dd.service_status : ['Active','Suspended','Deputation','Leave','Retired']} />
            <In label="Service Book Number" name="service_book_number" />
            <In label="Date of Enlistment" name="date_of_enlistment" type="date" />
          </div>

          <div className="pf-grid-2">
            <In label="Date of Last Promotion" name="date_of_last_promotion" type="date" />
            <In label="Retirement Date" name="retirement_date" type="date" />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 4: Posting & Location (STRICT)
        ═══════════════════════════════════════════════ */}
        <div className="pf-section">
          <div className="pf-section-title">
            4. Posting &amp; Location
            <span className="pf-strict-badge">STRICT</span>
          </div>

          <div className="pf-grid-5">
            <Sel label="State" name="state_id" placeholder="Select State"
              options={states.map(n => ({ id: n.id, name: n.name }))} />
            <Sel label="Range" name="range_id" placeholder="Select Range"
              options={ranges.map(n => ({ id: n.id, name: n.name }))}
              disabled={!form.state_id} />
            <Sel label="District" name="district_id" placeholder="Select District"
              options={districts.map(n => ({ id: n.id, name: n.name }))}
              disabled={!form.range_id} />
            <Sel label="Unit" name="current_unit_id" placeholder="Select Unit"
              options={units.map(n => ({ id: n.id, name: n.name }))}
              disabled={!form.district_id} />
          </div>

          <div className="pf-grid-1-of-5">
            <Sel label="Sub-Unit" name="current_sub_unit_id"
              placeholder={subUnits.length === 0 ? 'No sub-units found' : 'Select Sub-Unit'}
              options={subUnits.map(n => ({ id: n.id, name: n.name }))}
              disabled={!form.current_unit_id} />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 5: Duty & Role
        ═══════════════════════════════════════════════ */}
        <div className="pf-section">
          <div className="pf-section-title">5. Duty &amp; Role</div>

          <div className="pf-grid-5">
            <In label="PS Duty Type (Role 2)" name="ps_duty_type" />
            <In label="Company" name="company" />
            <In label="Date of Posting" name="date_of_posting" type="date" />
            <In label="R/BATCH" name="r_batch" />
            <In label="T/DUTY ORDER" name="t_duty_order" />
          </div>

          <Ta label="Remarks" name="remarks" rows={3} />
        </div>

        {/* ── Footer Actions ─────────────────────────── */}
        <div className="pf-footer">
          <button className="pf-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pf-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
