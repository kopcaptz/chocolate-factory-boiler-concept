// HE-BOILER-3D-V3 — editable 3D scene source (part 2: equipment, nozzles, signals).
// Equipment bodies are illustrative shapes, not selected models. No ratings, sizes,
// brands or set-points are implied. Nozzle positions are computed from each object's
// parameters; tools/check-topology.mjs verifies that every terminal port of v3 sits
// exactly on such a physical opening.
(function (root) {
  var HE3D = (root.HE3D = root.HE3D || {});
  var C = HE3D.C, P = HE3D.ports;

  // ---- stand-alone objects ----------------------------------------------
  var O = [
    { id: 'B01', type: 'boiler', c: [1.8, 0, 0], r: 0.6, y0: 0.3, y1: 2.85, head: 0.2, stub: 0.15,
      side: { B_OUT: C.YS, B_IN: C.YR }, top: { PSV_ROOT: -0.25 }, topStub: 0.068 },
    { id: 'VENT_DEV', type: 'airVent', port: 'VENT' },
    { id: 'ET01', type: 'expansionTank', c: [C.XT, 0, C.ZE], r: 0.3, y0: 0.42, y1: 1.0,
      head: 0.1, stub: 0.08, membraneY: 0.74, cut: true },
    { id: 'U_ET', type: 'union', edge: 'ET_DRAIN_TEE>ET_WATER', t: 0.48 },
    { id: 'TT01', type: 'instrument', port: 'TT01', style: 'temp' },
    { id: 'PI01', type: 'instrument', port: 'PI01', style: 'gauge' },
    { id: 'PT01', type: 'instrument', port: 'PT01', style: 'transmitter' },
    { id: 'TT02', type: 'instrument', port: 'TT02', style: 'temp' },
    { id: 'EC01', type: 'instrument', port: 'EC01', style: 'probe' },
    { id: 'pH01', type: 'instrument', port: 'pH01', style: 'probe' },
    { id: 'END_PSV', type: 'openEnd', port: 'PSV_DISCHARGE', kind: 'drain', dir: [0, -1, 0] },
    { id: 'END_ET_DRAIN', type: 'openEnd', port: 'ET_DRAIN', kind: 'drain', dir: [0, -1, 0] },
    { id: 'END_SAMPLE', type: 'openEnd', port: 'SAMPLE_DRAIN', kind: 'drain', dir: [0, -1, 0] },
    { id: 'SRC_RAW', type: 'source', port: 'RAW', out: [-1, 0, 0] },
    { id: 'CHEM_TANK', type: 'chemTank', c: [9.5, 0, -1.35], r: 0.22, y0: 0.06, y1: 0.8, stub: 0.02, faceDir: [0, 0, 1],
      side: { CHEM_OUT: 0.2 } },
    { id: 'BOUNDARY', type: 'boundary', x: C.XEXT + 0.12, y0: 0, y1: 4.7, z0: -1.3, z1: 2.3,
      ends: { EXT_S: [1, 0, 0], EXT_R: [-1, 0, 0] } },
    { id: 'CTRL', type: 'controlPanel', c: [10.45, 0, -1.5], w: 0.8, h: 1.45, d: 0.35 },
    // magnified, unconnected cross-section exhibit (illustration only, not to scale)
    { id: 'SECTION', type: 'sectionExhibit', c: [18.25, 1.15, 2.1], x0: 17.5, xs: 17.78, x1: 18.95,
      rJ: 0.36, rP: 0.21, rC: 0.18, half: 55, probeX: 17.63 },
    { id: 'TTP', type: 'productProbe', load: 6, x: 16.38 }
  ];

  // ---- inline components: v3 edges whose body is equipment, not plain pipe ----
  var CMP = {
    'AS_IN>AS_OUT': { id: 'AS', type: 'airSeparator', r: 0.16, y0: 2.3, y1: 2.9, stub: 0.06,
      top: { AIR: true } },
    'P_IN>P_OUT': { id: 'P01', type: 'pump' },
    'FS_IN>FS_OUT': { id: 'FS01', type: 'flowSwitch' },
    'VET_IN>VET_OUT': { id: 'VET', type: 'valve', state: 'locked_open' },
    'DVET_IN>DVET_OUT': { id: 'DVET', type: 'valve', state: 'closed' },
    'PSV_IN>PSV_OUT': { id: 'PSV01', type: 'psv' },
    'RET_LEFT>DS_OUT': { id: 'DS01', type: 'dirtSeparator' },
    'V1_IN>V1_OUT': { id: 'V1', type: 'valve', state: 'open' },
    'Y_IN>Y_OUT': { id: 'Y1', type: 'strainer' },
    'BF1_IN>BF1_OUT': { id: 'BF1', type: 'box', size: [0.45, 0.36, 0.3], tone: 'equip', valves: 2 },
    'WT1_IN>WT1_OUT': { id: 'WT1', type: 'box', size: [0.7, 1.1, 0.55], floor: true, tone: 'option' },
    'FQ_IN>FQ_OUT': { id: 'FQ01', type: 'meter' },
    'PRV1_IN>PRV1_OUT': { id: 'PRV1', type: 'prv' },
    'XV1_IN>XV1_OUT': { id: 'XV1', type: 'ctrlValve', state: 'controlled_closed' },
    'CV1_IN>CV1_OUT': { id: 'CV1', type: 'check' },
    'SAMPLE_IN>SAMPLE_OUT': { id: 'AN1', type: 'box', size: [0.3, 0.42, 0.35], tone: 'ghost' },
    'DP_IN>DP_OUT': { id: 'DP01', type: 'dosingPump' },
    'DCV_IN>DCV_OUT': { id: 'DCV', type: 'check' }
  };
  // jacketed pipe sections (loads 1..6) and jacketed tanks (loads 7, 8)
  for (var i = 1; i <= 6; i++) {
    CMP['LOAD' + i + '_IN>LOAD' + i + '_OUT'] = {
      id: 'LOAD' + i, type: 'jacketPipe', axisY: C.LV[i - 1], z: 0, x0: 12.1, x1: 16.2,
      px0: 11.85, px1: 16.55, rJ: 0.105, rP: 0.06, rC: 0.05, noz: C.NOZ,
      cut: i === 6 ? { jx0: 14.9, px0: 15.1, px1: 16.5, half: 50 } : null
    };
  }
  CMP['LOAD7_IN>LOAD7_OUT'] = { id: 'LOAD7', type: 'jacketTank', c: [13.0, 0, C.ZT], r: 0.5,
    rJ: 0.56, y0: 0.35, y1: 1.05, jy0: 0.4, jy1: 0.95, stub: 0.12 };
  CMP['LOAD8_IN>LOAD8_OUT'] = { id: 'LOAD8', type: 'jacketTank', c: [15.4, 0, C.ZT], r: 0.5,
    rJ: 0.56, y0: 0.35, y1: 1.05, jy0: 0.4, jy1: 0.95, stub: 0.12 };

  // ---- owner object of every terminal (degree-1) port --------------------
  var TERM = {
    B_OUT: 'B01', B_IN: 'B01', PSV_ROOT: 'B01', AIR: 'AS', VENT: 'VENT_DEV',
    TT01: 'TT01', PI01: 'PI01', PT01: 'PT01', TT02: 'TT02', EC01: 'EC01', pH01: 'pH01',
    ET_WATER: 'ET01', ET_DRAIN: 'END_ET_DRAIN', PSV_DISCHARGE: 'END_PSV',
    SAMPLE_DRAIN: 'END_SAMPLE', RAW: 'SRC_RAW', CHEM_OUT: 'CHEM_TANK',
    EXT_S: 'BOUNDARY', EXT_R: 'BOUNDARY'
  };

  // ---- computed nozzle positions (physical openings) ---------------------
  function byId(id) {
    for (var k = 0; k < O.length; k++) if (O[k].id === id) return O[k];
    for (var key in CMP) if (CMP[key].id === id) return CMP[key];
    return null;
  }
  function nozzle(objId, portId) {
    var o = byId(objId);
    if (!o) return null;
    switch (o.type) {
      case 'boiler':
        if (o.side[portId] != null) return [o.c[0] + o.r + o.stub, o.side[portId], o.c[2]];
        if (o.top[portId] != null) {
          var dx = o.top[portId];
          var yTop = o.y1 + o.head * Math.sqrt(1 - (dx * dx) / (o.r * o.r));
          return [o.c[0] + dx, +(yTop + o.topStub).toFixed(3), o.c[2]];
        }
        return null;
      case 'expansionTank':
        return portId === 'ET_WATER' ? [o.c[0], o.y1 + o.head + o.stub, o.c[2]] : null;
      case 'airSeparator':
        var a = P.AS_IN, b = P.AS_OUT;
        return portId === 'AIR' ? [(a[0] + b[0]) / 2, +(o.y1 + o.stub + 0.04).toFixed(3), a[2]] : null;
      case 'chemTank':
        var fd = o.faceDir || [0, 0, -1], d = o.r + o.stub;
        return o.side[portId] != null ? [+(o.c[0] + fd[0] * d).toFixed(3), o.side[portId], +(o.c[2] + fd[2] * d).toFixed(3)] : null;
      case 'instrument': case 'openEnd': case 'source': case 'airVent':
        return o.port === portId ? P[portId].slice() : null;
      case 'boundary':
        return o.ends[portId] ? [o.x - 0.12, P[portId][1], P[portId][2]] : null;
      case 'jacketPipe':
        return null;
      case 'jacketTank':
        return null;
    }
    return null;
  }
  // nozzles of loads (inline components) — used by the checker as well
  function loadNozzle(cmp, which) {
    if (cmp.type === 'jacketPipe') {
      return [which === 'IN' ? C.XIN : C.XOUT, +(cmp.axisY + cmp.noz).toFixed(3), cmp.z];
    }
    var c = cmp.c, d = cmp.rJ + cmp.stub;
    return which === 'IN' ? [+(c[0] - d).toFixed(3), 0.5, c[2]] : [+(c[0] + d).toFixed(3), 0.88, c[2]];
  }

  // ---- control signals (dashed, never water) -----------------------------
  var F = 0.03; // floor-level cable route height
  var ZF0 = C.ZF;
  var SIG = [
    { id: 'SIG_PT01', from: 'PT01', label: 'PT01 → בקר המילוי (בארון הבקרה)', arrow: true,
      path: [[6.27, 2.56, C.ZE], [6.45, 2.56, C.ZE], [6.45, F, C.ZE], [6.45, F, -0.7], [10.3, F, -0.7],
        [10.3, F, -1.2], [10.3, 0.35, -1.2], [10.3, 0.35, -1.32]] },
    { id: 'SIG_XV1', from: 'CTRL', label: 'פקודת מילוי', arrow: true,
      path: [[10.85, 0.9, -1.5], [11.0, 0.9, -1.5], [11.0, F, -1.5], [11.0, F, 3.1],
        [6.51, F, 3.1], [6.51, 1.28, 3.1], [6.51, 1.28, ZF0], [6.51, 1.14, ZF0]] },
    { id: 'SIG_TT02', from: 'TT02', path: [[10.2, 0.9, -0.06], [10.2, 0.9, -0.3], [10.2, F, -0.3],
      [10.45, F, -0.3], [10.45, F, -1.2], [10.45, 0.35, -1.2], [10.45, 0.35, -1.32]], arrow: true },
    { id: 'SIG_EC01', from: 'EC01', path: [[9.7, 0.9, -0.06], [9.7, 0.9, -0.3], [9.7, F, -0.3], [10.2, F, -0.3]] },
    { id: 'SIG_pH01', from: 'pH01', path: [[9.2, 0.9, -0.06], [9.2, 0.9, -0.3], [9.2, F, -0.3], [9.7, F, -0.3]] }
  ];


  // ---- supports: everything stands on the floor (y = 0) ---------------------
  // post: {x, z, h, arms: [[top, x0, x1, z0, z1], …]} — an arm is a 40 mm bracket whose top
  // carries a pipe (or clamps a vertical pipe). Checked by tools/check-topology.mjs.
  var SUP = [];
  function post(x, z, h, arms) { SUP.push({ x: x, z: z, h: h, arms: arms || [] }); }
  function arm(top, x, z0, z1, w) { w = w || 0.03; return [top, x - w, x + w, z0, z1]; }
  var SZ = -0.38, RZ = -0.235;
  // supply / return mains (posts behind both mains, brackets under each pipe)
  post(3.4, SZ, 2.21, [arm(2.25, 3.4, SZ, 0.12), arm(0.5, 3.4, SZ, 0.08)]);      // air separator + return
  post(5.9, SZ, 2.51, [arm(2.55, 5.9, SZ, 0.08), arm(0.5, 5.9, SZ, 0.08)]);
  post(7.6, SZ, 0.46, [arm(0.5, 7.6, SZ, 0.08)]);                                   // return behind the pump
  post(9.3, SZ, 0.46, [arm(0.5, 9.3, SZ, 0.08)]);
  post(8.65, 0.75, 0.86, [arm(0.9, 8.65, 0.71, 0.79)]);                              // low supply run
  // supply riser at the rack: post between rack and riser, clamps, top bracket under the tee run
  post(10.6, 0.38, 4.17, [arm(4.25, 10.6, -0.7, 0.64), arm(1.6, 10.6, 0.38, 0.69), arm(2.8, 10.6, 0.38, 0.69)]);
  // rack uprights: header clamps, jacket brackets, low runs, overhead line to the boundary
  var levels = C.LV.map(function (y) { return y - 0.105; });
  post(11.3, RZ, 4.17, [arm(4.25, 11.3, -0.7, -0.2), arm(0.5, 11.3, RZ, 0.06),
    arm(1.4, 11.3, -0.2, -0.05), arm(2.35, 11.3, -0.2, -0.05), arm(3.3, 11.3, -0.2, -0.05)]);
  post(12.9, RZ, 4.17, [arm(4.25, 12.9, -0.7, -0.2), arm(0.5, 12.9, RZ, 0.06), arm(0.83, 12.9, RZ, 0.06)]
    .concat(levels.map(function (t) { return arm(t, 12.9, RZ, 0.06); })));
  post(15.5, RZ, 4.17, [arm(4.25, 15.5, -0.7, -0.2), arm(0.5, 15.5, RZ, 0.06), arm(1.1, 15.5, RZ, 0.06)]
    .concat(levels.map(function (t) { return arm(t, 15.5, RZ, 0.06); })));
  post(17.0, RZ, 4.17, [arm(4.25, 17.0, -0.7, -0.2), arm(0.5, 17.0, RZ, 0.06),
    arm(1.4, 17.0, -0.2, -0.05), arm(2.35, 17.0, -0.2, -0.05), arm(3.3, 17.0, -0.2, -0.05)]);
  post(19.0, -0.6, 4.21, [arm(4.25, 19.0, -0.66, -0.54)]);
  post(18.4, 0, 0.46, [arm(0.5, 18.4, -0.05, 0.05)]);
  post(8.5, -0.55, 0.49, [arm(0.53, 8.5, -0.58, -0.52)]);                             // additive line to the return
  post(16.5, 0.65, 0.805, [arm(0.845, 16.5, 0.62, 0.68)]);                          // tank 8 return run
  // safety-valve discharge, expansion branch, make-up line
  post(0.3, -0.3, 3.3, [arm(3.3, 0.3, -0.3, -0.04), arm(1.2, 0.3, -0.3, -0.04), arm(2.4, 0.3, -0.3, -0.04)]);
  // behind the expansion branch (never in front of ET01): saddle under the run from T1 + clamp
  post(C.XT, 0.5, 2.525, [arm(2.565, C.XT, 0.47, 0.53), [1.92, C.XT - 0.03, C.XT + 0.03, 0.5, C.ZE - 0.035]]);
  post(5.9, 1.6, 1.925, [arm(1.965, 5.9, 1.57, 1.63)]);                                // make-up line to T2
  [10.27, 9.83, 7.1, 6.31].forEach(function (x) { post(x, C.ZF, 0.675, [arm(0.715, x, C.ZF - 0.04, C.ZF + 0.04)]); });
  post(8.9, C.ZF, 0.57); post(9.15, C.ZF, 0.57);                                     // BF1 legs
  post(7.54, C.ZF + 0.625, 0.54); post(7.7, C.ZF + 0.625, 0.54);                     // analyser legs

  HE3D.objects = O;
  HE3D.supports = SUP;
  HE3D.components = CMP;
  HE3D.terminals = TERM;
  HE3D.nozzle = nozzle;
  HE3D.loadNozzle = loadNozzle;
  HE3D.objectById = byId;
  HE3D.signals = SIG;
  if (typeof module !== 'undefined') module.exports = HE3D;
})(typeof window !== 'undefined' ? window : globalThis);
