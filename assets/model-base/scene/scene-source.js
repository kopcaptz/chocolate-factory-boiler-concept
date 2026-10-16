// HE-BOILER-3D-V3 — editable 3D scene source (part 1: ports and pipe routes).
// Units: metres, illustrative only. Axes: X → right, Y → up, Z → towards the viewer.
// Every port id is identical to boiler-workshop-connections-he-v3.json; the topology
// (which port connects to which) comes from topology-v3.js and must not change here.
// Allowed edits: coordinates, heights, angles and the "via" points of a route.
(function (root) {
  var HE3D = (root.HE3D = root.HE3D || {});

  // ---- layout constants -------------------------------------------------
  var YS = 2.6;   // supply main height
  var YR = 0.55;  // common return height
  var YL = 0.95, ZL = 0.75; // low supply run (pump axis on its floor base)
  var ZE = 1.0;   // plane of the expansion assembly (in front of the mains)
  var XT = 5.2;   // T1 / expansion branch x
  var ZF = 2.6;   // make-up train row (front, on the floor)
  var YF = 0.75;  // make-up train axis height
  var XSH = 11.3; // supply header x
  var XRH = 17.0; // return header x
  var LV = [3.75, 3.27, 2.79, 2.31, 1.83, 1.35]; // axis heights of jacketed pipes 1..6
  var TAP = 0.28; // header tap above pipe axis
  var NOZ = 0.19; // jacket nozzle top above pipe axis
  var XIN = 12.35, XOUT = 15.95; // jacket inlet / outlet nozzle x
  var ZT = 1.3;   // jacketed tanks row
  var XEXT = 19.6; // display boundary end points

  var C = { YS: YS, YR: YR, ZE: ZE, XT: XT, ZF: ZF, YF: YF, XSH: XSH, XRH: XRH, LV: LV,
    TAP: TAP, NOZ: NOZ, XIN: XIN, XOUT: XOUT, ZT: ZT, XEXT: XEXT };

  // ---- ports (102, ids from v3) ----------------------------------------
  var P = {
    // boiler and supply main
    B_OUT: [2.55, YS, 0], B_IN: [2.55, YR, 0],
    AS_IN: [3.22, YS, 0], AS_OUT: [3.58, YS, 0], AIR: [3.4, 3.0, 0], VENT: [3.4, 3.32, 0],
    T1: [XT, YS, 0],
    // after T1 the supply drops to floor level: pump on its own base, FS01 and TT01 low,
    // single riser at the rack to the top of the supply header
    P_IN: [7.0, YL, ZL], P_OUT: [7.6, YL, ZL],
    FS_IN: [8.9, YL, ZL], FS_OUT: [9.3, YL, ZL],
    TT_TAP: [10.0, YL, ZL], TT01: [10.0, YL + 0.24, ZL],
    SUPPLY: [10.6, 4.3, 0],
    EXT_S: [XEXT, 4.3, -0.6], EXT_R: [XEXT, YR, 0],
    // safety valve on the boiler (no isolation valve between boiler and PSV01)
    PSV_ROOT: [1.55, 3.1, 0], PSV_IN: [1.25, 3.45, 0], PSV_OUT: [0.95, 3.45, 0],
    PSV_DISCHARGE: [0.3, 0.35, 0],
    // expansion branch from T1 (plane Z = ZE)
    ET_PRESS_TEE: [XT, 2.3, ZE], PI_TAP: [5.7, 2.3, ZE], PT_TAP: [6.2, 2.3, ZE],
    PI01: [5.7, 2.47, ZE], PT01: [6.2, 2.47, ZE],
    T2: [XT, 2.0, ZE],
    VET_IN: [XT, 1.84, ZE], VET_OUT: [XT, 1.62, ZE],
    ET_DRAIN_TEE: [XT, 1.45, ZE], ET_WATER: [XT, 1.18, ZE],
    DRAIN_BRANCH: [4.75, 1.45, ZE], DVET_IN: [4.75, 1.27, ZE], DVET_OUT: [4.75, 1.05, ZE],
    ET_DRAIN: [4.75, 0.55, ZE],
    // common return
    RET_HEAD: [XRH, YR, 0], RET_T: [10.2, YR, 0], RET_EC: [9.7, YR, 0], RET_PH: [9.2, YR, 0],
    TT02: [10.2, 0.8, 0], EC01: [9.7, 0.8, 0], pH01: [9.2, 0.8, 0],
    DOSE_T: [8.5, YR, 0], RET_LEFT: [4.0, YR, 0], DS_OUT: [3.6, YR, 0],
    // jacketed tanks (loads 7, 8)
    S7: [XSH, 1.15, 0], R7: [XRH, 1.15, 0], S8: [XSH, 0.88, 0], R8: [XRH, 0.88, 0],
    LOAD7_IN: [12.32, 0.5, ZT], LOAD7_OUT: [13.68, 0.88, ZT],
    LOAD8_IN: [14.72, 0.5, ZT], LOAD8_OUT: [16.08, 0.88, ZT],
    // make-up train (front row Z = ZF), flowing right → left into T2 as in drawing v3
    RAW: [10.4, YF, ZF], V1_IN: [10.13, YF, ZF], V1_OUT: [9.95, YF, ZF],
    Y_IN: [9.7, YF, ZF], Y_OUT: [9.48, YF, ZF],
    BF1_IN: [9.25, YF, ZF], BF1_OUT: [8.8, YF, ZF],
    WT1_IN: [8.55, YF, ZF], WT1_OUT: [7.85, YF, ZF],
    SAMPLE_TEE: [7.62, YF, ZF], SAMPLE_IN: [7.62, YF, ZF + 0.45], SAMPLE_OUT: [7.62, YF, ZF + 0.8],
    SAMPLE_DRAIN: [7.62, 0.2, ZF + 0.8],
    FQ_IN: [7.42, YF, ZF], FQ_OUT: [7.2, YF, ZF],
    PRV1_IN: [7.0, YF, ZF], PRV1_OUT: [6.82, YF, ZF],
    XV1_IN: [6.6, YF, ZF], XV1_OUT: [6.42, YF, ZF],
    CV1_IN: [6.2, YF, ZF], CV1_OUT: [6.0, YF, ZF],
    // additive dosing (behind the mains, injection into the common return)
    CHEM_OUT: [9.5, 0.2, -1.11], DP_IN: [9.05, 0.55, -0.95], DP_OUT: [8.85, 0.55, -0.95],
    DCV_IN: [8.75, 0.55, -0.95], DCV_OUT: [8.6, 0.55, -0.95]
  };
  // jacketed pipe sections 1..6 and their header taps
  for (var i = 0; i < 6; i++) {
    var n = i + 1, y = LV[i];
    P['S' + n] = [XSH, y + TAP, 0];
    P['R' + n] = [XRH, y + TAP, 0];
    P['LOAD' + n + '_IN'] = [XIN, y + NOZ, 0];
    P['LOAD' + n + '_OUT'] = [XOUT, y + NOZ, 0];
  }

  // ---- routes: intermediate points per edge "A>B" (straight if absent) ----
  var R = {
    'PSV_ROOT>PSV_IN': [[1.55, 3.45, 0]],
    'PSV_OUT>PSV_DISCHARGE': [[0.3, 3.45, 0]],
    'T1>ET_PRESS_TEE': [[XT, YS, ZE]],
    'T1>P_IN': [[6.6, YS, 0], [6.6, YS, ZL], [6.6, YL, ZL]],
    'TT_TAP>SUPPLY': [[10.6, YL, ZL], [10.6, 4.3, ZL]],
    'SUPPLY>S1': [[XSH, 4.3, 0]],
    'SUPPLY>EXT_S': [[10.6, 4.3, -0.6]],
    'S7>LOAD7_IN': [[11.6, 1.15, 0], [11.6, 1.15, ZT], [11.6, 0.5, ZT]],
    'S8>LOAD8_IN': [[14.4, 0.88, 0], [14.4, 0.88, ZT], [14.4, 0.5, ZT]],
    'LOAD7_OUT>R7': [[14.0, 0.88, ZT], [14.0, 1.15, ZT], [14.0, 1.15, 0]],
    'LOAD8_OUT>R8': [[16.5, 0.88, ZT], [16.5, 0.88, 0]],
    'CV1_OUT>T2': [[5.9, YF, ZF], [5.9, 2.0, ZF], [5.9, 2.0, ZE]],
    'CHEM_OUT>DP_IN': [[9.5, 0.2, -0.95], [9.5, 0.55, -0.95]],
    'DCV_OUT>DOSE_T': [[8.5, 0.55, -0.95]]
  };
  for (var j = 0; j < 6; j++) {
    var m = j + 1, yy = LV[j];
    R['S' + m + '>LOAD' + m + '_IN'] = [[XIN, yy + TAP, 0]];
    R['LOAD' + m + '_OUT>R' + m] = [[XOUT, yy + TAP, 0]];
  }

  // ---- per-edge drawing style ---------------------------------------------
  // size: 'main' | 'branch' | 'small'; arrows: draw flow arrows (default true).
  // The expansion branch carries water both ways → no arrows (as in drawing v3).
  var NO_ARROWS = ['T1>ET_PRESS_TEE', 'ET_PRESS_TEE>T2', 'T2>VET_IN', 'VET_OUT>ET_DRAIN_TEE',
    'ET_DRAIN_TEE>ET_WATER', 'ET_PRESS_TEE>PI_TAP', 'PI_TAP>PT_TAP', 'PI_TAP>PI01', 'PT_TAP>PT01',
    'TT_TAP>TT01', 'RET_T>TT02', 'RET_EC>EC01', 'RET_PH>pH01', 'ET_DRAIN_TEE>DRAIN_BRANCH',
    'DRAIN_BRANCH>DVET_IN', 'DVET_OUT>ET_DRAIN', 'AIR>VENT'];
  var SMALL = ['TT_TAP>TT01', 'RET_T>TT02', 'RET_EC>EC01', 'RET_PH>pH01', 'PI_TAP>PI01',
    'PT_TAP>PT01', 'AIR>VENT', 'SAMPLE_TEE>SAMPLE_IN', 'SAMPLE_OUT>SAMPLE_DRAIN',
    'CHEM_OUT>DP_IN', 'DCV_OUT>DOSE_T', 'ET_PRESS_TEE>PI_TAP', 'PI_TAP>PT_TAP'];
  var EXP_BRANCH = ['T1>ET_PRESS_TEE', 'ET_PRESS_TEE>T2', 'T2>VET_IN', 'VET_IN>VET_OUT',
    'VET_OUT>ET_DRAIN_TEE', 'ET_DRAIN_TEE>ET_WATER'];
  function edgeStyle(key, kind) {
    var s = { arrows: NO_ARROWS.indexOf(key) < 0, size: 'branch' };
    if (SMALL.indexOf(key) >= 0) s.size = 'small';
    else if (kind === 'chem') s.size = 'small';
    else if (EXP_BRANCH.indexOf(key) >= 0 || key.indexOf('LOAD') >= 0) s.size = 'branch';
    else if (kind === 'hot' || kind === 'ret') s.size = 'main';
    return s;
  }

  HE3D.C = C;
  HE3D.ports = P;
  HE3D.routes = R;
  HE3D.edgeStyle = edgeStyle;
  HE3D.colors = {
    hot: '#d7463e', ret: '#167abb', fill: '#008c84', chem: '#8850bc', drain: '#b47a12',
    signal: '#85919e'
  };
  HE3D.pipeRadius = { main: 0.05, branch: 0.035, small: 0.02 };
  if (typeof module !== 'undefined') module.exports = HE3D;
})(typeof window !== 'undefined' ? window : globalThis);
