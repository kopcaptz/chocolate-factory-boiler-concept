// Scene → geometry, part 3: stand-alone equipment, jackets, instruments, ends, boundary.
(function (root) {
  var H = root.HE3D, M = H.M, PAL = H.PAL, C = H.C, P = H.ports;
  var D2R = Math.PI / 180;

  function nozzleStub(b, from, to, r, kind) {
    b.paint(H.kindColor(kind), 1, 0.42); b.cylinder(from, to, r, { segs: 18 });
    b.paint(PAL.steelDark, 1, 0.6);
    var d = M.norm(M.sub(to, from));
    b.cylinder(M.sub(to, M.scale(d, 0.02)), to, r * 1.6, { segs: 20 });
  }

  var OBJ = {
    boiler: function (b, o) {
      var c = o.c, r = o.r;
      b.paint(PAL.boiler, 1, 0.45);
      b.lathe(c, [[0, o.y0 - 0.12], [r * 0.6, o.y0 - 0.1], [r * 0.92, o.y0 - 0.04], [r, o.y0], [r, o.y1],
        [r * 0.92, o.y1 + o.head * 0.4], [r * 0.6, o.y1 + o.head * 0.8], [0, o.y1 + o.head]], { segs: 40 });
      b.paint(M.hex('#b9c5d0'), 1, 0.5);
      [o.y0 + 0.05, o.y1 - 0.05].forEach(function (y) { b.cylinder([c[0], y - 0.015, c[2]], [c[0], y + 0.015, c[2]], r + 0.008, { segs: 40 }); });
      b.paint(PAL.steelDark, 1, 0.4);
      for (var i = 0; i < 4; i++) {
        var a = (i + 0.5) / 4 * Math.PI * 2, x = c[0] + Math.cos(a) * r * 0.75, z = c[2] + Math.sin(a) * r * 0.75;
        b.cylinder([x, 0, z], [x, o.y0 - 0.06, z], 0.035, { segs: 10 });
        b.boxC([x, 0.01, z], [0.12, 0.02, 0.12]);
      }
      nozzleStub(b, [c[0] + r - 0.02, P.B_OUT[1], c[2]], P.B_OUT, H.pipeRadius.main, 'hot');
      nozzleStub(b, [c[0] + r - 0.02, P.B_IN[1], c[2]], P.B_IN, H.pipeRadius.main, 'ret');
      nozzleStub(b, [P.PSV_ROOT[0], o.y1 + 0.1, c[2]], P.PSV_ROOT, H.pipeRadius.branch, 'drain');
      // immersion heater flange (front) and independent protection bosses (no set-points)
      b.paint(M.hex('#9aa8b5'), 1, 0.6);
      b.cylinder([c[0], 0.9, c[2] + r - 0.02], [c[0], 0.9, c[2] + r + 0.05], 0.2, { segs: 32 });
      b.paint(M.hex('#53626f'), 1, 0.4);
      b.cylinder([c[0], 0.9, c[2] + r + 0.05], [c[0], 0.9, c[2] + r + 0.2], 0.16, { segs: 32 });
      b.paint(M.hex('#3f4c58'), 1, 0.4);
      [[1.9, 0.35], [2.4, 0.55]].forEach(function (q) {
        var a = q[1], p0 = [c[0] + Math.sin(a) * r, q[0], c[2] + Math.cos(a) * r], p1 = [c[0] + Math.sin(a) * (r + 0.09), q[0], c[2] + Math.cos(a) * (r + 0.09)];
        b.cylinder(p0, p1, 0.022, { segs: 10 });
        b.boxC(p1, [0.07, 0.07, 0.07]);
      });
    },
    airVent: function (b, o) {
      var p = P[o.port];
      b.paint(PAL.steel, 1, 0.75);
      b.cylinder(p, M.add(p, [0, 0.12, 0]), 0.04, { segs: 18 });
      b.paint(PAL.dark, 1, 0.4);
      b.cylinder(M.add(p, [0, 0.12, 0]), M.add(p, [0, 0.15, 0]), 0.015, { segs: 10 });
    },
    expansionTank: function (b, o) {
      var c = o.c, r = o.r, y0 = o.y0, y1 = o.y1, hd = o.head, cx = c[0], cz = c[2];
      var a0 = 50 * D2R, a1 = 310 * D2R, ref = [0, 0, 1];
      // shell (cut-away wedge at the front), heads closed
      b.paint(PAL.etShell, 1, 0.5);
      b.tubeSector([cx, y0, cz], [cx, y1, cz], r - 0.012, r, a0, a1, ref, 40);
      b.lathe([cx, y1, cz], [[r, 0], [r * 0.9, hd * 0.55], [r * 0.55, hd * 0.92], [0, hd]], { segs: 40 });
      b.lathe([cx, y0, cz], [[0, -hd], [r * 0.55, -hd * 0.92], [r * 0.9, -hd * 0.55], [r, 0]], { segs: 40 });
      // water above the membrane, gas below (as in drawing v3), seen in the cut
      b.paint(PAL.tankWater, 1, 0.3);
      b.tubeSector([cx, o.membraneY + 0.006, cz], [cx, y1, cz], 0, r - 0.012, a0, a1, ref, 40);
      b.paint(PAL.gas, 1, 0.2);
      b.tubeSector([cx, y0, cz], [cx, o.membraneY - 0.006, cz], 0, r - 0.012, a0, a1, ref, 40);
      b.paint(PAL.membrane, 1, 0.3);
      b.tubeSector([cx, o.membraneY - 0.006, cz], [cx, o.membraneY + 0.006, cz], 0, r - 0.006, a0, a1, ref, 40);
      // single water connection on top
      nozzleStub(b, [cx, y1 + hd - 0.01, cz], P.ET_WATER, H.pipeRadius.branch, 'hot');
      // independent support: ring, three legs, base plate
      b.paint(M.hex('#56636f'), 1, 0.45);
      b.lathe([cx, 0, cz], [[r * 0.82, y0 - hd * 0.7], [r * 0.82, y0 - hd * 0.25]], { segs: 40 });
      for (var i = 0; i < 3; i++) {
        var a = (i / 3) * Math.PI * 2 + Math.PI / 6, x = cx + Math.sin(a) * r * 0.82, z = cz + Math.cos(a) * r * 0.82;
        b.cylinder([x, 0.04, z], [x, y0 - hd * 0.5, z], 0.022, { segs: 10 });
      }
      b.paint(M.hex('#7a8793'), 1, 0.3);
      b.cylinder([cx, 0, cz], [cx, 0.04, cz], r * 1.15, { segs: 40 });
    },
    union: function (b, o) {
      var ab = o.edge.split('>'), p = M.lerp(P[ab[0]], P[ab[1]], o.t), d = M.norm(M.sub(P[ab[1]], P[ab[0]]));
      var r = H.pipeRadius.branch * 1.9;
      b.paint(PAL.steelDark, 1, 0.7);
      b.cylinder(M.sub(p, M.scale(d, 0.035)), M.sub(p, M.scale(d, 0.004)), r, { segs: 6 });
      b.paint(PAL.steel, 1, 0.8);
      b.cylinder(M.add(p, M.scale(d, 0.004)), M.add(p, M.scale(d, 0.03)), r * 0.92, { segs: 6 });
    },
    instrument: function (b, o) {
      var p = P[o.port];
      b.paint(PAL.steelDark, 1, 0.6);
      b.cylinder(M.sub(p, [0, 0.02, 0]), M.add(p, [0, 0.015, 0]), 0.022, { segs: 6 });
      if (o.style === 'testpoint') {
        b.paint(PAL.dark, 1, 0.4); b.cylinder(p, M.add(p,[0,0.04,0]), 0.023,{segs:10});
      } else if (o.style === 'gauge') {
        var c = M.add(p, [0, 0.1, 0]);
        b.paint(PAL.steelDark, 1, 0.6); b.cylinder(M.add(p, [0, 0.015, 0]), M.add(p, [0, 0.03, 0]), 0.012, { segs: 8 });
        b.paint(M.hex('#2e3a45'), 1, 0.5); b.cylinder(M.add(c, [0, 0, -0.025]), M.add(c, [0, 0, 0.02]), 0.085, { segs: 32 });
        b.paint(PAL.white, 1, 0.2); b.cylinder(M.add(c, [0, 0, 0.02]), M.add(c, [0, 0, 0.024]), 0.074, { segs: 32 });
        b.paint(M.hex('#c0392b'), 1, 0.3); b.boxC(M.add(c, [0.02, 0.02, 0.027]), [0.05, 0.008, 0.004]);
      } else if (o.style === 'transmitter') {
        b.paint(M.hex('#c9d1d8'), 1, 0.7); b.cylinder(M.add(p, [0, 0.015, 0]), M.add(p, [0, 0.07, 0]), 0.03, { segs: 16 });
        b.paint(M.hex('#3b4a59'), 1, 0.4); b.cylinder(M.add(p, [0, 0.07, 0]), M.add(p, [0, 0.17, 0]), 0.05, { segs: 24 });
        b.cylinder(M.add(p, [0.04, 0.12, 0]), M.add(p, [0.09, 0.12, 0]), 0.014, { segs: 10 });
      } else if (o.style === 'temp') {
        b.paint(M.hex('#c9d1d8'), 1, 0.7); b.cylinder(M.add(p, [0, 0.015, 0]), M.add(p, [0, 0.06, 0]), 0.012, { segs: 10 });
        b.paint(M.hex('#44545f'), 1, 0.4); b.cylinder(M.add(p, [0, 0.06, 0]), M.add(p, [0, 0.13, 0]), 0.038, { segs: 20 });
        b.ellipsoid(M.add(p, [0, 0.13, 0]), [0.038, 0.02, 0.038], { half: 'top' });
      } else {
        b.paint(M.hex('#c9d1d8'), 1, 0.7); b.cylinder(M.add(p, [0, 0.015, 0]), M.add(p, [0, 0.04, 0]), 0.03, { segs: 12 });
        b.paint(M.hex('#2f3d48'), 1, 0.4); b.cylinder(M.add(p, [0, 0.04, 0]), M.add(p, [0, 0.16, 0]), 0.026, { segs: 16 });
        b.paint(M.hex('#5c6b78'), 1, 0.4); b.cylinder(M.add(p, [0, 0.16, 0]), M.add(p, [0, 0.19, 0]), 0.012, { segs: 10 });
      }
    },
    openEnd: function (b, o) {
      var p = P[o.port], d = o.dir, col = H.kindColor(o.kind);
      b.paint(PAL.steelDark, 1, 0.6);
      b.cylinder(M.sub(p, M.scale(d, 0.02)), p, H.pipeRadius.branch * 1.3, { segs: 18 });
      H.arrow(b, M.add(p, M.scale(d, 0.09)), d, 0.03, H.darker(col, 0.85));
    },
    source: function (b, o) { // water supply entering through the floor (origin outside the scope)
      var p = P[o.port], back = M.scale(o.out, -0.22), q = M.add(p, back), r = H.pipeRadius.branch;
      b.paint(M.hex('#b9c0c7'), 1, 0.1);
      b.cylinder([q[0], 0, q[2]], [q[0], 0.015, q[2]], 0.14, { segs: 24 });
      b.paint(H.kindColor('fill'), 1, 0.42);
      b.cylinder([q[0], 0.01, q[2]], q, r, { segs: 16 });
      b.sphere(q, r, { rows: 8, segs: 16 });
      b.cylinder(q, p, r, { segs: 16, cap0: false });
      b.paint(PAL.steelDark, 1, 0.6);
      b.cylinder(M.add(p, M.scale(o.out, -0.03)), p, r * 1.6, { segs: 20 });
    },
    chemTank: function (b, o) {
      var c = o.c, r = o.r;
      b.paint(PAL.plastic, 1, 0.25);
      b.lathe(c, [[0, o.y0], [r, o.y0], [r, o.y1], [0, o.y1]], { segs: 32 });
      b.paint(M.hex('#8850bc'), 1, 0.35);
      b.cylinder([c[0], o.y1 - 0.2, c[2]], [c[0], o.y1 - 0.16, c[2]], r + 0.004, { segs: 32 });
      b.paint(PAL.dark, 1, 0.4);
      b.cylinder([c[0], o.y1, c[2]], [c[0], o.y1 + 0.03, c[2]], r * 0.55, { segs: 24 });
      var fd = o.faceDir || [0, 0, -1];
      nozzleStub(b, [c[0] + fd[0] * (r - 0.01), P.CHEM_OUT[1], c[2] + fd[2] * (r - 0.01)], P.CHEM_OUT, H.pipeRadius.small, 'chem');
    },
    boundary: function (b, o) {
      b.use('glass').paint(M.hex('#cfdae4'), 0.28, 0);
      b.fan([[o.x, o.y0, o.z0], [o.x, o.y0, o.z1], [o.x, o.y1, o.z1], [o.x, o.y1, o.z0]], [1, 0, 0]);
      b.use('base').paint(M.hex('#9fb0bf'), 1, 0.1);
      var edges = [[[o.x, o.y0, o.z0], [o.x, o.y1, o.z0]], [[o.x, o.y1, o.z0], [o.x, o.y1, o.z1]], [[o.x, o.y1, o.z1], [o.x, o.y0, o.z1]]];
      edges.forEach(function (e) {
        var L = M.len(M.sub(e[1], e[0]));
        for (var t = 0; t < L; t += 0.22) b.cylinder(M.lerp(e[0], e[1], t / L), M.lerp(e[0], e[1], Math.min(1, (t + 0.13) / L)), 0.008, { segs: 6 });
      });
      Object.keys(o.ends).forEach(function (k) {
        var p = P[k], d = o.ends[k], kind = k === 'EXT_S' ? 'hot' : 'ret';
        b.paint(PAL.steelDark, 1, 0.6);
        b.cylinder(M.sub(p, [0.02, 0, 0]), p, H.pipeRadius.main * 1.5, { segs: 20 });
        var ap = d[0] > 0 ? M.add(p, [0.1, 0, 0]) : M.sub(p, [0.25, 0, 0]);
        H.arrow(b, ap, d, H.pipeRadius.main, H.darker(H.kindColor(kind), 0.85));
      });
    },
    controlPanel: function (b, o) {
      var c = o.c;
      b.paint(PAL.panel, 1, 0.3);
      b.box([c[0] - o.w / 2, 0.08, c[2] - o.d / 2], [c[0] + o.w / 2, o.h, c[2] + o.d / 2]);
      b.paint(M.hex('#59656f'), 1, 0.3);
      b.box([c[0] - o.w / 2 + 0.02, 0, c[2] - o.d / 2 + 0.02], [c[0] + o.w / 2 - 0.02, 0.08, c[2] + o.d / 2 - 0.02]);
      b.paint(M.hex('#2c3740'), 1, 0.5);
      b.box([c[0] - 0.18, o.h - 0.42, c[2] + o.d / 2], [c[0] + 0.18, o.h - 0.16, c[2] + o.d / 2 + 0.01]);
      b.paint(M.hex('#9aa6b1'), 1, 0.3);
      b.box([c[0] - 0.002, 0.12, c[2] + o.d / 2], [c[0] + 0.002, o.h - 0.04, c[2] + o.d / 2 + 0.006]);
    },
    productProbe: function (b, o) {
      var j = H.components['LOAD' + o.load + '_IN>LOAD' + o.load + '_OUT'];
      var a = 310 * D2R, dir = [0, -Math.sin(a), Math.cos(a)]; // on the cut face of the product
      var axis = [o.x, j.axisY, j.z];
      b.paint(M.hex('#d2d8de'), 1, 0.8);
      b.cylinder(M.add(axis, M.scale(dir, -0.005)), M.add(axis, M.scale(dir, 0.085)), 0.007, { segs: 10 });
      b.paint(M.hex('#2f3a44'), 1, 0.45);
      b.cylinder(M.add(axis, M.scale(dir, 0.085)), M.add(axis, M.scale(dir, 0.17)), 0.026, { segs: 18 });
    }
  };


  // magnified cross-section exhibit (not connected, not to scale)
  OBJ.sectionExhibit = function (b, o) {
    var y = o.c[1], z = o.c[2], ref = [0, 0, 1], w0 = o.half * D2R, w1 = (360 - o.half) * D2R;
    var A = function (x) { return [x, y, z]; };
    b.paint(PAL.choc, 1, 0.35); b.tubeSector(A(o.x0), A(o.x1), 0, o.rC, w0, w1, ref, 40);
    b.paint(M.hex('#8e9aa6'), 1, 0.75); b.tubeSector(A(o.x0), A(o.x1), o.rC, o.rP, w0, w1, ref, 40);
    b.paint(PAL.jacketWater, 1, 0.25); b.tubeSector(A(o.xs), A(o.x1), o.rP, o.rJ - 0.025, w0, w1, ref, 48);
    b.paint(PAL.steel, 1, 0.7); b.tubeSector(A(o.xs), A(o.x1), o.rJ - 0.025, o.rJ, w0, w1, ref, 48);
    b.tubeSector(A(o.xs), A(o.xs + 0.03), o.rP, o.rJ, w0, w1, ref, 48);
    // TT-P on the product pipe outside the jacket, tip inside the chocolate (on the cut face)
    var a = (360 - o.half) * D2R, dir = [0, -Math.sin(a), Math.cos(a)], ax = A(o.probeX);
    b.paint(M.hex('#d2d8de'), 1, 0.8); b.cylinder(ax, M.add(ax, M.scale(dir, o.rP + 0.02)), 0.014, { segs: 12 });
    b.paint(M.hex('#2f3a44'), 1, 0.45);
    b.cylinder(M.add(ax, M.scale(dir, o.rP + 0.02)), M.add(ax, M.scale(dir, o.rP + 0.16)), 0.045, { segs: 20 });
    // plinth with two saddles
    var top = y - o.rJ - 0.03;
    b.paint(M.hex('#c9d0d7'), 1, 0.2); b.box([o.x0 + 0.1, 0, z - 0.25], [o.x1 - 0.1, top, z + 0.25]);
    b.paint(M.hex('#8793a0'), 1, 0.35);
    [o.xs + 0.2, o.x1 - 0.2].forEach(function (x) { b.box([x - 0.04, top, z - 0.2], [x + 0.04, y - o.rJ + 0.04, z + 0.2]); });
  };

  // jacketed chocolate pipe: product pipe inside, heating-water jacket outside
  function jacketPipe(b, j, n) {
    var y = j.axisY, z = j.z, cut = j.cut, ref = [0, 0, 1];
    var A = function (x) { return [x, y, z]; };
    var full0 = 0, full1 = Math.PI * 2;
    var w0 = cut ? cut.half * D2R : 0, w1 = cut ? (360 - cut.half) * D2R : 0;
    // chocolate core (only visible in the cut)
    b.paint(PAL.choc, 1, 0.35);
    if (cut) {
      b.tubeSector(A(j.px0), A(cut.px0), 0, j.rC, full0, full1, ref, 24);
      b.tubeSector(A(cut.px0), A(cut.px1), 0, j.rC, w0, w1, ref, 24);
      b.tubeSector(A(cut.px1), A(j.px1), 0, j.rC, full0, full1, ref, 24);
    } else b.cylinder(A(j.px0), A(j.px1), j.rC, { segs: 16 });
    // product pipe wall = separating wall
    b.paint(M.hex('#8e9aa6'), 1, 0.75);
    if (cut) {
      b.tubeSector(A(j.px0), A(cut.px0), j.rC, j.rP, full0, full1, ref, 28);
      b.tubeSector(A(cut.px0), A(cut.px1), j.rC, j.rP, w0, w1, ref, 28);
      b.tubeSector(A(cut.px1), A(j.px1), j.rC, j.rP, full0, full1, ref, 28);
    } else b.tubeSector(A(j.px0), A(j.px1), j.rC, j.rP, full0, full1, ref, 24);
    // blind caps: chocolate route beyond the jackets is not defined
    b.paint(PAL.steelDark, 1, 0.6);
    b.cylinder(A(j.px0 - 0.03), A(j.px0), j.rP + 0.02, { segs: 24 });
    b.cylinder(A(j.px1), A(j.px1 + 0.03), j.rP + 0.02, { segs: 24 });
    // heating water in the jacket annulus and jacket wall
    var segsJ = 36;
    if (cut) {
      b.paint(PAL.jacketWater, 1, 0.25);
      b.tubeSector(A(cut.jx0), A(j.x1), j.rP, j.rJ - 0.008, w0, w1, ref, segsJ);
      b.paint(PAL.steel, 1, 0.7);
      b.tubeSector(A(j.x0), A(cut.jx0), j.rJ - 0.008, j.rJ, full0, full1, ref, segsJ);
      b.tubeSector(A(cut.jx0), A(j.x1), j.rJ - 0.008, j.rJ, w0, w1, ref, segsJ);
      b.tubeSector(A(j.x0), A(j.x0 + 0.02), j.rP, j.rJ, full0, full1, ref, segsJ);
      b.tubeSector(A(j.x1 - 0.02), A(j.x1), j.rP, j.rJ, w0, w1, ref, segsJ);
    } else {
      b.paint(PAL.steel, 1, 0.7);
      b.tubeSector(A(j.x0), A(j.x1), j.rP, j.rJ, full0, full1, ref, segsJ);
    }
    // jacket nozzles (supply in / return out)
    var pin = H.loadNozzle(j, 'IN'), pout = H.loadNozzle(j, 'OUT');
    nozzleStub(b, [pin[0], y + j.rJ - 0.01, z], pin, H.pipeRadius.branch, 'hot');
    nozzleStub(b, [pout[0], y + j.rJ - 0.01, z], pout, H.pipeRadius.branch, 'ret');
  }
  function jacketTank(b, t) {
    var c = t.c, r = t.r;
    b.paint(PAL.steel, 1, 0.7);
    b.lathe(c, [[0, t.y0 - 0.1], [r * 0.6, t.y0 - 0.08], [r * 0.93, t.y0 - 0.03], [r, t.y0], [r, t.y1],
      [r * 0.92, t.y1 + 0.07], [r * 0.55, t.y1 + 0.14], [0, t.y1 + 0.15]], { segs: 44 });
    b.paint(M.hex('#a9b4be'), 1, 0.6);
    b.lathe(c, [[r, t.jy0 - 0.02], [t.rJ, t.jy0], [t.rJ, t.jy1], [r, t.jy1 + 0.02]], { segs: 44 });
    b.paint(PAL.steelDark, 1, 0.4);
    for (var i = 0; i < 4; i++) {
      var a = (i + 0.5) / 4 * Math.PI * 2, x = c[0] + Math.cos(a) * r * 0.8, z = c[2] + Math.sin(a) * r * 0.8;
      b.cylinder([x, 0, z], [x, t.y0 - 0.04, z], 0.03, { segs: 10 });
    }
    var pin = H.loadNozzle(t, 'IN'), pout = H.loadNozzle(t, 'OUT');
    nozzleStub(b, [c[0] - t.rJ + 0.01, pin[1], c[2]], pin, H.pipeRadius.branch, 'hot');
    nozzleStub(b, [c[0] + t.rJ - 0.01, pout[1], c[2]], pout, H.pipeRadius.branch, 'ret');
  }

  H.buildObjects = function (b) {
    H.objects.forEach(function (o) { var fn = OBJ[o.type]; if (fn) { b.use('base'); b.pickId = o.id; fn(b, o); b.pickId = null; } });
    Object.keys(H.components).forEach(function (k) {
      var cmp = H.components[k];
      b.use('base');
      if (cmp.type === 'jacketPipe') jacketPipe(b, cmp);
      if (cmp.type === 'jacketTank') jacketTank(b, cmp);
    });
    // supports: posts with base plates and brackets (all loads go to the floor)
    H.supports.forEach(function (sp) {
      b.use('base').paint(M.hex('#8793a0'), 1, 0.35);
      b.box([sp.x - 0.035, 0.012, sp.z - 0.035], [sp.x + 0.035, sp.h, sp.z + 0.035]);
      b.paint(M.hex('#6d7884'), 1, 0.3);
      b.box([sp.x - 0.08, 0, sp.z - 0.08], [sp.x + 0.08, 0.012, sp.z + 0.08]);
      b.paint(M.hex('#8793a0'), 1, 0.35);
      sp.arms.forEach(function (a) {
        var x0 = Math.min(a[1], sp.x - 0.035), x1 = Math.max(a[2], sp.x + 0.035);
        var z0 = Math.min(a[3], sp.z - 0.035), z1 = Math.max(a[4], sp.z + 0.035);
        b.box([x0, a[0] - 0.04, z0], [x1, a[0], z1]);
      });
    });
  };
})(window);
