/* BOILER-A3 local calculation UI. No storage, network, live commands or approval. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.BoilerCalcUI=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const STATUSES={not_calculated:'לא חושב',calculated:'חושב · לא אושר',approved:'טענת אישור מיובאת · לא אומתה'};
  const VALIDITY={current:'עדכני לקלט זה',stale:'לא עדכני · יש לחשב מחדש',invalid:'לא תקף'};
  const CHECKS={
    'SAF-PRESSURE':'מעטפת לחץ עליונה','SAF-MINPRESSURE':'מעטפת לחץ תחתונה',
    'SAF-RELIEF':'הגנת פריקה','SAF-QMIN':'ספיקה מזערית',
    'SAF-NPSH':'יניקת משאבה / NPSH','SAF-HOTSTOP':'עצירה חמה ואובדן זרימה',
    'SAF-ELECTRIC':'אספקת חשמל','SAF-THERMAL':'היתכנות תרמית'
  };
  const FAMILIES={
    'SC01-COLD-FILL':'מילוי קר','SC02-HOT-RUN':'עבודה חמה',
    'SC03-ALL-CLOSED':'כל הענפים סגורים · H0 / Hmax',
    'SC04-MAKEUP-H0-HEAT':'כשל מילוי + משאבה + חימום',
    'SC05-HEAT-CLOSED':'חימום עם ענפים סגורים','SC06-TRAPPED-JACKET':'מעטפת מבודדת ומחוממת',
    'SC07-TWO-PUMPS':'שתי משאבות במקביל בטעות','SC08-COOLING-STOP':'קירור ועצירה',
    'SC09-ET-ISOLATED':'אובדן קשר למכל ההתפשטות'
  };
  const CODES={missing_input:'חסר נתון',missing_coefficient:'חסר מקדם',unresolved_reference:'המסמך טרם הומר לנתונים',unsupported_method:'המודל אינו תומך במקרה',invalid_input:'קלט לא תקין',invalid_domain:'מחוץ לתחום המודל',upstream_not_computed:'תוצאה תלויה טרם חושבה',non_converged:'לא הושגה התכנסות',contradictory_inputs:'קלטים סותרים',decision_required:'דרושה החלטה הנדסית',not_applicable:'תחולה דורשת הצדקה'};
  const LABELS={id:'מזהה יציב',value:'ערך',unit:'יחידה',provenance:'מקור ואי־ודאות',source_ref:'מזהה מסמך מקור',page:'עמוד / סעיף',revision:'מהדורת מקור',reviewer_role:'קוד תפקיד אחראי',status:'מעמד מקור',data_class:'סוג נתונים',uncertainty:'אי־ודאות',approval_ref:'מזהה מסמך בדיקה',source_type:'סוג מקור',review_required:'דרושה בדיקת מהנדס',applicability_ref:'תחום תחולה / מסמך',equipment_ref:'מזהה ציוד',fluid_ref:'מזהה תכונות נוזל',load_ref:'מזהה עומס',route_ref:'מזהה תוואי',scenario_ref:'מזהה תרחיש',points:'נקודות מאופיינות',interpolation_method:'מזהה ושיטת קירוב (ללא אקסטרפולציה)',speed_rpm:'מהירות [rpm]',impeller_m:'קוטר מאיץ [m]',flow_m3_h:'ספיקה [m³/h]',head_m:'עומד [m]',npshr_m:'NPSHr [m]',electrical_kw:'הספק חשמלי [kW]',temperature_c:'טמפרטורה [°C]',pressure_abs_bar:'לחץ מוחלט [bar]',minimum_flow_m3_h:'ספיקה מזערית [m³/h]',maximum_flow_m3_h:'ספיקה מרבית [m³/h]',source_pressure_g_bar:'לחץ מקור יחסי [bar]',gravity_m_s2:'תאוצת כבידה [m/s²]',atmospheric_pressure_bar:'לחץ אטמוספרי [bar abs]',rho_kg_m3:'צפיפות [kg/m³]',cp_j_kg_k:'קיבול חום סגולי [J/(kg·K)]',mu_pa_s:'צמיגות דינמית [Pa·s]',pv_abs_bar:'לחץ אדים [bar abs]',beta_per_k:'מקדם התפשטות [1/K]',model:'מודל',family_id:'משפחת תרחיש',paths:'מסלולי לחץ',branch_paths:'מסלולי ענפים',system_curve:'עקומת מערכת',pressure_ladders:'סולם לחץ',timers:'תקציבי זמן',target_ref:'מזהה יעד',point_ref:'מזהה נקודה'};
  function leaves(tree,path='results',out=[]){
    if(Array.isArray(tree))tree.forEach((n,i)=>leaves(n,`${path}[${i}]`,out));
    else if(object(tree)){if(Object.hasOwn(tree,'result_id'))out.push({path,envelope:tree});else Object.entries(tree).forEach(([k,n])=>leaves(n,path+'.'+k,out));}
    return out;
  }
  function pressureDetails(n,artifact){
    if(!n||!(n.output_kind==='L23'||typeof n.result_id==='string'&&n.result_id.startsWith('L23:'))||!['calculated','approved'].includes(n.status)||!['current','stale'].includes(n.validity)||n.unit!=='bar'||!Number.isFinite(n.value))return null;
    if(typeof n.scenario_ref!=='string'||!n.scenario_ref||!Array.isArray(n.target_refs)||n.target_refs.length!==1||!artifact||!artifact.run_id||!artifact.input_hash||artifact.run_id!==n.run_ref||artifact.input_hash!==n.input_fingerprint)return null;
    const matches=(Array.isArray(artifact.traces)?artifact.traces:[]).filter(t=>t&&t.trace_id==='pressure:'+n.scenario_ref);
    if(matches.length!==1)return null;const t=matches[0],v=t.values;
    if(!object(v)||v.target_ref!==n.target_refs[0]||n.scenario_ref!==v.case_id+':'+v.path_id)return null;
    const suffix={gauge:'_g_bar',absolute:'_abs_bar'}[n.pressure_reference];if(!suffix)return null;
    const nominal=v['nominal'+suffix],lower=v['lower'+suffix],upper=v['upper'+suffix];
    if(![nominal,lower,upper].every(Number.isFinite)||lower>nominal||nominal>upper||upper!==n.value)return null;
    return {nominal_bar:nominal,lower_bar:lower,upper_bar:upper,unit:'bar',pressure_reference:n.pressure_reference,scenario_ref:n.scenario_ref,target_ref:v.target_ref,trace_id:t.trace_id,validity:n.validity};
  }
  function inputSnapshot(app){return app.getInputSnapshot?app.getInputSnapshot():JSON.stringify({schema_version:app.getDataset().schema_version,dataset_id:app.getDataset().dataset_id,revision_id:app.getDataset().revision_id,inputs:app.getDataset().inputs,documents:app.getDataset().documents});}
  // Independent of DOM: each run holds a cloned snapshot and a generation.
  // An edit/import or a newer run makes the old async completion ineligible.
  function createSession(app,engine,catalog,compute){
    let generation=0;
    return {
      async run(runTime){
        const token=++generation,snapshotKey=inputSnapshot(app),serial=app.getChangeSerial?.(),dataset=copy(app.getDataset());
        const validation=engine.validate(dataset);
        if(validation.errors.length)return {status:'invalid',validation};
        const artifact=await compute(dataset,catalog,{run_time:runTime});
        if(token!==generation||snapshotKey!==inputSnapshot(app)||(serial!==undefined&&serial!==app.getChangeSerial()))return {status:'superseded',artifact};
        const applied=app.applyCalculation(artifact,{expectedSnapshot:snapshotKey});
        return {status:applied===false?'superseded':'applied',artifact};
      },
      cancel(){generation++;},
      importArtifact(text){
        if(typeof text!=='string'||new TextEncoder().encode(text).length>5*1024*1024)throw new Error('Results file exceeds 5 MiB');
        const artifact=JSON.parse(text);generation++;app.applyCalculation(artifact,{imported:true});return artifact;
      }
    };
  }
  function mount(container,catalog,engine,app){
    if(!container||!app||!engine)throw new Error('Calculation UI needs the local editor');
    if(container.dataset.calcMounted==='true')return app.calculator;
    container.dataset.calcMounted='true';
    const doc=container.ownerDocument,win=doc.defaultView||globalThis;
    const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
    const btn=(text,action,cls)=>{const n=el('button',text,cls);n.type='button';n.addEventListener('click',action);return n;};
    const schema=win.BoilerCalcSchema,compute=win.BoilerCompute;
    const session=createSession(app,engine,catalog,(...args)=>{if(!compute?.computeSite)throw new Error('מנוע החישוב המקומי אינו זמין.');return compute.computeSite(...args);});
    const nodes=app.getNodes(),panel=el('section',undefined,'site-calc-panel');panel.setAttribute('aria-label','חישוב מקומי ראשוני');
    const headline=el('div',undefined,'site-calc-headline');headline.append(el('h2','חישוב ראשוני, לפי הנתונים שהוזנו'));
    const badge=el('strong','אין חישוב','site-calc-badge');headline.append(badge);
    const actions=el('div',undefined,'site-calc-actions');
    const runButton=btn('חשב',run,'site-primary site-calc-run');
    const exportButton=btn('הורדת תוצאות JSON',()=>downloadArtifact());exportButton.disabled=true;
    const resultFile=el('input');resultFile.type='file';resultFile.accept='.json,application/json';resultFile.hidden=true;
    const methodButton=btn('מקדמים ועקומות · מתקדם',methodEditor);
    actions.append(runButton,btn('37 תוצאות ובדיקות',()=>app.showResults()),exportButton,methodButton,btn('דוגמה EXAMPLE-3',examplePreview),btn('ייבוא תוצאות לבדיקה',()=>resultFile.click()),resultFile);
    const migration=btn('צפייה בשדרוג מפורש ל־1c',migrationPreview);
    const summary=el('p','טרם בוצע חישוב. קובץ חדש אינו מכיל ערכי אתר או מקדמים מספריים.','site-calc-summary');summary.setAttribute('aria-live','polite');
    const boundary=el('p','חישוב מקומי אינו אישור תכנון, בחירת ציוד או ערכי הגנה מאושרים. דרושה בדיקת מהנדס לפי המקורות והאי־ודאות. אין חיבור לטלמטריה או לבקר.','site-note');
    const hashes=el('details',undefined,'site-calc-hashes');hashes.append(el('summary','זהות קלט, שיטה ותוצאה'));
    panel.append(headline,actions,migration,summary,boundary,hashes);nodes.shell.insertBefore(panel,nodes.notice);
    let busy=0,dialog=null,lastFocus=null;
    function tell(message,bad=false){app.notify(message,bad);}
    function close(){if(dialog){dialog.close();dialog.remove();dialog=null;}lastFocus?.focus();}
    function modal(title){close();lastFocus=doc.activeElement;dialog=el('dialog',undefined,'site-dialog site-calc-dialog');dialog.dir='rtl';const h=el('h2',title);h.id='site-calc-dialog-heading';dialog.setAttribute('aria-labelledby',h.id);dialog.append(btn('סגירה',close,'site-dialog-close'),h);container.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();return dialog;}
    function pre(value){const n=el('pre',typeof value==='string'?value:JSON.stringify(value,null,2),'site-calc-json');n.dir='ltr';return n;}
    function pathButton(path,host){if(typeof path!=='string')return;const known=engine.definitionFor(path.replace(/\.(value|unit|status|source_ref)$/,''));const label=known?.label_he||LABELS[path.split('.').pop()]||'נתון שיטה / מסמך נדרש';const n=known?btn(label+' · '+path,()=>app.showValue(path.replace(/\.(value|unit|status|source_ref)$/,''))):el('code',label+' · '+path);n.classList.add('site-calc-path');host.append(n);}
    function refresh(){
      const artifact=app.getCalculation(),all=leaves(app.getDataset().results),current=artifact?.ui_validity==='current',calculated=all.filter(x=>x.envelope.status==='calculated').length;
      badge.textContent=artifact?(current?(calculated?'חושב · לא אושר':'הריצה הסתיימה · חסרים נתונים'):'לא עדכני · יש לחשב מחדש'):(all.length?'תוצאות מיובאות · לא אומתו':'אין חישוב');badge.dataset.validity=artifact?.ui_validity||'stale';
      const example=engine.entries(app.getDataset()).some(x=>x.envelope?.status==='example')||app.getDataset().dataset_id?.includes('EXAMPLE-3');panel.classList.toggle('site-calc-example',example);
      summary.textContent=artifact?`${example?'דוגמה בלבד · ':''}${calculated} ערכים חושבו מתוך ${all.length} ערכים/תרחישים. ${current?'עדכני לקלט זה; טעון בדיקת מהנדס.':'הקלט או המקור השתנו; תוצאות קודמות אינן עדכניות.'}`:(example?'דוגמה בלבד · יש ללחוץ על חשב.':'טרם בוצע חישוב מקומי. חסר נתון נשאר חסר; אין השלמת מספרים אוטומטית.');
      exportButton.disabled=!artifact;methodButton.disabled=!schema;runButton.disabled=busy>0||!compute?.computeSite;migration.hidden=app.getDataset().schema_version!=='boiler-site-input-1b';
      hashes.replaceChildren(el('summary','זהות קלט, שיטה ותוצאה'));
      if(artifact){for(const key of ['dataset_id','input_revision','run_id','supplied_run_time','input_hash','method_registry_version','method_hash','basis_hash','output_hash']){const row=el('div',undefined,'site-calc-hash-row');row.append(el('strong',key),el('code',String(artifact[key]??'—')));hashes.append(row);}hashes.append(el('p','הגיבוב מתייחס לקובץ הריצה המקורי. שינוי קלט אינו משנה את הארכיון; הוא מסמן את ההיטל המקומי כלא עדכני.','site-note'));const coefficients=el('details');coefficients.append(el('summary','כל המקדמים ששימשו בריצה · לבדוק עם מהנדס'),pre(artifact.coefficients_used||[]));hashes.append(coefficients);}
      else hashes.append(el('p','זהויות ריצה יופיעו לאחר חישוב.'));
    }
    async function run(){
      const ticket=++busy;refresh();runButton.textContent='מחשב…';
      try{const done=await session.run(new Date().toISOString());if(done.status==='invalid'){tell('הקלט אינו תקין. יש לתקן שגיאות מבנה לפני חישוב.',true);showValidation(done.validation);}else if(done.status==='superseded')tell('הקלט השתנה בזמן החישוב. התוצאה הישנה לא הוחלה; יש לחשב מחדש.');else{tell('החישוב המקומי הסתיים. התוצאות אינן אישור הנדסי.');app.showResults();}}
      catch(e){tell('החישוב לא הוחל: '+e.message,true);}
      finally{if(ticket<=busy)busy--;runButton.textContent='חשב';refresh();}
    }
    function showValidation(validation){const d=modal('נתונים לתיקון');d.append(el('p','הטיוטה הנוכחית נשמרה.'));for(const e of validation.errors||[]){const row=el('div',undefined,'site-calc-diagnostic');row.append(el('p',e.message_he||e.message||e.code));pathButton(e.path,row);d.append(row);}}
    function downloadArtifact(){const source=app.getCalculation();if(!source)return;const artifact=copy(source);delete artifact.ui_validity;const url=URL.createObjectURL(new Blob([JSON.stringify(artifact,null,2)+'\n'],{type:'application/json'}));const a=el('a');a.href=url;a.download='site-results.json';doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);tell(source.ui_validity==='current'?'קובץ תוצאות נפרד הוכן להורדה.':'הורד קובץ הריצה המקורי. הוא מתייחס לקלט הקודם ואינו עדכני לטיוטה.');}
    resultFile.addEventListener('change',async()=>{const f=resultFile.files[0];if(!f)return;try{if(f.size>5*1024*1024)throw new Error('5 MiB maximum');const text=await f.text(),artifact=JSON.parse(text);const candidate=engine.projectCalculation(app.getDataset(),artifact,{imported:true});const d=modal('ייבוא תוצאות — בדיקה לפני החלה');d.append(el('p','תוצאות מיובאות יישארו לא עדכניות ולא מאומתות. אין כאן אימות גיבובים או חתימה.'),pre({dataset_id:artifact.dataset_id,input_revision:artifact.input_revision,run_id:artifact.run_id,outputs:leaves(candidate.results).length}),btn('החלת תוצאות כלא עדכניות',()=>{try{session.importArtifact(text);close();app.showResults();tell('התוצאות יובאו לבדיקה בלבד; יש לחשב מחדש.');}catch(e){tell(e.message,true);}},'site-primary'));}catch(e){tell('קובץ התוצאות לא הוחל: '+e.message,true);}resultFile.value='';});
    function migrationPreview(){try{const preview=engine.previewMigration(app.getDataset()),before=inputSnapshot(app);const d=modal('מעבר מ־1b ל־1c · צפייה לפני החלה');d.append(el('p','נוספת אפשרות לנתוני שיטה ומקורות. שום ערך מספרי, יחידה או נתון מקור אינו מומצא או מומר.'),pre(preview.changes),btn('אישור השדרוג ל־1c',()=>{if(before!==inputSnapshot(app)){tell('הטיוטה השתנתה; יש לפתוח צפייה חדשה.',true);return;}app.replaceDataset(preview.candidate,{reason:'migration'});close();tell('גרסה 1c הוחלה במפורש. הערכים המקוריים נשמרו.');},'site-primary'),btn('ביטול',close));}catch(e){tell(e.message,true);}}
    async function examplePreview(){
      if(!compute?.createExample3){tell('קובץ הדוגמה המקומי אינו זמין.',true);return;}
      try{const candidate=await compute.createExample3(catalog),validated=engine.validate(candidate);if(validated.errors.length){showValidation(validated);return;}const before=inputSnapshot(app),d=modal('דוגמה EXAMPLE-3 — נתונים סינתטיים בלבד');d.append(el('p','דוגמה בלבד. ההחלה תחליף את הטיוטה בזיכרון בשלושה ענפים סינתטיים; המספרים אינם נתוני המפעל. ייצאו קודם טיוטה שברצונכם לשמור.','site-calc-example-notice'),el('p','הדוגמה מדגימה חישוב מותנה, נתונים חסרים וגבולות לחץ. שום תוצאה אינה מאושרת.'),btn('אישור טעינת דוגמה בלבד',()=>{if(before!==inputSnapshot(app)){tell('הטיוטה השתנתה; יש לפתוח צפייה חדשה.',true);return;}session.cancel();app.replaceDataset(candidate,{reason:'example'});close();tell('דוגמה EXAMPLE-3 נטענה. יש ללחוץ על חשב.');},'site-primary'),btn('ביטול',close));}catch(e){tell('הדוגמה לא הוחלה: '+e.message,true);}
    }
    function methodEditor(){
      if(app.getDataset().schema_version!=='boiler-site-input-1c'){migrationPreview();return;}
      const before=inputSnapshot(app),draft=copy(app.getDataset().inputs?.calculation_basis?.method_data||{}),d=modal('מקדמים ועקומות · נתוני שיטה 1c');
      d.append(el('p','הרחבה לפי הצורך. אין מקדמים או נקודות ברירת מחדל. הזינו ערכים קנוניים ואת מראה המקום לכל רשומה ולכל נקודה. assumed = לבדוק עם מהנדס; confirmed הוא טענת מקור שאינה אימות חתימה.','site-note'));
      const family=el('select');family.setAttribute('aria-label','בחירת קבוצת נתוני שיטה');for(const f of schema.FAMILY_SPECS){const o=el('option',`${f.id} · ${f.label_he}`);o.value=f.key;family.append(o);}d.append(family);
      const form=el('div',undefined,'site-calc-method-form'),errors=el('div',undefined,'site-field-error');errors.setAttribute('role','alert');d.append(form,errors);
      const raw=el('details',undefined,'site-calc-raw-editor'),rawArea=el('textarea');rawArea.dir='ltr';rawArea.rows=16;rawArea.setAttribute('aria-label','JSON מלא של נתוני השיטה בלבד');raw.append(el('summary','עריכת JSON מתקדמת של method_data בלבד'),el('p','עריכת JSON פעילה כשהחלונית פתוחה; היא מחליפה את השדות המובנים בשמירה.','site-note'),rawArea);d.append(raw);
      raw.addEventListener('toggle',()=>{if(raw.open)rawArea.value=JSON.stringify(draft,null,2);});
      const fresh=spec=>{const n={};if(Object.hasOwn(spec,'id'))n.id='';if(Object.hasOwn(spec,'provenance'))n.provenance={status:'assumed',data_class:'site',uncertainty:{}};return n;};
      function labelFor(key){return LABELS[key]||key;}
      function buildObject(host,value,spec,path,depth=0){
        for(const [key,type] of Object.entries(spec)){
          const fieldPath=path+'.'+key;
          const enumValues=Array.isArray(type)&&typeof type[0]==='string'&&!['number','string','boolean'].includes(type[0]);
          if(typeof type==='string'||enumValues){
            const label=el('label',undefined,'site-dialog-field'),title=el('span',labelFor(key));let control;
            if(enumValues||type==='boolean'){control=el('select');const blank=el('option','— לא נמסר —');blank.value='';control.append(blank);for(const v of enumValues?type:['true','false']){const option=el('option',({assumed:'assumed · לבדוק עם מהנדס',confirmed:'confirmed · טענת תיעוד',site:'נתוני אתר',example:'דוגמה',true:'כן',false:'לא'})[v]||v);option.value=String(v);control.append(option);}}
            else{control=el('input');control.type=type==='number'?'number':'text';if(type==='number'){control.step='any';control.inputMode='decimal';}}
            control.value=value[key]===undefined||value[key]===null?'':String(value[key]);control.dataset.methodPath=fieldPath;
            control.addEventListener('input',()=>{const text=control.value;if(text===''){delete value[key];return;}value[key]=type==='number'?Number(text):type==='boolean'?text==='true':text;});
            label.append(title,control);if(schema.FIELD_HELP[key])label.append(el('small',schema.FIELD_HELP[key],'site-note'));host.append(label);
          }else if(Array.isArray(type)&&['number','string'].includes(type[0])){
            const label=el('label',undefined,'site-dialog-field'),control=el('input');control.value=Array.isArray(value[key])?value[key].join(', '):'';control.placeholder=type[0]==='number'?'ערכים קנוניים מופרדים בפסיקים':'מזהים מופרדים בפסיקים';label.append(el('span',labelFor(key)),control);control.addEventListener('input',()=>{if(control.value.trim()===''){delete value[key];return;}const values=control.value.split(',').map(s=>s.trim());value[key]=type[0]==='number'?values.map(s=>s!==''&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)?Number(s):s):values;});host.append(label);
          }else{
            const detail=el('details',undefined,'site-calc-method-nested');detail.append(el('summary',labelFor(key)));if(schema.FIELD_HELP[key])detail.append(el('p',schema.FIELD_HELP[key],'site-note'));
            let built=false;detail.addEventListener('toggle',()=>{if(!detail.open||built)return;built=true;
              if(Array.isArray(type)){const items=Array.isArray(value[key])?value[key]:[];function addItem(item,i){const section=el('details',undefined,'site-calc-method-record');section.append(el('summary',`${key==='points'?'נקודה':'רשומה'} ${i+1}`));const fields=el('div',undefined,'site-calc-method-fields');buildObject(fields,item,type[0],fieldPath+`[${i}]`,depth+1);section.append(fields);detail.append(section);}
                items.forEach(addItem);detail.append(btn(key==='points'?'הוספת נקודה ריקה':'הוספת רשומה ריקה',()=>{if(!Array.isArray(value[key]))value[key]=items;const item=fresh(type[0]);items.push(item);addItem(item,items.length-1);}));
              }else{const child=object(value[key])?value[key]:{};const fields=el('div',undefined,'site-calc-method-fields');buildObject(fields,child,type,fieldPath,depth+1);fields.addEventListener('input',()=>{value[key]=child;});detail.append(fields);}
            });host.append(detail);
          }
        }
      }
      function renderFamily(){form.replaceChildren();const selected=schema.FAMILY_SPECS.find(f=>f.key===family.value),spec=schema.schemas[selected.key];form.append(el('h3',selected.label_he),el('code','inputs.calculation_basis.method_data.'+selected.key,'site-calc-path'));
        if(selected.kind==='array'){
          const items=draft[selected.key]||[];const records=el('div');const add=(item,i)=>{const detail=el('details',undefined,'site-calc-method-record');detail.open=items.length===1;detail.append(el('summary',`${item.id||'רשומה ריקה'} · ${i+1}`));const fields=el('div',undefined,'site-calc-method-fields');buildObject(fields,item,spec[0],`inputs.calculation_basis.method_data.${selected.key}[${i}]`);detail.append(fields);records.append(detail);};items.forEach(add);form.append(records,btn('הוספת רשומה ריקה',()=>{if(!draft[selected.key])draft[selected.key]=items;const item=fresh(spec[0]);items.push(item);renderFamily();}));
        }else if(draft[selected.key]){const fields=el('div',undefined,'site-calc-method-fields');buildObject(fields,draft[selected.key],spec,`inputs.calculation_basis.method_data.${selected.key}`);form.append(fields);}
        else form.append(el('p','טרם הוזנו נתונים בקבוצה זו.'),btn('פתיחת רשומה ריקה',()=>{draft[selected.key]=fresh(spec);renderFamily();}));
      }
      family.addEventListener('change',renderFamily);renderFamily();
      d.append(btn('בדיקה ושמירת נתוני השיטה',()=>{try{if(before!==inputSnapshot(app))throw new Error('הטיוטה השתנתה. יש לסגור ולפתוח את העורך מחדש.');const value=raw.open?JSON.parse(rawArea.value):draft;const checked=engine.setMethodData(app.getDataset(),value);app.commitEdit('method_data');close();tell(`נתוני השיטה נשמרו. ${checked.warnings.length} הערות מקור; תוצאות קודמות אינן עדכניות.`);}catch(e){errors.replaceChildren(el('p','הנתונים לא הוחלו. '+e.message));for(const issue of e.validation?.errors||[])errors.append(el('code',issue.path,'site-calc-path'));}},'site-primary'));
    }
    function resultDetails(entry,definition,artifact){
      const n=entry.envelope,d=modal(definition.label_he);d.append(el('p',`${STATUSES[n?.status]||'לא חושב'} · ${VALIDITY[n?.validity]||'אין ריצה'}`,'site-note'),el('code',entry.path,'site-calc-path'));
      if(!n){d.append(el('p','טרם בוצע חישוב עבור פלט זה. לחצו על חשב להצגת שדות חסרים.'));return;}
      const pressure=pressureDetails(n,artifact),isPressure=n.output_kind==='L23'||typeof n.result_id==='string'&&n.result_id.startsWith('L23:');
      if(pressure){const block=el('section',undefined,'site-pressure-envelope'),fmt=x=>String(Number(x.toPrecision(9)));block.append(el('p','לחץ נומינלי: '+fmt(pressure.nominal_bar)+' bar','site-value-heading'),el('p','תחום מחושב: '+fmt(pressure.lower_bar)+' … '+fmt(pressure.upper_bar)+' bar'),el('p','בסיס לחץ: '+({gauge:'יחסי לאטמוספרה',absolute:'מוחלט'}[pressure.pressure_reference])+' · מעטפת התרחיש, לא מדידה חיה','site-note'));d.append(block);}
      else{const shown=n.status==='not_calculated'?'לא חושב':n.value===null||n.value===undefined?'—':typeof n.value==='object'?JSON.stringify(n.value):String(n.value);d.append(el('p',(isPressure&&Number.isFinite(n.value)?'גבול עליון בלבד: ':'')+shown+(n.status!=='not_calculated'&&n.value!==null&&n.unit&&n.unit!=='—'?' '+n.unit:''),'site-value-heading'));if(isPressure&&Number.isFinite(n.value))d.append(el('p','נתוני הנומינל והתחום אינם זמינים או אינם תואמים לריצה ולתרחיש. אין השלמת גבולות אוטומטית.','site-note'));}
      const meta={result_id:n.result_id,method_ref:n.method_ref,method_version:n.method_version,scenario_ref:n.scenario_ref,target_refs:n.target_refs,pressure_reference:n.pressure_reference,input_refs:n.input_refs,assumptions_refs:n.assumptions_refs};d.append(el('h3','שיטה, נוסחה וקלט'),pre(meta));
      const diagnostics=(artifact?.diagnostics||[]).filter(x=>x.result_id===n.result_id||x.result_ref===n.result_id);
      for(const diag of diagnostics){const row=el('section',undefined,'site-calc-diagnostic');row.append(el('strong',CODES[diag.code]||diag.code),el('p',diag.message_he||diag.message||'נדרש נתון כדי להשלים את החישוב.'));if(diag.formula_id)row.append(el('code',diag.formula_id,'site-calc-path'));for(const path of diag.missing_inputs||[])pathButton(path,row);if(diag.missing_coefficients?.length)row.append(pre({missing_coefficients:diag.missing_coefficients}));const extra=el('details');extra.append(el('summary','נימוק ודרישות מלאים'),pre(diag));row.append(extra);d.append(row);}
      const directTraces=Array.isArray(artifact?.traces)?artifact.traces.filter(x=>x.result_id===n.result_id||x.result_ref===n.result_id||x.trace_id===n.result_id):[];
      const formulas=new Set(directTraces.map(x=>x.formula_id));const traces=Array.isArray(artifact?.traces)?artifact.traces.filter(x=>directTraces.includes(x)||(formulas.has(x.formula_id)&&(x.input_refs||[]).some(p=>(n.input_refs||[]).some(q=>typeof p==='string'&&typeof q==='string'&&(p.startsWith(q)||q.startsWith(p)))))):artifact?.traces?.[n.result_id];if(traces&&(Array.isArray(traces)?traces.length:true)){d.append(el('h3','נוסחה, הצבה, יחידות ואי־ודאות בריצה המקורית'),pre(traces));}
      const coefficients=Array.isArray(artifact?.coefficients_used)?artifact.coefficients_used.filter(x=>(n.assumptions_refs||[]).includes(x.coefficient_id||x.id)||(n.method_ref&&JSON.stringify(x.method_refs||[]).includes(n.method_ref))):artifact?.coefficients_used;
      if(coefficients&&(Array.isArray(coefficients)?coefficients.length:true))d.append(el('h3','מקדמים ומקורות · לבדוק עם מהנדס'),pre(coefficients));
      const refs=[...(n.input_refs||[])];if(refs.length){const detail=el('details');detail.append(el('summary','הערכים ומקורות הקלט בריצה זו'));for(const ref of refs){const path=typeof ref==='string'?ref:ref.path;if(!path)continue;const row=el('div');pathButton(path,row);let value;try{value=engine.get(app.getDataset(),path);}catch(_){}row.append(pre(value===undefined?'לא נמסר בקלט הנוכחי':value));detail.append(row);}d.append(detail);}
      d.append(el('p','המקדמים, המקורות, תחום התחולה ואי־הוודאות מחייבים בדיקה מקצועית. calculated אינו אישור הנדסי.','site-note'));
    }
    function assessmentDetails(a){const d=modal(CHECKS[a.check_id]||a.check_id||'בדיקת תכנון');if(app.getCalculation()?.ui_validity==='stale')d.append(el('p','בדיקה מריצה קודמת שאינה עדכנית לקלט. יש לחשב מחדש.','site-calc-stale-notice'));d.append(el('p',`מצב בדיקה בריצה המקורית: ${a.verdict||'UNKNOWN'}${a.conditional_outcome?' · תוצאה מותנית: '+a.conditional_outcome:''}`),pre(a),el('p','PASS של מודל ראשוני אינו אישור הפעלה או חתימה. UNKNOWN נשאר פתוח; הנחות דורשות בדיקת מהנדס.','site-note'));for(const path of a.missing_inputs||[])pathButton(path,d);}
    function checkGroup(title,matches){const d=modal(title);d.append(el('p','כל שורה שומרת את התרחיש, ההנחות והמקורות שלה. פירוט אינו אישור הנדסי.','site-note'));if(!matches.length){d.append(el('p','UNKNOWN · אין נתונים להשלמת הבדיקה.'));return;}for(const a of matches){const row=el('div',undefined,'site-calc-check-row');row.append(el('code',[a.check_id,a.scenario_ref,...(a.target_refs||[])].filter(Boolean).join(' · ')),btn(`${a.verdict||'UNKNOWN'}${a.conditional_outcome?' · מותנה '+a.conditional_outcome:''} · פרטים`,()=>assessmentDetails(a)));d.append(row);}}
    function aggregateChecks(matches){return matches.some(a=>a.verdict==='FAIL')?'FAIL':!matches.length||matches.some(a=>a.verdict!=='PASS')?'UNKNOWN':'PASS';}
    function renderAssessments(host,artifact){
      const section=el('section',undefined,'site-calc-assessments');section.append(el('h3','בדיקות תכנון נפרדות מהערך המחושב'),el('p','PASS / FAIL / UNKNOWN מתייחסים לתנאי המודל. הנחות ותרחישים לא שלמים אינם אישור בטיחות.','site-note'));
      const list=Array.isArray(artifact?.assessments)?artifact.assessments:[],stale=artifact?.ui_validity==='stale',prefix=stale?'בריצה קודמת · ':'';
      if(stale)section.append(el('p','בדיקות הריצה הקודמת מוצגות לעיון בלבד. הן אינן עדכניות לטיוטה הנוכחית.','site-calc-stale-notice'));
      const categories=Object.entries(CHECKS);for(const [id,label]of categories){const matches=list.filter(a=>a.check_id===id),verdict=aggregateChecks(matches);const row=el('div',undefined,'site-calc-check-row');row.append(el('strong',label),el('code',id));const b=btn(`${prefix}${verdict} · ${matches.length} בדיקות${matches.some(a=>a.conditional_outcome)?' · יש תוצאה מותנית':''} · פרטים`,()=>checkGroup(label,matches));b.dataset.verdict=stale?'STALE':verdict;row.append(b);section.append(row);}
      const extra=list.filter(a=>!Object.hasOwn(CHECKS,a.check_id));if(extra.length)section.append(btn(`בדיקות תרמיות ותוצאות משנה · ${extra.length} · פרטים`,()=>checkGroup('בדיקות ותוצאות משנה',extra)));
      const families=el('details',undefined,'site-calc-pressure-families');families.append(el('summary','9 משפחות לחץ חובה · עליונה ותחתונה'));for(const [id,label]of Object.entries(FAMILIES)){const family=(artifact?.pressure_scenario_families||[]).find(f=>f.family_id===id||f.id===id),caseIds=family?.case_refs||family?.case_ids||family?.scenario_refs||[];const relevant=list.filter(a=>a.scenario_ref===id||a.family_id===id||(a.scenario_ref||'').startsWith(id)||caseIds.includes(a.scenario_ref));const row=el('div',undefined,'site-calc-check-row');row.append(el('strong',label),el('code',id));const familyStatus=family?`עליון ${family.verdict||'UNKNOWN'} · תחתון ${family.minimum_pressure_verdict||'UNKNOWN'}`:aggregateChecks(relevant);const b=btn(`${prefix}${familyStatus} · ${relevant.length} בדיקות · פרטים`,()=>{if(relevant.length)checkGroup(label,relevant);else{const d=modal(label);d.append(el('p','UNKNOWN · חסרים נתוני מסלולי לחץ ומקור.'));if(family)d.append(pre(family));else pathButton('inputs.calculation_basis.method_data.network_cases',d);}});b.dataset.verdict=stale?'STALE':aggregateChecks(relevant);row.append(b);families.append(row);}section.append(families);host.append(section);
    }
    function renderPlots(host,dataset){
      const detail=el('details',undefined,'site-calc-plots');detail.append(el('summary','עקומות וסולם לחץ לפי נתוני מקור'));
      const md=dataset.inputs?.calculation_basis?.method_data;
      const curves=(md?.pump_curves||[]).filter(c=>Array.isArray(c.points)&&c.points.length>=2&&c.points.every((p,i)=>Number.isFinite(p.flow_m3_h)&&Number.isFinite(p.head_m)&&(i===0||p.flow_m3_h>c.points[i-1].flow_m3_h)));
      if(!curves.length)detail.append(el('p','עקומת משאבה אינה קיימת או אינה תקפה. לא מוצגת עקומה משוערת.','site-note'));
      function plotCurve(c,system){const section=el('section');section.append(el('h4',`H(q) · ${c.equipment_ref||c.id}`),el('p','נקודות מקור ואינטרפולציה בתחום בלבד. אין אקסטרפולציה. מספרי סכמה/תמונה אינם מדידות.','site-note'));
        const points=c.points,sys=system?.points||[],all=points.concat(sys),xmin=Math.min(...all.map(p=>p.flow_m3_h)),xmax=Math.max(...all.map(p=>p.flow_m3_h)),ymin=Math.min(...all.map(p=>p.head_m)),ymax=Math.max(...all.map(p=>p.head_m));
        if(xmax<=xmin||ymax<=ymin){section.append(el('p','אין טווח מספרי מתאים לגרף.'));detail.append(section);return;}
        const ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 560 260');svg.setAttribute('role','img');svg.setAttribute('aria-label',`עקומת משאבה ${c.id}; ספיקה m³/h ועומד m`);
        const line=ps=>{const n=doc.createElementNS(ns,'polyline');n.setAttribute('points',ps.map(p=>`${55+(p.flow_m3_h-xmin)/(xmax-xmin)*465},${215-(p.head_m-ymin)/(ymax-ymin)*175}`).join(' '));n.setAttribute('fill','none');n.setAttribute('stroke-width','3');return n;};const curve=line(points);curve.setAttribute('stroke','#215f86');svg.append(curve);if(sys.length>=2){const s=line(sys);s.setAttribute('stroke','#a46b17');s.setAttribute('stroke-dasharray','6 4');svg.append(s);}
        for(const [x,y,text]of [[55,242,`${xmin} — ${xmax} m³/h`],[15,24,`${ymin} — ${ymax} m`]]){const t=doc.createElementNS(ns,'text');t.setAttribute('x',String(x));t.setAttribute('y',String(y));t.textContent=text;svg.append(t);}section.append(svg);
        const data=el('details');data.append(el('summary','טבלת נקודות, מקורות ואי־ודאות'),pre({pump:c,system_curve:system||null}));section.append(data);detail.append(section);
      }
      for(const c of curves){const system=(md?.network_cases||[]).find(n=>n.pump_curve_ref===c.id&&n.system_curve?.points?.every(p=>Number.isFinite(p.flow_m3_h)&&Number.isFinite(p.head_m)))?.system_curve;plotCurve(c,system);}
      const ladders=md?.control_basis?.pressure_ladders||[];if(!ladders.length)detail.append(el('p','סולם לחץ אינו מלא. אין שימוש באפס במקום גבול חסר.','site-note'));
      for(const ladder of ladders){const section=el('section');section.append(el('h4',`סולם לחץ · ${ladder.point_ref||ladder.id}`));const rows=[['גבול עבודה עליון',ladder.normal_upper_g_bar],['תחום ניתוק',ladder.trip_interval_g_bar],['תחום פתיחת PSV',ladder.psv_open_interval_g_bar],['לחץ כושר פריקה',ladder.capacity_pressure_upper_g_bar],['גבול מקומי מותר',ladder.local_allow_g_bar]];const table=el('table'),caption=el('caption','bar יחסי · נתוני תכנון בלבד');table.append(caption);for(const [name,value]of rows){const tr=el('tr');tr.append(el('th',name),el('td',value===undefined?'לא נמסר':Array.isArray(value)?value.join(' — '):String(value)));table.append(tr);}section.append(table,pre({source:ladder.provenance,transfer_bar:ladder.local_transfer_bar,uncertainty_bar:ladder.transfer_uncertainty_bar}));detail.append(section);}host.append(detail);
    }
    app.setResultRenderer((host,group,dataset,artifact)=>{
      const all=leaves(dataset.results),section=el('div',undefined,'site-calc-results');section.append(el('p','37 סוגי פלט קיימים גם כשחלקם אינם ניתנים לחישוב. פתחו תוצאה להצגת הנוסחה, המקור והשדות החסרים.','site-note'));
      const current=artifact?.ui_validity==='current';if(!current)section.append(el('p',artifact?'הריצה אינה עדכנית לקלט הנוכחי. יש לחשב מחדש לפני בדיקת מסקנות.':'אין ריצה מקומית מאומתת לקלט זה. תוצאות מיובאות נשארות לא עדכניות.','site-calc-stale-notice'));
      if(artifact?.coverage){const coverage=el('details');coverage.append(el('summary','כיסוי החישוב · ענפים, תוצאות ותרחישים'),pre(artifact.coverage));section.append(coverage);}
      if(win.BoilerCalcGraphs?.render){const graph=win.BoilerCalcGraphs.render(artifact,dataset);if(graph)section.append(graph);}else renderPlots(section,dataset);
      group.fields.forEach((definition,i)=>{const entries=all.filter(x=>x.path.replace(/\[\d+\]/g,'[]')===definition.key);const card=el('section',undefined,'site-calc-result');card.dataset.resultKey=definition.key;card.append(el('h3',`L${String(i+1).padStart(2,'0')} · ${definition.label_he}`));if(!entries.length){const entry={path:definition.key,envelope:null};card.append(btn('לא חושב · פירוט',()=>resultDetails(entry,definition,artifact)));}
        for(const entry of entries){const n=entry.envelope,row=el('div',undefined,'site-calc-result-row');const value=n.status==='not_calculated'?'לא חושב':n.value===null?'—':typeof n.value==='object'?JSON.stringify(n.value):String(Number.isFinite(n.value)?Number(n.value.toPrecision(9)):n.value);const main=btn(value+(n.unit&&n.unit!=='—'?' '+n.unit:''),()=>resultDetails(entry,definition,artifact),'site-calc-result-value');row.append(main,el('span',STATUSES[n.status]||n.status),el('span',VALIDITY[n.validity]||'לא תקף'));if(n.scenario_ref||n.target_refs?.length)row.append(el('code',[n.scenario_ref,...(n.target_refs||[])].filter(Boolean).join(' · '),'site-calc-path'));row.dataset.validity=n.validity;card.append(row);
          const missing=(artifact?.diagnostics||[]).filter(x=>x.result_id===n.result_id);if(missing.length){const list=el('details',undefined,'site-calc-missing-list');list.append(el('summary',`${missing.length} סיבות / פרטים להשלמה`));for(const reason of missing){const diag=el('div',undefined,'site-calc-diagnostic');diag.append(el('span',(CODES[reason.code]||reason.code)+' · '+(reason.message_he||reason.message||'דרוש מידע נוסף')));for(const path of reason.missing_inputs||[])pathButton(path,diag);list.append(diag);}card.append(list);}
        }section.append(card);});host.append(section);renderAssessments(host,artifact);
    });
    const unsubscribe=app.onChange(detail=>{if(['import','migration','example'].includes(detail.reason))session.cancel();refresh();});refresh();
    const api={run,session,refresh,methodEditor,migrationPreview,examplePreview,destroy(){unsubscribe();session.cancel();panel.remove();app.setResultRenderer(null);delete container.dataset.calcMounted;}};app.calculator=api;return api;
  }
  return Object.freeze({mount,createSession,leaves,pressureDetails,STATUSES,VALIDITY,CHECKS,FAMILIES});
});
