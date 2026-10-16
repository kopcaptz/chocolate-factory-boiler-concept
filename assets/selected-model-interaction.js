// Selected-room UI only. The hydraulic scene and its draw buffers are unchanged.
(function (root) {
  'use strict';
  var H = root.HE3D, M = H.M, catalog = {}, aliases = {};
  var pending = 'דגם, נתוני תכן וכיול: אין נתונים מאושרים.';
  var pressure = 'עד 2 bar מפי טכנאי, ללא דרכון — לא מאומת. בסיס הלחץ ותחולתו על שש המעטפות טרם הובהרו; הגנת הלחץ פתוחה לתכן.';
  function add(id, name, role, note, view, ports, related) {
    catalog[id] = { id:id, name:name, role:role, note:note || '', view:view || 'iso', ports:ports || [], related:related || [] };
  }
  add('B01','דוד חשמלי','מחמם את מי מעגל הסחרור הסגור. היציאה העליונה מובילה למפריד האוויר וליניקת המשאבות; החזרה נכנסת בחיבור התחתון.','ההספק וטמפרטורת המים טרם נקבעו. הגנות עצמאיות לטמפרטורת יתר ולחוסר מים מוצעות לבדיקה.','boiler',['B_OUT','B_IN','PSV_ROOT','B_DRAIN'],['PSV01','K_HEAT','THH_B01','LW_B01']);
  add('ET01','מכל התפשטות','קולט את שינוי נפח המים דרך חיבור מים יחיד. שלוחת ההתפשטות מחוברת ב־T1 לפני היניקה המשותפת; המכל אינו בטור לסחרור.','מי ההשלמה נכנסים ב־T2 מחוץ למכל. הכיוון, הנפח וקדם־הלחץ לפי הדגם והתכן שייבחרו.','exp',['ET_WATER'],['T1','T2','VET','DVET','PT01']);
  add('T1','חיבור ההתפשטות','נקודת חיבור שלוחת המכל למעגל, לפני היניקה המשותפת של שתי המשאבות.','אין אל־חוזר בשלוחת ההתפשטות.','exp',['T1'],['ET01','T2','VET']);
  add('T2','חיבור מי השלמה','מי ההשלמה נכנסים למחבר על שלוחת ההתפשטות, בצד המערכת של VET — מחוץ למכל.','בידוד המכל אינו מבודד את חיבור ההשלמה מהמערכת.','exp',['T2'],['ET01','XV1','FQ01']);
  add('AS','מפריד אוויר','מפריד אוויר ממי האספקה אחרי הדוד.','האוורור והפריקה מובילים לממשק קולט נפרד; יעד ולחץ נגדי טרם תוכננו.','boiler',['AS_IN','AS_OUT','AIR'],['VENT_DEV']);
  add('DS01','מפריד משקעים','מפריד משקעים בקו החזרה לפני כניסת המים לדוד.','בידוד, ניקוי וריקון לפי הוראות הדגם שייבחר.','boiler',['RET_LEFT','DS_OUT','DS_PURGE_ROOT'],['VDSI','VDSO','DDS01']);
  add('FS01','רלה זרימה','מאשר נוכחות זרימה אחרי איחוד שתי המשאבות.','רלה זרימה אינו מד ספיקה ואינו מספק נתון לחישוב אנרגיה. סף האישור ורצף ההגנה טרם נקבעו.','pump',['FS_IN','FS_OUT'],['P01A','P01B']);
  ['A','B'].forEach(function (s) {
    add('P01'+s,'משאבת סחרור '+s,'אחת משתי משאבות במערך עובדת + גיבוי. כל אחת מיועדת להיבחר בהמשך למלוא הספיקה והעומד הנדרשים.','אין כאן מצב עבודה חי. מעבר לגיבוי דורש משוב פעולה ואישור זרימה; תכנון הספיקה המזערית עדיין פתוח.','pump',['P01'+s+'_IN','P01'+s+'_OUT'],['P01'+(s==='A'?'B':'A'),'V'+s+'I','CV'+s,'V'+s+'O','FS01']);
  });
  add('PSV01','שסתום ביטחון','מחובר ישירות לדוד ללא ברז בידוד ביניהם. פורק לממשק קולט נפרד.','לחץ הפתיחה וקיבולת הפריקה לא נקבעו. PSV הדוד אינו הגנה יחידה למעטפות. '+pressure,'boiler',['PSV_IN','PSV_OUT'],['B01']);
  add('VET','ברז שירות למכל','מאפשר בידוד לצורך תחזוקת מכל ההתפשטות.','נעול פתוח בהפעלה רגילה. חימום חסום כאשר משוב פתוח אינו מאומת; תחזוקת המכל מחייבת השבתת חימום.','exp',['VET_IN','VET_OUT'],['ET01','ZSO_VET','DVET']);
  add('DVET','ניקוז מכל ההתפשטות','ניקוז שירות בצד המכל של ברז הבידוד VET.','סגור בהפעלה רגילה. ניקוז ותחזוקה לפי נוהל מאושר וללא לחץ מסוכן.','exp',['DVET_IN','DVET_OUT'],['ET01','VET']);
  add('U_ET','מחבר פירוק למכל','מחבר שירות בחיבור המים של מכל ההתפשטות.','מיקום וכיוון חיבור המכל לפי הדגם שייבחר.','exp',['ET_DRAIN_TEE','ET_WATER'],['ET01','VET']);
  add('PI01','מד לחץ מקומי','מראה את הלחץ בצד המערכת, לפני ברז הבידוד VET.','אין מדידה חיה במודל.','exp',['PI01'],['PT01','VET']);
  add('PT01','משדר לחץ','אות לחץ לבקרה בצד המערכת, לפני VET.','לחץ בנקודה זו אינו בהכרח הלחץ המקומי במעטפת. '+pressure,'exp',['PT01'],['PI01','T2']);
  add('TT01','טמפרטורת אספקה','מדידת טמפרטורת המים בקו האספקה המשותף.','חישוב חום לענף דורש גם ספיקה כמותית וטמפרטורת חזרה תואמת; אין ערכים חיים במודל.','pump',['TT01'],['FS01','TT02']);
  add('TT02','טמפרטורת חזרה משותפת','מדידת טמפרטורת המים בקו החזרה המשותף.','אינה מחליפה מדידה של החזרה מכל ענף.','boiler',['TT02'],['TT01']);
  add('WT1','ממשק טיפול במים','מקום למערכת טיפול שתיבחר לפי בדיקת מים, חומרים ודרישות יצרן.','RO אינו חובה שנקבעה. אם נבחר אוסמוזה הפוכה, נבחנים גם אגירה והגברת לחץ; החלופות אינן מותקנות במקביל.','exp',['WT1_IN','WT1_OUT'],['BF1','FQ01']);
  add('BF1','מונע זרימה חוזרת','מפריד תברואתית את מקור מי ההשלמה מן המעגל לפי סיווג הסיכון.','הסוג והאישור טרם נבחרו. אם יש פתח פריקה, נדרש קולט מתאים עם פער אוויר.','exp',['BF1_IN','BF1_OUT'],['WT1','Y1']);
  add('FQ01','מונה מי השלמה','מודד את כמות המים שנוספה למעגל.','אינו מד ספיקה לענפי הסחרור. צריכת השלמה בלתי מוסברת היא סימן לבירור, לא הוכחה לבדה למיקום דליפה.','exp',['FQ_IN','FQ_OUT'],['T2','XV1']);
  add('PRV1','וסת לחץ מילוי','ויסות לחץ בקו מי ההשלמה.','אינו וסת לחץ נפרד לכל צרכן. אין ערך כיוון שנבחר.','exp',['PRV1_IN','PRV1_OUT'],['T2','XV1']);
  add('XV1','שסתום השלמה מבוקר','מאפשר או חוסם את כניסת מי ההשלמה לפי הבקרה שתתוכנן.','מוצע סגור ללא מתח. פקודת סגירה אינה הוכחה לסגירה בפועל.','exp',['XV1_IN','XV1_OUT'],['FQ01','CV1','T2']);
  add('CV1','אל־חוזר בהשלמה','מאפשר זרימה ממי ההשלמה לכיוון המערכת.','אינו מחליף את מכלול מניעת הזרימה החוזרת BF1.','exp',['CV1_IN','CV1_OUT'],['BF1','T2']);
  add('Y1','מסנן מי השלמה','מסנן בקו מי ההשלמה לפני מכלול מניעת הזרימה החוזרת.','ניקוי ותחזוקה לפי הדגם שייבחר.','exp',['Y_IN','Y_OUT'],['BF1']);
  add('DP01','משאבת מינון','ממשק מוצע למינון חומרי טיפול למעגל.','חומר, ריכוז, מינון והרשאות טרם אושרו. אין להסיק pH או ריכוז מעכב ממוליכות בלבד.','exp',['DP_IN','DP_OUT'],['CHEM_TANK','DCV']);
  add('CHEM_TANK','מכל חומר טיפול','מאגר חומר למערכת המינון המוצעת.','תוכנית הכימיה והחומר טרם נבחרו.','exp',['CHEM_OUT'],['DP01']);
  add('EC01','חיישן מוליכות','ממשק מוצע לניטור מוליכות המים.','אינו מחליף בדיקת קשיות או מדידת ריכוז חומר טיפול.','iso',['EC01']);
  add('pH01','חיישן חומציות','ממשק מוצע לניטור pH במים.','דורש בחירת חיישן, כיול ותחזוקה לפי המים והדגם.','iso',['pH01']);
  add('AN1','ממשק דגימת מים','ממשק לדגימה או לבדיקת מים לפי תוכנית שתאושר.','דגימה עם מגיבים מיועדת לניקוז, ללא החזרה למעגל.','exp',['SAMPLE_IN','SAMPLE_OUT']);
  add('SRC_RAW','מקור מי השלמה','כניסת מקור המים אל מערכת ההשלמה.','איכות המים ותנאי האספקה טעונים בדיקה.','exp',['RAW'],['V1','Y1','BF1']);
  add('CTRL','ארון בקרה','המחשה של ארון הבקרה למערכת.','המודל אינו מחובר לציוד. לוח הטכנאי נמצא בלשונית 04 של המצגת.','iso',[],['K_HEAT']);
  add('VENT_DEV','משחרר אוויר','משחרר אוויר ממפריד האוויר.','ממשק הפריקה נפרד מקו החזרה. יעד הפריקה ולחץ נגדי נדרשים בתכן.','boiler',['VENT','VENT_OUT'],['AS']);
  add('K_HEAT','ניתוק כוח לחימום','מגעון ניתוק כוח מוצע להגנות העצמאיות של הדוד.','החיווט העקרוני טעון בדיקה; אינו תלוי במסך הטכנאי או בבקר התהליך.','boiler',[],['THH_B01','LW_B01','B01']);
  add('THH_B01','הגנת טמפרטורת יתר','מגביל טמפרטורה עצמאי מוצע לניתוק החימום.','איפוס מקומי לפי יצרן; אין כאן סף שנבחר או חיווט מאומת.','boiler',[],['K_HEAT']);
  add('LW_B01','הגנת חוסר מים','הגנה עצמאית לחוסר מים לפי יצרן הדוד שייבחר.','חוסר מים אינו נלמד מלחץ נמוך בלבד. החיווט עדיין מוצע.','boiler',[],['K_HEAT']);
  add('ZSO_VET','משוב פתיחת VET','משוב מצב פתוח מוצע לברז השירות של מכל ההתפשטות.','מצב סגור או לא ידוע חוסם חימום; חיווט ואימות בשטח עדיין נדרשים.','exp',[],['VET','ET01']);
  var types = {valve:'ברז בידוד',check:'אל־חוזר',openEnd:'ממשק פריקה',instrument:'נקודת מדידה'};
  Object.keys(H.components).forEach(function (edge) {
    var c=H.components[edge]; if (catalog[c.id]) return;
    var name=types[c.type]||'רכיב במערכת', role='רכיב בקו המים לפי גרף החיבורים הנוכחי.',note='',view='exp';
    if (/^BV\d+$/.test(c.id)) { var n=c.id.slice(2);name='ברז איזון · צרכן '+n;role='איזון ספיקת החזרה מענף '+n+' באמצעות ברז עם שתי נקודות מדידה.';note='אינו וסת לחץ מוחלט או מד ספיקה רציף. כיול, ספיקה ואמצעי איזון סופיים טרם נבחרו.';view='jacket'; }
    else if (/^[SR]V\d+$/.test(c.id)) {name='ברז '+(c.id[0]==='S'?'אספקה':'חזרה')+' · צרכן '+c.id.slice(2);role='בידוד קו '+(c.id[0]==='S'?'האספקה לצרכן':'החזרה מהצרכן')+'.';view='jacket';}
    else if (/^V[A-B][IO]$|^CV[A-B]$/.test(c.id)) {name=c.id.startsWith('CV')?'אל־חוזר במשאבה '+c.id.slice(-1):'ברז '+(c.id.endsWith('I')?'יניקה':'סניקה')+' במשאבה '+c.id[1];role='רכיב בענף המשאבה, נפרד מהענף המקביל.';view='pump';}
    else if (/^VB01/.test(c.id)) {name='ברז בידוד '+(c.id.endsWith('I')?'בכניסת הדוד':'ביציאת הדוד');role='בידוד הדוד לתחזוקה.';note='בידוד רק בדוד מנותק מחשמל ובנוהל נעילה. דוד מבודד מנותק ממכל ההתפשטות.';view='boiler';}
    else if (/^VDS/.test(c.id)) {name='ברז בידוד מפריד משקעים';role='בידוד מפריד המשקעים לצורך תחזוקה.';view='boiler';}
    var service=(H.topology.serviceBranches||[]).find(function (s) {return s.id===c.id;});
    if (service) {name=/^V[HP]/.test(c.id)?'ברז שחרור אוויר':'ברז ניקוז';role='שלוחת שירות מן החיבור '+service.root+'.';note='סגור בהפעלה רגילה. שיפועים, נגישות ואופן השירות לפי התכן והיצרן.'+(service.conditional?' החיבור מותנה בדגם שייבחר.':'');view=/P[A-B]|^VH_P/.test(c.id)?'pump':/H_[SR]/.test(c.id)?'jacket':'boiler';}
    add(c.id,name,role,note,view,edge.split('>'));
  });
  for (var i=1;i<=6;i++) {
    add('CONSUMER_'+i,'צרכן '+i,'זוג חיבורי אספקה וחזרה אל צרכן מחוץ לחדר. הצינורות והציוד במפעל אינם מצוירים.','הצרכן יכול להיות מעטפת צינור או מכל קיים. '+pressure,'jacket',['EXT_S'+i,'EXT_R'+i],['SV'+i,'RV'+i,'BV'+i,'TT_R'+i]);
    add('TT_R'+i,'טמפרטורת חזרה · צרכן '+i,'מודד את טמפרטורת המים בחזרת ענף '+i+'.','יחד עם TT01 ניתן לקבל הפרש טמפרטורות, בתנאים מתאימים. אנרגיה לענף דורשת גם מדידת ספיקה; אין מדידה חיה במודל.','jacket',['TT_R'+i],['CONSUMER_'+i,'TT01','BV'+i]);
    aliases['END_S'+i]=aliases['END_R'+i]='CONSUMER_'+i;
    aliases['BV'+i+'_P1']=aliases['BV'+i+'_P2']='BV'+i;
  }
  H.objects.forEach(function (o) {if (!catalog[o.id]&&!aliases[o.id]) add(o.id,types[o.type]||'רכיב שירות',o.type==='openEnd'?'סיום קו אל ממשק פריקה נפרד.':'רכיב המחובר בנקודה המסומנת בגרף.',o.type==='openEnd'?'יעד הפריקה והקולט טעונים תכן. אין חיבור לחץ דרך הקולט.':'','iso',o.port?[o.port]:[]);});
  add('SUPPLY_HEADER','סעפת אספקה','מחלקת מים לששת הענפים דרך ברזי האספקה.','הצרכנים מחוץ לחדר; אין חיבור קצר לסעפת החזרה.','jacket',['SUPPLY','S1','S2','S3','S4','S5','S6']);
  add('RETURN_HEADER','סעפת חזרה','אוספת את מי החזרה מששת הענפים ומחזירה אותם לקו הדוד.','','jacket',['RET_HEAD','R1','R2','R3','R4','R5','R6']);
  var kindNames={hot:'קו אספקה',ret:'קו חזרה',fill:'קו מי השלמה',chem:'קו חומר טיפול',drain:'קו ניקוז ואוורור',sample:'קו דגימה'};
  H.edgeList().forEach(function (e) {
    var id='PIPE_'+e.kind, match=e.k.match(/(?:EXT_[SR]|[SR]V|TR|TT_R|BV)([1-6])(?:_|>|$)/);
    if (/^(SUPPLY|S[1-6])>S[1-6]$/.test(e.k)) id='SUPPLY_HEADER';
    else if (/^R[1-6]>(R[1-6]|RET_HEAD)$/.test(e.k)) id='RETURN_HEADER';
    else if (match) id='CONSUMER_'+match[1];
    if (!catalog[id]) add(id,kindNames[e.kind]||'קו מים','צנרת מחברת בין רכיבי המערכת.','החצים מסמנים את הכיוון העקרוני; אין במודל נתוני זרימה חיים.','iso');
    aliases['edge:'+e.k]=id;
  });
  aliases['port:T1']='T1';aliases['port:T2']='T2';
  function resolve(id) { return aliases[id] || (catalog[id]?id:null); }
  H.componentCatalog=catalog;

  // Record ownership of existing primitives. Neither topology nor render data is modified.
  H.preparePicking=function(b) {
    b.pickRecords=[];
    ['grid','fan'].forEach(function(name) {
      var original=b[name];
      b[name]=function() {
        var layer=this.layer, list=this.layers[layer]||[], before=list.map(function(c){return {n:c.n,idx:c.idx.length};});
        var result=original.apply(this,arguments), self=this;
        (this.layers[layer]||[]).forEach(function(c,i){
          var prev=before[i]||{n:0,idx:0};
          if(c.idx.length>prev.idx) self.pickRecords.push({layer:layer,chunk:i,start:prev.idx,end:c.idx.length,first:prev.n,last:c.n,id:resolve(self.pickId)});
        });
        return result;
      };
    });
  };
  function boundsHit(origin,dir,mn,mx,limit) {
    var near=0,far=limit;
    for(var i=0;i<3;i++) {
      if(Math.abs(dir[i])<1e-10) {if(origin[i]<mn[i]||origin[i]>mx[i])return false;continue;}
      var a=(mn[i]-origin[i])/dir[i],b=(mx[i]-origin[i])/dir[i];
      near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return false;
    }
    return true;
  }
  function triangle(origin,dir,p,a,b,c) {
    a*=3;b*=3;c*=3;
    var ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
    var hx=dir[1]*vz-dir[2]*vy,hy=dir[2]*vx-dir[0]*vz,hz=dir[0]*vy-dir[1]*vx,det=ux*hx+uy*hy+uz*hz;
    if(Math.abs(det)<1e-10)return Infinity;
    var sx=origin[0]-p[a],sy=origin[1]-p[a+1],sz=origin[2]-p[a+2],u=(sx*hx+sy*hy+sz*hz)/det;
    if(u<0||u>1)return Infinity;
    var qx=sy*uz-sz*uy,qy=sz*ux-sx*uz,qz=sx*uy-sy*ux,v=(dir[0]*qx+dir[1]*qy+dir[2]*qz)/det;
    if(v<0||u+v>1)return Infinity;
    var t=(vx*qx+vy*qy+vz*qz)/det;return t>=0?t:Infinity;
  }
  H.createPickIndex=function(b,mesh) {
    var groups=b.pickRecords.filter(function(r){return r.layer==='base'||r.layer==='floor';}),centers={};
    groups.forEach(function(g){
      g.mesh=mesh[g.layer][g.chunk];g.min=[Infinity,Infinity,Infinity];g.max=[-Infinity,-Infinity,-Infinity];
      for(var v=g.first;v<g.last;v++)for(var d=0;d<3;d++){var x=g.mesh.pos[v*3+d];g.min[d]=Math.min(g.min[d],x);g.max[d]=Math.max(g.max[d],x);}
      if(g.id){var volume=M.len(M.sub(g.max,g.min));if(!centers[g.id]||volume>centers[g.id].size)centers[g.id]={point:M.scale(M.add(g.min,g.max),0.5),size:volume};}
    });
    return {groups:groups,centers:centers,cast:function(origin,dir){
      var distance=Infinity,best=null;
      groups.forEach(function(g){
        if(!boundsHit(origin,dir,g.min,g.max,distance))return;
        var c=g.mesh;
        for(var i=g.start;i<g.end;i+=3){var t=triangle(origin,dir,c.pos,c.idx[i],c.idx[i+1],c.idx[i+2]);if(t<distance){distance=t;best=g;}}
      });
      // Opaque walls/floor/unsupported objects occlude; never select through them.
      return best&&best.id?{id:best.id,point:M.add(origin,M.scale(dir,distance)),distance:distance}:null;
    }};
  };
  function invert(m) {
    var rows=[],out=new Float32Array(16);
    for(var r=0;r<4;r++){rows[r]=[];for(var c=0;c<4;c++)rows[r][c]=m[c*4+r];for(c=0;c<4;c++)rows[r][c+4]=r===c?1:0;}
    for(c=0;c<4;c++){
      var pivot=c;for(r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;
      var tmp=rows[c];rows[c]=rows[pivot];rows[pivot]=tmp;if(Math.abs(rows[c][c])<1e-10)return null;
      var n=rows[c][c];for(var j=0;j<8;j++)rows[c][j]/=n;
      for(r=0;r<4;r++)if(r!==c){n=rows[r][c];for(j=0;j<8;j++)rows[r][j]-=n*rows[c][j];}
    }
    for(r=0;r<4;r++)for(c=0;c<4;c++)out[c*4+r]=rows[r][c+4];return out;
  }
  function rayAt(inv,cam,x,y) {
    var nx=x/cam.w*2-1,ny=1-y/cam.h*2;
    var a=M.transform(inv,[nx,ny,-1]),b=M.transform(inv,[nx,ny,1]);
    var origin=a.slice(0,3).map(function(v){return v/a[3];}),end=b.slice(0,3).map(function(v){return v/b[3];});
    return {origin:origin,dir:M.norm(M.sub(end,origin))};
  }
  // Drag, right/modified clicks and multi-touch are explicitly not component clicks.
  function Gesture(){this.points={};this.cancelled=false;}
  Gesture.prototype.down=function(e){if(!Object.keys(this.points).length)this.cancelled=false;this.points[e.pointerId]={x:e.clientX,y:e.clientY};if(Object.keys(this.points).length>1||e.button!==0||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey)this.cancelled=true;};
  Gesture.prototype.move=function(e){var p=this.points[e.pointerId];if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>=6)this.cancelled=true;};
  Gesture.prototype.up=function(e){this.move(e);var click=!!this.points[e.pointerId]&&!this.cancelled;delete this.points[e.pointerId];return click;};
  Gesture.prototype.cancel=function(){this.points={};this.cancelled=true;};
  H.pickMath={invert:invert,rayAt:rayAt,Gesture:Gesture};

  function Interaction(stage,canvas,index) {
    var self=this;this.stage=stage;this.canvas=canvas;this.index=index;this.cam=null;this.selected=null;this.anchor=null;this.gesture=new Gesture();
    this.tooltip=document.getElementById('component-tooltip');this.marker=document.getElementById('selection-marker');
    this.panel=document.getElementById('component-panel');this.content=document.getElementById('component-content');this.launch=document.getElementById('find-component');
    this.launch.addEventListener('click',function(){self.showList();});
    document.getElementById('close-component').addEventListener('click',function(){self.close();});
    document.getElementById('component-list').addEventListener('click',function(){self.showList();});
    canvas.addEventListener('pointerdown',function(e){self.gesture.down(e);self.hideHover();});
    canvas.addEventListener('pointermove',function(e){self.gesture.move(e);if(Object.keys(self.gesture.points).length)return;self.hover(e);});
    canvas.addEventListener('pointerup',function(e){if(self.gesture.up(e)){var hit=self.hitEvent(e);if(hit)self.select(hit.id,hit.point);}});
    canvas.addEventListener('pointercancel',function(){self.gesture.cancel();self.hideHover();});
    canvas.addEventListener('lostpointercapture',function(){if(Object.keys(self.gesture.points).length)self.gesture.cancel();});
    canvas.addEventListener('pointerleave',function(){self.hideHover();});
    canvas.addEventListener('wheel',function(){self.hideHover();self.gesture.cancelled=true;},{passive:true});
    window.addEventListener('blur',function(){self.gesture.cancel();self.hideHover();});
    window.addEventListener('keydown',function(e){
      if(e.key==='Escape'){self.hideHover();if(!self.panel.hidden){self.close();e.preventDefault();}}
      if((e.key==='Enter'||e.key===' ')&&e.target===canvas){e.preventDefault();self.showList();}
    });
  }
  Interaction.prototype.measure=function(){this.hideHover();};
  Interaction.prototype.hideHover=function(){this.tooltip.hidden=true;this.canvas.style.cursor='grab';};
  Interaction.prototype.hit=function(x,y){if(!this.cam||!this.inverse||x<0||y<0||x>this.cam.w||y>this.cam.h)return null;var r=rayAt(this.inverse,this.cam,x,y);return this.index.cast(r.origin,r.dir);};
  Interaction.prototype.hitEvent=function(e){var r=this.canvas.getBoundingClientRect();return this.hit(e.clientX-r.left,e.clientY-r.top);};
  Interaction.prototype.hover=function(e){
    var hit=this.hitEvent(e);if(!hit){this.hideHover();return;}
    var item=catalog[hit.id],box=this.canvas.getBoundingClientRect();
    this.tooltip.textContent=item.id.indexOf('CONSUMER_')===0?item.name:item.name+' · '+item.id;
    this.tooltip.hidden=false;this.canvas.style.cursor='pointer';
    this.tooltip.style.left=Math.max(8,Math.min(e.clientX-box.left+14,this.stage.clientWidth-this.tooltip.offsetWidth-8))+'px';
    this.tooltip.style.top=Math.max(8,Math.min(e.clientY-box.top+18,this.stage.clientHeight-this.tooltip.offsetHeight-8))+'px';
  };
  Interaction.prototype.layout=function(cam){this.cam=cam;this.inverse=invert(cam.vp);this.hideHover();this.updateMarker();};
  Interaction.prototype.updateMarker=function(){
    this.marker.hidden=true;if(!this.selected||!this.cam)return;
    var point=this.anchor||(this.index.centers[this.selected]||{}).point;if(!point)return;
    var p=M.transform(this.cam.vp,point);if(p[3]<=0||Math.abs(p[2]/p[3])>1)return;
    var x=(p[0]/p[3]*0.5+0.5)*this.cam.w,y=(0.5-p[1]/p[3]*0.5)*this.cam.h,hit=this.hit(x,y);
    if(!hit||hit.id!==this.selected)return;
    this.marker.hidden=false;this.marker.style.left=x+'px';this.marker.style.top=y+'px';
  };
  Interaction.prototype.open=function(){this.panel.hidden=false;this.launch.setAttribute('aria-expanded','true');this.hideHover();};
  Interaction.prototype.close=function(){this.panel.hidden=true;this.selected=null;this.anchor=null;this.marker.hidden=true;this.launch.setAttribute('aria-expanded','false');this.hideHover();this.launch.focus();};
  function el(tag,text,cls){var n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
  Interaction.prototype.select=function(id,point){
    var item=catalog[id];if(!item)return;var self=this;this.selected=id;this.anchor=point||null;this.panel.dataset.component=id;this.open();this.content.replaceChildren();this.panel.scrollTop=0;
    var tag=el('div',id.indexOf('CONSUMER_')===0?'ממשק לצרכן':id,'component-tag');tag.dir='ltr';this.content.appendChild(tag);
    var title=el('h2',item.name);title.id='component-title';title.tabIndex=-1;this.content.appendChild(title);
    this.content.appendChild(el('p',item.role,'component-role'));
    if(item.note){var section=el('section',null,'component-note');section.append(el('h3','חשוב לדעת'),el('p',item.note));this.content.appendChild(section);}
    if(item.ports.length){var details=el('details');details.appendChild(el('summary','חיבורים ותגים'));var list=el('ul');item.ports.forEach(function(p){var li=el('li',p);li.dir='ltr';list.appendChild(li);});details.appendChild(list);this.content.appendChild(details);}
    if(item.related.length){var related=el('div',null,'component-related');related.appendChild(el('h3','רכיבים קשורים'));item.related.filter(function(x){return catalog[x];}).forEach(function(x){var bt=el('button',catalog[x].name+' · '+x);bt.type='button';bt.addEventListener('click',function(){self.select(x);});related.appendChild(bt);});this.content.appendChild(related);}
    var view=el('button','מבט על האזור','component-view');view.type='button';view.addEventListener('click',function(){H.app.setView(item.view);canvasFocus(self);});this.content.appendChild(view);
    this.content.appendChild(el('p',pending,'component-pending'));title.focus({preventScroll:true});this.updateMarker();
  };
  function canvasFocus(self){self.canvas.focus({preventScroll:true});}
  Interaction.prototype.showList=function(){
    var self=this;this.selected=null;this.anchor=null;this.marker.hidden=true;delete this.panel.dataset.component;this.open();this.content.replaceChildren();this.panel.scrollTop=0;
    var title=el('h2','איתור רכיב');title.id='component-title';this.content.appendChild(title);
    var label=el('label','שם או תג רכיב');label.htmlFor='component-search';this.content.appendChild(label);
    var search=el('input');search.id='component-search';search.type='search';search.placeholder='לדוגמה: משאבה, P01A, ET01';search.autocomplete='off';this.content.appendChild(search);
    var results=el('div',null,'component-results');this.content.appendChild(results);
    function filter(){var q=search.value.trim().toLocaleLowerCase();results.replaceChildren();Object.keys(catalog).filter(function(id){var i=catalog[id];return (i.id+' '+i.name).toLocaleLowerCase().indexOf(q)>=0;}).forEach(function(id){var i=catalog[id],bt=el('button',i.name+' · '+id);bt.type='button';bt.dataset.componentId=id;bt.addEventListener('click',function(){self.select(id);});results.appendChild(bt);});if(!results.children.length)results.appendChild(el('p','לא נמצאו רכיבים. נסו שם או תג אחר.'));}
    search.addEventListener('input',filter);filter();search.focus();
  };
  H.Interaction=Interaction;
})(window);
