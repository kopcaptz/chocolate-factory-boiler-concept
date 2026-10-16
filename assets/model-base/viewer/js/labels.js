// HTML label layer: crisp RTL text anchored to 3D points, greedy collision avoidance,
// leader lines in an SVG overlay. Labels never become textures.
(function (root) {
  var H = root.HE3D, M = H.M;
  var DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [0.8, -0.6], nw: [-0.8, -0.6], se: [0.8, 0.6], sw: [-0.8, 0.6] };
  var ORDER = ['n', 'ne', 'nw', 'e', 'w', 's', 'se', 'sw'];

  function Labels(host) {
    this.host = host;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'leaders');
    host.appendChild(this.svg);
    this.items = H.labels.map(function (l, i) {
      var el = document.createElement('div');
      el.className = 'lbl c-' + l.c;
      el.setAttribute('dir', 'rtl');
      el.innerHTML = '<b></b>' + (l.s ? '<span></span>' : '');
      el.querySelector('b').textContent = l.t;
      if (l.s) el.querySelector('span').textContent = l.s;
      host.appendChild(el);
      return { l: l, el: el, i: i, w: 0, h: 0 };
    });
    this.enabled = true;
  }
  Labels.prototype.measure = function () {
    this.items.forEach(function (it) {
      it.el.style.display = 'block'; it.el.style.left = '0px'; it.el.style.top = '0px';
      it.w = it.el.offsetWidth; it.h = it.el.offsetHeight;
    });
  };
  // cam: {vp, w, h}; mode: view name or 'free'; level: max priority shown in free mode
  Labels.prototype.layout = function (cam, mode, level, obstacles, maxPrio) {
    var W = cam.w, Hh = cam.h, placed = [], dots = [], lines = [];
    if (!this.items[0].w) this.measure();
    var list = this.items.filter(function (it) {
      if (!this.enabled) return false;
      return mode === 'free' ? it.l.p <= level : (it.l.v.indexOf(mode) >= 0 && it.l.p <= (maxPrio || 9));
    }, this).sort(function (a, b) { return a.l.p - b.l.p || a.i - b.i; });
    var pad = 5 * (cam.scale || 1), gap = 14 * (cam.scale || 1);
    // reserve all anchors first so labels avoid covering connection points
    var anchors = list.map(function (it) {
      var q = M.transform(cam.vp, it.l.at);
      if (q[3] <= 0) return null;
      return [(q[0] / q[3] * 0.5 + 0.5) * W, (1 - (q[1] / q[3] * 0.5 + 0.5)) * Hh];
    });
    this.items.forEach(function (it) { it.el.style.display = 'none'; });
    list.forEach(function (it, k) {
      var a = anchors[k];
      if (!a || a[0] < -20 || a[0] > W + 20 || a[1] < -20 || a[1] > Hh + 20) return;
      var w = it.w, h = it.h, best = null;
      var dirs = [it.l.d].concat(ORDER.filter(function (d) { return d !== it.l.d; }));
      for (var pass = 0; pass < 2 && !best; pass++) for (var ring = 0; ring < 4 && !best; ring++) {
        for (var j = 0; j < dirs.length; j++) {
          var dv = DIRS[dirs[j]], dist = gap + ((dirs[j] === it.l.d ? it.l.o : 0) || 0) * (cam.scale || 1) + ring * 26 * (cam.scale || 1);
          var cx = a[0] + dv[0] * (dist + w / 2), cy = a[1] + dv[1] * (dist + h / 2);
          var r = { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
          if (r.x < 4 || r.y < 4 || r.x + w > W - 4 || r.y + h > Hh - 4) continue;
          if (hits(r, placed, pad) || dotHit(r, anchors, k)) continue;
          if (pass === 0 && obstacles && dotHit(r, obstacles, -1)) continue; // keep ports uncovered
          best = r; break;
        }
      }
      if (!best) {
        if (it.l.p > 1) return;
        var dv0 = DIRS[it.l.d];
        best = { x: Math.min(Math.max(4, a[0] + dv0[0] * (gap + w / 2) - w / 2), W - w - 4),
          y: Math.min(Math.max(4, a[1] + dv0[1] * (gap + h / 2) - h / 2), Hh - h - 4), w: w, h: h };
      }
      placed.push(best);
      it.el.style.display = 'block';
      it.el.style.left = best.x + 'px'; it.el.style.top = best.y + 'px';
      var ex = Math.min(Math.max(a[0], best.x), best.x + w), ey = Math.min(Math.max(a[1], best.y), best.y + h);
      lines.push([a[0], a[1], ex, ey, it.l.c]);
      dots.push([a[0], a[1], it.l.c]);
    });
    this.svg.setAttribute('width', W); this.svg.setAttribute('height', Hh);
    this.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    var s = cam.scale || 1, html = '';
    lines.forEach(function (l) { html += '<line class="ln c-' + l[4] + '" x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] + '" stroke-width="' + (1.2 * s) + '"/>'; });
    dots.forEach(function (d) { html += '<circle class="dt c-' + d[2] + '" cx="' + d[0] + '" cy="' + d[1] + '" r="' + (3 * s) + '" stroke-width="' + (1.4 * s) + '"/>'; });
    this.svg.innerHTML = html;
  };
  function hits(r, placed, pad) {
    for (var i = 0; i < placed.length; i++) {
      var p = placed[i];
      if (r.x < p.x + p.w + pad && r.x + r.w + pad > p.x && r.y < p.y + p.h + pad && r.y + r.h + pad > p.y) return true;
    }
    return false;
  }
  function dotHit(r, anchors, self) {
    for (var i = 0; i < anchors.length; i++) {
      if (i === self || !anchors[i]) continue;
      var a = anchors[i];
      if (a[0] > r.x - 3 && a[0] < r.x + r.w + 3 && a[1] > r.y - 3 && a[1] < r.y + r.h + 3) return true;
    }
    return false;
  }
  H.Labels = Labels;
})(window);
