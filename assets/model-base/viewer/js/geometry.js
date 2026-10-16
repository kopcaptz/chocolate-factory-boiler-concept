// Procedural mesh builder: every primitive is appended to a layer ("base", "signal",
// "glass" …) with per-vertex colour (rgba) and a material value (0 = matte, 1 = polished).
(function (root) {
  var M = root.HE3D.M;
  var MAXV = 65000;

  function Chunk() { this.pos = []; this.nor = []; this.col = []; this.mat = []; this.idx = []; this.n = 0; }

  function Builder() { this.layers = {}; this.layer = 'base'; this.color = [0.7, 0.7, 0.7, 1]; this.mat = 0.4; }
  Builder.prototype.use = function (layer) { this.layer = layer; return this; };
  Builder.prototype.paint = function (rgb, alpha, mat) {
    this.color = [rgb[0], rgb[1], rgb[2], alpha == null ? 1 : alpha];
    if (mat != null) this.mat = mat;
    return this;
  };
  Builder.prototype.chunk = function (need) {
    var L = this.layers[this.layer] || (this.layers[this.layer] = []);
    var c = L[L.length - 1];
    if (!c || c.n + need > MAXV) { c = new Chunk(); L.push(c); }
    return c;
  };
  // add a strip-grid of vertices: rows × cols, f(i, j) → {p, n}; quads between rows
  Builder.prototype.grid = function (rows, cols, f, wrap) {
    var c = this.chunk(rows * cols), base = c.n, col = this.color, mat = this.mat;
    for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) {
      var v = f(i, j);
      c.pos.push(v.p[0], v.p[1], v.p[2]); c.nor.push(v.n[0], v.n[1], v.n[2]);
      c.col.push(col[0], col[1], col[2], col[3]); c.mat.push(mat); c.n++;
    }
    var cc = wrap ? cols : cols - 1;
    for (i = 0; i + 1 < rows; i++) for (j = 0; j < cc; j++) {
      var j1 = (j + 1) % cols;
      var a = base + i * cols + j, b = base + i * cols + j1, d = base + (i + 1) * cols + j, e = base + (i + 1) * cols + j1;
      c.idx.push(a, d, b, b, d, e);
    }
  };
  // polygon fan (convex), shared normal
  Builder.prototype.fan = function (pts, n) {
    var c = this.chunk(pts.length), base = c.n, col = this.color;
    for (var i = 0; i < pts.length; i++) {
      c.pos.push(pts[i][0], pts[i][1], pts[i][2]); c.nor.push(n[0], n[1], n[2]);
      c.col.push(col[0], col[1], col[2], col[3]); c.mat.push(this.mat); c.n++;
    }
    for (i = 1; i + 1 < pts.length; i++) c.idx.push(base, base + i, base + i + 1);
  };
  Builder.prototype.quad = function (a, b, d, e) { // a b / d e  (counter-clockwise a,b,e,d)
    var n = M.norm(M.cross(M.sub(b, a), M.sub(d, a)));
    this.fan([a, b, e, d], n);
  };

  // cylinder from p0 to p1
  Builder.prototype.cylinder = function (p0, p1, r, o) {
    o = o || {};
    var segs = o.segs || 20, B = M.basis(M.sub(p1, p0)), self = this;
    this.grid(2, segs, function (i, j) {
      var a = j / segs * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      var n = M.add(M.scale(B.u, ca), M.scale(B.v, sa));
      return { p: M.add(i ? p1 : p0, M.scale(n, r)), n: n };
    }, true);
    if (o.cap0 !== false) this.disc(p0, M.scale(B.n, -1), r, segs);
    if (o.cap1 !== false) this.disc(p1, B.n, r, segs);
  };
  Builder.prototype.disc = function (c, n, r, segs) {
    segs = segs || 20;
    var B = M.basis(n), pts = [];
    for (var j = 0; j < segs; j++) {
      var a = -j / segs * Math.PI * 2;
      pts.push(M.add(c, M.add(M.scale(B.u, Math.cos(a) * r), M.scale(B.v, Math.sin(a) * r))));
    }
    // orientation: fan winding must face n
    var tri = M.cross(M.sub(pts[1], pts[0]), M.sub(pts[2], pts[0]));
    if (M.dot(tri, n) < 0) pts.reverse();
    this.fan(pts, M.norm(n));
  };
  Builder.prototype.cone = function (base, tip, r, segs) {
    segs = segs || 16;
    var B = M.basis(M.sub(tip, base)), h = M.len(M.sub(tip, base)), k = r / h;
    this.grid(2, segs, function (i, j) {
      var a = j / segs * Math.PI * 2, rad = M.add(M.scale(B.u, Math.cos(a)), M.scale(B.v, Math.sin(a)));
      var n = M.norm(M.add(rad, M.scale(B.n, k)));
      return { p: i ? tip : M.add(base, M.scale(rad, r)), n: n };
    }, true);
    this.disc(base, M.scale(B.n, -1), r, segs);
  };
  // ellipsoid (or sphere) with radii rv = [rx, ry, rz]; optional half: 'top' | 'bottom'
  Builder.prototype.ellipsoid = function (c, rv, o) {
    o = o || {};
    var rows = o.rows || 12, segs = o.segs || 20, t0 = 0, t1 = Math.PI;
    if (o.half === 'top') t1 = Math.PI / 2;
    if (o.half === 'bottom') t0 = Math.PI / 2;
    this.grid(rows + 1, segs, function (i, j) {
      var t = t0 + (t1 - t0) * i / rows, a = j / segs * Math.PI * 2;
      var s = Math.sin(t), y = Math.cos(t), x = Math.cos(a) * s, z = -Math.sin(a) * s;
      var n = M.norm([x / rv[0], y / rv[1], z / rv[2]]);
      return { p: [c[0] + x * rv[0], c[1] + y * rv[1], c[2] + z * rv[2]], n: n };
    }, true);
  };
  Builder.prototype.sphere = function (c, r, o) { this.ellipsoid(c, [r, r, r], o); };
  // axis-aligned box
  Builder.prototype.box = function (mn, mx) {
    var x0 = mn[0], y0 = mn[1], z0 = mn[2], x1 = mx[0], y1 = mx[1], z1 = mx[2];
    this.fan([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]);
    this.fan([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1]);
    this.fan([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0]);
    this.fan([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0]);
    this.fan([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0]);
    this.fan([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0]);
  };
  Builder.prototype.boxC = function (c, s) {
    this.box([c[0] - s[0] / 2, c[1] - s[1] / 2, c[2] - s[2] / 2], [c[0] + s[0] / 2, c[1] + s[1] / 2, c[2] + s[2] / 2]);
  };
  // revolve a profile [[r, h], …] around axis through c with direction d (default +Y)
  Builder.prototype.lathe = function (c, profile, o) {
    o = o || {};
    var d = o.axis || [0, 1, 0], B = M.basis(d), segs = o.segs || 28;
    var a0 = o.a0 || 0, a1 = o.a1 == null ? Math.PI * 2 : o.a1, full = (a1 - a0) >= Math.PI * 2 - 1e-6;
    var cols = full ? segs : segs + 1, ref = o.ref ? M.norm(o.ref) : B.u, side = M.cross(B.n, ref);
    var self = this;
    // per-profile-point 2D normals
    var nrm = profile.map(function (p, i) {
      var a = profile[Math.max(0, i - 1)], b = profile[Math.min(profile.length - 1, i + 1)];
      var dr = b[0] - a[0], dh = b[1] - a[1], l = Math.hypot(dr, dh) || 1;
      return [dh / l, -dr / l]; // outward (radial, axial)
    });
    this.grid(profile.length, cols, function (i, j) {
      var a = a0 + (a1 - a0) * j / segs;
      var rad = M.add(M.scale(ref, Math.cos(a)), M.scale(side, Math.sin(a)));
      var p = M.add(c, M.add(M.scale(rad, profile[i][0]), M.scale(B.n, profile[i][1])));
      var n = M.norm(M.add(M.scale(rad, nrm[i][0]), M.scale(B.n, nrm[i][1])));
      if (o.flip) n = M.scale(n, -1);
      return { p: p, n: n };
    }, full);
  };
  // thick tube sector between radii rIn..rOut from p0 to p1, angles a0..a1 measured from
  // reference direction ref (perpendicular to the axis). Used for cut-away views.
  Builder.prototype.tubeSector = function (p0, p1, rIn, rOut, a0, a1, ref, segs) {
    segs = segs || 24;
    var d = M.sub(p1, p0), L = M.len(d), n = M.norm(d);
    var u = M.norm(ref), v = M.cross(n, u);
    function P(r, a, t) { return M.add(M.add(p0, M.scale(n, t * L)), M.add(M.scale(u, Math.cos(a) * r), M.scale(v, Math.sin(a) * r))); }
    function R(a) { return M.add(M.scale(u, Math.cos(a)), M.scale(v, Math.sin(a))); }
    var cols = segs + 1;
    this.grid(2, cols, function (i, j) { var a = a0 + (a1 - a0) * j / segs; return { p: P(rOut, a, i), n: R(a) }; }, false);
    if (rIn > 0) this.grid(2, cols, function (i, j) { var a = a1 - (a1 - a0) * j / segs; return { p: P(rIn, a, i), n: M.scale(R(a), -1) }; }, false);
    // end faces
    for (var e = 0; e < 2; e++) {
      for (var j = 0; j < segs; j++) {
        var aa = a0 + (a1 - a0) * j / segs, ab = a0 + (a1 - a0) * (j + 1) / segs;
        var q = [P(rIn, aa, e), P(rOut, aa, e), P(rOut, ab, e), P(rIn, ab, e)];
        if (e === 0) q.reverse();
        this.fan(q, e ? n : M.scale(n, -1));
      }
    }
    // radial cut faces
    var full = (a1 - a0) >= Math.PI * 2 - 1e-6;
    if (!full) {
      var fa = [P(rIn, a0, 0), P(rIn, a0, 1), P(rOut, a0, 1), P(rOut, a0, 0)];
      this.fan(fa, M.scale(M.cross(n, R(a0)), -1));
      var fb = [P(rOut, a1, 0), P(rOut, a1, 1), P(rIn, a1, 1), P(rIn, a1, 0)];
      this.fan(fb, M.cross(n, R(a1)));
    }
  };
  // finished buffers per layer
  Builder.prototype.finish = function () {
    var out = {};
    for (var k in this.layers) out[k] = this.layers[k].map(function (c) {
      return { pos: new Float32Array(c.pos), nor: new Float32Array(c.nor), col: new Float32Array(c.col),
        mat: new Float32Array(c.mat), idx: new Uint16Array(c.idx), count: c.idx.length,
        center: centerOf(c.pos) };
    });
    return out;
  };
  function centerOf(p) {
    var s = [0, 0, 0], n = p.length / 3;
    for (var i = 0; i < p.length; i += 3) { s[0] += p[i]; s[1] += p[i + 1]; s[2] += p[i + 2]; }
    return n ? [s[0] / n, s[1] / n, s[2] / n] : s;
  }
  root.HE3D.Builder = Builder;
})(window);
