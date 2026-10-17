/* Display-only plots of an entered calculation snapshot. No process control or extrapolation. */
(function(root){
  'use strict';
  const NS='http://www.w3.org/2000/svg',num=Number.isFinite;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const sv=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
  const fmt=v=>num(v)?Number(v.toPrecision(6)).toString():'—';
  const tick=v=>num(v)?Number(v.toPrecision(3)).toString():'—';
  function table(headers,rows){const t=el('table'),head=el('tr');headers.forEach(h=>head.append(el('th',h)));t.append(head);rows.forEach(row=>{const r=el('tr');row.forEach(v=>r.append(el('td',v)));t.append(r);});const wrap=el('div',undefined,'site-calc-plot-table');wrap.append(t);return wrap;}
  function graph(title){const n=sv('svg',{viewBox:'0 0 600 290',role:'img','aria-label':title});n.append(sv('title',{},title));return n;}
  function source(p){return p?'מסמך '+(p.source_ref||'—')+' · עמוד '+(p.page||'—')+' · תפקיד '+(p.reviewer_role||'—'): 'מקור לא נמסר';}
  function render(artifact,dataset){
    artifact=artifact||{};dataset=dataset||{};
    const section=el('section',undefined,'site-calc-plots');section.setAttribute('aria-label','תרשימי חישוב מקדים');
    const md=dataset.inputs?.calculation_basis?.method_data||{},stale=artifact.ui_validity==='stale';
    section.append(el('h3','המחשה של בסיס החישוב'),el('p',(stale?'תוצאות מיושנות · ':artifact.run_id?'מחושב, לא מאושר · ':'נתוני מקור בלבד · לא חושב · ')+'עקומות שהוזנו בלבד · ללא אקסטרפולציה','site-calc-plot-note'));
    if(stale){section.append(el('p','הקלט השתנה. הגרפים הקודמים אינם מוצגים עם נתוני המקור החדשים; יש לחשב מחדש.','site-calc-plot-note'));return section;}
    const grid=el('div',undefined,'site-calc-plot-grid');section.append(grid);
    const pumps=el('article',undefined,'site-calc-plot-card');pumps.append(el('h4','משאבה ורשת · H(q)'));grid.append(pumps);
    const view=(artifact.curve_views||[])[0];
    const validCurves=(md.pump_curves||[]).filter(c=>Array.isArray(c.points)&&c.points.length>=2&&c.points.every(p=>num(p.flow_m3_h)&&num(p.head_m)));
    const curve=validCurves.find(c=>c.id===view?.curve_id)||validCurves[0];
    const design=(md.network_cases||[]).find(c=>c.mode==='design'&&c.system_curve?.points?.length>=2&&c.system_curve.points.every(p=>num(p.flow_m3_h)&&num(p.head_m)));
    if(curve)pumps.append(el('p','עקומה: '+curve.id+' · ציוד: '+(curve.equipment_ref||'—'),'site-calc-plot-note'));
    if(!curve){pumps.append(el('p','לא הוזנה עקומת משאבה שלמה. אין נקודת עבודה מחושבת.','site-calc-plot-note'));}
    else{
      const series=[{name:'עקומת משאבה שהוזנה',points:curve.points,dash:false}];
      if(design)series.push({name:'עקומת רשת שהוזנה',points:design.system_curve.points,dash:true});
      const points=series.flatMap(s=>s.points),xmax=Math.max(...points.map(p=>p.flow_m3_h)),ymax=Math.max(...points.map(p=>p.head_m));
      if(xmax>0&&ymax>0){
        const svg=graph('עקומות משאבה ורשת בתחום הנתונים שהוזן');const X=q=>65+q/xmax*490,Y=h=>235-h/ymax*190;
        svg.append(sv('path',{d:'M65 35V235H555',fill:'none',stroke:'#77828a','stroke-width':1.5}));
        for(let i=0;i<=4;i++){const q=xmax*i/4,h=ymax*i/4;svg.append(sv('text',{x:X(q),y:254,'text-anchor':'middle','font-size':12},tick(q)),sv('text',{x:52,y:Y(h)+4,'text-anchor':'end','font-size':12},tick(h)));}
        svg.append(sv('text',{x:310,y:280,'text-anchor':'middle','font-size':13},'q · m³/h'),sv('text',{x:12,y:20,'font-size':13},'H · m'));
        for(const s of series){const ps=s.points.slice().sort((a,b)=>a.flow_m3_h-b.flow_m3_h);svg.append(sv('polyline',{points:ps.map(p=>X(p.flow_m3_h)+','+Y(p.head_m)).join(' '),fill:'none',stroke:s.dash?'#89949c':'#2c4657','stroke-width':2.5,...(s.dash?{'stroke-dasharray':'8 5'}:{})}));for(const p of ps)svg.append(sv('circle',{cx:X(p.flow_m3_h),cy:Y(p.head_m),r:2.5,fill:s.dash?'#89949c':'#2c4657'}));}
        const op=(artifact.traces||[]).find(t=>t.trace_id==='pump-operating-point');
        const v=view?.curve_id===curve.id?view.operating_point:(op?.values||op?.details);
        if(v&&num(v.flow_m3_h)&&num(v.head_m)&&v.flow_m3_h>=0&&v.flow_m3_h<=xmax&&v.head_m>=0&&v.head_m<=ymax){
          svg.append(sv('circle',{cx:X(v.flow_m3_h),cy:Y(v.head_m),r:6,fill:'#fff',stroke:'#263f50','stroke-width':2}),sv('text',{x:Math.min(455,X(v.flow_m3_h)+10),y:Math.max(25,Y(v.head_m)-13),'font-size':12},'q*='+fmt(v.flow_m3_h)+' · H*='+fmt(v.head_m)));
          pumps.append(el('p','נקודת עבודה מחושבת: '+fmt(v.flow_m3_h)+' m³/h · '+fmt(v.head_m)+' m · לא מאושרת'));
        }else pumps.append(el('p','נקודת עבודה מחושבת לא זמינה; דרישת q/H אינה נקודת חיתוך.','site-calc-plot-note'));
        pumps.append(svg,el('p','קו מלא: משאבה · מקווקו: רשת · הנקודות הן נתוני קלט, הקווים חיבור לינארי לתצוגה בלבד.'));
      }else pumps.append(el('p','תחום עקומה אינו מספיק להצגה.'));
      pumps.append(el('p',source(curve.provenance),'site-calc-plot-note'));
      const details=el('details');details.append(el('summary','נקודות ומקורות'),table(['q · m³/h','H · m','מקור לכל נקודה'],curve.points.map(p=>[fmt(p.flow_m3_h),fmt(p.head_m),source(p.provenance)])));pumps.append(details);
      if(!design)pumps.append(el('p','עקומת רשת לא הוזנה; אין עקומה מדומה במקומה.','site-calc-plot-note'));
    }
    const pressure=el('article',undefined,'site-calc-plot-card');pressure.append(el('h4','סולם לחצים · נקודה ותרחיש'));grid.append(pressure);
    const ladders=md.control_basis?.pressure_ladders||[];
    if(!ladders.length)pressure.append(el('p','לא הוזנו תחומי לחץ, סבילויות והעברה מקומית. אין סולם מספרי להצגה.','site-calc-plot-note'));
    for(const l of ladders){
      const complete=num(l.normal_upper_g_bar)&&Array.isArray(l.trip_interval_g_bar)&&l.trip_interval_g_bar.length===2&&l.trip_interval_g_bar.every(num)&&Array.isArray(l.psv_open_interval_g_bar)&&l.psv_open_interval_g_bar.length===2&&l.psv_open_interval_g_bar.every(num)&&[l.capacity_pressure_upper_g_bar,l.local_transfer_bar,l.transfer_uncertainty_bar,l.local_allow_g_bar].every(num);
      pressure.append(el('strong',(l.point_ref||l.id||'—')+' · '+(l.family_id||'תרחיש לא נמסר')));
      if(!complete){pressure.append(el('p','חסר תחום/אי־ודאות/גבול מקומי; השוואה אינה זמינה.','site-calc-plot-note'));continue;}
      // Express the local permissible bound at the same point for this explicit entered transfer.
      // This only positions plot marks; the assessment is computed by compute_site, never here.
      const converted=l.local_allow_g_bar-l.local_transfer_bar-l.transfer_uncertainty_bar;
      const rows=[['תקין · עליון',l.normal_upper_g_bar,l.normal_upper_g_bar],['תחום ניתוק',...l.trip_interval_g_bar],['תחום פתיחת PSV',...l.psv_open_interval_g_bar],['לחץ ליכולת הספיקה',l.capacity_pressure_upper_g_bar,l.capacity_pressure_upper_g_bar],['גבול מקומי מועבר לנקודה',converted,converted]];
      const vals=rows.flatMap(r=>r.slice(1)),lo=Math.min(0,...vals),hi=Math.max(...vals);if(!(hi>lo)){pressure.append(el('p','אין טווח מספרי להצגה.'));continue;}
      const svg=graph('סולם לחץ בנקודה '+(l.point_ref||'')+' ביחידות bar gauge');const X=v=>215+(v-lo)/(hi-lo)*285;
      rows.forEach(([name,a,b],i)=>{const y=35+i*44;svg.append(sv('text',{x:200,y:y+4,'text-anchor':'end','font-size':12,direction:'rtl'},name),sv('line',{x1:X(a),x2:X(b),y1:y,y2:y,stroke:'#425866','stroke-width':5}),sv('circle',{cx:X(a),cy:y,r:3,fill:'#425866'}),sv('text',{x:590,y:y+4,'text-anchor':'end','font-size':11},fmt(a)+(a===b?'':'…'+fmt(b))));});
      svg.append(sv('text',{x:380,y:272,'text-anchor':'middle','font-size':13},'bar gauge · '+(l.point_ref||'נקודת הבסיס')));pressure.append(svg);
      pressure.append(el('p','כל הסימונים באותה נקודה. גבול הצרכן הועבר לפי Δp='+fmt(l.local_transfer_bar)+' bar ואי־ודאות '+fmt(l.transfer_uncertainty_bar)+' bar שהוזנו; הצגה אינה אימות מסלול או אישור PSV.','site-calc-plot-note'));
      const details=el('details');details.append(el('summary','ערכים, מקורות והגבול המקורי'),table(['נתון','תחום · bar gauge'],rows.map(r=>[r[0],fmt(r[1])+(r[1]===r[2]?'':' … '+fmt(r[2]))]).concat([['גבול הצרכן בנקודתו',fmt(l.local_allow_g_bar)]])),el('p',source(l.provenance)));pressure.append(details);
    }
    return section;
  }
  root.BoilerCalcGraphs=Object.freeze({render});
})(typeof window!=='undefined'?window:globalThis);
