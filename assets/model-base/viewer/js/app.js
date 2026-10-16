// Viewer application: orbit camera, view presets, UI toggles, capture mode, port visibility check.
(function (root) {
  var H = root.HE3D, M = H.M;
  var D2R = Math.PI / 180;
  var params = new URLSearchParams(location.search);
  var capture = params.get('capture') === '1';
  var BOUNDS = { min: [-3.2, 0, -1.6], max: [20.4, 5.0, 4.2] };

  var canvas = document.getElementById('gl');
  var stage = document.getElementById('stage');
  var renderer, labels, cam = { target: [8.6, 1.7, 1], yaw: 38, pitch: 30, dist: 26, half: 7, ortho: true, fov: 30 };
  var mode = 'iso', dirty = true;

  function build() {
    var b = new H.Builder();
    if (H.preparePicking) H.preparePicking(b);
    H.buildFloor(b); H.buildPipes(b); H.buildComponents(b); H.buildObjects(b); H.buildSignals(b);
    var mesh = b.finish();
    if (H.createPickIndex) H.pickIndex = H.createPickIndex(b, mesh);
    return mesh;
  }

  function basis(c) {
    var y = c.yaw * D2R, p = c.pitch * D2R;
    var back = [Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)]; // target → eye
    var right = M.norm(M.cross([0, 1, 0], back)), up = M.cross(back, right);
    return { back: back, right: right, up: up };
  }
  function matrices(c, w, h) {
    var B = basis(c), aspect = w / h, eye, proj, near, far;
    if (c.ortho) {
      eye = M.add(c.target, M.scale(B.back, 60)); near = 1; far = 140;
      proj = M.ortho(-c.half * aspect, c.half * aspect, -c.half, c.half, near, far);
    } else {
      eye = M.add(c.target, M.scale(B.back, c.dist)); near = Math.max(0.05, c.dist * 0.02); far = c.dist + 60;
      proj = M.perspective(c.fov * D2R, aspect, near, far);
    }
    var view = M.lookAt(eye, c.target, [0, 1, 0]);
    return { vp: M.mul(proj, view), eye: eye, dir: M.scale(B.back, -1), ortho: c.ortho, near: near, far: far, w: w, h: h };
  }
  // frame a view box: centre it and choose zoom so that all 8 corners fit
  function fit(v, aspect) {
    var c = { yaw: v.yaw, pitch: v.pitch, ortho: v.ortho, fov: v.fov || 30, target: null, dist: 20, half: 5 };
    var B = basis(c), mn = v.box[0], mx = v.box[1];
    var t = M.scale(M.add(mn, mx), 0.5), corners = [];
    for (var i = 0; i < 8; i++) corners.push([i & 1 ? mx[0] : mn[0], i & 2 ? mx[1] : mn[1], i & 4 ? mx[2] : mn[2]]);
    for (var it = 0; it < 3; it++) {
      var xs = [], ys = [], zs = [];
      corners.forEach(function (p) { var d = M.sub(p, t); xs.push(M.dot(d, B.right)); ys.push(M.dot(d, B.up)); zs.push(M.dot(d, B.back)); });
      var cx = (Math.min.apply(0, xs) + Math.max.apply(0, xs)) / 2, cy = (Math.min.apply(0, ys) + Math.max.apply(0, ys)) / 2;
      t = M.add(t, M.add(M.scale(B.right, cx), M.scale(B.up, cy)));
    }
    var m = 1 + (v.margin || 0.04), tanH = Math.tan(c.fov * D2R / 2);
    xs = []; ys = []; zs = [];
    corners.forEach(function (p) { var d = M.sub(p, t); xs.push(M.dot(d, B.right)); ys.push(M.dot(d, B.up)); zs.push(M.dot(d, B.back)); });
    if (c.ortho) {
      var ex = Math.max.apply(0, xs.map(Math.abs)), ey = Math.max.apply(0, ys.map(Math.abs));
      c.half = Math.max(ey, ex / aspect) * m;
    } else {
      var d = 0;
      for (i = 0; i < 8; i++) d = Math.max(d, zs[i] + Math.abs(ys[i]) * m / tanH, zs[i] + Math.abs(xs[i]) * m / (tanH * aspect));
      c.dist = d;
      c.half = d * tanH;
    }
    c.target = t;
    return c;
  }
  function setView(name) {
    var v = H.views[name];
    var unavailable = !v;
    if (unavailable) { name = 'iso'; v = H.views.iso; }
    cam = fit(v, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    mode = name;
    document.querySelectorAll('[data-view]').forEach(function (bt) { bt.classList.toggle('on', bt.dataset.view === name); });
    var t = document.getElementById('viewTitle'); if (t) t.textContent = v.title + (unavailable ? ' · התצוגה המבוקשת אינה זמינה' : '');
    var pr = document.getElementById('tProj'); if (pr) pr.classList.toggle('on', !cam.ortho);
    dirty = true;
  }

  function resize() {
    var dpr = capture ? (parseFloat(params.get('dpr')) || window.devicePixelRatio || 1) : Math.min(window.devicePixelRatio || 1, 2);
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return; // A hidden presentation tab has no viewport yet.
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    var s = capture ? (parseFloat(params.get('ls')) || 1) : (w < 760 ? 0.78 : Math.max(0.85, Math.min(1.15, w / 1500)));
    document.documentElement.style.setProperty('--ls', s);
    if (labels) labels.measure();
    dirty = true;
  }

  function portObstacles(m) {
    return Object.keys(H.ports).map(function (k) {
      var q = M.transform(m.vp, H.ports[k]);
      if (q[3] <= 0) return null;
      return [(q[0] / q[3] * 0.5 + 0.5) * m.w, (1 - (q[1] / q[3] * 0.5 + 0.5)) * m.h];
    });
  }

  function frame() {
    if (dirty) {
      dirty = false;
      var m = matrices(cam, canvas.width, canvas.height);
      renderer.render(m, BOUNDS, {});
      var css = matrices(cam, stage.clientWidth, stage.clientHeight);
      css.scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ls')) || 1;
      var lvl = cam.ortho ? (cam.half < 3 ? 3 : cam.half < 6 ? 2 : 1) : (cam.dist < 9 ? 3 : cam.dist < 18 ? 2 : 1);
      var narrow = !capture && stage.clientWidth < 760;
      labels.layout(css, mode, narrow ? 1 : lvl, portObstacles(css), narrow ? 1 : 9);
      document.documentElement.dataset.ready = '1';
      if (params.get('check') === '1' && !document.getElementById('vis')) {
        var pre = document.createElement('pre'); pre.id = 'vis'; pre.style.display = 'none';
        pre.textContent = JSON.stringify(H.visibility(['iso', 'exp', 'jacket'], 1920, 1080));
        document.body.appendChild(pre);
      }
    }
    requestAnimationFrame(frame);
  }

  // ---- interaction ---------------------------------------------------------
  function free() { if (mode !== 'free') { mode = 'free'; document.querySelectorAll('[data-view]').forEach(function (b) { b.classList.remove('on'); }); var t = document.getElementById('viewTitle'); if (t) t.textContent = 'מבט חופשי'; } }
  function pan(dx, dy) {
    var B = basis(cam), k = (cam.ortho ? cam.half : cam.dist * Math.tan(cam.fov * D2R / 2)) * 2 / stage.clientHeight;
    cam.target = M.add(cam.target, M.add(M.scale(B.right, -dx * k), M.scale(B.up, dy * k)));
  }
  function zoom(f) { if (cam.ortho) cam.half = Math.min(30, Math.max(0.6, cam.half * f)); else cam.dist = Math.min(80, Math.max(1.2, cam.dist * f)); }
  function controls() {
    var drag = null, pts = {};
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      pts[e.pointerId] = [e.clientX, e.clientY];
      drag = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, started: false, panning: e.button === 2 || e.shiftKey };
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag || !pts[e.pointerId]) return;
      var ids = Object.keys(pts);
      if (ids.length === 2) {
        var o = pts[ids[0]], p = pts[ids[1]], d0 = Math.hypot(o[0] - p[0], o[1] - p[1]);
        pts[e.pointerId] = [e.clientX, e.clientY];
        o = pts[ids[0]]; p = pts[ids[1]];
        var d1 = Math.hypot(o[0] - p[0], o[1] - p[1]);
        if (d0 > 0 && d1 > 0) zoom(d0 / d1);
        free(); dirty = true; return;
      }
      if (!drag.started && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
      drag.started = true;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY; pts[e.pointerId] = [e.clientX, e.clientY];
      if (drag.panning) pan(dx, dy);
      else { cam.yaw -= dx * 0.3; cam.pitch = Math.min(85, Math.max(-5, cam.pitch + dy * 0.25)); }
      free(); dirty = true;
    });
    function up(e) { delete pts[e.pointerId]; if (!Object.keys(pts).length) drag = null; }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.0012)); free(); dirty = true; }, { passive: false });
    window.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.target.closest('input,select,textarea,[contenteditable=true]')) return;
      if (e.key === '1') setView('iso'); if (e.key === '2') setView('exp'); if (e.key === '3') setView('jacket');
      if (e.key === '0' || e.key === 'r' || e.key === 'R') setView('iso');
    });
    document.querySelectorAll('[data-view]').forEach(function (bt) { bt.addEventListener('click', function () { setView(bt.dataset.view); }); });
    var reset = document.getElementById('bReset'); if (reset) reset.addEventListener('click', function () { setView('iso'); });
    toggle('tLabels', function (on) { labels.enabled = on; });
    toggle('tSignals', function (on) { renderer.visible.signal = on; });
    toggle('tProj', function (on) {
      var B = basis(cam), tanH = Math.tan(cam.fov * D2R / 2);
      if (on && cam.ortho) { cam.dist = cam.half / tanH; cam.ortho = false; }
      else if (!on && !cam.ortho) { cam.half = cam.dist * tanH; cam.ortho = true; }
    });
  }
  function toggle(id, fn) {
    var el = document.getElementById(id); if (!el) return;
    el.addEventListener('click', function () { el.classList.toggle('on'); fn(el.classList.contains('on')); dirty = true; });
  }

  // ---- automated visibility check: is each v3 port seen (not hidden) in a view? ----
  H.visibility = function (names, W, Hh) {
    var gl = renderer.gl, dp = renderer.dprog;
    W = W || 1920; Hh = Hh || 1080;
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, Hh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    var fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    var rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, W, Hh);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    var out = {}, px = new Uint8Array(4 * W * Hh);
    (names || ['iso', 'exp', 'jacket']).forEach(function (n) {
      var c = fit(H.views[n], W / Hh), m = matrices(c, W, Hh);
      gl.viewport(0, 0, W, Hh); gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.useProgram(dp.p); gl.uniformMatrix4fv(dp.u.uLVP, false, m.vp);
      ['base', 'floor'].forEach(function (k) { (renderer.layers[k] || []).forEach(function (ch) { renderer.bind(dp, ch, false); gl.drawElements(gl.TRIANGLES, ch.count, gl.UNSIGNED_SHORT, 0); }); });
      gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px);
      function lin(z) { return m.ortho ? (z * (m.far - m.near) + (m.far + m.near)) / 2 : 2 * m.near * m.far / (m.far + m.near - z * (m.far - m.near)); }
      var res = {};
      Object.keys(H.ports).forEach(function (k) {
        var q = M.transform(m.vp, H.ports[k]), x = (q[0] / q[3] * 0.5 + 0.5) * W, y = (q[1] / q[3] * 0.5 + 0.5) * Hh;
        if (q[3] <= 0 || x < 2 || y < 2 || x > W - 3 || y > Hh - 3) { res[k] = { inFrame: false, visible: false }; return; }
        var best = -1;
        for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
          var i = 4 * ((Math.round(y) + dy) * W + Math.round(x) + dx);
          var d = px[i] / 255 + px[i + 1] / 65025 + px[i + 2] / 16581375 + px[i + 3] / 4228250625;
          best = Math.max(best, d);
        }
        var zp = q[2] / q[3], occl = lin(zp) - lin(best * 2 - 1);
        res[k] = { inFrame: true, visible: occl < 0.1, occluderAhead: +occl.toFixed(3) };
      });
      out[n] = res;
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb); gl.deleteTexture(tex); gl.deleteRenderbuffer(rb);
    dirty = true;
    return out;
  };

  function start() {
    try { renderer = new H.Renderer(canvas); }
    catch (err) { document.getElementById('err').textContent = 'לא ניתן להציג תלת־ממד: ' + err.message; document.getElementById('err').style.display = 'block'; return; }
    renderer.upload(build(), { glass: ['glass'] });
    labels = H.Interaction ? new H.Interaction(stage, canvas, H.pickIndex) : new H.Labels(document.getElementById('labels'));
    if (capture) document.body.classList.add('capture');
    resize();
    setView(params.get('view') || 'iso');
    if (params.get('labels') === '0') labels.enabled = false;
    controls();
    window.addEventListener('resize', function () { resize(); });
    if (H.Interaction && window.ResizeObserver) new ResizeObserver(function () {
      if (!stage.clientWidth || !stage.clientHeight) return;
      resize();
      if (mode !== 'free') setView(mode);
    }).observe(stage);
    requestAnimationFrame(frame);
  }
  H.app = { setView: setView, get cam() { return cam; } };
  start();
})(window);
