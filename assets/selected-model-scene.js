// Owner-selected Claude basis, adapted only for the boiler-room presentation.
// Original 3d-candidate files are unchanged. Coordinates are illustrative only.
// The six consumers are external boundary interfaces, not equipment in this room.
(function (root) {
  'use strict';
  var H = root.HE3D, P = H.ports, M = H.M;
  var removed = function (p) { return /^(LOAD\d+_|[SR]\d+$|EXT_[SR]$)/.test(p); };
  H.topology = Object.assign({}, H.topology, {
    source: 'Proposed v4 / Claude room / six external pairs / duty-standby 1+1',
    edges: H.topology.edges.filter(function (e) { return !removed(e[0]) && !removed(e[1]); }),
    checks: {},
    limitations: ['Illustrative boiler-room preview; factory consumers not drawn', 'No sizing, selected equipment or engineering acceptance']
  });
  Object.keys(P).forEach(function (k) { if (removed(k)) delete P[k]; });
  Object.keys(H.routes).forEach(function (k) { if (k.split('>').some(removed)) delete H.routes[k]; });
  Object.keys(H.components).forEach(function (k) { if (k.indexOf('LOAD') >= 0) delete H.components[k]; });
  H.objects = H.objects.filter(function (o) { return ['BOUNDARY', 'SECTION', 'TTP'].indexOf(o.id) < 0; });
  delete H.terminals.EXT_S; delete H.terminals.EXT_R;

  // Header layout belongs to the distribution interface. Boiler outlet/inlet,
  // expansion branch and makeup train retain their source connections.
  var supplyY = 1.35, returnY = 2.3, wallZ = -2.8;
  P.SUPPLY = [10.6, supplyY, 0.75];
  P.RET_HEAD = [10.9, returnY, -0.15];
  H.routes['TT_TAP>SUPPLY'] = [[10.6, 0.95, 0.75]];
  H.routes['RET_HEAD>RET_T'] = [[10.9, 0.55, -0.15], [10.9, 0.55, 0]];
  var edge = function (a, b, kind, label) { H.topology.edges.push([a, b, kind, 'open', label || null]); };
  // Duty/standby 1+1 proposal: each pump has its own isolation and discharge check.
  // T1/ET stays on common suction; common FS01 proves circulation after the merge.
  H.topology.edges = H.topology.edges.filter(function (e) {
    return ['T1>P_IN', 'P_IN>P_OUT', 'P_OUT>FS_IN'].indexOf(e[0] + '>' + e[1]) < 0;
  });
  delete H.routes['T1>P_IN'];
  delete H.components['P_IN>P_OUT'];
  delete P.P_IN; delete P.P_OUT;
  P.P_SUC = [6.3, 0.95, 0.75];
  P.P_DIS = [8.6, 0.95, 0.75];
  edge('T1', 'P_SUC', 'hot');
  H.routes['T1>P_SUC'] = [[6.3, 2.6, 0], [6.3, 2.6, 0.75]];
  ['A', 'B'].forEach(function (n, i) {
    var z = i === 0 ? 0.75 : 1.65;
    var prefix = 'P01' + n;
    [['VI_IN',6.48],['VI_OUT',6.72],['IN',7],['OUT',7.6],
     ['CV_IN',7.78],['CV_OUT',8.00],['VO_IN',8.18],['VO_OUT',8.42]].forEach(function (q) {
      P[prefix + '_' + q[0]] = [q[1], 0.95, z];
    });
    var chain = ['P_SUC',prefix+'_VI_IN',prefix+'_VI_OUT',prefix+'_IN',prefix+'_OUT',
      prefix+'_CV_IN',prefix+'_CV_OUT',prefix+'_VO_IN',prefix+'_VO_OUT','P_DIS'];
    for (var j=0;j<chain.length-1;j++) edge(chain[j],chain[j+1],'hot');
    H.components[prefix+'_VI_IN>'+prefix+'_VI_OUT'] = {id:'V'+n+'I',type:'valve',state:'open'};
    H.components[prefix+'_IN>'+prefix+'_OUT'] = {id:prefix,type:'pump',duty:'duty-or-standby'};
    H.components[prefix+'_CV_IN>'+prefix+'_CV_OUT'] = {id:'CV'+n,type:'check'};
    H.components[prefix+'_VO_IN>'+prefix+'_VO_OUT'] = {id:'V'+n+'O',type:'valve',state:'open'};
    if(i===1) {
      H.routes['P_SUC>'+prefix+'_VI_IN'] = [[6.3,0.95,z]];
      H.routes[prefix+'_VO_OUT>P_DIS'] = [[8.6,0.95,z]];
    }
    [6.3,8.6].forEach(function(x){H.supports.push({x:x,z:z,h:0.90,arms:[]});});
  });
  edge('P_DIS','FS_IN','hot');
  H.topology.pumpDesign = {
    arrangement:'1 duty + 1 standby; each sized later for full design flow/head',
    proposed:true, automaticTransfer:'requires selected controls, feedback and site testing',
    commonFlowProof:'FS01', commonExpansionConnection:'T1',
    noFlow:'heating inhibited; restart/permissives to be engineered',
    commonCauseLimits:'power, controls, water and shared hydraulic path are not redundant'
  };

  var branchKeys = {};
  var consumerXs = [];
  for (var i = 1; i <= 6; i++) {
    var x = 11.5 + (i - 1) * 1.1;
    consumerXs.push(x);
    P['S' + i] = [x, supplyY, 0.75];
    P['R' + i] = [x, returnY, -0.15];
    P['SV' + i + '_IN'] = [x, supplyY, 0.35];
    P['SV' + i + '_OUT'] = [x, supplyY, 0.05];
    P['RV' + i + '_IN'] = [x, returnY, -0.65];
    P['RV' + i + '_OUT'] = [x, returnY, -0.35];
    P['EXT_S' + i] = [x, supplyY, wallZ - 0.65];
    P['EXT_R' + i] = [x, returnY, wallZ - 0.65];
    edge(i === 1 ? 'SUPPLY' : 'S' + (i - 1), 'S' + i, 'hot');
    edge('R' + i, i === 1 ? 'RET_HEAD' : 'R' + (i - 1), 'ret');
    [['S' + i, 'SV' + i + '_IN', 'hot'], ['SV' + i + '_IN', 'SV' + i + '_OUT', 'hot'],
      ['SV' + i + '_OUT', 'EXT_S' + i, 'hot'], ['EXT_R' + i, 'RV' + i + '_IN', 'ret'],
      ['RV' + i + '_IN', 'RV' + i + '_OUT', 'ret'], ['RV' + i + '_OUT', 'R' + i, 'ret']].forEach(function (e) {
      edge(e[0], e[1], e[2]); branchKeys[e[0] + '>' + e[1]] = true;
    });
    H.components['SV' + i + '_IN>SV' + i + '_OUT'] = { id: 'SV' + i, type: 'valve', state: 'open' };
    H.components['RV' + i + '_IN>RV' + i + '_OUT'] = { id: 'RV' + i, type: 'valve', state: 'open' };
    H.objects.push({ id: 'END_S' + i, type: 'openEnd', port: 'EXT_S' + i, kind: 'hot', dir: [0, 0, -1] });
    H.objects.push({ id: 'END_R' + i, type: 'openEnd', port: 'EXT_R' + i, kind: 'ret', dir: [0, 0, 1] });
    H.terminals['EXT_S' + i] = 'END_S' + i;
    H.terminals['EXT_R' + i] = 'END_R' + i;
  }
  H.topology.portIds = Object.keys(P);
  var sourceStyle = H.edgeStyle;
  H.edgeStyle = function (key, kind) {
    return branchKeys[key] ? { size: 'branch', arrows: true } : sourceStyle(key, kind);
  };

  // Retain boiler-room supports; replace the former consumer rack supports.
  H.supports = H.supports.filter(function (s) { return s.x < 10.6; });
  [10.9, 12.05, 14.25, 16.45, 17.0].forEach(function (x) {
    H.supports.push({ x: x, z: -0.85, h: returnY - 0.05,
      arms: [[supplyY - 0.05, x - 0.04, x + 0.04, -0.85, 0.8],
        [returnY - 0.05, x - 0.04, x + 0.04, -0.85, -0.10]] });
  });
  consumerXs.forEach(function (x) {
    H.supports.push({ x: x - 0.15, z: -2.25, h: returnY - 0.035,
      arms: [[supplyY - 0.035, x - 0.15, x + 0.04, -2.3, -2.2],
        [returnY - 0.035, x - 0.15, x + 0.04, -2.3, -2.2]] });
  });

  // Keep the detailed expansion/makeup annotations, isolated to their closeup.
  H.labels = H.labels.filter(function (l) { return l.v.indexOf('exp') >= 0; }).map(function (l) {
    return Object.assign({}, l, { v: ['exp'] });
  });
  function label(t, at, color, views, direction, sub) {
    H.labels.push({ t: t, s: sub || '', at: at, c: color || 'tag', p: 1,
      v: views || ['iso', 'jacket'], d: direction || 'n', o: 0 });
  }
  consumerXs.forEach(function (x, i) { label('צרכן ' + (i + 1), [x, 2.95, wallZ + 0.12], 'note', ['iso', 'jacket'], 'n'); });
  label('P01A', [7.3, 1.5, 0.75], 'hot', ['pump'], 'n');
  label('P01B', [7.3, 1.5, 1.65], 'hot', ['pump'], 's');
  label('סחרור 1+1', [7.3, 0.95, 1.2], 'hot', ['iso'], 'n');
  label('אל־חוזר בכל ענף', [7.89, 0.95, 1.2], 'hot', ['pump'], 'ne');
  label('FS01 · אישור זרימה משותף', [9.1, 1.13, 0.75], 'tag', ['pump'], 'ne');
  label('T1 · מכל לפני המשאבות', P.T1, 'tag', ['pump'], 'nw');
  H.views.pump = {title:'סחרור 1+1 · עובדת וגיבוי',ortho:true,yaw:12,pitch:36,box:[[5.9,0,0.3],[9.8,3.0,2.1]],margin:0.12};
  label('דוד חשמלי', [1.8, 2.6, 0.6], 'tag', ['iso'], 'nw');
  label('מכל התפשטות', [5.2, 0.65, 1.15], 'tag', ['iso'], 's');
  label('טיפול במים והשלמה', [8.2, 1.25, 2.6], 'fill', ['iso'], 's');
  label('סעפת אספקה', [14.25, supplyY, 0.75], 'hot', ['iso', 'jacket'], 's');
  label('סעפת חזרה', [14.25, returnY, -0.15], 'ret', ['iso', 'jacket'], 'n');
  H.views.iso = { title: 'חדר הדוד · מבט כללי', ortho: true, yaw: 22, pitch: 25,
    box: [[-0.8, 0, -3.6], [18.4, 4.2, 3.8]], margin: 0.04 };
  H.views.jacket = { title: 'צרכנים 1–6 · יציאה וחזרה דרך הקיר', ortho: true, yaw: 18, pitch: 25,
    box: [[10.4, 0, -3.6], [17.8, 3.7, 1.3]], margin: 0.08 };

  // Cutaway room. Twelve physical wall penetrations, no off-page bypass.
  var baseObjects = H.buildObjects;
  H.buildObjects = function (b) {
    baseObjects(b);
    b.use('base').paint(M.hex('#e2e8ed'), 1, 0.1);
    function backBlock(x0, x1, y0, y1) {
      b.box([x0, y0, wallZ - 0.15], [x1, y1, wallZ + 0.04]);
    }
    backBlock(-0.65, 11.25, 0, 4.1);
    var last = 11.25, halfHole = 0.17;
    consumerXs.forEach(function (x) {
      backBlock(last, x - halfHole, 0, 4.1);
      backBlock(x - halfHole, x + halfHole, 0, supplyY - halfHole);
      backBlock(x - halfHole, x + halfHole, supplyY + halfHole, returnY - halfHole);
      backBlock(x - halfHole, x + halfHole, returnY + halfHole, 4.1);
      last = x + halfHole;
    });
    backBlock(last, 18, 0, 4.1);
    // Left wall with a doorway; front and right wall cut low for visibility.
    b.paint(M.hex('#d4dde5'), 1, 0.1);
    b.box([-0.8, 0, wallZ], [-0.64, 4.1, 0.65]);
    b.box([-0.8, 2.65, 0.65], [-0.64, 4.1, 2.25]);
    b.box([-0.8, 0, 2.25], [-0.64, 4.1, 3.8]);
    b.box([17.9, 0, wallZ], [18.05, 0.23, 3.8]);
    b.paint(M.hex('#afbbc7'), 1, 0.2);
    b.box([-0.8, -0.1, wallZ - 0.16], [18.05, -0.012, 3.8]);
    // Penetration sleeves make it clear that the lines pass through the wall.
    consumerXs.forEach(function (x) {
      [supplyY, returnY].forEach(function (y) {
        b.paint(M.hex('#7f8f9d'), 1, 0.3);
        b.tubeSector([x, y, wallZ - 0.16], [x, y, wallZ + 0.08], 0.095, 0.13, 0, Math.PI * 2, [1, 0, 0], 24);
      });
    });
    // The header ends are closed; only the six branches continue to consumers.
    [['S6', 'hot'], ['R6', 'ret']].forEach(function (q) {
      var p = P[q[0]];
      b.paint(M.hex('#687c8d'), 1, 0.5);
      b.cylinder([p[0] + 0.05, p[1], p[2]], [p[0] + 0.07, p[1], p[2]], 0.075, { segs: 24 });
      b.paint(H.kindColor(q[1]), 1, 0.4);
      b.cylinder(p, [p[0] + 0.05, p[1], p[2]], 0.05, { segs: 24 });
    });
  };
  H.buildFloor = function (b) {
    b.use('floor').paint(M.hex('#f1f4f6'), 1, 0);
    b.fan([[-0.64, -0.01, wallZ], [-0.64, -0.01, 3.8], [17.9, -0.01, 3.8], [17.9, -0.01, wallZ]], [0, 1, 0]);
  };
})(window);

// R2 PRESSURE REVISION START — applied after the preserved base and R1 scene below.
// The function is invoked at the end so the R1 initialization cannot overwrite it.
window.applyBoilerR2 = function () {
  'use strict';
  var H=window.HE3D,P=H.ports,C=H.components;
  function edge(a,b,k,state,label){H.topology.edges.push([a,b,k,state||'open',label||null]);}
  H.topology.edges=H.topology.edges.filter(function(e){return !(e[0]==='FS_OUT'&&e[1]==='TT_TAP');});
  delete H.routes['FS_OUT>TT_TAP'];
  P.PT02_TAP=[9.65,0.95,0.75];P.PT02=[9.65,1.38,0.75];
  edge('FS_OUT','PT02_TAP','hot');edge('PT02_TAP','TT_TAP','hot');edge('PT02_TAP','PT02','hot');
  H.objects.push({id:'PT02',type:'instrument',port:'PT02',style:'transmitter',status:'proposed unwired supply transmitter'});H.terminals.PT02='PT02';
  function relief(id,root,pi,po,pe,via,scope){
    P[id+'_IN']=pi;P[id+'_OUT']=po;P[id+'_END']=pe;
    edge(root,id+'_IN','drain');edge(id+'_IN',id+'_OUT','drain','relief',id);edge(id+'_OUT',id+'_END','drain');
    C[id+'_IN>'+id+'_OUT']={id:id,type:'psv',state:'relief',setPressure:null,certifiedCapacity:null,status:'proposed; qualification pending',protectedZone:scope};
    H.routes[id+'_OUT>'+id+'_END']=via;
    H.objects.push({id:'END_'+id,type:'openEnd',port:id+'_END',kind:'drain',dir:[0,-1,0]});H.terminals[id+'_END']='END_'+id;
    H.topology.dischargeInterfaces.push({id:'RCV_'+id,from:id+'_END',airGap:true,pressurizedConnection:false,destination:'dedicated safe receptor; capacity, temperature, backpressure and supports unselected'});
  }
  relief('PSV02','T2',[5.55,2,1],[5.82,2,1],[6.05,0.25,2.0],[[6.05,2,1],[6.05,2,2.0]],'makeup/base loop at T2, system side of VET; available with pump branches isolated');
  relief('PSV03','SUPPLY',[10.6,1.61,0.75],[10.6,1.87,0.75],[10.2,0.25,1.9],[[10.6,1.87,1.9],[10.2,1.87,1.9]],'common supply after pump checks and before SV1–6; not isolated remote jackets');
  H.supports.push({x:6.05,z:2.0,h:1.9,arms:[]},{x:10.2,z:1.9,h:1.78,arms:[]});
  H.topology.revision='v4.2 / R2';H.topology.source='selected Claude room / v4.2 R2 conceptual correction / no engineering acceptance';
  H.topology.pressureProtection={
    status:'PROPOSED_NOT_QUALIFIED',baseSensor:'PT01',supplySensor:'PT02',
    independentReliefs:[{id:'PSV01',root:'PSV_ROOT',scope:'boiler only'},{id:'PSV02',root:'T2',scope:'makeup/base loop'},{id:'PSV03',root:'SUPPLY',scope:'common supply header'}],
    mainsFailureCase:'PRV1 failed fully open with XV1 open or leaking; CV1 and BF1 do not reduce forward pressure; FQ01 and PLC are not relief protection',
    qualificationRequired:['maximum mains pressure and failed-open inflow','weakest verified allowable pressure and temperature','pump shutoff head and all operating states','local elevations and pressure losses','relieving overpressure, tolerances and certified water capacity','discharge capacity/backpressure','isolated and remotely trapped volumes'],
    setpoints:null,capacity:null,remoteProtectionProved:false,
    alternatives:'If direct-feed pressure envelope cannot be qualified, assess pressure-decoupled supply/break tank or separate low-pressure heat-exchanger circuit; no selection made',
    reference:'../concept-notes-he.html'
  };
  H.topology.engineeringHolds.R3.pressureRevision='N1/N2: PSV02 at T2, PSV03 common supply and PT02 proposed; qualification, local jacket pressure and remote isolated thermal relief remain OPEN';
  H.topology.engineeringHolds.N4={status:'OPEN',topic:'Selected boiler manufacturer must approve hot-stop and residual-cooling sequence; HMI conservative pressure-unknown/high stop is not a certified physical sequence'};
  H.topology.engineeringHolds.N5={status:'OPEN',topic:'Fill pressure/time/volume/cycle limits, safety qualification, instrumentation and operator procedure require engineering configuration; default disabled'};
  H.topology.engineeringHolds.N7={status:'OPEN',topic:'Automatic heat recovery not selected; interim manual reset and new heat request after verified standby; allowed chocolate cooling time missing'};
  H.topology.fillDesign={mode:'supervised bounded cold refill; explicit operator request',default:'disabled/unconfigured',
    startRequires:['approved procedure and configured pressure/time/volume/cycle limits','qualified independent relief protection and safe drains','independent cold-fill permit','heat off feedback','both pumps stopped feedback and stop commands','PT01 valid low/permitted','PT02 valid permitted','valid FQ01 and closed XV1 feedback'],
    closeOn:['target reached','time/volume/cycle limit','high or invalid pressure','meter/valve fault','unexpected flow','lost permit/link'],
    completion:'closed valve feedback AND no makeup flow; no automatic retry',
    recovery:'find cause; repair leak if present; verify water by LW_B01 independently; manufacturer local reset; acknowledge/reset appropriate latches; new pump/run/flow/heat requests',
    productionAutomation:'May be designed after data and safety approval; low pressure alone never authorizes unlimited makeup',numericSettings:null};
  H.topology.dosingDesign={permission:['heatPermitted','approved chemistry','valid water quality','approved treatment limits'],
    heatPermittedRequires:['eligible pump running feedback','fresh FS01 proof for that pump','safe hydraulic path','valid permitted PT01 and PT02','VET open proof','boiler safety ready','no heat-blocking latches','no fill cycle'],
    actualHeatOnRequired:false,ECandPH:'do not measure inhibitor concentration',productAndDose:'not selected',policy:'conservative concept shared with HMI'};
  H.topology.controlSignals=H.topology.controlSignals.filter(function(q){return q.to!=='DP01_PERMISSION';});
  [['PT01','BASE_PRESSURE_INTERLOCK'],['PT02','SUPPLY_PRESSURE_INTERLOCK']].forEach(function(q){H.topology.controlSignals.push({from:q[0],to:q[1],kind:'proposed_pressure_monitoring',invalid:'heat/fill/dose inhibited; pump stop requested by provisional policy',mechanicalReliefSubstitute:false});});
  ['HEAT_PERMISSION','APPROVED_CHEMISTRY','VALID_WATER_QUALITY','APPROVED_TREATMENT_LIMITS'].forEach(function(q){H.topology.controlSignals.push({from:q,to:'DP01_PERMISSION',kind:'and_permissive',actualHeatOnRequired:false});});
  H.topology.pumpDesign.modePolicy='Standby manual/service removes that pump only; healthy auto duty pump and proven flow remain. Active removal requires stopped-source feedback, new reserve run feedback and fresh common FS proof.';
  H.topology.pumpDesign.heatRecovery='Manual acknowledgement/reset of cleared heat-blocking latch plus new heat request; automatic heat restart pending N7';
  H.topology.operatingNotes.DS01='VDSI/VDSO isolate the entire common return; service only with circulation stopped, heat isolated, cooled and safely depressurized per manufacturer procedure; no bypass';
  H.topology.portIds=Object.keys(P);
  H.labels.push({t:'PT02',s:'לחץ באספקה אחרי המשאבות · לא הגנת פריקה',at:P.PT02,c:'tag',p:1,v:['pump','exp'],d:'ne',o:0});
  ['PSV02','PSV03'].forEach(function(id){H.labels.push({t:id,s:'שסתום ביטחון מוצע · לחץ וכושר פריקה טרם נקבעו',at:P[id+'_IN'],c:'drain',p:1,v:['exp'],d:'e',o:0});});
  H.views.exp.title='מכל, השלמה והגנות לחץ · v4.2/R2';H.views.exp.box=[[4.35,0,0],[11.05,3.25,3.45]];
};

// v4.1 / R1: proposed serviceability, balancing and independent protection detail.
// No operating setpoints, selected models or engineering acceptance are implied.
(function (root) {
  'use strict';
  var H=root.HE3D, P=H.ports, M=H.M, C=H.components, E=H.topology.edges;
  function add(a,b,kind,state,label){E.push([a,b,kind,state||'open',label||null]);}
  function remove(a,b){var k=a+'>'+b;H.topology.edges=E=E.filter(function(e){return e[0]+'>'+e[1]!==k;});delete H.routes[k];delete C[k];}
  function valve(id,a,b,kind,state){add(a,b,kind,state||'open',id);C[a+'>'+b]={id:id,type:'valve',state:state||'open'};}
  function end(id,port,kind,dir){H.objects.push({id:id,type:'openEnd',port:port,kind:kind,dir:dir||[0,-1,0]});H.terminals[port]=id;}
  function lab(t,at,views,sub,color,d){H.labels.push({t:t,s:sub||'',at:at,c:color||'tag',p:1,v:views,d:d||'n',o:0});}
  H.topology.revision='v4.1 / R1';
  H.topology.source='selected Claude room / v4.1 R1 proposed correction / no engineering acceptance';
  H.topology.serviceBranches=[];
  H.topology.dischargeInterfaces=[];
  H.topology.vesselConnections={B01:['B_IN','B_OUT','PSV_ROOT','B_DRAIN'],AS:['AS_IN','AS_OUT','AIR'],DS01:['RET_LEFT','DS_OUT','DS_PURGE_ROOT']};
  H.topology.signalNodes={
    THH_B01:{type:'independent_high_temperature_limit',at:[2.12,2.4,0.58],reset:'manual local',status:'proposed/unconnected'},
    LW_B01:{type:'independent_low_water_protection',at:[2.02,1.9,0.62],basis:'selected boiler manufacturer; not inferred from low pressure',status:'proposed/unconnected'},
    K_HEAT:{type:'hardwired_power_contactor_trip',at:[2.35,1.55,0.7],independentOf:['HMI','process PLC'],status:'proposed/unconnected'},
    ZSO_VET:{type:'open_position_proof',at:[5.34,1.76,1.0],heatPermission:'blocked when unknown or closed',mechanicalLock:'locked open in normal operation',status:'proposed/unconnected'}
  };
  H.topology.controlSignals=[
    {from:'THH_B01',to:'K_HEAT',kind:'hardwired_trip',reset:'manual local'},
    {from:'LW_B01',to:'K_HEAT',kind:'hardwired_trip',reset:'manufacturer procedure'},
    {from:'ZSO_VET',to:'HEAT_PERMISSION',kind:'open_position_permissive',unknown:'block heat'},
    {from:'FS01',to:'DP01_PERMISSION',kind:'flow_proof'},
    {from:'P01A/P01B_RUN_FEEDBACK',to:'DP01_PERMISSION',kind:'running_feedback'},
    {from:'APPROVED_TREATMENT_LIMITS',to:'DP01_PERMISSION',kind:'qualified_treatment_permissive'}
  ];
  H.topology.engineeringHolds={
    R2:{status:'OPEN',topic:'Minimum flow architecture unselected',requires:['boiler Qmin','pump Qmin','branch closure profile','cool-down requirements','pump and system delta-P curves'],noBypassAdded:true,zeroFlow:'block heat and dose; stop pumps when zero-flow/deadhead/dry operation is unsafe; inhibit repeated standby attempts on common hydraulic fault; exact sequence/timing subject to selected equipment. On overtemperature, residual circulation is conditional on safe hydraulics.'},
    R3:{status:'OPEN',topic:'Pressure envelope and isolated-section protection',requires:['weakest allowable pressure/temperature','static height','dynamic pressure','isolation and trapped thermal expansion'],boilerPSVNotSoleJacketProtection:true,fieldInput:{id:'UNVERIFIED_JACKET_PRESSURE',reportedValue:2,unit:'bar',status:'UNVERIFIED',source:'Technician-reported jacket pressure; no equipment document; unverified',pressureReference:null,classification:null,appliesToAllSix:null,temperatureBasis:null,designValue:false,setpoints:null,record:'../concept-notes-he.html#pressure'},assessment:'../concept-notes-he.html#pressure',protectionRequires:'local pressure incl elevation, pump, transients, tolerances and full-capacity relieving pressure; nominal 2 bar setpoint is not proof',alternativesSelected:false},
    R12:{status:'OPEN',inlineAlternative:'qualified inline treatment if suitable',ROAlternative:'optional RO with storage and repressurization when required by selected equipment; neither RO nor a buffer is universal'},
    R13:{status:'OPEN',topic:'Backflow assembly risk classification and approved selection',conditionalDischarge:'If selected device has relief discharge, provide approved air-gap disposal; type not selected'},
    R18:{status:'OPEN',topic:'Discharge destinations/capacity/backpressure and floor drainage'},
    R20:{status:'OPEN',topic:'Expansion-vessel orientation, water drainability and installation per selected model'},
    R22:{status:'OPEN',topic:'TT-P external product-temperature interface with process technologist; not drawn as factory equipment'}
  };
  H.topology.pumpDesign.noFlow=H.topology.engineeringHolds.R2.zeroFlow;
  H.topology.pumpDesign.minimumFlowArchitecture='OPEN; no arbitrary bypass';
  H.topology.dosingDesign={permission:['proven FS01','pump running feedback','approved treatment limits'],ECandPH:'do not measure inhibitor concentration',productAndDose:'not selected'};
  H.topology.treatmentAlternatives={activeGraph:'WT1 qualified interface only, not an installed RO internals diagram',alternatives:[{id:'WT_INLINE',label:'qualified inline treatment'},{id:'WT_RO',label:'optional RO',conditionalItems:['storage when needed','repressurization when needed','reject discharge with approved destination']}],notSimultaneous:true};
  H.topology.operatingNotes={boilerIsolation:'VB01I/VB01O only under deenergization/LOTO; isolated boiler disconnected from expansion vessel; PSV stays on boiler side',VET:'נעול פתוח בהפעלה רגילה; סגירה רק לתחזוקת המכל עם חימום חסום',DVET:'סגור בהפעלה רגילה',ET:'מכל כללי; כיוון חיבור ויכולת ניקוז לפי הדגם שייבחר'};

  // Boiler isolation does not intercept the boiler-side safety relief connection.
  remove('B_OUT','AS_IN');P.VB01O_IN=[2.72,2.6,0];P.VB01O_OUT=[2.94,2.6,0];
  add('B_OUT','VB01O_IN','hot');valve('VB01O','VB01O_IN','VB01O_OUT','hot');add('VB01O_OUT','AS_IN','hot');
  remove('DOSE_T','RET_LEFT');remove('DS_OUT','B_IN');
  P.RET_LEFT=[4.8,0.55,0];P.DS_OUT=[4.2,0.55,0];
  P.VDSI_IN=[5.5,0.55,0];P.VDSI_OUT=[5.25,0.55,0];
  P.VDSO_IN=[3.95,0.55,0];P.VDSO_OUT=[3.72,0.55,0];
  P.VB01I_IN=[3.25,0.55,0];P.VB01I_OUT=[3.03,0.55,0];
  add('DOSE_T','VDSI_IN','ret');valve('VDSI','VDSI_IN','VDSI_OUT','ret');add('VDSI_OUT','RET_LEFT','ret');
  add('DS_OUT','VDSO_IN','ret');valve('VDSO','VDSO_IN','VDSO_OUT','ret');add('VDSO_OUT','VB01I_IN','ret');
  valve('VB01I','VB01I_IN','VB01I_OUT','ret');add('VB01I_OUT','B_IN','ret');

  // Every service discharge has an independent end; receivers are NOT hydraulic graph edges.
  function service(id,rootPort,kind,positions,role,conditional){
    var a=id+'_IN',b=id+'_OUT',t=id+'_END';P[a]=positions[0];P[b]=positions[1];P[t]=positions[2];
    add(rootPort,a,kind);valve(id,a,b,kind,'closed');add(b,t,kind);end('END_'+id,t,kind);
    C[a+'>'+b].conditional=!!conditional;
    H.topology.serviceBranches.push({id:id,root:rootPort,inlet:a,outlet:b,end:t,role:role,conditional:!!conditional,normalState:'closed'});
    H.topology.dischargeInterfaces.push({id:'RCV_'+id,from:t,airGap:true,pressurizedConnection:false,destination:'engineer to select; floor receiver interface only'});
  }
  P.B_DRAIN=[1.8,0.18,0];H.terminals.B_DRAIN='B01';
  service('DB01','B_DRAIN','drain',[[1.8,0.18,0.32],[1.8,0.18,0.54],[1.8,0.15,0.78]],'boiler bottom drain; deenergize and LOTO',false);
  P.DS_PURGE_ROOT=[4.5,0.16,0];H.terminals.DS_PURGE_ROOT='DS01';
  service('DDS01','DS_PURGE_ROOT','drain',[[4.5,0.16,-0.22],[4.5,0.16,-0.42],[4.5,0.12,-0.62]],'DS01 sludge purge; selected manufacturer procedure',false);
  ['A','B'].forEach(function(s,i){
    var pre='P01'+s,z=i?1.65:0.75;
    service('DP'+s+'1',pre+'_OUT','drain',[[7.6,0.64,z],[7.6,0.44,z],[7.6,0.2,z]],'isolated pump cavity / upstream side of discharge check; full drainability per manufacturer',false);
    service('DP'+s+'2',pre+'_CV_OUT','drain',[[8.0,0.64,z],[8.0,0.44,z],[8.0,0.2,z]],'trapped section downstream of discharge check before outlet isolation',false);
    service('VP'+s,pre+'_IN','drain',[[7.0,1.18,z],[7.0,1.36,z],[7.0,1.50,z]],'pump vent connection per selected pump manufacturer',true);
  });
  service('DH_S','S6','drain',[[17,0.92,0.75],[17,0.70,0.75],[17,0.25,0.75]],'supply header end drain; real slopes/low points to confirm',false);
  service('DH_R','R6','drain',[[17,1.93,-0.15],[17,1.73,-0.15],[17,0.25,-0.15]],'return header end drain; real slopes/low points to confirm',false);
  service('DR_LOW','RET_T','drain',[[10.2,0.38,0],[10.2,0.22,0],[10.2,0.12,-0.25]],'low common return drain',false);
  service('VH_S','S6','drain',[[17,1.55,0.75],[17,1.73,0.75],[17,1.88,0.75]],'supply header high-point vent; real slopes to confirm',false);
  service('VH_R','R6','drain',[[17,2.52,-0.15],[17,2.7,-0.15],[17,2.85,-0.15]],'return header high-point vent',false);
  remove('T1','P_SUC');P.P_HI=[6.3,2.6,0.75];add('T1','P_HI','hot');H.routes['T1>P_HI']=[[6.3,2.6,0]];add('P_HI','P_SUC','hot');
  service('VH_P','P_HI','drain',[[6.3,2.82,0.75],[6.3,3.0,0.75],[6.3,3.14,0.75]],'high point before downleg to pump suction',false);

  // Six balancing valves with two capped test points, separate return isolation and TT.
  for(var n=1;n<=6;n++){
    var x=P['R'+n][0],pre='BV'+n;
    remove('EXT_R'+n,'RV'+n+'_IN');
    P['TR'+n+'_TAP']=[x,2.3,-2.1];P['TT_R'+n]=[x,2.58,-2.1];
    P[pre+'_IN']=[x,2.3,-1.75];P[pre+'_OUT']=[x,2.3,-1.38];
    P[pre+'_P1']=[x+0.13,2.48,-1.75];P[pre+'_P2']=[x+0.13,2.48,-1.38];
    add('EXT_R'+n,'TR'+n+'_TAP','ret');add('TR'+n+'_TAP',pre+'_IN','ret');add(pre+'_IN',pre+'_OUT','ret','open',pre);
    C[pre+'_IN>'+pre+'_OUT']={id:pre,type:'balancingValve',testPoints:[pre+'_P1',pre+'_P2'],setting:'unselected'};
    add(pre+'_OUT','RV'+n+'_IN','ret');add('TR'+n+'_TAP','TT_R'+n,'ret');
    add(pre+'_IN',pre+'_P1','ret');add(pre+'_OUT',pre+'_P2','ret');
    H.objects.push({id:'TT_R'+n,type:'instrument',port:'TT_R'+n,style:'temp',status:'proposed unwired transmitter'});H.terminals['TT_R'+n]='TT_R'+n;
    [pre+'_P1',pre+'_P2'].forEach(function(p){H.objects.push({id:p,type:'instrument',port:p,style:'testpoint'});H.terminals[p]=p;});
    lab('BV'+n+' · TT_R'+n,[x,2.55,-1.5],['jacket'],'איזון ומדידת חזרה · ערכים לא נקבעו','ret','s');
  }
  // Vent/drain color is independent from the blue return-water convention.
  E.forEach(function(e){if(e[0]==='AIR'&&e[1]==='VENT')e[2]='drain';});
  P.VENT_OUT=[3.4,3.44,-0.12];P.VENT_END=[3.05,0.32,-0.8];
  add('VENT','VENT_OUT','drain','automatic_vent','AS air release');add('VENT_OUT','VENT_END','drain');
  H.routes['VENT_OUT>VENT_END']=[[3.05,3.44,-0.8]];end('END_VENT','VENT_END','drain');delete H.terminals.VENT;
  ['PSV_DISCHARGE','ET_DRAIN','SAMPLE_DRAIN','VENT_END'].forEach(function(p){H.topology.dischargeInterfaces.push({id:'RCV_'+p,from:p,airGap:true,pressurizedConnection:false,destination:'final destination, capacity and permitted backpressure unselected'});});
  H.topology.conditionalInterfaces=[{id:'BF1_RELIEF',owner:'BF1',condition:'selected backflow device has relief port',airGap:true,graphEdge:false,destination:'approved receptor; exact type and risk approval pending'},{id:'TT-P',owner:'external consumer',condition:'future process interface, no plant geometry',graphEdge:false,status:'unconnected'}];
  C['WT1_IN>WT1_OUT'].definition='qualified treatment interface; alternatives separate from active graph';
  C['WT1_IN>WT1_OUT'].alternatives=['inline treatment if qualified','RO plus storage/repressurization as required'];
  C['BF1_IN>BF1_OUT'].selection='risk classification and approved device type pending';

  // These proposed hardwired signals are distinct from the hydraulic graph.
  H.signals.push({id:'SIG_THH_B01',from:'THH_B01',to:'K_HEAT',proposed:true,arrow:true,path:[[2.12,2.4,0.58],[2.35,2.4,0.7],[2.35,1.55,0.7]]});
  H.signals.push({id:'SIG_LW_B01',from:'LW_B01',to:'K_HEAT',proposed:true,arrow:true,path:[[2.02,1.9,0.62],[2.35,1.9,0.7],[2.35,1.55,0.7]]});
  H.signals.push({id:'SIG_ZSO_VET',from:'ZSO_VET',to:'HEAT_PERMISSION',proposed:true,arrow:true,path:[[5.34,1.76,1.0],[5.55,1.76,1.0],[5.55,0.06,1.0],[10.3,0.06,-0.7],[10.3,0.35,-1.32]]});
  H.topology.portIds=Object.keys(P);
  var oldStyle=H.edgeStyle;
  H.edgeStyle=function(k,kind){var s=oldStyle(k,kind);if(kind==='drain'||/BV\d+_P[12]|TT_R\d+/.test(k))return{size:'small',arrows:kind==='drain'&&k.indexOf('>VENT')<0};return s;};
  H.labels=H.labels.map(function(l){
    var q=Object.assign({},l,{t:l.t.replace(/בשירות|בזמן עבודה/g,'בהפעלה רגילה'),s:(l.s||'').replace(/בשירות|בזמן עבודה/g,'בהפעלה רגילה').replace('לפני המשאבה','לפני היניקה המשותפת').replace('בזמן שירות למכל','בתחזוקת המכל')});
    if(q.t.indexOf('ממברנה')>=0)q.s='חתך עקרוני בלבד; כיוון מים/גז וחיבור לפי הדגם שייבחר';
    if(q.t.indexOf('WT1')>=0)q.s='ממשק לבחירה: טיפול בקו או RO; אגירה והגברת לחץ לפי הצורך במערכת הנבחרת';
    if(q.t.indexOf('BF1')>=0)q.s='בחירה ואישור לפי סיכון; אם יש פתח פריקה נדרש קולט עם פער אוויר';
    return q;
  });
  lab('PSV01',[1.25,3.45,0],['boiler'],'ישירות לדוד ללא ברז בידוד; אינו הגנה יחידה למעטפות','drain','nw');
  lab('VENT / פריקה',[3.05,3.44,-0.8],['boiler'],'שחרור אוויר/מים לקולט נפרד; יעד ולחץ נגדי בתכן','drain','n');
  lab('VB01O / VB01I',[2.9,1.6,0],['boiler'],'בידוד רק בדוד מנותק מחשמל ובנוהל נעילה','warn','e');
  lab('K_HEAT',[2.35,1.55,0.7],['boiler'],'ניתוק כוח עצמאי · חיווט מוצע לבדיקה','warn','e');
  lab('DB01',[1.8,0.22,0.64],['boiler'],'ניקוז תחתון · הדוד המבודד מנותק ממכל ההתפשטות','drain','s');
  lab('THH_B01 / LW_B01',[2.12,2.4,0.58],['boiler'],'הגנות עצמאיות → K_HEAT; חוסר מים אינו נלמד מלחץ נמוך','warn','ne');
  lab('VDSI / DS01 / VDSO',[4.5,0.85,0],['boiler'],'בידוד ופינוי משקעים DDS01 לפי יצרן','ret','n');
  lab('ZSO_VET',[5.34,1.76,1],['exp'],'משוב פתוח מוצע · לא ידוע/סגור חוסם חימום','warn','e');
  lab('ET01 · מכל כללי',[5.2,0.65,1.15],['exp'],'כיוון חיבור ויכולת ניקוז לפי הדגם שייבחר','note','sw');
  lab('DPA1 / DPA2 · DPB1 / DPB2',[7.8,0.48,1.2],['pump'],'ניקוז משני צדי האל־חוזר; אוורור משאבה לפי דגם','drain','s');
  lab('VH_P',[6.3,3.0,0.75],['pump'],'שחרור אוויר בנקודה הגבוהה','drain','nw');
  lab('DH_S / DH_R · VH_S / VH_R',[17,1.4,0.3],['jacket'],'ניקוזים ושחרור אוויר בקצות הסעפות','drain','e');
  lab('תכנון ספיקה מזערית טרם הוכרע',[8.7,2.15,1.7],['pump'],'אין מעקף שנבחר · אין זרימה: חסימות ועצירה לפי רצף שיתוכנן','warn','e');
  H.views.boiler={title:'דוד · בידוד, ניקוז והגנות',ortho:true,yaw:8,pitch:22,box:[[0,0,-1.1],[6.0,3.9,1.4]],margin:0.08};
  H.views.pump={title:'סחרור 1+1 · שירות וספיקה מזערית פתוחה לתכן',ortho:true,yaw:12,pitch:30,box:[[5.8,0,0.25],[10.0,3.4,2.1]],margin:0.08};
  H.views.exp={title:'מכל והשלמה · v4.1/R1',ortho:true,yaw:-10,pitch:22,box:[[4.35,0,0],[10.55,3.25,3.45]],margin:0.03};
  H.topology.serviceAccess='Actual motor/heater removal, valve/purge access and electrical-panel clearances require dimensioned design; model is not to scale';
  var build=H.buildObjects;
  H.buildObjects=function(b){
    build(b);
    // Separate unpressurized collection interfaces with visible air gaps.
    H.topology.dischargeInterfaces.forEach(function(q){var p=P[q.from];b.use('base').paint(M.hex('#958567'),1,0.25);b.box([p[0]-0.12,0.012,p[2]-0.12],[p[0]+0.12,0.032,p[2]+0.12]);b.paint(M.hex('#303d44'),1,0.2);for(var j=-2;j<=2;j++)b.box([p[0]-0.1,0.034,p[2]+j*0.035-0.006],[p[0]+0.1,0.04,p[2]+j*0.035+0.006]);});
    // Bottom-nozzle stubs and a proposed mechanical-position feedback housing.
    b.paint(H.kindColor('drain'),1,0.5);b.cylinder([1.8,0.24,0],P.B_DRAIN,0.025,{segs:12});b.cylinder([4.5,0.20,0],P.DS_PURGE_ROOT,0.025,{segs:12});
    b.pickId='K_HEAT';
    b.paint(M.hex('#61798a'),1,0.4);b.boxC([2.35,1.55,0.7],[0.17,0.24,0.12]);
    b.pickId='ZSO_VET';
    b.paint(M.hex('#61798a'),1,0.4);b.boxC([5.34,1.76,1.0],[0.13,0.12,0.10]);b.cylinder([5.2,1.76,1.0],[5.34,1.76,1.0],0.014,{segs:10});
    b.pickId=null;
  };
})(window);
window.applyBoilerR2();
