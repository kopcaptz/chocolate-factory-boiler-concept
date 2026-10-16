// WebGL 1 renderer: hemispheric + directional light, PCF shadow map, procedural floor grid.
(function (root) {
  var M = root.HE3D.M;

  var VS = [
    'attribute vec3 aPos; attribute vec3 aNor; attribute vec4 aCol; attribute float aMat;',
    'uniform mat4 uVP; uniform mat4 uLVP;',
    'varying vec3 vPos; varying vec3 vNor; varying vec4 vCol; varying float vMat; varying vec4 vL;',
    'void main(){ vPos=aPos; vNor=aNor; vCol=aCol; vMat=aMat; vL=uLVP*vec4(aPos,1.0); gl_Position=uVP*vec4(aPos,1.0); }'
  ].join('\n');

  var FS = [
    '#ifdef GL_OES_standard_derivatives',
    '#extension GL_OES_standard_derivatives : enable',
    '#endif',
    'precision highp float;',
    'varying vec3 vPos; varying vec3 vNor; varying vec4 vCol; varying float vMat; varying vec4 vL;',
    'uniform vec3 uCam; uniform vec3 uLdir; uniform sampler2D uShadow; uniform float uSz;',
    'uniform float uFloor; uniform float uOrtho; uniform vec3 uViewDir;',
    'float unpack(vec4 c){ return dot(c, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0)); }',
    'float shadow(){',
    '  vec3 p = vL.xyz / vL.w * 0.5 + 0.5;',
    '  if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0||p.z>1.0) return 1.0;',
    '  float s=0.0; float b=0.0015;',
    '  for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){',
    '    float d = unpack(texture2D(uShadow, p.xy + vec2(float(i),float(j))/uSz));',
    '    s += (p.z - b > d) ? 0.0 : 1.0; }',
    '  return s/9.0; }',
    'void main(){',
    '  vec3 N = normalize(vNor);',
    '  vec3 V = uOrtho > 0.5 ? -uViewDir : normalize(uCam - vPos);',
    '  vec3 L = -uLdir;',
    '  vec3 base = vCol.rgb;',
    '  if(uFloor > 0.5){',
    '    vec2 g = vPos.xz; float line = 0.0;',
    '    #ifdef GL_OES_standard_derivatives',
    '    vec2 w = fwidth(g); vec2 f = abs(fract(g - 0.5) - 0.5) / max(w, vec2(1e-4));',
    '    line = 1.0 - min(min(f.x, f.y), 1.0);',
    '    vec2 g5 = g / 5.0; vec2 w5 = fwidth(g5); vec2 f5 = abs(fract(g5 - 0.5) - 0.5) / max(w5, vec2(1e-4));',
    '    line = max(line * 0.5, 1.0 - min(min(f5.x, f5.y), 1.0));',
    '    #endif',
    '    base = mix(base, base * 0.86, line);',
    '  }',
    '  float sh = shadow();',
    '  float hemi = 0.5 + 0.5 * N.y;',
    '  vec3 amb = mix(vec3(0.50,0.49,0.47), vec3(0.93,0.95,0.98), hemi);',
    '  float dif = max(dot(N, L), 0.0);',
    '  vec3 H = normalize(L + V);',
    '  float shin = mix(12.0, 90.0, vMat);',
    '  float spec = pow(max(dot(N, H), 0.0), shin) * mix(0.06, 0.55, vMat) * sh;',
    '  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.12;',
    '  float ao = mix(0.55, 1.0, sh);',
    '  vec3 col = base * (amb * 0.62 * mix(0.82, 1.0, sh) + dif * sh * 0.58) + vec3(spec) + rim;',
    '  if(uFloor > 0.5){ float d = length(vPos.xz - vec2(8.5, 1.0)); col = mix(col, vec3(0.955,0.962,0.97), smoothstep(13.0, 22.0, d)); }',
    '  gl_FragColor = vec4(col, vCol.a);',
    '}'
  ].join('\n');

  var DVS = 'attribute vec3 aPos; uniform mat4 uLVP; void main(){ gl_Position = uLVP * vec4(aPos,1.0); }';
  var DFS = [
    'precision highp float;',
    'vec4 pack(float d){ vec4 e = vec4(1.0, 255.0, 65025.0, 16581375.0) * d; e = fract(e);',
    '  e -= e.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0); return e; }',
    'void main(){ gl_FragColor = pack(gl_FragCoord.z); }'
  ].join('\n');

  function compile(gl, vs, fs) {
    function sh(t, s) {
      var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
      return o;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var info = { p: p, a: {}, u: {} };
    ['aPos', 'aNor', 'aCol', 'aMat'].forEach(function (n) { info.a[n] = gl.getAttribLocation(p, n); });
    ['uVP', 'uLVP', 'uCam', 'uLdir', 'uShadow', 'uSz', 'uFloor', 'uOrtho', 'uViewDir'].forEach(function (n) {
      info.u[n] = gl.getUniformLocation(p, n);
    });
    return info;
  }

  function Renderer(canvas) {
    var gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true, alpha: false });
    if (!gl) throw new Error('WebGL אינו זמין בדפדפן זה');
    this.gl = gl; this.canvas = canvas;
    this.derivs = !!gl.getExtension('OES_standard_derivatives');
    this.prog = compile(gl, VS, FS);
    this.dprog = compile(gl, DVS, DFS);
    this.layers = {}; this.visible = {};
    this.lightDir = M.norm([-0.45, -1.0, -0.55]);
    this.initShadow(2048);
  }
  Renderer.prototype.initShadow = function (sz) {
    var gl = this.gl;
    this.sz = sz;
    this.stex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.stex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sz, sz, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.sfb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sfb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.stex, 0);
    var rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, sz, sz);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  // upload finished builder output: {layer: [chunk…]}
  Renderer.prototype.upload = function (out, flags) {
    var gl = this.gl;
    for (var k in out) {
      this.layers[k] = out[k].map(function (c) {
        function buf(data, target) { var b = gl.createBuffer(); gl.bindBuffer(target || gl.ARRAY_BUFFER, b); gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; }
        return { pos: buf(c.pos), nor: buf(c.nor), col: buf(c.col), mat: buf(c.mat), idx: buf(c.idx, gl.ELEMENT_ARRAY_BUFFER),
          count: c.count, center: c.center };
      });
      if (this.visible[k] == null) this.visible[k] = true;
    }
    this.flags = flags || {};
  };
  Renderer.prototype.bind = function (prog, c, full) {
    var gl = this.gl, a = prog.a;
    gl.bindBuffer(gl.ARRAY_BUFFER, c.pos); gl.enableVertexAttribArray(a.aPos); gl.vertexAttribPointer(a.aPos, 3, gl.FLOAT, false, 0, 0);
    if (full) {
      gl.bindBuffer(gl.ARRAY_BUFFER, c.nor); gl.enableVertexAttribArray(a.aNor); gl.vertexAttribPointer(a.aNor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, c.col); gl.enableVertexAttribArray(a.aCol); gl.vertexAttribPointer(a.aCol, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, c.mat); gl.enableVertexAttribArray(a.aMat); gl.vertexAttribPointer(a.aMat, 1, gl.FLOAT, false, 0, 0);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, c.idx);
  };
  // light-space matrix covering the scene bounds
  Renderer.prototype.lightMatrix = function (bounds) {
    var c = M.scale(M.add(bounds.min, bounds.max), 0.5), r = M.len(M.sub(bounds.max, bounds.min)) / 2;
    var eye = M.sub(c, M.scale(this.lightDir, r * 2));
    var view = M.lookAt(eye, c, [0, 1, 0]);
    return M.mul(M.ortho(-r, r, -r, r, 0.1, r * 4), view);
  };
  Renderer.prototype.render = function (cam, bounds, opts) {
    var gl = this.gl, self = this, w = this.canvas.width, h = this.canvas.height;
    var LVP = this.lightMatrix(bounds);
    var opaque = [], glass = [];
    for (var k in this.layers) {
      if (!this.visible[k]) continue;
      var isGlass = (this.flags.glass || []).indexOf(k) >= 0;
      this.layers[k].forEach(function (c) { (isGlass ? glass : opaque).push({ c: c, floor: k === 'floor', shadow: k !== 'floor' && k !== 'signal' }); });
    }
    // shadow pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sfb);
    gl.viewport(0, 0, this.sz, this.sz);
    gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    gl.useProgram(this.dprog.p);
    gl.uniformMatrix4fv(this.dprog.u.uLVP, false, LVP);
    for (var i = 0; i < opaque.length; i++) if (opaque[i].shadow) {
      this.bind(this.dprog, opaque[i].c, false);
      gl.drawElements(gl.TRIANGLES, opaque[i].c.count, gl.UNSIGNED_SHORT, 0);
    }
    for (i = 0; i < 4; i++) gl.disableVertexAttribArray(i);
    // main pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    var bg = opts.background || [0.955, 0.962, 0.97];
    gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var P = this.prog, u = P.u;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(u.uVP, false, cam.vp);
    gl.uniformMatrix4fv(u.uLVP, false, LVP);
    gl.uniform3fv(u.uCam, cam.eye); gl.uniform3fv(u.uViewDir, cam.dir);
    gl.uniform1f(u.uOrtho, cam.ortho ? 1 : 0);
    gl.uniform3fv(u.uLdir, this.lightDir);
    gl.uniform1f(u.uSz, this.sz);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.stex); gl.uniform1i(u.uShadow, 0);
    function draw(list) {
      list.forEach(function (o) {
        gl.uniform1f(u.uFloor, o.floor ? 1 : 0);
        self.bind(P, o.c, true);
        gl.drawElements(gl.TRIANGLES, o.c.count, gl.UNSIGNED_SHORT, 0);
      });
    }
    gl.depthMask(true);
    draw(opaque);
    if (glass.length) {
      glass.sort(function (a, b) { return M.dot(M.sub(b.c.center, cam.eye), cam.dir) - M.dot(M.sub(a.c.center, cam.eye), cam.dir); });
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      draw(glass);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
  };
  root.HE3D.Renderer = Renderer;
})(window);
