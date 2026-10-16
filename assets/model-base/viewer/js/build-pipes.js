// Scene → geometry, part 1: pipes from v3 edges, tees, elbows, flow arrows, signals, floor.
(function (root) {
  var H = root.HE3D, M = H.M;

  var PAL = {
    steel: M.hex('#c3ccd4'), steelDark: M.hex('#6c7986'), equip: M.hex('#e3e9ee'), dark: M.hex('#33414d'),
    boiler: M.hex('#e2e9f0'), floor: M.hex('#eceff2'), choc: M.hex('#6b3a1f'), jacketWater: M.hex('#f2b2a7'),
    tankWater: M.hex('#6fa8de'), gas: M.hex('#e3e7ec'), membrane: M.hex('#b3392f'), etShell: M.hex('#e6dcd8'),
    option: M.hex('#dcebea'), white: [1, 1, 1], lock: M.hex('#e2b21b'), panel: M.hex('#d3d9df'),
    plastic: M.hex('#eef0f5'), wall: M.hex('#d9dee3')
  };
  H.PAL = PAL;
  function kindColor(kind) { return M.hex(H.colors[kind]); }
  function darker(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }
  H.kindColor = kindColor; H.darker = darker;

  function edgeList() {
    return H.topology.edges.map(function (e) {
      var k = e[0] + '>' + e[1];
      return { a: e[0], b: e[1], kind: e[2], state: e[3], label: e[4], k: k,
        pts: [H.ports[e[0]]].concat(H.routes[k] || [], [H.ports[e[1]]]),
        style: H.edgeStyle(k, e[2]) };
    });
  }
  H.edgeList = edgeList;

  function polyLength(pts) {
    var L = 0;
    for (var i = 0; i + 1 < pts.length; i++) L += M.len(M.sub(pts[i + 1], pts[i]));
    return L;
  }
  function pointAt(pts, s) { // position and direction at arc length s
    for (var i = 0; i + 1 < pts.length; i++) {
      var d = M.sub(pts[i + 1], pts[i]), l = M.len(d);
      if (s <= l || i + 2 === pts.length) return { p: M.add(pts[i], M.scale(d, Math.min(1, s / l))), d: M.norm(d), seg: l, at: s };
      s -= l;
    }
  }
  H.pointAt = pointAt; H.polyLength = polyLength;

  function arrow(b, p, d, r, col) {
    var len = r * 4.2, rad = r * 1.9;
    b.paint(col, 1, 0.3);
    b.cone(M.sub(p, M.scale(d, len * 0.5)), M.add(p, M.scale(d, len * 0.5)), rad, 18);
  }
  H.arrow = arrow;

  H.buildPipes = function (b) {
    var edges = edgeList(), deg = {}, rmax = {};
    edges.forEach(function (e) {
      var r = H.pipeRadius[e.style.size];
      [e.a, e.b].forEach(function (p) { deg[p] = (deg[p] || 0) + 1; rmax[p] = Math.max(rmax[p] || 0, r); });
    });
    edges.forEach(function (e) {
      if (H.components[e.k]) return; // equipment body drawn separately
      b.pickId = 'edge:' + e.k;
      var r = H.pipeRadius[e.style.size], col = kindColor(e.kind);
      b.use('base').paint(col, 1, 0.42);
      for (var i = 0; i + 1 < e.pts.length; i++) b.cylinder(e.pts[i], e.pts[i + 1], r, { cap0: false, cap1: false, segs: 18 });
      for (i = 1; i + 1 < e.pts.length; i++) b.sphere(e.pts[i], r, { rows: 8, segs: 18 });
      if (e.style.arrows) {
        var L = polyLength(e.pts), n = Math.max(1, Math.floor(L / 1.5));
        if (L > r * 7) for (var k = 0; k < n; k++) {
          var q = pointAt(e.pts, (k + 0.5) * L / n);
          if (q.seg > r * 6) arrow(b, q.p, q.d, r, darker(col, 0.82));
        }
      }
    });
    b.pickId = null;
    // tees (degree 3) as visible joint "dots", the same convention as drawing v3
    Object.keys(deg).forEach(function (p) {
      if (deg[p] !== 3) return;
      b.pickId = 'port:' + p;
      var kind = edges.filter(function (e) { return e.a === p || e.b === p; })[0].kind;
      b.use('base').paint(darker(kindColor(kind), 0.9), 1, 0.5);
      b.sphere(H.ports[p], rmax[p] * 1.45, { rows: 10, segs: 20 });
    });
    b.pickId = null;
    // flanges where pipes meet an inline component
    Object.keys(H.components).forEach(function (k) {
      var ab = k.split('>'), cmp = H.components[k];
      if (cmp.type === 'jacketPipe' || cmp.type === 'jacketTank') return;
      b.pickId = cmp.id;
      var e = edges.filter(function (x) { return x.k === k; })[0];
      var r = H.pipeRadius[e.style.size], d = M.norm(M.sub(H.ports[ab[1]], H.ports[ab[0]]));
      b.paint(PAL.steelDark, 1, 0.6);
      [H.ports[ab[0]], H.ports[ab[1]]].forEach(function (p, i) {
        var s = i ? -1 : 1;
        b.cylinder(p, M.add(p, M.scale(d, 0.018 * s)), r * 1.6, { segs: 20 });
      });
    });
    b.pickId = null;
    return edges;
  };

  // dashed control-signal lines
  H.buildSignals = function (b) {
    var col = M.hex(H.colors.signal);
    H.signals.forEach(function (s) {
      var pts = s.path, L = polyLength(pts), dash = 0.07, gap = 0.05, r = 0.009;
      b.use('signal').paint(col, 1, 0.2);
      for (var t = 0; t < L - 0.02; t += dash + gap) {
        var A = pointAt(pts, t), B = pointAt(pts, Math.min(L, t + dash));
        if (M.len(M.sub(B.p, A.p)) > 0.005 && Math.abs(M.dot(A.d, B.d)) > 0.99) b.cylinder(A.p, B.p, r, { segs: 8 });
      }
      if (s.arrow) {
        var E = pointAt(pts, L);
        b.cone(M.sub(E.p, M.scale(E.d, 0.06)), E.p, 0.028, 12);
      }
    });
  };

  H.buildFloor = function (b) {
    b.use('floor').paint(PAL.floor, 1, 0);
    b.fan([[-5, 0, -4], [-5, 0, 7], [23, 0, 7], [23, 0, -4]], [0, 1, 0]);
  };
})(window);
