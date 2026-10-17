/* Local site-data editor. Calculations are preliminary; no telemetry or network writes. */
(function (global) {
  'use strict';
  const LEVELS = {1:'מינימום לאיסוף',2:'מפרטי ציוד',3:'התקנה ופיקוח',0:'תוצאות חישוב'};
  const STATUS = {empty:'לא נמסר',example:'דוגמה',reported:'נמסר בעל פה',measured:'מדידה מתועדת',passport:'מפרט יצרן',assumed_by_engineer:'הנחת מהנדס',engineer_approved:'אישור מתועד — לא אומת'};
  const WORDS = {operating:'לחץ עבודה',maximum_allowable:'לחץ מרבי מותר',test:'לחץ בדיקה',alarm_delay:'השהיית התראה',branch_flow_target:'יעד ספיקה בקו',bv_setting:'כיוון שסתום איזון',cold_fill_pressure:'לחץ מילוי במצב קר',cooldown_duration:'משך קירור',dosing_limit:'מגבלת מינון',dosing_target:'יעד מינון',failover_timeout:'זמן מרבי למעבר לגיבוי',fill_cycle_count:'מספר מחזורי השלמה',fill_cycle_duration:'משך מחזור השלמה',fill_cycle_volume:'נפח למחזור השלמה',fill_daily_volume:'נפח השלמה יומי',fill_pressure_ceiling:'תקרת לחץ השלמה',fill_target_pressure:'לחץ יעד להשלמה',flow_proof_timeout:'זמן מרבי לאימות זרימה',hysteresis:'הפרש מיתוג',normal_high:'גבול עליון בתחום תקין',normal_low:'גבול תחתון בתחום תקין',prv_target_pressure:'לחץ יעד במקטין לחץ',pump_start_timeout:'זמן מרבי להתנעת משאבה',reset_threshold:'סף איפוס',trip_high:'סף ניתוק גבוה',trip_low:'סף ניתוק נמוך',vessel_precharge:'לחץ מקדים במכל ההתפשטות',water_return_target:'טמפרטורת יעד בחזרה',water_supply_target:'טמפרטורת יעד באספקה',yes:'כן',no:'לא',unknown:'לא ידוע',series:'בטור',parallel:'במקביל',mixed:'משולב',closed:'סגור',open:'פתוח',last_position:'מיקום אחרון',other:'אחר',vessel:'מכל',jacketed_pipe:'צינור עם מעטפת',product_pump:'משאבת מוצר',heat_exchanger:'מחליף חום',storage:'אחסון',transfer:'העברה',hold:'שמירת טמפרטורה',warmup:'חימום ראשוני',melting:'התכה',supply:'אספקה',return:'חזרה',expansion:'התפשטות',makeup:'השלמה',discharge:'פריקה',existing:'קיים',proposed:'מוצע',equal:'ערך נמדד',below_detection:'מתחת לסף גילוי',above_range:'מעל טווח המדידה',none:'ללא',softening:'ריכוך',RO:'אוסמוזה הפוכה',cold_start:'הפעלה ממצב קר',holding_melt:'שמירת מוצר מותך',manual:'ידני',automatic:'אוטומטי',request_review:'דרושה בדיקה',N_plus_1:'N+1',undecided:'טרם הוחלט',duty_standby:'עבודה / גיבוי',boiler:'דוד',pump:'משאבה',expansion_vessel:'מכל התפשטות',PSV:'שסתום ביטחון',BV:'שסתום איזון',PRV:'מקטין לחץ',control_valve:'שסתום בקרה',check_valve:'אל־חזור',meter:'מונה',backflow:'מונע זרימה חוזרת',treatment:'טיפול במים',separator:'מפריד',dosing_pump:'משאבת מינון',sensor:'חיישן',controller:'בקר',candidate:'מועמד',selected:'נבחר',installed:'מותקן',retired:'הוצא משימוש',analog:'אנלוגי',digital_bus:'תקשורת דיגיטלית',switch:'מגע',valid_for_record:'תקף לרישום',questionable:'מוטל בספק',invalid:'לא תקף',supply_return:'אספקה וחזרה',supply_delta:'אספקה והפרש טמפרטורה',gauge:'יחסי לאטמוספרה',absolute:'מוחלט',differential:'הפרש',temperature:'טמפרטורה',temperature_difference:'הפרש טמפרטורה',pressure:'לחץ',pressure_difference:'הפרש לחץ',volume_flow:'ספיקה',volume:'נפח',duration:'זמן',length:'אורך',area:'שטח',mass:'מסה',mass_flow:'ספיקה מסית',power:'הספק',energy:'אנרגיה',voltage:'מתח',current:'זרם',frequency:'תדר',velocity:'מהירות',density:'צפיפות',specific_heat:'קיבול חום סגולי',thermal_conductivity:'מוליכות תרמית',heat_transfer_coefficient:'מקדם מעבר חום',ratio:'יחס',count:'כמות',rotational_speed:'מהירות סיבוב',valve_kv:'מקדם Kv',volume_per_pulse:'נפח לפולס',conductivity:'מוליכות',concentration:'ריכוז',hardness_as_CaCO3:'קשיות כ־CaCO3',valve_turns:'סיבובי שסתום',manufacturer_position:'מיקום לפי יצרן',total_hardness:'קשיות כוללת',carbonate_hardness:'קשיות קרבונטית',alkalinity:'אלקליניות',chloride:'כלוריד',iron:'ברזל',silica:'סיליקה',dissolved_oxygen:'חמצן מומס',inhibitor_concentration:'ריכוז מעכב קורוזיה'};
  function el(tag, text, cls) { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; }
  function button(text, click, cls) {const n=el('button',text,cls); n.type='button'; n.addEventListener('click',click); return n;}
  function plain(v) {return v && typeof v==='object' && Object.hasOwn(v,'value')?v.value:v;}
  function str(v) {return v===null||v===undefined?'':Array.isArray(v)?v.join(', '):String(v);}
  function fieldKey(f) {return f.type==='number_list'&&f.key.endsWith('[]')?f.key.slice(0,-2):f.key;}
  function scopeOf(key) {const i=key.lastIndexOf('[]');return i<0?'':key.slice(0,i+2);}
  function mount(container,catalog,engine) {
    if(!container||!catalog||!engine)throw new Error('Site editor requires container, catalog and engine');
    let data=engine.newDataset(),validation,level=1,groupId='A',advanced=false,dirty=false,selected={},dialog=null,lastFocus=null;
    let calculation=null,resultRenderer=null,lastInputSnapshot='',changeSerial=0;
    const changeListeners=new Set(),calculationListeners=new Set();
    const copy=x=>JSON.parse(JSON.stringify(x));
    const inputSnapshot=()=>JSON.stringify({schema_version:data.schema_version,dataset_id:data.dataset_id,revision_id:data.revision_id,inputs:data.inputs,documents:data.documents});
    const allDefs=catalog.groups.flatMap(g=>g.fields), defsByKey=new Map(allDefs.map(f=>[f.key,f]));
    container.classList.add('site-input-app');container.dir='rtl';
    const shell=el('div',undefined,'site-shell');container.replaceChildren(shell);
    const heading=el('header',undefined,'site-heading');heading.append(el('p','05 · נתוני אתר וחישוב מקומי','site-eyebrow'),el('h1','מנתוני האתר לבדיקת תכנון ראשונית'),el('p','ממלאים בהדרגה, מחשבים במפורש ושומרים קבצים מקומיים. תוצאה מחושבת דורשת בדיקת מהנדס; אינה חתימה הנדסית או טלמטריה.'));
    const toolbar=el('div',undefined,'site-toolbar'),fileInput=el('input');fileInput.type='file';fileInput.accept='.json,application/json';fileInput.hidden=true;
    toolbar.append(button('טעינת קובץ',()=>fileInput.click()),button('הדבקת JSON',()=>pasteDialog()),button('שמירה / ייצוא JSON',()=>download(),'site-primary'),button('מסמכי מקור',()=>documentsDialog()));
    fileInput.addEventListener('change',async()=>{const f=fileInput.files[0];if(!f)return;try{if(f.size>5*1024*1024)throw new Error('File exceeds 5 MiB');stageImport(await f.text());}catch(e){showImportError(e,notice);}fileInput.value='';});
    const note=el('p','הנתונים נשמרים בזיכרון הלשונית בלבד. יש לייצא לפני סגירה. קובץ ייבוא אינו מאמת אישור או חתימה.','site-note');
    const notice=el('div',undefined,'site-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
    const mapping=el('div',undefined,'site-mapping'), levels=el('nav',undefined,'site-levels');levels.setAttribute('aria-label','רמות איסוף');
    const progress=el('div',undefined,'site-progress'), nav=el('nav',undefined,'site-groups');nav.setAttribute('aria-label','קבוצות נתונים');
    const body=el('section',undefined,'site-body');shell.append(heading,toolbar,fileInput,note,notice,mapping,levels,progress,nav,body);
    function notify(text,bad=false){notice.textContent=text;notice.classList.toggle('site-error',bad);}
    function markCalculationStale(){
      if(!calculation)return;
      const walk=n=>{if(Array.isArray(n))n.forEach(walk);else if(n&&typeof n==='object'){if(Object.hasOwn(n,'result_id')&&n.status){n.validity='stale';n.import_review='pending';}else Object.values(n).forEach(walk);}};
      // Keep the original hashed sidecar immutable. Freshness belongs to this
      // editor session and to the projected envelopes in the input export.
      walk(data.results);calculation.ui_validity='stale';
    }
    function emit(reason='refresh'){
      const snapshot=inputSnapshot();if(lastInputSnapshot&&snapshot!==lastInputSnapshot){changeSerial++;markCalculationStale();}lastInputSnapshot=snapshot;
      validation=engine.validate(data);const detail={dataset:data,validation,reason,changeSerial,calculation};
      container.dispatchEvent(new CustomEvent('boiler-site-change',{bubbles:true,detail}));changeListeners.forEach(fn=>fn(detail));
    }
    function changed(reason='input'){if(reason==='documents')engine.invalidate(data);dirty=true;emit(reason);render();}
    function displayName(record,index,label){return str(plain(record?.label))||`${label} ${index+1}`;}
    function get(path){return engine.get(data,path);}
    function scopesFor(defs){return [...new Set(defs.map(f=>scopeOf(fieldKey(f))))];}
    function fieldVisible(f){if(Number(f.level)!==level)return false;if(level!==1||advanced)return true;return f.presentation==='core'||f.key==='inputs.consumers[].label';}
    function renderMapping(){
      const count=data.inputs?.consumers?.length||0;
      mapping.textContent=validation.mapping?.status==='mapped'?`${count} ממשקים מפורשים תואמים לתבנית · מוצגת שכבת מפרט בלבד. ההגנות אינן מאושרות על ידי מילוי הטופס.`:`${count} קווים בקובץ · mapping_pending — הנתונים מוצגים כשכבת מפרט; התאמת מספר הקווים לסכמה, ל־3D וללוח ממתינה לבדיקה. ההגנות אינן מאושרות על ידי מילוי הטופס.`;
    }
    function renderProgress(){
      const lev=validation.levels?.[level];
      const filled=engine.entries(data).filter(x=>x.definition?.type!=='id'&&Number(x.definition?.level)===level&&plain(x.envelope)!==null&&plain(x.envelope)!==undefined&&plain(x.envelope)!=='').length;
      progress.replaceChildren(el('span',level===0?'37 סוגי תוצאות · חישוב ואקטואליות נפרדים מאישור הנדסי':`${filled} ערכים רשומים ברמה זו · שלמות נתונים אינה אישור הנדסי`));if(level===1)progress.append(el('small','בסיס האיסוף: 40 שדות לאתר ו־15 לכל צרכן. הרחבות נפתחות לפי הצורך; מילוי אינו בדיקת בטיחות או אישור תכנון.'));
      if(lev){const vals=Object.entries(lev).filter(([,v])=>typeof v==='number');if(vals.length){const detail=el('details');detail.append(el('summary','בדיקת שלמות הרמה'),el('small',vals.map(([k,v])=>`${({required:'נדרשים',filled:'מולאו',missing:'חסרים',conditional:'מותנים',errors:'שגיאות',warnings:'הערות',total:'סה״כ',complete:'מלאים',unresolved:'תחולה לא הוגדרה'})[k]||k}: ${v}`).join(' · ')),el('small','הפירוט כולל מזהים טכניים ודרישות מותנות; אינו דירוג בטיחות.'));progress.append(detail);}}
    }
    function render(){
      validation=engine.validate(data);
      renderMapping();
      levels.replaceChildren(...[1,2,3,0].map(n=>{const b=button(`${n||'↗'} · ${LEVELS[n]}`,()=>{level=n;advanced=false;const possible=catalog.groups.find(g=>g.fields.some(f=>Number(f.level)===n));groupId=possible?.id||'L';render();});b.setAttribute('aria-pressed',String(n===level));return b;}));
      renderProgress();
      const groups=catalog.groups.filter(g=>g.fields.some(f=>Number(f.level)===level));if(!groups.some(g=>g.id===groupId))groupId=groups[0]?.id;
      nav.replaceChildren(...groups.map(g=>{const b=button(g.title_he||g.id,()=>{groupId=g.id;render();});b.setAttribute('aria-current',g.id===groupId?'page':'false');return b;}));
      body.replaceChildren();const group=catalog.groups.find(g=>g.id===groupId);if(!group)return;
      const top=el('div',undefined,'site-section-head');top.append(el('h2',group.title_he));if(level===1){const l=el('label',undefined,'site-toggle'),cb=el('input');cb.type='checkbox';cb.checked=advanced;cb.addEventListener('change',()=>{advanced=cb.checked;render();});l.append(cb,document.createTextNode('הרחבות לפי הצורך'));top.append(l);}body.append(top);
      if(level===0){renderResults(group);return;}
      const fields=group.fields.filter(fieldVisible);
      if(!fields.length){body.append(el('p','אין שדות בסיס בקבוצה זו. פתחו הרחבות לפי הצורך.','site-note'));return;}
      // One repeat record at each depth is shown at a time; data for every other record stays in the dataset.
      for(const scope of scopesFor(fields)){
        const section=el('section',undefined,'site-scope');let concrete='';
        if(scope){const segments=scope.split('.');let generic='';let valid=true;
          for(const seg of segments){generic+=(generic?'.':'')+seg;if(!seg.endsWith('[]')){concrete+=(concrete?'.':'')+seg;continue;}
            const key=seg.slice(0,-2),collectionPath=concrete+(concrete?'.':'')+key,records=get(collectionPath)||[];
            const row=el('div',undefined,'site-repeat-nav'),label=catalog.scope_labels_he[seg]||key;
            const select=el('select');select.setAttribute('aria-label',`בחירת ${label}`);select.dataset.collection=collectionPath;
            if(!records.length){const o=el('option','אין רשומות');o.value='';select.append(o);}else records.forEach((r,i)=>{const o=el('option',displayName(r,i,label));o.value=String(i);select.append(o);});
            const index=Math.min(selected[collectionPath]||0,Math.max(0,records.length-1));select.value=String(index);select.addEventListener('change',()=>{selected[collectionPath]=Number(select.value);render();});
            row.append(el('span',label),select,button(`הוספת ${label}`,()=>{try{engine.addRecord(data,collectionPath);selected[collectionPath]=(get(collectionPath)||[]).length-1;changed();}catch(e){notify(e.message,true);}}));section.append(row);
            if(!records.length){valid=false;break;}concrete=collectionPath+`[${index}]`;
          }
          if(!valid){body.append(section);continue;}
        }
        const grid=el('div',undefined,'site-fields');
        for(const f of fields.filter(d=>scopeOf(fieldKey(d))===scope)){const key=fieldKey(f);const path=scope?concrete+key.slice(scope.length):key;if(visibleAlternative(f,path))grid.append(field(f,path));}
        section.append(grid);body.append(section);
      }
      const errs=validation.errors||[];if(errs.length){const details=el('details',undefined,'site-validation');details.append(el('summary',`${errs.length} הערות לתיקון בקובץ`));const list=el('ul');for(const e of errs.slice(0,30)){const li=el('li');const p=e.path||e.field||'';li.append(button(errorText(e),()=>{if(p&&engine.definitionFor(p))showValue(p);}));list.append(li);}details.append(list);body.append(details);}
    }
    function visibleAlternative(f,path){const mode=plain(get('inputs.calculation_basis.design_water.temperature_mode'));if(mode==='supply_return'&&f.requirement?.condition==='temperature_mode=supply_delta')return false;if(mode==='supply_delta'&&f.requirement?.condition==='temperature_mode=supply_return')return false;return true;}
    function errorText(e){if(typeof e==='string')return 'נתון לבדיקה: '+e;const names={unsafe:'תוכן לא נתמך',shape:'מבנה נתונים לא תקין',unknown_key:'שדה לא מוכר',version:'גרסת קובץ לא נתמכת',id:'מזהה חסר או לא תקין',date:'תאריך ISO חסר או לא תקין',duplicate_id:'מזהה כפול',document_id:'מזהה מסמך חסר או כפול',type:'סוג ערך לא תקין',unknown_array:'אוסף רשומות לא מוכר',envelope:'חסרה מעטפת מקור',status:'מעמד מקור לא תקין',empty_status:'ערך ריק עם מעמד מקור',quantity:'יש לבחור גודל פיזיקלי מתאים',unit:'יחידת אחסון לא תקינה',metadata_type:'פרטי מקור חייבים להיות טקסט',missing_document:'מסמך מקור לא נמצא במרשם',provenance_incomplete:'חסרים מסמך מקור, תפקיד או תאריך',measurement_time:'חסר מועד המדידה',approval_incomplete:'חסרים קוד תפקיד או מסמך אישור',pressure_reference:'בסיס הלחץ טרם הוגדר',pressure_class:'לחץ בדיקה אינו גבול עבודה',original_input:'הקלט המקורי אינו תואם',missing_reference:'קישור לרשומה לא נמצא',missing_field_reference:'קישור לשדה לא נמצא',minmax:'המינימום גבוה מהמקסימום',base_mismatch:'גרסת הבסיס דורשת בדיקת התאמה',missing:'ערך נדרש לא נמסר',applicability_unknown:'תחולת הדרישה טרם הוגדרה'};const def=e.path?engine.definitionFor(e.path.replace(/\.(value|unit|status|source_ref|approval_ref|date|original_input)$/,'')):null;return `${names[e.code]||e.message_he||'נדרשת בדיקת נתון'}${def?' · '+def.label_he:''}${e.path?' · '+e.path:''}`;}
    function inputControl(f,value){let n;const options=f.enum_options||(f.type==='tri_bool'?['yes','no','unknown']:f.type==='pressure_ref'?['gauge','absolute','differential','unknown']:null);
      if(options){n=el('select');const o=el('option','— לא נמסר —');o.value='';n.append(o);options.forEach(v=>{const op=el('option',WORDS[v]||v);op.value=v;n.append(op);});}
      else {n=el('input');n.type=['number','integer'].includes(f.type)?'number':f.type==='datetime'?'text':'text';if(n.type==='number'){n.step=f.type==='integer'?'1':'any';n.inputMode='decimal';}if(f.type==='datetime')n.placeholder='YYYY-MM-DDTHH:mm:ssZ';if(['id_list','field_ref_list','number_list'].includes(f.type))n.placeholder='ערכים מופרדים בפסיקים';}
      n.value=str(value);return n;
    }
    function unitOptions(path,f){const u=engine.unitInfo(data,path)||{};let opts=u.input_units||u.inputUnits||f.input_units||[];if(!opts.length&&u.resolved!==false&&!u.error&&f.canonical_unit&&f.canonical_unit!=='dynamic'&&f.quantity!=='dependent')opts=[f.canonical_unit];return {canonical:u.canonical_unit||u.canonicalUnit||f.canonical_unit,options:opts.map(x=>typeof x==='string'?x:x.unit).filter(Boolean)};}
    function field(f,path){const box=el('div',undefined,'site-field');box.dataset.field=path;const env=get(path),v=plain(env),id='sf-'+path.replace(/[^a-zA-Z0-9_-]/g,'-');
      const label=el('label',f.label_he);label.htmlFor=id;box.append(label);
      if(f.type==='id'){box.append(el('code',str(v)||'מזהה ייווצר עם הרשומה','site-id'));return box;}
      const row=el('div',undefined,'site-input-row'),control=inputControl(f,v);control.id=id;control.dataset.path=path;const u=unitOptions(path,f),unit=el('select');unit.setAttribute('aria-label',`יחידה — ${f.label_he}`);for(const name of u.options){const op=el('option',name);op.value=name;unit.append(op);}unit.value=env?.unit||u.canonical||u.options[0]||'';
      row.append(control);if(['number','integer','number_list'].includes(f.type)){if(u.options.length)row.append(unit);else {control.disabled=true;row.append(el('small','בחרו קודם את סוג הגודל'));}}
      const metaButton=button(`ⓘ ${STATUS[env?.status]||STATUS.empty}`,()=>showValue(path),'site-source');metaButton.setAttribute('aria-label',`מקור ופרטים — ${f.label_he}`);row.append(metaButton);box.append(row);
      const commit=()=>{try{const saved=engine.setValue(data,path,control.value,unit.value||u.canonical,{});notify('הערך נרשם בטיוטה המקומית.');dirty=true;emit();
        // Keep input/button nodes alive during blur so the pending click is not swallowed.
        if(control.tagName==='SELECT'){render();return;}
        control.value=str(plain(saved));if(saved?.unit)unit.value=saved.unit;renderMapping();renderProgress();refreshFieldMessages();
      }catch(e){notify(e.message,true);control.setAttribute('aria-invalid','true');}};control.addEventListener('change',commit);
      unit.addEventListener('change',()=>{if(control.value!=='')commit();else control.focus();});
      const hint=el('small',f.hint_he||'ציינו מקור ותחום תחולה.','site-hint');hint.id=id+'-hint';control.setAttribute('aria-describedby',hint.id);box.append(hint);
      refreshFieldMessages(box);
      return box;
    }
    function refreshFieldMessages(single){
      const boxes=single?[single]:Array.from(body.querySelectorAll('.site-field'));
      for(const box of boxes){const path=box.dataset.field,control=box.querySelector('[data-path]');if(!control)continue;
        box.querySelectorAll('.site-field-error,.site-field-warning').forEach(n=>n.remove());
        const related=e=>{const p=e.path||e.field||'';return p===path||p.startsWith(path+'.');};
        const errors=(validation.errors||[]).filter(related),warnings=(validation.warnings||[]).filter(related);
        control.setAttribute('aria-invalid',String(errors.length>0));
        if(errors.length)box.append(el('small',errors.map(errorText).join(' · '),'site-field-error'));
        if(warnings.length)box.append(el('small',warnings.map(errorText).join(' · '),'site-field-warning'));
        const badge=box.querySelector('.site-source');if(badge)badge.textContent=`ⓘ ${STATUS[get(path)?.status]||STATUS.empty}`;
      }
    }
    function closeDialog(){if(dialog){dialog.close();dialog.remove();dialog=null;}lastFocus?.focus();}
    function openDialog(title){closeDialog();lastFocus=document.activeElement;dialog=el('dialog',undefined,'site-dialog');dialog.dir='rtl';const h=el('h2',title);h.id='site-dialog-heading';dialog.setAttribute('aria-labelledby',h.id);const close=button('סגירה',closeDialog,'site-dialog-close');dialog.append(close,h);container.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});dialog.showModal();return dialog;}
    function labeled(root,title,control){const l=el('label',undefined,'site-dialog-field');l.append(el('span',title),control);root.append(l);return control;}
    function showValue(path){const f=engine.definitionFor(path)||defsByKey.get(path);if(!f)return;const env=get(path)||{};const d=openDialog(f.label_he||'מקור הנתון');d.append(el('p',`${str(Object.hasOwn(env,'value')?env.value:(f.type==='id'?env:null))||'—'} ${env.unit&&env.unit!=='—'?env.unit:''}`,'site-value-heading'),el('p','זהו נתון מפרט או רישום היסטורי; אינו חיווי חי ואינו מפעיל הגנה.','site-note'));const key=el('code',path,'site-path');d.append(key);
      if(f.type==='id'){d.append(el('p','מזהה טכני בלבד; אינו ערך שנמדד.'));return;}
      const status=el('select');Object.entries(STATUS).forEach(([v,t])=>{const op=el('option',t);op.value=v;status.append(op);});status.value=env.status||'empty';labeled(d,'מעמד מקור הנתון',status);
      const source=el('select');const empty=el('option','— ללא מסמך —');empty.value='';source.append(empty);for(const doc of data.documents||[]){const o=el('option',`${doc.title||doc.label||doc.id} · ${doc.id}`);o.value=doc.id;source.append(o);}source.value=env.source_ref||'';labeled(d,'מסמך מקור',source);d.append(button('עריכת מרשם מסמכים',()=>documentsDialog()));
      const controls={};for(const [k,title]of Object.entries({author_ref:'קוד תפקיד אחראי (ללא שם אישי)',approval_ref:'מספר / מזהה מסמך אישור',date:'תאריך המקור',observed_at:'מועד המדידה (כולל אזור זמן)',note:'הערה ותחום תחולה'})){const input=el('input');input.type=k==='date'?'date':'text';input.value=env[k]||'';controls[k]=labeled(d,title,input);}
      if(env.original_input)d.append(el('p',`הקלט המקורי: ${env.original_input.value} ${env.original_input.unit}`));
      if(env.import_review||env.origin_status)d.append(el('p','מקור ואישור טעונים בדיקה; הכלי אינו מאמת חתימה.','site-note'));
      const methods=f.calculations?.method_ids||[];d.append(el('p',f.hint_he||''));const details=el('details');details.append(el('summary','קשר למתודולוגיות חישוב'));for(const id of methods)details.append(el('code',id,'site-path'));details.append(el('p','הנתון נכלל רק בחישוב מפורש. שינוי ערך או מקור מסמן תוצאות קודמות כלא עדכניות.'));d.append(details);
      d.append(button('שמירת פרטי מקור',()=>{if(plain(env)===undefined||plain(env)===null||plain(env)===''||!Object.hasOwn(env,'value')){let msg=d.querySelector('.site-meta-empty');if(!msg){msg=el('p','יש להזין קודם ערך בשדה, ואז לציין את מקורו.','site-field-warning site-meta-empty');d.append(msg);}return;}try{const meta={status:status.value,source_ref:source.value||null};Object.entries(controls).forEach(([k,n])=>{meta[k]=n.value||null;});if(engine.updateProvenance)engine.updateProvenance(data,path,meta);else engine.setValue(data,path,plain(env)??'',env.unit,meta);closeDialog();changed();notify('פרטי המקור נשמרו. האישור לא אומת על ידי הכלי.');}catch(e){notify(e.message,true);}},'site-primary'));
    }
    function documentsDialog(){const d=openDialog('מרשם מסמכי מקור');d.append(el('p','מזהה ומראה מקום בלבד. אין להעלות מסמכים, שמות אישיים או פרטי גישה.','site-note'));const list=el('div');for(const doc of data.documents||[]){list.append(el('p',`${doc.id} · ${doc.title||'—'} · ${doc.reference||'—'} · ${doc.revision||'—'}`));}d.append(list);const controls={};for(const [k,t]of Object.entries({id:'מזהה מסמך',title:'תיאור קצר',reference:'מראה מקום / מספר מסמך',revision:'מהדורה'})){controls[k]=labeled(d,t,el('input'));}const err=el('p',undefined,'site-field-error');d.append(err,button('הוספת מסמך',()=>{const entry=Object.fromEntries(Object.entries(controls).map(([k,n])=>[k,n.value.trim()]));if(!entry.id||!entry.title){err.textContent='נדרשים מזהה ותיאור.';return;}if((data.documents||[]).some(x=>x.id===entry.id)){err.textContent='מזהה זה כבר קיים.';return;}data.documents=data.documents||[];data.documents.push(entry);changed('documents');documentsDialog();},'site-primary'));}
    function showImportError(error,host){
      const message=error?.message||String(error),issues=error?.validation?.errors||[];
      const reason=issues.length?errorText(issues[0]):/Invalid JSON|JSON.parse|Unexpected token/i.test(message)?'תחביר JSON אינו תקין.':/5 MiB|size|גדול/i.test(message)?'גודל הקובץ חורג מהמגבלה של 5 MiB.':'לא ניתן לקרוא את הקובץ או שמבנה הנתונים אינו נתמך.';
      host.replaceChildren(el('span','הקובץ לא הוחל. הטיוטה הנוכחית לא השתנתה. '+reason),el('p','יש לבדוק את גרסת הקובץ, סוגי הערכים ויחידות האחסון. אין המרת יחידות או שדרוג גרסה אוטומטיים בייבוא.'));
      host.classList.add('site-error');const details=el('details');details.append(el('summary','פרטים טכניים'));const technical=el('pre',message);technical.dir='ltr';technical.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;';details.append(technical);host.append(details);
    }
    function stageImport(text){const candidate=engine.importText(text);const d=openDialog('בדיקת קובץ לפני החלה');const val=candidate.validation||engine.validate(candidate.data);const count=candidate.data.inputs?.consumers?.length||0;d.append(el('p',`${count} קווים · ${(val.errors||[]).length} שגיאות · ${(val.warnings||[]).length} הערות`),el('p','החלה תחליף את הטיוטה הנוכחית בזיכרון. אין מיזוג אוטומטי. נתוני הקובץ אינם אישור הנדסי או חיווי חי.','site-note'));const summary=el('details');summary.append(el('summary','הערות ייבוא'));for(const e of [...(val.errors||[]),...(val.warnings||[])].slice(0,40))summary.append(el('p',errorText(e)));d.append(summary,button('החלת הקובץ',()=>{replaceDataset(candidate.data,{reason:'import'});closeDialog();notify('הקובץ הוחל כטיוטה; המקורות והאישורים דורשים בדיקה.');},'site-primary'),button('ביטול',closeDialog));return candidate;}
    function pasteDialog(){const d=openDialog('הדבקת קובץ JSON');const t=el('textarea');t.dir='ltr';t.rows=10;t.setAttribute('aria-label','JSON לייבוא');d.append(t);const err=el('div',undefined,'site-field-error');err.setAttribute('role','alert');d.append(err,button('בדיקת הייבוא',()=>{try{stageImport(t.value);}catch(e){showImportError(e,err);}},'site-primary'));}
    function download(){try{const text=engine.exportText(data);const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=el('a');a.href=url;a.download='site-input.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);dirty=false;notify('קובץ הטיוטה הוכן להורדה; בדקו שנשמר בתיקיית ההורדות.');}catch(e){notify(e.message,true);}}
    function renderResults(group){if(resultRenderer){resultRenderer(body,group,data,calculation);return;}body.append(el('p','תוצאות מופיעות לאחר לחיצה על חשב. נתונים מיובאים דורשים בדיקה וחישוב מחדש.','site-note'));for(const f of group.fields){const card=el('div',undefined,'site-result');card.append(el('strong',f.label_he),el('span','לא חושב'));const entries=engine.instances(data,f)||[];for(const x of entries){const v=x.envelope||get(x.path);if(v&&plain(v)!==null&&plain(v)!==undefined){card.append(el('p',`טענה מיובאת: ${str(plain(v))} · ${v.status||'לא אומת'} · ${v.validity||'דורש בדיקה'}`));}}body.append(card);}}
    global.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
    function replaceDataset(next,{reason='import'}={}){const checked=engine.validate(next);if(checked.errors.length){const e=new Error(checked.errors[0].path+': '+checked.errors[0].message);e.validation=checked;throw e;}data=copy(next);calculation=null;selected={};changeSerial++;dirty=true;emit(reason);render();}
    function applyCalculation(artifact,{imported=false,expectedSnapshot}={}){
      if(expectedSnapshot!==undefined&&expectedSnapshot!==inputSnapshot())return false;
      const projected=engine.projectCalculation(data,artifact,{imported});data=projected;calculation=copy(artifact);calculation.ui_validity=imported?'stale':'current';
      if(imported)markCalculationStale();dirty=true;emit('calculation');const detail={dataset:data,calculation,imported};container.dispatchEvent(new CustomEvent('boiler-site-calculation',{bubbles:true,detail}));calculationListeners.forEach(fn=>fn(detail));render();return true;
    }
    const app={getDataset:()=>data,getValidation:()=>engine.validate(data),getCalculation:()=>calculation,getInputSnapshot:inputSnapshot,getChangeSerial:()=>changeSerial,applyCalculation,replaceDataset,markCalculationStale,showValue,refresh:()=>{emit();render();},loadText:stageImport,notify,
      onChange:fn=>{changeListeners.add(fn);return()=>changeListeners.delete(fn);},onCalculation:fn=>{calculationListeners.add(fn);return()=>calculationListeners.delete(fn);},
      setResultRenderer:fn=>{resultRenderer=fn;render();},showResults:()=>{level=0;groupId='L';render();body.scrollIntoView?.({behavior:'smooth',block:'start'});},getNodes:()=>({shell,toolbar,note,notice,body,levels}),commitEdit:reason=>changed(reason||'input')};emit();render();return app;
  }
  global.BoilerSiteUI=Object.freeze({mount});
})(window);
