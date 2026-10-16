// Minimal vector / matrix helpers (column-major 4x4, WebGL convention).
(function (root) {
  var M = {};
  M.add = function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; };
  M.sub = function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; };
  M.scale = function (a, s) { return [a[0] * s, a[1] * s, a[2] * s]; };
  M.dot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
  M.cross = function (a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  };
  M.len = function (a) { return Math.sqrt(M.dot(a, a)); };
  M.norm = function (a) { var l = M.len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  M.lerp = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  // orthonormal basis (u, v) perpendicular to axis d
  M.basis = function (d) {
    var n = M.norm(d);
    var ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1];
    var u = M.norm(M.cross(ref, n));
    var v = M.cross(n, u);
    return { n: n, u: u, v: v };
  };
  M.mul = function (a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      var s = 0;
      for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  };
  M.perspective = function (fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far), o = new Float32Array(16);
    o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf;
    return o;
  };
  M.ortho = function (l, r, b, t, n, f) {
    var o = new Float32Array(16);
    o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
    o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1;
    return o;
  };
  M.lookAt = function (eye, at, up) {
    var z = M.norm(M.sub(eye, at)), x = M.norm(M.cross(up, z)), y = M.cross(z, x);
    var o = new Float32Array(16);
    o[0] = x[0]; o[4] = x[1]; o[8] = x[2];
    o[1] = y[0]; o[5] = y[1]; o[9] = y[2];
    o[2] = z[0]; o[6] = z[1]; o[10] = z[2];
    o[12] = -M.dot(x, eye); o[13] = -M.dot(y, eye); o[14] = -M.dot(z, eye); o[15] = 1;
    return o;
  };
  M.transform = function (m, p) { // returns clip-space [x, y, z, w]
    var x = p[0], y = p[1], z = p[2];
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]];
  };
  M.hex = function (h) {
    var n = parseInt(h.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  M.mix = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  (root.HE3D = root.HE3D || {}).M = M;
})(window);
