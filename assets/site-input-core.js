/* Local input-data engine. Calculation projection never changes HMI/PLC state. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => require('./site-calc-schema.js'));
  else root.BoilerSiteCore = factory(() => root.BoilerCalcSchema);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (getCalcSchema) {
  'use strict';
  const BAD = new Set(['__proto__', 'prototype', 'constructor']);
  const MAX_BYTES = 5 * 1024 * 1024;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const present = v => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);
  const unwrap = v => object(v) && own(v, 'value') ? v.value : v;
  const clone = v => JSON.parse(JSON.stringify(v));
  const now = () => new Date().toISOString();
  let seq = 0;
  const uid = prefix => prefix + '-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + (++seq).toString(36) + '-' + Math.random().toString(36).slice(2, 9));
  function tokens(path) {
    if (typeof path !== 'string' || !/^[A-Za-z_][\w]*(?:\[\d+\])?(?:\.[A-Za-z_][\w]*(?:\[\d+\])?)*$/.test(path)) throw new Error('Invalid data path');
    const out = [];
    path.replace(/([A-Za-z_]\w*)|\[(\d+)\]/g, (_, k, i) => { if (BAD.has(k)) throw new Error('Forbidden path'); out.push(k === undefined ? Number(i) : k); });
    return out;
  }
  const generic = p => p.replace(/\[\d+\]/g, '[]');
  function read(data, path) { let v = data; for (const k of tokens(path)) { if (v == null || !own(v, k)) return undefined; v = v[k]; } return v; }
  function write(data, path, value) {
    const ts = tokens(path); let p = data;
    ts.forEach((k, i) => { if (i === ts.length - 1) p[k] = value; else { if (!own(p, k)) p[k] = typeof ts[i + 1] === 'number' ? [] : {}; if (!object(p[k]) && !Array.isArray(p[k])) throw new Error('Path crosses a value'); p = p[k]; } });
  }
  function plainSafe(value, path = '$', depth = 0, budget = { n: 0 }) {
    if (++budget.n > 150000 || depth > 32) throw new Error('Document exceeds structural limit');
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Nonfinite number at ' + path);
    if (typeof value === 'string' && (value.length > 20000 || /<\s*\/?(?:script|iframe|object|embed)\b|javascript\s*:/i.test(value))) throw new Error('Unsupported text at ' + path);
    if (Array.isArray(value)) { if (value.length > 10000) throw new Error('Array exceeds record limit'); value.forEach((v, i) => plainSafe(v, path + '[' + i + ']', depth + 1, budget)); }
    else if (object(value)) { for (const k of Object.keys(value)) { if (BAD.has(k)) throw new Error('Forbidden key at ' + path); plainSafe(value[k], path + '.' + k, depth + 1, budget); } }
    else if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw new Error('Unsupported JSON value at ' + path);
  }
  function create(catalog) {
    if (!catalog || !Array.isArray(catalog.groups) || !catalog.quantity_registry) throw new Error('Catalog required');
    const defs = catalog.groups.flatMap(g => g.fields.map(f => Object.assign({ group: g.id, group_he: g.title_he }, f)));
    const inputDefs = defs.filter(f => f.key.startsWith('inputs.'));
    const byKey = new Map(defs.map(d => [d.key, d]));
    const leaves = new Map();
    const arrayScopes = new Set();
    defs.forEach(d => {
      // number_list is one enveloped list, not a list of record objects.
      const key = d.type === 'number_list' && d.key.endsWith('[]') ? d.key.slice(0, -2) : d.key;
      leaves.set(key, d);
      for (const m of key.matchAll(/\[\]/g)) arrayScopes.add(key.slice(0, m.index));
    });
    const definitionFor = path => leaves.get(generic(path)) || byKey.get(generic(path));
    // An old 1b catalog remains a 1b-only validator. The additive 1c catalog
    // explicitly supports both input versions; migration is never automatic.
    const versions = catalog.schema_version === 'boiler-site-input-1c' ? ['boiler-site-input-1b', 'boiler-site-input-1c'] : [catalog.schema_version];
    const MD_PATH = 'inputs.calculation_basis.method_data';
    function paths(data, template, includeMissing = false) {
      const parts = template.split('.'); const out = [];
      function walk(node, index, path, lastRecord) {
        if (index === parts.length) { out.push({ path, value: node, recordId: lastRecord }); return; }
        const array = parts[index].endsWith('[]'), key = parts[index].replace(/\[\]$/, '');
        const child = object(node) && own(node, key) ? node[key] : undefined;
        const base = path ? path + '.' + key : key;
        if (array) { if (Array.isArray(child)) child.forEach((v, i) => walk(v, index + 1, base + '[' + i + ']', object(v) ? v.record_id || lastRecord : lastRecord)); }
        else if (child !== undefined || includeMissing) walk(child, index + 1, base, lastRecord);
      }
      walk(data, 0, '', null); return out;
    }
    function instances(data, def) {
      if (typeof def === 'string') def = byKey.get(def) || definitionFor(def);
      if (!def) return [];
      const key = def.type === 'number_list' && def.key.endsWith('[]') ? def.key.slice(0, -2) : def.key;
      return paths(data, key, true).map(x => ({ path: x.path, recordId: x.recordId, envelope: x.value, definition: def }));
    }
    function entries(data) { return inputDefs.flatMap(d => instances(data, d)).filter(x => x.envelope !== undefined); }
    function collections(data, scope) {
      scope = scope.replace(/\[\]$/, '');
      if (!arrayScopes.has(generic(scope))) return [];
      const list = paths(data, scope, true);
      return list.map(x => ({ path: x.path, records: Array.isArray(x.value) ? x.value : [], parentRecord: x.recordId, recordId: x.recordId }));
    }
    function invalidate(data) {
      data.revision_id = uid('rev'); data.updated_at = now();
      const walk = n => { if (Array.isArray(n)) n.forEach(walk); else if (object(n)) { if (own(n, 'status') && ['not_calculated', 'calculated', 'approved'].includes(n.status)) { n.validity = 'stale'; n.import_review = 'pending'; } for (const k of Object.keys(n)) if (object(n[k]) || Array.isArray(n[k])) walk(n[k]); } };
      walk(data.results);
    }
    function addRecord(data, collectionPath) {
      const scope = generic(collectionPath); if (!arrayScopes.has(scope) || !scope.startsWith('inputs.')) throw new Error('Unknown input collection');
      let arr = read(data, collectionPath); if (arr === undefined) { write(data, collectionPath, []); arr = read(data, collectionPath); }
      if (!Array.isArray(arr)) throw new Error('Expected record array');
      const rec = { record_id: uid('record') };
      if (byKey.has(scope + '[].id')) rec.id = uid(scope.split('.').pop());
      if (scope === 'inputs.consumers') rec.loads = [{ record_id: uid('record'), id: uid('load') }];
      arr.push(rec); invalidate(data); return { record: rec, path: collectionPath + '[' + (arr.length - 1) + ']', index: arr.length - 1 };
    }
    function newDataset() {
      const data = { schema_version: catalog.schema_version, dataset_id: uid('dataset'), revision_id: uid('rev'), base_package_revision: 'v4.2/R2', created_at: now(), updated_at: now(), inputs: {}, documents: [], results: {}, calculation_runs: [] };
      addRecord(data, 'inputs.consumers'); return data;
    }
    function sibling(data, path, field) {
      let ps = path.split('.'); ps.pop();
      while (ps.length) { const p = ps.join('.') + '.' + field; const v = unwrap(read(data, p)); if (present(v)) return v; ps.pop(); }
      return undefined;
    }
    function unitInfo(data, path) {
      const def = definitionFor(path); if (!def) return null;
      let q = def.quantity;
      if (q === 'dependent') {
        if (def.quantity_ref && def.quantity_ref.endsWith('.analyte')) q = catalog.analyte_quantity_rules[sibling(data, path, 'analyte')];
        else q = sibling(data, path, 'quantity');
        if (generic(path).startsWith('inputs.parameters[].')) {
          const kind = sibling(data, path, 'kind'), allowed = catalog.parameter_quantity_rules && catalog.parameter_quantity_rules[kind];
          if (allowed && present(q) && !allowed.includes(q)) return { quantity: q, canonical_unit: null, input_units: [], error: 'Quantity does not match parameter kind' };
        }
      }
      const info = catalog.quantity_registry[q];
      if (info) return Object.assign({ quantity: q, resolved: true }, info);
      if (def.quantity === 'dependent') return { quantity: q || 'dependent', canonical_unit: null, input_units: [], resolved: false, error: 'Select a supported quantity/analyte first' };
      return { quantity: q, canonical_unit: def.canonical_unit, input_units: def.input_units || [], resolved: true };
    }
    function cast(def, raw) {
      if (raw === '' || raw === null || raw === undefined) return null;
      if (['number', 'integer'].includes(def.type)) {
        if (typeof raw !== 'number' && (typeof raw !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()))) throw new Error('Numeric value required');
        const v = Number(raw); if (!Number.isFinite(v) || (def.type === 'integer' && !Number.isInteger(v))) throw new Error('Invalid number'); return v;
      }
      if (['id_list', 'field_ref_list', 'number_list'].includes(def.type)) {
        const list = Array.isArray(raw) ? raw : String(raw).split(/[,\n]+/).map(v => v.trim()).filter(Boolean);
        if (def.type === 'number_list') return list.map(v => cast({ type: 'number' }, v));
        if (!list.every(v => typeof v === 'string')) throw new Error('Reference list requires strings'); return list;
      }
      if (typeof raw !== 'string') throw new Error('Text or enumeration value required');
      if (def.enum_options && !def.enum_options.includes(raw)) throw new Error('Value is not in the enumeration');
      if (def.type === 'datetime' && !validDate(raw)) throw new Error('ISO date required');
      return raw;
    }
    const ENV_KEYS = new Set(['value','unit','status','source_ref','author_ref','approval_ref','date','original_input','recorded_at','observed_at','evidence_refs','applicability','uncertainty_ref','note','relevance','origin_status','import_review','supersedes']);
    function setValue(data, path, raw, inputUnit, meta = {}) {
      const def = definitionFor(path); if (!def || !def.key.startsWith('inputs.')) throw new Error('Only catalog input fields are writable');
      for (const k of Object.keys(meta)) if (!ENV_KEYS.has(k) || ['value','unit','original_input'].includes(k)) throw new Error('Unsupported provenance field: ' + k);
      plainSafe(meta);
      let v = cast(def, raw);
      if (def.type === 'id') { if (!present(v)) throw new Error('Record ID cannot be empty'); write(data, path, v); invalidate(data); return v; }
      const info = unitInfo(data, path); const canonical = info && info.canonical_unit;
      let original = null;
      if (present(v) && (typeof v === 'number' || def.type === 'number_list')) {
        if (!info || !info.resolved || !canonical) throw new Error(info && info.error || 'Unresolved units');
        const from = inputUnit || canonical;
        const conv = info.input_units.find(x => x.unit === from);
        if (!conv && from !== canonical) throw new Error('Unsupported input unit');
        if (conv) {
          original = from === canonical ? null : { value: clone(v), unit: from };
          v = Array.isArray(v) ? v.map(n => n * conv.factor + conv.offset) : v * conv.factor + conv.offset;
          if ((Array.isArray(v) ? v : [v]).some(n => !Number.isFinite(n))) throw new Error('Conversion overflow');
        }
      }
      const previous = read(data, path);
      const env = Object.assign({ source_ref: null, author_ref: null, approval_ref: null, date: null }, object(previous) ? previous : {}, meta, { value: v, unit: canonical || def.canonical_unit, original_input: original, recorded_at: now() });
      const changed = !object(previous) || JSON.stringify(previous.value) !== JSON.stringify(v) || previous.unit !== env.unit;
      if (!own(meta, 'status')) env.status = present(v) ? (changed ? 'reported' : (previous && previous.status || 'reported')) : 'empty';
      if (changed) { env.approval_ref = null; if (previous && (previous.status === 'engineer_approved' || previous.import_review)) env.import_review = 'pending'; if (!own(meta, 'observed_at')) delete env.observed_at; }
      // Any edit invalidates an old approval. The UI may record a new approval claim explicitly.
      if (previous && previous.status === 'engineer_approved') { env.approval_ref = null; if (env.status === 'engineer_approved') env.status = env.origin_status || 'reported'; env.import_review = 'pending'; }
      if (env.status === 'engineer_approved') env.import_review = 'pending';
      if (!present(v)) env.status = 'empty';
      if (!catalog.dataset_contract.input_statuses.includes(env.status)) throw new Error('Invalid provenance status');
      write(data, path, env); invalidate(data); return env;
    }
    function updateProvenance(data, path, meta) {
      const def=definitionFor(path), previous=read(data,path);
      if(!def||!def.key.startsWith('inputs.')||def.type==='id'||!object(previous))throw new Error('Existing input value required');
      for(const k of Object.keys(meta))if(!ENV_KEYS.has(k)||['value','unit','original_input'].includes(k))throw new Error('Unsupported provenance field: '+k);
      plainSafe(meta);
      const next=Object.assign({},previous,meta,{recorded_at:now()});
      if(!catalog.dataset_contract.input_statuses.includes(next.status))throw new Error('Invalid provenance status');
      if(previous.status==='engineer_approved'){next.approval_ref=null;if(next.status==='engineer_approved')next.status=next.origin_status||'reported';next.import_review='pending';}
      else if(next.status==='engineer_approved')next.import_review='pending';
      write(data,path,next);invalidate(data);return next;
    }
    function validDate(v) {
      if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(v)||Number.isNaN(Date.parse(v)))return false;
      const [y,m,d]=v.slice(0,10).split('-').map(Number), check=new Date(Date.UTC(y,m-1,d));
      return check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d;
    }
    function mapping(data) {
      const consumers = data && data.inputs && data.inputs.consumers;
      const records = Array.isArray(consumers) ? consumers : [];
      const indexes = records.map(c => unwrap(c.interface_index));
      const exact = records.length === 6 && indexes.every(Number.isInteger) && new Set(indexes).size === 6 && indexes.every(i => i >= 1 && i <= 6);
      return { status: exact ? 'mapped' : 'mapping_pending', count: records.length, indices: indexes.map(v => v === undefined ? null : v), reason: exact ? 'Six explicit unique interfaces; specification overlay only' : 'Current concept has six interfaces; no truncation or automatic reassignment' };
    }
    function condition(data, item) {
      const def = item.definition, req = def.required;
      if (req === 'O' || req === 'FUTURE') return false;
      if (req === 'R') return true;
      if (req === 'E') {
        let st = sibling(data, item.path, 'selection_state');
        if (!present(st)) {
          const equipmentRef=sibling(data,item.path,'equipment_ref');
          const equipment=read(data,'inputs.equipment');
          const record=Array.isArray(equipment)?equipment.find(x=>x.id===equipmentRef):null;
          if(record)st=unwrap(record.selection_state);
        }
        return ['candidate','selected','installed'].includes(st) ? true : st === 'retired' ? false : 'unknown';
      }
      const c = req.slice(2);
      if (c.includes('=')) { const [name, expect] = c.split('='); let v = sibling(data, item.path, name); if (name === 'temperature_mode') v = unwrap(read(data, 'inputs.calculation_basis.design_water.temperature_mode')); if (name === 'treatment_choice') v = unwrap(read(data, 'inputs.water.treatment_choice')); return !present(v) || v === 'unknown' || v === 'undecided' ? 'unknown' : String(v) === expect; }
      if (['point_entered','fitting_present','parameter_entered','observation_entered','product_property_entered','insulation_property_entered','roughness_entered','heat_transfer_entered','local_loss_entered'].includes(c)) return true;
      if (c === 'existing_or_selected') { const st = sibling(data, item.path, 'state'); return st === 'existing' || st === 'selected' ? true : st === 'proposed' ? false : 'unknown'; }
      if (c === 'mass_known' || c === 'volume_known') { const field = c.split('_')[0], alternate = field === 'mass' ? 'volume' : 'mass'; if (present(sibling(data,item.path,field+'_min')) || present(sibling(data,item.path,field+'_max'))) return true; if (present(sibling(data,item.path,alternate+'_min')) && present(sibling(data,item.path,alternate+'_max'))) return false; return 'unknown'; }
      if (c === 'max_differential_pressure_present' || c === 'rated_heat_present') return present(sibling(data,item.path,c.replace('_present',''))) ? true : 'unknown';
      if (c === 'thermal_basis_area' || c === 'thermal_basis_power') { const a = sibling(data,item.path,'area'), p = sibling(data,item.path,'rated_heat'); return c === 'thermal_basis_area' ? (present(a) ? true : present(p) ? false : 'unknown') : (present(p) ? true : present(a) ? false : 'unknown'); }
      if (c === 'chemical_selected') return present(unwrap(read(data,'inputs.chemical.product_ref'))) ? true : 'unknown';
      if (c === 'receiver_present') { const rec = item.path.match(/^inputs\.discharge_receivers\[\d+\]/); return rec ? true : 'unknown'; }
      if (c === 'phase_change') { const v=sibling(data,item.path,'process_mode'); return v==='melting'?true:'unknown'; }
      // Unsupported applicability cannot silently waive a required record.
      return 'unknown';
    }
    function validate(data) {
      const errors = [], warnings = [], levels = {};
      [1,2,3].forEach(l => levels[l] = { required:0, filled:0, missing:0, unresolved:0, missingFields:[], status:'incomplete' });
      const err = (path,code,message) => errors.push({ path, code, message });
      const warn = (path,code,message) => warnings.push({ path, code, message });
      try { plainSafe(data); } catch(e) { err('$','unsafe',e.message); return { errors,warnings,levels,mapping:{status:'mapping_pending',count:0} }; }
      if (!object(data)) { err('$','shape','Dataset must be an object'); return { errors,warnings,levels,mapping:{status:'mapping_pending',count:0} }; }
      const ROOT = new Set(['schema_version','dataset_id','revision_id','base_package_revision','base_graph_sha256','created_at','updated_at','inputs','documents','results','calculation_runs']);
      Object.keys(data).forEach(k => { if(!ROOT.has(k)) err(k,'unknown_key','Unknown dataset property'); });
      if(!versions.includes(data.schema_version)) err('schema_version','version','Unsupported schema version; explicit migration required');
      ['dataset_id','revision_id'].forEach(k=>{if(typeof data[k]!=='string'||!data[k])err(k,'id','Stable dataset/revision ID required');});
      ['created_at','updated_at'].forEach(k=>{if(!validDate(data[k]))err(k,'date','ISO date required');});
      if(!object(data.inputs)) err('inputs','shape','inputs must be an object');
      if(!Array.isArray(data.documents)) err('documents','shape','documents must be an array');
      const docs = new Set(), ids = new Map(), records = new Map();
      function register(map,id,path,label) { if(typeof id!=='string'||!id||id.length>160)err(path,'id','Invalid '+label);else if(map.has(id))err(path,'duplicate_id','Duplicate '+label);else map.set(id,path); }
      (Array.isArray(data.documents)?data.documents:[]).forEach((d,i)=>{const path='documents['+i+']';if(!object(d)){err(path,'shape','Document must be an object');return;}Object.keys(d).forEach(k=>{if(!['id','title','reference','revision','date','role_ref'].includes(k))err(path+'.'+k,'unknown_key','Unknown document property');});if(typeof d.id!=='string'||!d.id||docs.has(d.id))err(path+'.id','document_id','Missing/duplicate document ID');else docs.add(d.id);for(const k of Object.keys(d))if(typeof d[k]!=='string'&&d[k]!==null)err(path+'.'+k,'type','Document metadata must be text');});
      function walk(n,path) {
        if(path===MD_PATH && data.schema_version==='boiler-site-input-1c' && versions.includes(data.schema_version)) {
          const schema=getCalcSchema();
          if(!schema||typeof schema.validateMethodData!=='function'){err(path,'method_schema_missing','Method-data validator is unavailable');return;}
          const checked=schema.validateMethodData(n,data);
          errors.push(...(checked.errors||[]));warnings.push(...(checked.warnings||[]));return;
        }
        const templ=generic(path),def=leaves.get(templ);
        if(def){validateLeaf(n,path,def);return;}
        if(Array.isArray(n)) {
          if(!arrayScopes.has(templ)){err(path,'unknown_array','Unknown record collection');return;}
          n.forEach((v,i)=>{const pp=path+'['+i+']';if(!object(v)){err(pp,'shape','Repeated records must be objects');return;}register(records,v.record_id,pp+'.record_id','record_id');walk(v,pp);});return;
        }
        if(!object(n)){err(path,'shape','Expected an object or catalog value');return;}
        for(const k of Object.keys(n)) {
          if(k==='record_id'&&/\[\d+\]$/.test(path))continue;
          const pp=path+'.'+k,gp=generic(pp);
          if(pp===MD_PATH && data.schema_version==='boiler-site-input-1c' && versions.includes(data.schema_version))walk(n[k],pp);
          else if(!leaves.has(gp)&&!Array.from(leaves.keys()).some(x=>x.startsWith(gp+'.')||x.startsWith(gp+'[]')))err(pp,'unknown_key','Unknown input property');
          else walk(n[k],pp);
        }
      }
      function validateLeaf(env,path,def) {
        if(def.type==='id'){register(ids,env,path,'domain ID');return;}
        if(!object(env)||!own(env,'value')){err(path,'envelope','Value envelope required');return;}
        Object.keys(env).forEach(k=>{if(!ENV_KEYS.has(k))err(path+'.'+k,'unknown_key','Unknown provenance property');});
        if(!catalog.dataset_contract.input_statuses.includes(env.status))err(path+'.status','status','Unsupported provenance status');
        const v=env.value;
        if(!present(v)) { if(env.status!=='empty')warn(path,'empty_status','Empty value must not imply provenance'); return; }
        if(env.status==='empty')err(path+'.status','status','Nonempty value cannot have empty status');
        try { const typed=cast(def,v); if(typeof typed!==typeof v || JSON.stringify(typed)!==JSON.stringify(v))err(path+'.value','type','Serialized value has wrong type'); } catch(e){err(path+'.value','type',e.message);}
        const info=unitInfo(data,path);
        if(!info||!info.resolved)err(path+'.unit','quantity',info&&info.error||'Unknown quantity');
        else if(env.unit!==info.canonical_unit)err(path+'.unit','unit','Stored value must use '+info.canonical_unit);
        ['source_ref','author_ref','approval_ref','date','recorded_at','observed_at','uncertainty_ref','note','origin_status','import_review','supersedes'].forEach(k=>{if(env[k]!==undefined&&env[k]!==null&&typeof env[k]!=='string')err(path+'.'+k,'metadata_type','Provenance must be text');});
        ['date','recorded_at','observed_at'].forEach(k=>{if(present(env[k])&&!validDate(env[k]))err(path+'.'+k,'date','Invalid ISO date');});
        if(env.source_ref&&!docs.has(env.source_ref))warn(path+'.source_ref','missing_document','Referenced source document is absent');
        if(env.approval_ref&&!docs.has(env.approval_ref))warn(path+'.approval_ref','missing_document','Approval document is absent');
        if(env.status!=='example'&&(!env.source_ref||!env.author_ref||!env.date))warn(path,'provenance_incomplete','Source document, responsible role and source date required');
        if(env.status==='measured'&&!env.observed_at)warn(path,'measurement_time','Measurement time required; entry time is not a measurement');
        if(env.status==='engineer_approved'&&(!env.approval_ref||!env.author_ref))warn(path,'approval_incomplete','Approval needs role and document ID; claim is not authenticated');
        if(def.type==='doc_ref'&&!docs.has(v))warn(path,'missing_document','Document reference is absent');
        if(def.type==='pressure_ref'&&v==='unknown')warn(path,'pressure_reference','Pressure base still unknown');
        if(def.type==='pressure_class'&&['test','unknown'].includes(v))warn(path,'pressure_class','Test/unknown pressure is not an allowable service limit');
        if(env.original_input!==undefined&&env.original_input!==null){
          const o=env.original_input;
          if(!object(o)||Object.keys(o).some(k=>!['value','unit'].includes(k))||typeof o.unit!=='string')err(path+'.original_input','original_input','Original input must contain value/unit only');
          else {
            const conv=info&&info.input_units.find(c=>c.unit===o.unit), nums=Array.isArray(o.value)?o.value:[o.value], values=Array.isArray(v)?v:[v];
            if(!conv||nums.length!==values.length||nums.some(x=>typeof x!=='number'||!Number.isFinite(x)))err(path+'.original_input','original_input','Original unit/value unsupported');
            else if(nums.some((x,i)=>Math.abs(x*conv.factor+conv.offset-values[i])>Math.max(1,Math.abs(values[i]))*1e-12))err(path+'.original_input','original_input','Original input contradicts stored value');
          }
        }
      }
      if(object(data.inputs))walk(data.inputs,'inputs');
      for(const [id,path] of ids)if(records.has(id))err(path,'duplicate_id','Domain ID collides with technical record_id');
      for(const item of entries(data)) {
        const f=item.definition,v=unwrap(item.envelope);
        if(['id_ref','id_list'].includes(f.type)&&present(v))for(const ref of (Array.isArray(v)?v:[v]))if(!ids.has(ref)&&!records.has(ref))warn(item.path,'missing_reference','Record reference is unresolved: '+String(ref));
        if(f.type==='field_ref_list'&&present(v))for(const ref of v){try{if(!definitionFor(ref))warn(item.path,'missing_field_reference','Unknown field reference');}catch(e){warn(item.path,'missing_field_reference','Unresolved field reference');}}
        // Comparison of documented endpoints is a structural check, not hydraulic calculation.
        if(typeof v==='number') {
          const pairs=[['_min','_max'],['.minimum','.maximum'],['.elevation_bottom','.elevation_top'],['.elevation_low','.elevation_high']];
          for(const [a,b]of pairs)if(item.path.endsWith(a)){const pp=item.path.slice(0,-a.length)+b,other=unwrap(read(data,pp));if(typeof other==='number'&&v>other)warn(item.path,'minmax','Minimum exceeds maximum');}
        }
        if(f.quantity==='pressure'&&typeof v==='number') {
          const base=sibling(data,item.path,item.path.endsWith('factory_precharge')?'precharge_reference':'pressure_reference');
          if(!['gauge','absolute'].includes(base))warn(item.path,'pressure_reference','Gauge/absolute base is required for this pressure');
        }
      }
      inputDefs.forEach(def=>instances(data,def).forEach(item=>{
        const l=levels[def.level];if(!l)return;const req=condition(data,item);if(req===false)return;
        if(req==='unknown') {l.unresolved++; l.missingFields.push({path:item.path,code:'applicability_unknown',label_he:def.label_he});return;}
        l.required++;const env=item.envelope,v=unwrap(env);
        const sourceOkay=object(env)&&!!env.source_ref&&docs.has(env.source_ref)&&!!env.author_ref&&!!env.date&&(env.status!=='measured'||!!env.observed_at)&&(env.status!=='engineer_approved'||(!!env.approval_ref&&docs.has(env.approval_ref)));
        const fieldWarnings=warnings.some(w=>w.path===item.path||w.path.startsWith(item.path+'.'))||errors.some(w=>w.path===item.path||w.path.startsWith(item.path+'.'));
        const okay=present(v)&&(def.type==='id'||(object(env)&&!['empty','example'].includes(env.status)&&sourceOkay&&!fieldWarnings));
        if(okay)l.filled++;else{l.missing++;l.missingFields.push({path:item.path,code:'missing',label_he:def.label_he});}
      }));
      // Absence of a repeated collection is not proof that its engineering need is waived.
      const missingCollections=['inputs.routes','inputs.operations.scenarios'];
      missingCollections.forEach(path=>{const arr=read(data,path);if(!Array.isArray(arr)||!arr.length){levels[1].unresolved++;levels[1].missingFields.push({path,code:'collection_not_described',label_he:path==='inputs.routes'?'תוואי צנרת טרם תוארו':'תרחישי הפעלה טרם תוארו'});}});
      Object.values(levels).forEach(l=>{l.status=l.missing||l.unresolved||errors.length?'incomplete':'ready_for_engineering_review';});
      validateResults(data,err,warn);
      if(data.base_package_revision!=='v4.2/R2')warn('base_package_revision','base_mismatch','Review template mapping against this revision');
      return { errors,warnings,levels,mapping:mapping(data), engineeringAcceptance:false, physicalConnection:false };
    }
    function validateResults(data,err,warn) {
      if(!object(data.results)){err('results','shape','Results must be a reserved object');return;}
      if(!Array.isArray(data.calculation_runs)){err('calculation_runs','shape','Calculation runs must be an array');return;}
      const resultDefs=defs.filter(d=>d.key.startsWith('results.'));
      const allowed=new Set(['result_id','output_kind','target_refs','value','unit','pressure_reference','status','validity','run_ref','method_ref','method_version','input_refs','input_fingerprint','assumptions_refs','scenario_ref','warnings','approval_ref','import_review','record_id']);
      const resultIds=new Set();
      function walk(n,path) {
        const g=generic(path),def=leaves.get(g);
        if(def){if(!object(n)){err(path,'result_envelope','Read-only result envelope required');return;}Object.keys(n).forEach(k=>{if(!allowed.has(k))err(path+'.'+k,'unknown_key','Unknown result property');});
          if(!['not_calculated','calculated','approved'].includes(n.status))err(path+'.status','result_status','Invalid result status');
          if(n.status==='not_calculated'&&n.value!==null)err(path+'.value','result_value','Not calculated requires null');
          if(!['current','stale','invalid'].includes(n.validity))err(path+'.validity','result_validity','Result validity required');
          if(typeof n.result_id!=='string'||!n.result_id||resultIds.has(n.result_id))err(path+'.result_id','result_id','Missing/duplicate result ID');else resultIds.add(n.result_id);
          if(present(n.value)&&def.quantity!=='dependent'&&n.unit!==def.canonical_unit)err(path+'.unit','unit','Result unit must be canonical');
          if(n.status!=='not_calculated')warn(path,'external_result','Calculated or claimed result is read-only and requires independent engineering review');return;}
        if(Array.isArray(n)){if(!arrayScopes.has(g)){err(path,'unknown_key','Unknown result array');return;}n.forEach((v,i)=>walk(v,path+'['+i+']'));return;}
        if(!object(n)){err(path,'shape','Expected result object');return;}
        for(const k of Object.keys(n)){if(k==='record_id'&&/\[\d+\]$/.test(path))continue;const pp=path+'.'+k,gp=generic(pp);if(!resultDefs.some(d=>d.key===gp||d.key.startsWith(gp+'.')||d.key.startsWith(gp+'[]')))err(pp,'unknown_key','Unknown result property');else walk(n[k],pp);}
      }
      walk(data.results,'results');
      const runKeys=new Set(['run_id','method_registry_version','started_at','finished_at','input_revision','input_fingerprint','scenario_refs','result_refs','warnings','blocking_input_refs','verification_ref']);
      data.calculation_runs.forEach((r,i)=>{if(!object(r)){err('calculation_runs['+i+']','shape','Run must be an object');return;}Object.keys(r).forEach(k=>{if(!runKeys.has(k))err('calculation_runs['+i+'].'+k,'unknown_key','Unknown calculation-run property');});});
    }
    function importText(text) {
      if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw new Error('File must be JSON up to 5 MiB');
      let data;try{data=JSON.parse(text);}catch(e){throw new Error('Invalid JSON');}
      const check=validate(data);if(check.errors.length){const e=new Error(check.errors[0].path+': '+check.errors[0].message);e.validation=check;throw e;}
      for(const item of entries(data))if(object(item.envelope)&&item.envelope.status==='engineer_approved')item.envelope.import_review='pending';
      const mark=n=>{if(Array.isArray(n))n.forEach(mark);else if(object(n)){if(['not_calculated','calculated','approved'].includes(n.status)){n.validity='stale';n.import_review='pending';}Object.values(n).forEach(v=>{if(object(v)||Array.isArray(v))mark(v);});}};mark(data.results);
      return { data, validation:validate(data) };
    }
    function exportText(data) { const v=validate(data);if(v.errors.length){const e=new Error(v.errors[0].path+': '+v.errors[0].message);e.validation=v;throw e;}return JSON.stringify(data,null,2)+'\n'; }
    function setMethodData(data, md) {
      if(data.schema_version!=='boiler-site-input-1c'||!versions.includes(data.schema_version))throw new Error('Explicit migration to 1c is required');
      plainSafe(md);if(new TextEncoder().encode(JSON.stringify(md)).length>MAX_BYTES)throw new Error('Method data exceeds 5 MiB');const schema=getCalcSchema();if(!schema)throw new Error('Method-data validator unavailable');
      const checked=schema.validateMethodData(md,data);
      if(checked.errors.length){const e=new Error(checked.errors[0].path+': '+checked.errors[0].message);e.validation=checked;throw e;}
      write(data,MD_PATH,clone(md));invalidate(data);return checked;
    }
    function previewMigration(data) {
      const schema=getCalcSchema();if(!schema||typeof schema.previewMigration!=='function')throw new Error('Migration validator unavailable');
      const validation=validate(data);if(validation.errors.length)throw new Error('Invalid source input cannot be migrated');
      const proposal=schema.previewMigration(clone(data));const checked=validate(proposal.candidate);
      if(checked.errors.length){const e=new Error('Migration candidate failed validation');e.validation=checked;throw e;}
      return proposal;
    }
    const RESULT_KEYS=new Set(['result_id','output_kind','target_refs','value','unit','pressure_reference','status','validity','run_ref','method_ref','method_version','input_refs','input_fingerprint','assumptions_refs','scenario_ref','warnings','approval_ref','import_review','record_id']);
    function projectCalculation(data, artifact, options={}) {
      plainSafe(artifact);
      if(!object(artifact)||artifact.schema_version!=='boiler-site-results-1'||!object(artifact.results)||typeof artifact.run_id!=='string'||!artifact.run_id)throw new Error('Unsupported result artifact');
      if(artifact.dataset_id!==data.dataset_id)throw new Error('Result dataset does not match');
      if(!options.imported&&artifact.input_revision!==data.revision_id)throw new Error('Result input revision is stale');
      function project(n,path) {
        const def=leaves.get(generic(path));
        if(def){if(!object(n)||!['not_calculated','calculated'].includes(n.status))throw new Error('Calculation cannot approve results');
          if(n.status==='not_calculated'&&n.value!==null)throw new Error('Not calculated requires null');
          if(n.status==='calculated'&&(n.value===undefined||n.value===null))throw new Error('Calculated result requires a value');
          if(n.status==='calculated'&&def.type==='result'&&(typeof n.value!=='number'||!Number.isFinite(n.value)))throw new Error('Numeric result requires a finite number');
          if(n.status==='calculated'&&def.type==='result_id_list'&&(!Array.isArray(n.value)||n.value.some(v=>typeof v!=='string')))throw new Error('Result references must be an ID list');
          const out={};for(const k of Object.keys(n))if(RESULT_KEYS.has(k))out[k]=clone(n[k]);
          out.approval_ref=null;if(options.imported){out.validity='stale';out.import_review='pending';}return out;}
        if(Array.isArray(n))return n.map((v,i)=>project(v,path+'['+i+']'));
        if(!object(n))throw new Error('Invalid result shape');
        const out={};for(const k of Object.keys(n))out[k]=k==='record_id'?clone(n[k]):project(n[k],path+'.'+k);return out;
      }
      const candidate=clone(data);candidate.results=project(artifact.results,'results');
      const run={run_id:artifact.run_id,method_registry_version:artifact.method_registry_version||'',started_at:artifact.supplied_run_time||null,finished_at:artifact.supplied_run_time||null,input_revision:artifact.input_revision,input_fingerprint:artifact.input_hash,scenario_refs:[...new Set((artifact.assessments||[]).map(a=>a.scenario_ref).filter(Boolean))],result_refs:[],warnings:[],blocking_input_refs:[...new Set((artifact.diagnostics||[]).flatMap(d=>d.missing_inputs||[]))],verification_ref:null};
      const gather=n=>{if(Array.isArray(n))n.forEach(gather);else if(object(n)){if(n.result_id)run.result_refs.push(n.result_id);else Object.values(n).forEach(gather);}};gather(candidate.results);
      candidate.calculation_runs=[...(candidate.calculation_runs||[]),run];
      const checked=validate(candidate);if(checked.errors.length){const e=new Error(checked.errors[0].path+': '+checked.errors[0].message);e.validation=checked;throw e;}
      return candidate;
    }
    return { catalog, definitions:defs, inputDefinitions:inputDefs, newDataset, definitionFor, get:read, collections, addRecord, instances, entries, unitInfo, setValue, updateProvenance, validate, importText, exportText, mapping, condition, invalidate, setMethodData, previewMigration, projectCalculation, supportedVersions:versions.slice() };
  }
  return { create, MAX_BYTES };
});
