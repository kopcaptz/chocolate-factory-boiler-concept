// Scene → geometry, part 2: inline components placed between their v3 IN / OUT ports.
// Shapes are generic symbols in 3D; no model, size or rating is implied.
(function (root) {
  var H = root.HE3D, M = H.M, PAL = H.PAL;

  function frame(k) {
    var ab = k.split('>'), a = H.ports[ab[0]], b = H.ports[ab[1]];
    var d = M.sub(b, a), L = M.len(d), n = M.norm(d);
    var up = Math.abs(n[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0];
    var side = M.norm(M.cross(n, up));
    var e = H.edgeList().filter(function (x) { return x.k === k; })[0];
    return { a: a, b: b, n: n, L: L, c: M.lerp(a, b, 0.5), up: up, side: side, kind: e.kind, state: e.state,
      r: H.pipeRadius[e.style.size], col: H.kindColor(e.kind) };
  }
  function at(f, t, u, s) { // point along axis t∈[0,1], offset u along up, s along side
    return M.add(M.add(M.lerp(f.a, f.b, t), M.scale(f.up, u || 0)), M.scale(f.side, s || 0));
  }
  function stubs(b, f, r) { b.paint(f.col, 1, 0.42); b.cylinder(f.a, f.b, r || f.r, { segs: 18 }); }

  function valveBody(b, f) {
    var r = f.r;
    stubs(b, f, r);
    b.paint(PAL.steel, 1, 0.75);
    b.cone(f.a, f.c, r * 2.3, 20);
    b.cone(f.b, f.c, r * 2.3, 20);
    b.sphere(f.c, r * 1.5, { rows: 8, segs: 18 });
  }
  function ballValve(b, f, cmp) {
    valveBody(b, f);
    var r = f.r, stemTop = at(f, 0.5, r * 2.2 + 0.07);
    b.paint(PAL.steelDark, 1, 0.6);
    b.cylinder(at(f, 0.5, r * 1.4), stemTop, 0.012, { segs: 10 });
    var open = cmp.state !== 'closed';
    var dir = open ? f.n : f.side, hl = 0.17;
    b.paint(open ? PAL.dark : M.hex('#8a2f26'), 1, 0.4);
    b.boxC(M.add(stemTop, M.scale(dir, hl / 2 - 0.02)),
      absVec(M.add(M.add(M.scale(dir, hl), M.scale(f.up, 0.018)), M.scale(M.cross(dir, f.up), 0.03))));
    if (cmp.state === 'locked_open') padlock(b, M.add(stemTop, M.add(M.scale(dir, hl - 0.03), M.scale(f.up, -0.06))));
  }
  function absVec(v) { return [Math.max(Math.abs(v[0]), 0.018), Math.max(Math.abs(v[1]), 0.018), Math.max(Math.abs(v[2]), 0.018)]; }
  function padlock(b, p) {
    b.paint(PAL.lock, 1, 0.6);
    b.boxC(p, [0.06, 0.05, 0.03]);
    b.paint(PAL.steel, 1, 0.8);
    b.cylinder(M.add(p, [-0.018, 0.025, 0]), M.add(p, [-0.018, 0.06, 0]), 0.005, { segs: 8 });
    b.cylinder(M.add(p, [0.018, 0.025, 0]), M.add(p, [0.018, 0.06, 0]), 0.005, { segs: 8 });
    b.cylinder(M.add(p, [-0.018, 0.06, 0]), M.add(p, [0.018, 0.06, 0]), 0.005, { segs: 8 });
  }
  H.padlock = padlock;

  var BUILD = {
    valve: ballValve,
    balancingValve: function (b, f) {
      valveBody(b, f);
      b.paint(PAL.steelDark, 1, 0.5);
      b.cylinder(at(f, 0.5, f.r), at(f, 0.5, 0.20), 0.018, {segs:12});
      b.paint(M.hex('#2e6481'), 1, 0.4);
      b.cylinder(at(f, 0.5, 0.20), at(f, 0.5, 0.24), 0.075, {segs:24});
    },
    psv: function (b, f) {
      valveBody(b, f);
      b.paint(PAL.steel, 1, 0.7);
      b.cylinder(at(f, 0.5, f.r), at(f, 0.5, 0.26), 0.035, { segs: 18 });
      b.paint(M.hex('#9a4a33'), 1, 0.5);
      b.cylinder(at(f, 0.5, 0.26), at(f, 0.5, 0.31), 0.03, { segs: 18 });
      b.paint(PAL.dark, 1, 0.4);
      b.cylinder(at(f, 0.5, 0.3), at(f, 0.15, 0.32), 0.008, { segs: 8 });
    },
    pump: function (b, f) {
      stubs(b, f, f.r);
      b.paint(M.hex('#5f7c97'), 1, 0.45);
      var c = f.c;
      b.cylinder(M.add(c, [0, 0, -0.09]), M.add(c, [0, 0, 0.09]), 0.17, { segs: 28 });
      b.paint(M.hex('#6f8396'), 1, 0.45);
      b.cylinder(M.add(c, [0, 0.12, 0]), M.add(c, [0, 0.5, 0]), 0.115, { segs: 28 });
      b.paint(M.hex('#4d5f70'), 1, 0.4);
      b.cylinder(M.add(c, [0, 0.5, 0]), M.add(c, [0, 0.53, 0]), 0.1, { segs: 28 });
      b.boxC(M.add(c, [0, 0.35, 0.13]), [0.1, 0.09, 0.05]);
      H.arrow(b, M.add(c, [0, 0, 0.1]), f.n, 0.03, H.darker(f.col, 0.85));
      // floor base: concrete pad + steel pedestal under the volute (pump does not hang on the pipe)
      b.paint(M.hex('#c4c8cc'), 1, 0.1);
      b.box([c[0] - 0.36, 0, c[2] - 0.3], [c[0] + 0.36, 0.08, c[2] + 0.3]);
      b.paint(M.hex('#56636f'), 1, 0.4);
      b.box([c[0] - 0.13, 0.08, c[2] - 0.13], [c[0] + 0.13, c[1] - 0.16, c[2] + 0.13]);
      b.box([c[0] - 0.2, 0.08, c[2] - 0.2], [c[0] + 0.2, 0.11, c[2] + 0.2]);
    },
    flowSwitch: function (b, f) {
      stubs(b, f, f.r);
      b.paint(PAL.steel, 1, 0.7);
      b.cylinder(at(f, 0.15), at(f, 0.85), f.r * 1.7, { segs: 20 });
      b.paint(M.hex('#4f6273'), 1, 0.4);
      b.cylinder(at(f, 0.5, f.r * 1.6), at(f, 0.5, f.r * 1.6 + 0.07), 0.025, { segs: 12 });
      b.boxC(at(f, 0.5, f.r * 1.6 + 0.1), [0.09, 0.06, 0.07]);
    },
    airSeparator: function (b, f, cmp) {
      var x = f.c[0], z = f.c[2], r = cmp.r;
      b.paint(PAL.equip, 1, 0.5);
      b.lathe([x, 0, z], [[0, cmp.y0 - 0.05], [r * 0.7, cmp.y0 - 0.04], [r, cmp.y0], [r, cmp.y1], [r * 0.7, cmp.y1 + 0.04], [0, cmp.y1 + 0.05]]);
      b.paint(f.col, 1, 0.42);
      b.cylinder(f.a, [x - r + 0.01, f.a[1], z], f.r, { segs: 18 });
      b.cylinder([x + r - 0.01, f.b[1], z], f.b, f.r, { segs: 18 });
      b.paint(M.hex(H.colors.drain), 1, 0.42);
      b.cylinder([x, cmp.y1 + 0.03, z], H.ports.AIR, 0.02, { segs: 12 });
    },
    dirtSeparator: function (b, f) {
      var x = f.c[0], z = f.c[2], r = 0.17, y0 = 0.22, y1 = 0.92;
      b.paint(PAL.equip, 1, 0.5);
      b.lathe([x, 0, z], [[0, y0 - 0.06], [r * 0.7, y0 - 0.05], [r, y0], [r, y1], [r * 0.7, y1 + 0.05], [0, y1 + 0.06]]);
      b.paint(PAL.steelDark, 1, 0.5);
      b.cylinder([x, y1 + 0.05, z], [x, y1 + 0.1, z], 0.03, { segs: 12 });
      b.paint(f.col, 1, 0.42);
      var lo = Math.min(f.a[0], f.b[0]), hi = Math.max(f.a[0], f.b[0]);
      b.cylinder([lo, f.a[1], z], [x - r + 0.01, f.a[1], z], f.r, { segs: 18 });
      b.cylinder([x + r - 0.01, f.a[1], z], [hi, f.a[1], z], f.r, { segs: 18 });
      for (var i = 0; i < 3; i++) {
        var a = i / 3 * Math.PI * 2;
        b.paint(PAL.steelDark, 1, 0.4);
        b.cylinder([x + Math.cos(a) * r * 0.8, 0, z + Math.sin(a) * r * 0.8], [x + Math.cos(a) * r * 0.8, y0 - 0.02, z + Math.sin(a) * r * 0.8], 0.012, { segs: 8 });
      }
    },
    strainer: function (b, f) {
      stubs(b, f, f.r);
      b.paint(PAL.steel, 1, 0.75);
      b.cylinder(at(f, 0.15), at(f, 0.85), f.r * 1.6, { segs: 20 });
      var s0 = at(f, 0.45), s1 = M.add(at(f, 0.75), M.add(M.scale(f.up, -0.13), M.scale([0, 0, 1], 0.0)));
      b.cylinder(s0, s1, f.r * 1.25, { segs: 16 });
    },
    box: function (b, f, cmp) {
      var s = cmp.size, c = f.c.slice();
      if (cmp.floor) c[1] = s[1] / 2;
      var ax = Math.abs(f.n[0]) > 0.5 ? 0 : 2; // body length along the flow axis
      var size = ax === 0 ? [s[0], s[1], s[2]] : [s[2], s[1], s[0]];
      var mn = [c[0] - size[0] / 2, c[1] - size[1] / 2, c[2] - size[2] / 2], mx = [c[0] + size[0] / 2, c[1] + size[1] / 2, c[2] + size[2] / 2];
      if (cmp.tone === 'ghost') {
        b.use('glass').paint(PAL.white, 0.38, 0.2); b.box(mn, mx);
        b.use('base').paint(PAL.steelDark, 1, 0.3);
        edgesOf(b, mn, mx, 0.006);
        b.paint(f.col, 1, 0.42); b.cylinder(f.a, f.b, f.r, { segs: 12 });
        return;
      }
      b.use('base').paint(cmp.tone === 'option' ? PAL.option : PAL.equip, 1, 0.3);
      b.box(mn, mx);
      b.paint(PAL.steelDark, 1, 0.4);
      edgesOf(b, mn, mx, 0.008);
      if (cmp.valves) for (var i = 0; i < cmp.valves; i++) {
        var p = at(f, 0.3 + 0.4 * i, size[1] / 2);
        b.paint(PAL.dark, 1, 0.4);
        b.cylinder(p, M.add(p, [0, 0.05, 0]), 0.012, { segs: 8 });
        b.boxC(M.add(p, [0, 0.055, 0]), [0.1, 0.014, 0.02]);
      }
      // pipe stubs into the body
      b.paint(f.col, 1, 0.42);
      var faceA = ax === 0 ? [f.n[0] > 0 ? mn[0] : mx[0], f.a[1], f.a[2]] : [f.a[0], f.a[1], f.n[2] > 0 ? mn[2] : mx[2]];
      var faceB = ax === 0 ? [f.n[0] > 0 ? mx[0] : mn[0], f.b[1], f.b[2]] : [f.b[0], f.b[1], f.n[2] > 0 ? mx[2] : mn[2]];
      b.cylinder(f.a, faceA, f.r, { segs: 16 });
      b.cylinder(faceB, f.b, f.r, { segs: 16 });
    },
    meter: function (b, f) {
      stubs(b, f, f.r);
      b.paint(PAL.steel, 1, 0.75);
      b.cylinder(at(f, 0.12), at(f, 0.88), f.r * 1.8, { segs: 20 });
      b.paint(PAL.dark, 1, 0.4);
      b.cylinder(at(f, 0.5, f.r * 1.6), at(f, 0.5, f.r * 1.6 + 0.05), 0.055, { segs: 24 });
      b.paint(PAL.white, 1, 0.2);
      b.cylinder(at(f, 0.5, f.r * 1.6 + 0.05), at(f, 0.5, f.r * 1.6 + 0.056), 0.045, { segs: 24 });
    },
    prv: function (b, f) {
      valveBody(b, f);
      b.paint(PAL.steel, 1, 0.7);
      b.cylinder(at(f, 0.5, f.r), at(f, 0.5, 0.2), 0.035, { segs: 18 });
      b.paint(PAL.dark, 1, 0.4);
      b.cylinder(at(f, 0.5, 0.2), at(f, 0.5, 0.24), 0.018, { segs: 12 });
    },
    ctrlValve: function (b, f) {
      valveBody(b, f);
      b.paint(PAL.steelDark, 1, 0.5);
      b.cylinder(at(f, 0.5, f.r), at(f, 0.5, 0.12), 0.012, { segs: 10 });
      b.paint(M.hex('#43535f'), 1, 0.35);
      b.boxC(at(f, 0.5, 0.2), [0.13, 0.15, 0.12]);
      b.paint(M.hex('#2d3a44'), 1, 0.35);
      b.cylinder(at(f, 0.5, 0.2, 0.065), at(f, 0.5, 0.2, 0.1), 0.012, { segs: 10 });
    },
    check: function (b, f) {
      stubs(b, f, f.r);
      b.paint(PAL.steel, 1, 0.75);
      b.cylinder(at(f, 0.1), at(f, 0.9), f.r * 1.9, { segs: 20 });
      H.arrow(b, at(f, 0.5, f.r * 1.9 + 0.012), f.n, Math.max(f.r * 0.55, 0.012), H.darker(f.col, 0.8));
    },
    dosingPump: function (b, f) {
      stubs(b, f, f.r);
      b.paint(PAL.steelDark, 1, 0.4);
      b.boxC([f.c[0], (f.c[1] - 0.07) / 2, f.c[2]], [0.16, f.c[1] - 0.07, 0.16]);
      b.paint(M.hex('#d9dee6'), 1, 0.35);
      b.boxC(at(f, 0.5, 0.02), [0.16, 0.14, 0.22]);
      b.paint(M.hex('#7b5aa6'), 1, 0.35);
      b.cylinder(M.add(at(f, 0.5, 0.02), M.scale(f.side, 0.1)), M.add(at(f, 0.5, 0.02), M.scale(f.side, 0.22)), 0.05, { segs: 18 });
    }
  };

  function edgesOf(b, mn, mx, r) {
    var X = [mn[0], mx[0]], Y = [mn[1], mx[1]], Z = [mn[2], mx[2]];
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      b.cylinder([X[0], Y[i], Z[j]], [X[1], Y[i], Z[j]], r, { segs: 6 });
      b.cylinder([X[i], Y[0], Z[j]], [X[i], Y[1], Z[j]], r, { segs: 6 });
      b.cylinder([X[i], Y[j], Z[0]], [X[i], Y[j], Z[1]], r, { segs: 6 });
    }
  }
  H.edgesOf = edgesOf;

  H.buildComponents = function (b) {
    Object.keys(H.components).forEach(function (k) {
      var cmp = H.components[k], fn = BUILD[cmp.type];
      if (!fn) return; // jackets handled in build-objects.js
      b.use('base');
      b.pickId = cmp.id; // UI ownership only; does not change mesh buffers.
      fn(b, frame(k), cmp);
      b.pickId = null;
    });
  };
})(window);
