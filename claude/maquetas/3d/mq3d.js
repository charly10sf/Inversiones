/* Toisón · el 3D hecho a mano (WebGL 1, sin librerías): la moneda de Hoy y el anillo del reparto.
   Maqueta del 15 nov 2026. Esto es lo que iría en el trozo «3d» de la app: se mide su peso tal cual.
   - Se pinta solo cuando algo se mueve (sin bucle fijo), salvo en las versiones «vivas».
   - Si no hay WebGL, crear…() devuelve null y se queda la versión plana que ya está debajo. */
(() => {
  'use strict';
  const { sin, cos, tan, PI, min, max, abs, sqrt, atan2, hypot } = Math;
  const TAU = PI * 2;
  /* ---------- matrices 4×4 (por columnas) ---------- */
  const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
  const persp = (fovy, asp, n, f) => { const t = 1 / tan(fovy / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; };
  const ident = () => { const o = new Float32Array(16); o[0] = o[5] = o[10] = o[15] = 1; return o; };
  const rotX = (a) => { const o = ident(), c = cos(a), s = sin(a); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o; };
  const rotY = (a) => { const o = ident(), c = cos(a), s = sin(a); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; };
  const rotZ = (a) => { const o = ident(), c = cos(a), s = sin(a); o[0] = c; o[1] = s; o[4] = -s; o[5] = c; return o; };
  const tras = (x, y, z) => { const o = ident(); o[12] = x; o[13] = y; o[14] = z; return o; };
  const m3 = (m) => new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);
  const norm3 = (v) => { const l = hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  /* ---------- lo común de WebGL ---------- */
  function contexto(lienzo) {
    const o = { alpha: true, antialias: true, premultipliedAlpha: true, depth: true, stencil: false, powerPreference: 'low-power' };
    try { return lienzo.getContext('webgl', o) || lienzo.getContext('experimental-webgl', o); } catch (e) { return null; }
  }
  function programa(g, vs, fs) {
    const sh = (t, s) => { const x = g.createShader(t); g.shaderSource(x, s); g.compileShader(x); if (!g.getShaderParameter(x, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(x)); return x; };
    const p = g.createProgram(); g.attachShader(p, sh(g.VERTEX_SHADER, vs)); g.attachShader(p, sh(g.FRAGMENT_SHADER, fs)); g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p));
    const u = {}, a = {};
    for (let i = 0, n = g.getProgramParameter(p, g.ACTIVE_UNIFORMS); i < n; i++) { const x = g.getActiveUniform(p, i), k = x.name.replace(/\[0\]$/, ''); u[k] = g.getUniformLocation(p, k); }
    for (let i = 0, n = g.getProgramParameter(p, g.ACTIVE_ATTRIBUTES); i < n; i++) { const x = g.getActiveAttrib(p, i); a[x.name] = g.getAttribLocation(p, x.name); }
    return { p, u, a };
  }
  const medir = (lienzo, g, tope, minimo) => {
    const d = min(tope || 2, max(minimo || 1, (window.devicePixelRatio || 1) * (lienzo.dataset.baja ? 0.5 : 1))), w = Math.round(lienzo.clientWidth * d), h = Math.round(lienzo.clientHeight * d);
    if (w && h && (lienzo.width !== w || lienzo.height !== h)) { lienzo.width = w; lienzo.height = h; }
    g.viewport(0, 0, lienzo.width, lienzo.height);
    return lienzo.width / max(1, lienzo.height);
  };
  /* un estudio de mentira para los reflejos: cielo suave, una caja de luz arriba que se mueve con la luz, y un rebote abajo */
  const GLSL_LUZ = `
    uniform vec3 uLuz;
    float entorno(vec3 r) {
      float cielo = smoothstep(-0.35, 0.85, r.y);
      float caja = smoothstep(0.34, 0.62, r.y) * smoothstep(0.62, 0.30, abs(r.x - uLuz.x * 0.9));
      float tira = smoothstep(0.88, 0.955, dot(r, normalize(vec3(-0.80 - uLuz.x * 0.3, 0.18, 0.56)))) * 0.5;
      float suelo = smoothstep(-0.25, -0.95, r.y) * 0.26;
      float frente = smoothstep(0.55, 1.0, r.z) * 0.32;   // lo que tiene delante: la sala, no un vacío negro
      return 0.08 + 0.40 * cielo + 1.25 * caja + tira + suelo + frente;
    }`;
  /* cuántos fotogramas por segundo salen de verdad (lo enseña la maqueta) */
  const fps = { n: 0, t: 0, v: 0, marca(t, lienzo) { if (this.t && t - this.t < 200) { this.v = this.v ? this.v * 0.9 + (1000 / (t - this.t)) * 0.1 : 1000 / (t - this.t); this.n++; if (lienzo && this.n > 40 && this.v < 42 && !lienzo.dataset.baja) lienzo.dataset.baja = '1'; } else this.n = 0; this.t = t; } };
  const quieto = () => { if (typeof window.T3D_QUIETO === 'function') return window.T3D_QUIETO(); try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  /* =====================================================================
     LA MONEDA: un disco torneado (perfil que gira), con canto de oro, campo de esmalte y el sello en relieve
     ===================================================================== */
  const CARA = 0.87;   // hasta dónde llega el campo de esmalte; de ahí al borde, el canto de oro
  function torno(perfil, n) {
    const v = [], idx = [];
    const seg = [];
    for (let i = 0; i < perfil.length - 1; i++) { const a = perfil[i], b = perfil[i + 1], dr = b[0] - a[0], dz = b[1] - a[1], l = hypot(dr, dz) || 1; seg.push([-dz / l, dr / l]); }
    for (let i = 0; i < seg.length; i++) {
      const a = perfil[i], b = perfil[i + 1], mat = b[2];
      // normal en cada extremo: la del tramo o, si la esquina es suave (b[3]), la media con el vecino
      const na = (a[3] && i > 0) ? [(seg[i][0] + seg[i - 1][0]) / 2, (seg[i][1] + seg[i - 1][1]) / 2] : seg[i];
      const nb = (b[3] && i < seg.length - 1) ? [(seg[i][0] + seg[i + 1][0]) / 2, (seg[i][1] + seg[i + 1][1]) / 2] : seg[i];
      const base = v.length / 7;
      for (let k = 0; k <= n; k++) {
        const f = k / n * TAU, c = cos(f), s = sin(f);
        v.push(a[0] * c, a[0] * s, a[1], na[0] * c, na[0] * s, na[1], mat);
        v.push(b[0] * c, b[0] * s, b[1], nb[0] * c, nb[0] * s, nb[1], mat);
      }
      for (let k = 0; k < n; k++) { const p = base + k * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
    }
    return { v: new Float32Array(v), i: new Uint16Array(idx) };
  }
  /* el sello (la O y la T) a una textura: rojo = la O, verde = la T, azul = la altura (los dos, con el borde suavizado) */
  function texturaSello(sello, T) {
    const c = document.createElement('canvas'); c.width = c.height = T;
    const x = c.getContext('2d'), vb = sello.vb, esc = T * (1.143 / (2 * CARA)) / vb[2];
    const pinta = (color, cual) => { x.save(); x.translate(T / 2, T / 2); x.scale(esc, esc); x.translate(-(vb[0] + vb[2] / 2), -(vb[1] + vb[3] / 2)); x.fillStyle = color; for (const d of cual) x.fill(new Path2D(d)); x.restore(); };
    x.fillStyle = '#000'; x.fillRect(0, 0, T, T);
    x.globalCompositeOperation = 'lighter';
    pinta('#f00', [sello.o]); pinta('#0f0', [sello.t]);
    const im = x.getImageData(0, 0, T, T), d = im.data, h = new Float32Array(T * T), t = new Float32Array(T * T);
    for (let i = 0; i < T * T; i++) h[i] = max(d[i * 4], d[i * 4 + 1]) / 255;
    const R = Math.round(T / 64);   // el bisel del relieve
    for (let pasada = 0; pasada < 2; pasada++) {
      for (let y = 0; y < T; y++) { let s = 0; for (let k = -R; k <= R; k++) s += h[y * T + min(T - 1, max(0, k))]; for (let xx = 0; xx < T; xx++) { t[y * T + xx] = s / (2 * R + 1); s += h[y * T + min(T - 1, xx + R + 1)] - h[y * T + max(0, xx - R)]; } }
      for (let xx = 0; xx < T; xx++) { let s = 0; for (let k = -R; k <= R; k++) s += t[min(T - 1, max(0, k)) * T + xx]; for (let y = 0; y < T; y++) { h[y * T + xx] = s / (2 * R + 1); s += t[min(T - 1, y + R + 1) * T + xx] - t[max(0, y - R) * T + xx]; } }
    }
    for (let i = 0; i < T * T; i++) d[i * 4 + 2] = Math.round(h[i] * 255);
    x.putImageData(im, 0, 0);
    return c;
  }
  const VS_MONEDA = `
    attribute vec3 aP; attribute vec3 aN; attribute float aM;
    uniform mat4 uMV, uPr;
    varying vec3 vPo, vNo, vV; varying float vM;
    void main() { vPo = aP; vNo = aN; vM = aM; vec4 p = uMV * vec4(aP, 1.0); vV = p.xyz; gl_Position = uPr * p; }`;
  const FS_MONEDA = `
    precision mediump float;
    ${GLSL_LUZ}
    uniform mat3 uNM; uniform sampler2D uSello; uniform vec3 uOro, uEsm, uO, uT; uniform vec4 uVidrio; uniform float uBrillo, uRel, uCristal;
    varying vec3 vPo, vNo, vV; varying float vM;
    void main() {
      vec3 no = vNo; vec4 t = vec4(0.0);
      if (vM > 0.5) {
        float lado = vPo.z > 0.0 ? 1.0 : -1.0;
        vec2 uv = vec2(vPo.x * lado, vPo.y) / ${CARA.toFixed(2)} * 0.5 + 0.5;
        t = texture2D(uSello, uv);
        float e = 1.0 / 360.0;
        float hx = texture2D(uSello, uv + vec2(e, 0.0)).b - texture2D(uSello, uv - vec2(e, 0.0)).b;
        float hy = texture2D(uSello, uv + vec2(0.0, e)).b - texture2D(uSello, uv - vec2(0.0, e)).b;
        no = normalize(vec3(-hx * lado * uRel, -hy * uRel, lado));
      } else if (abs(vNo.z) < 0.35) {
        float a = atan(vPo.y, vPo.x);   // el canto, estriado como el de una moneda
        no = normalize(no + vec3(-sin(a), cos(a), 0.0) * sin(a * 120.0) * 0.55);
      }
      vec3 N = normalize(uNM * no), V = normalize(-vV), L = normalize(uLuz), H = normalize(L + V);
      float ndl = max(dot(N, L), 0.0), ndh = max(dot(N, H), 0.0), fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
      float env = entorno(reflect(-V, N));
      vec3 luzc = vec3(1.0, 0.96, 0.88);
      vec3 col = uOro * (0.20 + 0.98 * env) + luzc * pow(ndh, 60.0) * 0.75;
      float alfa = 1.0;
      if (vM > 0.5) {
        float rr = length(vPo.xy) / ${CARA.toFixed(2)};
        vec3 esm = uEsm * (0.62 + 0.38 * ndl) + luzc * ((0.03 + 0.55 * fres) * env + pow(ndh, 140.0) * 0.6) * uBrillo;
        if (uCristal > 0.5) {
          // cristal: deja ver lo de detrás (el desenfoque lo pone el CSS), con su reflejo, su filo de luz y sombra hacia el borde
          if (dot(N, V) < 0.0) discard;
          float borde = smoothstep(0.55, 1.0, rr);
          vec3 refl = luzc * ((0.05 + 0.85 * fres) * env * 0.55 + pow(ndh, 160.0) * 0.8 + borde * borde * max(N.y * 0.0 + (vPo.y * 0.5 + 0.5), 0.0) * 0.16);
          alfa = clamp(uVidrio.a + borde * 0.22 + dot(refl, vec3(0.33)), 0.0, 1.0);
          esm = uVidrio.rgb * (uVidrio.a + borde * 0.22) * (1.0 - borde * 0.5) + refl;
        }
        vec3 co = uO * (0.55 + 0.45 * ndl) + luzc * pow(ndh, 36.0) * 0.22;
        vec3 ct = uT * (0.42 + 0.80 * env) + luzc * pow(ndh, 60.0) * 0.6;
        float filete = smoothstep(0.012, 0.004, abs(rr - 0.925));   // un filete fino de oro por dentro del canto
        float mo = smoothstep(0.35, 0.65, t.r), mt = max(smoothstep(0.35, 0.65, t.g), filete);
        col = mix(mix(esm, co, mo), ct, mt); alfa = mix(mix(alfa, 1.0, mo), 1.0, mt);
      }
      gl_FragColor = vec4(col, alfa);
    }`;
  const TEMAS_MONEDA = {
    marmol: { oro: [0.89, 0.70, 0.36], esm: [0.045, 0.042, 0.036], o: [0.97, 0.96, 0.94], t: [0.89, 0.70, 0.36], brillo: 1.0, vidrio: [0.0, 0.0, 0.0, 0.30] },
    marfil: { oro: [0.80, 0.61, 0.28], esm: [1.0, 0.96, 0.87], o: [0.30, 0.06, 0.11], t: [0.68, 0.49, 0.17], brillo: 0.35, vidrio: [1.0, 0.97, 0.90, 0.66] },
  };
  function crearMoneda(lienzo, op) {
    const g = contexto(lienzo); if (!g) return null;
    let pr;
    try { pr = programa(g, VS_MONEDA, FS_MONEDA); } catch (e) { return null; }
    const H = 0.085, F = 0.058, B = 0.04;
    // perfil [r, z, material del tramo que llega aquí (1 = cara, 0 = oro), esquina suave]
    const perfil = [[0, F, 1, 0], [CARA, F, 1, 0], [CARA + 0.022, H, 0, 0], [0.962, H, 0, 0], [0.988, H - B * 0.3, 0, 1], [1.0, H - B, 0, 1], [1.0, -(H - B), 0, 1], [0.988, -(H - B * 0.3), 0, 1], [0.962, -H, 0, 1], [CARA + 0.022, -H, 0, 0], [CARA, -F, 0, 0], [0, -F, 1, 0]];
    const malla = torno(perfil, 96);
    const vb = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, vb); g.bufferData(g.ARRAY_BUFFER, malla.v, g.STATIC_DRAW);
    const ib = g.createBuffer(); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ib); g.bufferData(g.ELEMENT_ARRAY_BUFFER, malla.i, g.STATIC_DRAW);
    const tex = g.createTexture(); g.bindTexture(g.TEXTURE_2D, tex); g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, texturaSello(op.sello, 512));
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR); g.generateMipmap(g.TEXTURE_2D);
    g.enable(g.DEPTH_TEST); g.clearColor(0, 0, 0, 0); g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
    const E = { cristal: !!op.cristal, giro: 0, vGiro: 0, ix: 0, iy: 0, tix: 0, tiy: 0, lx: -0.35, ly: 0.62, tlx: -0.35, tly: 0.62, vivo: false, tema: op.tema || 'marmol', raf: 0, t0: 0, visible: true, pintado: false, roto: false };
    const FOV = 0.36, DIST = 1.5 * (1 / tan(FOV / 2));   // la moneda ocupa dos tercios del lienzo: sitio para girar sin cortarse
    function pinta(t) {
      E.raf = 0; if (E.roto) return;
      const dt = min(0.05, E.t0 ? (t - E.t0) / 1000 : 0.016); E.t0 = t; fps.marca(t, lienzo);
      // muelles: el giro (una vuelta y se asienta), la inclinación y la luz
      const obj = Math.round(E.giroObj / TAU) * TAU; E.giroObj = obj;
      E.vGiro += ((E.giroObj - E.giro) * 24 - E.vGiro * 7.6) * dt; E.giro += E.vGiro * dt;
      const k = 1 - Math.exp(-dt * 9);
      let bx = E.tix, by = E.tiy, blx = E.tlx, bly = E.tly;
      if (E.vivo && !quieto()) { const s = t / 1000; by += sin(s * 0.55) * 0.20; bx += sin(s * 0.41 + 1) * 0.07; blx += sin(s * 0.33) * 0.45; }
      E.ix += (bx - E.ix) * k; E.iy += (by - E.iy) * k; E.lx += (blx - E.lx) * k; E.ly += (bly - E.ly) * k;
      const asp = medir(lienzo, g, 4, 3);
      const mv = mul(tras(0, 0, -DIST), mul(rotX(E.ix), rotY(E.iy + E.giro)));
      const c = TEMAS_MONEDA[E.tema] || TEMAS_MONEDA.marmol;
      g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
      g.useProgram(pr.p);
      g.bindBuffer(g.ARRAY_BUFFER, vb); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ib);
      g.enableVertexAttribArray(pr.a.aP); g.vertexAttribPointer(pr.a.aP, 3, g.FLOAT, false, 28, 0);
      g.enableVertexAttribArray(pr.a.aN); g.vertexAttribPointer(pr.a.aN, 3, g.FLOAT, false, 28, 12);
      g.enableVertexAttribArray(pr.a.aM); g.vertexAttribPointer(pr.a.aM, 1, g.FLOAT, false, 28, 24);
      g.uniformMatrix4fv(pr.u.uMV, false, mv); g.uniformMatrix4fv(pr.u.uPr, false, persp(FOV, asp, 0.1, 30)); g.uniformMatrix3fv(pr.u.uNM, false, m3(mv));
      g.uniform3fv(pr.u.uLuz, norm3([E.lx, E.ly, 0.72]));
      g.uniform3fv(pr.u.uOro, c.oro); g.uniform3fv(pr.u.uEsm, c.esm); g.uniform3fv(pr.u.uO, c.o); g.uniform3fv(pr.u.uT, c.t);
      g.uniform1f(pr.u.uBrillo, c.brillo); g.uniform1f(pr.u.uRel, 2.6); g.uniform1i(pr.u.uSello, 0);
      g.uniform1f(pr.u.uCristal, E.cristal ? 1 : 0); g.uniform4fv(pr.u.uVidrio, c.vidrio);
      if (op.alGirar) op.alGirar(abs(cos(E.iy + E.giro)));
      g.drawElements(g.TRIANGLES, malla.i.length, g.UNSIGNED_SHORT, 0);
      if (!E.pintado) { E.pintado = true; if (op.alPintar) op.alPintar(); }
      const moviendo = abs(E.giroObj - E.giro) > 0.002 || abs(E.vGiro) > 0.02 || abs(bx - E.ix) + abs(by - E.iy) + abs(blx - E.lx) + abs(bly - E.ly) > 0.004;
      if ((moviendo || (E.vivo && !quieto())) && E.visible && !document.hidden) pide(); else E.t0 = 0;
    }
    const pide = () => { if (!E.raf && !E.roto) E.raf = requestAnimationFrame(pinta); };
    E.giroObj = 0;
    lienzo.addEventListener('webglcontextlost', (e) => { e.preventDefault(); E.roto = true; if (op.alFallar) op.alFallar(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pide(); });
    if ('IntersectionObserver' in window) new IntersectionObserver((x) => { E.visible = x[0].isIntersecting; if (E.visible) pide(); }).observe(lienzo);
    pide();
    return {
      girar(vueltas) { if (quieto()) return; E.giroObj += TAU * (vueltas || 1); pide(); },
      inclinar(x, y) { E.tiy = max(-1, min(1, x)) * 0.30; E.tix = max(-1, min(1, y)) * 0.22; E.tlx = -0.35 + x * 0.75; E.tly = 0.62 - y * 0.35; if (quieto()) { E.tix = E.tiy = 0; } pide(); },
      soltar() { E.tix = E.tiy = 0; E.tlx = -0.35; E.tly = 0.62; pide(); },
      tema(t) { E.tema = t; pide(); },
      cristal(si) { E.cristal = !!si; pide(); },
      vivo(si) { E.vivo = !!si; pide(); },
      pintar: pide,
      destruir() { E.roto = true; cancelAnimationFrame(E.raf); const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); },
    };
  }

  /* =====================================================================
     EL ANILLO: cada trozo es un arco con grosor y bisel. Los ángulos, la altura y lo que sube el elegido van en
     uniformes: cambiar de reparto o elegir un trozo no rehace la malla, solo mueve números.
     ===================================================================== */
  const NSEG = 8, RI = 0.69, RO = 1.0, HH = 0.07, BIS = 0.042, PASOS = 80, ARCO = 4;
  function mallaAnillo() {
    // el corte del anillo: un rectángulo con las cuatro esquinas redondeadas; cada punto lleva su normal (suave en la curva)
    const S = [], cen = [[RO - BIS, -HH + BIS, -PI / 2], [RO - BIS, HH - BIS, 0], [RI + BIS, HH - BIS, PI / 2], [RI + BIS, -HH + BIS, PI]];
    for (const [cr, cz, a0] of cen) for (let k = 0; k <= ARCO; k++) { const a = a0 + k / ARCO * PI / 2; S.push([cr + cos(a) * BIS, cz + sin(a) * BIS, cos(a), sin(a)]); }
    const n = S.length, v = [], idx = [];
    for (let s = 0; s < NSEG; s++) {
      const base = v.length / 7;
      for (let k = 0; k <= PASOS; k++) for (let c = 0; c < n; c++) v.push(k / PASOS, S[c][0], S[c][1], s, S[c][2], S[c][3], 0);
      for (let k = 0; k < PASOS; k++) for (let c = 0; c < n; c++) { const a = base + k * n + c, b = base + k * n + (c + 1) % n; idx.push(a, b, a + n, b, b + n, a + n); }
      for (const [t, lado] of [[0, -1], [1, 1]]) {   // las dos tapas del trozo
        const b2 = v.length / 7;
        for (let c = 0; c < n; c++) v.push(t, S[c][0], S[c][1], s, 0, 0, lado);
        for (let c = 1; c < n - 1; c++) idx.push(b2, b2 + c, b2 + c + 1);
      }
    }
    return { v: new Float32Array(v), i: new Uint16Array(idx) };
  }
  const VS_ANILLO = `
    attribute vec4 aP; attribute vec3 aN;
    uniform mat4 uMV, uPr; uniform mat3 uNM; uniform vec4 uSeg[${NSEG}]; uniform vec4 uCol[${NSEG}];
    varying vec3 vN, vV; varying vec4 vC; varying float vArr;
    void main() {
      int i = int(aP.w + 0.5); vec4 s = uSeg[i];
      float a = mix(s.x, s.y, aP.x), c = cos(a), sn = sin(a);
      float z = (aP.z + ${HH.toFixed(3)}) * s.w - ${HH.toFixed(3)} + s.z;
      float r = aP.y + s.z * 0.22;
      vec4 p = uMV * vec4(r * c, r * sn, z, 1.0);
      vec3 n = abs(aN.z) > 0.5 ? vec3(sn, -c, 0.0) * aN.z : vec3(aN.x * c, aN.x * sn, aN.y);
      vN = uNM * n; vV = p.xyz; vC = uCol[i]; vArr = 1.0 - 0.30 * max(0.0, -aN.x) * (1.0 - abs(aN.z));
      gl_Position = uPr * p;
      if (abs(s.x - s.y) < 0.0005 || s.w < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);   // un trozo vacío no se pinta
    }`;
  const FS_ANILLO = `
    precision mediump float;
    ${GLSL_LUZ}
    uniform float uMetal;
    varying vec3 vN, vV; varying vec4 vC; varying float vArr;
    void main() {
      vec3 N = normalize(vN), V = normalize(-vV), L = normalize(uLuz), H = normalize(L + V);
      float ndh = max(dot(N, H), 0.0), fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
      float dif = 0.5 + 0.5 * dot(N, L); dif *= dif;
      float env = entorno(reflect(-V, N));
      vec3 luzc = vec3(1.0, 0.97, 0.90), c = vC.rgb;
      // cerámica lacada: el color mate debajo y, encima, un barniz que refleja el estudio (más en los cantos)
      float barniz = 0.045 + 0.955 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      vec3 sat = c * (0.30 + 0.60 * dif + 0.05 * env) * vArr + luzc * (env * barniz * 0.55 + pow(ndh, 180.0) * 0.55 + pow(ndh, 24.0) * 0.05);
      vec3 met = c * (0.22 + 0.36 * env + 0.24 * dif) * vArr + luzc * (pow(ndh, 120.0) * 0.6 + fres * env * 0.14);
      vec3 col = mix(sat, met, uMetal) * vC.a;
      gl_FragColor = vec4(col, 1.0);
    }`;
  const suave = (x) => 1 - Math.pow(1 - max(0, min(1, x)), 3);
  const conRebote = (x) => { x = max(0, min(1, x)); const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function crearAnillo(lienzo, op) {
    const g = contexto(lienzo); if (!g) return null;
    let pr;
    try { pr = programa(g, VS_ANILLO, FS_ANILLO); } catch (e) { return null; }
    const malla = mallaAnillo();
    const vb = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, vb); g.bufferData(g.ARRAY_BUFFER, malla.v, g.STATIC_DRAW);
    const ib = g.createBuffer(); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ib); g.bufferData(g.ELEMENT_ARRAY_BUFFER, malla.i, g.STATIC_DRAW);
    g.enable(g.DEPTH_TEST); g.clearColor(0, 0, 0, 0);
    const FOV = 0.42, DIST = 4.3, INCL = 0.60, HUECO = 0.03, MINIMO = 0.012;
    const vacio = () => Array.from({ length: NSEG }, () => ({ v: 0, c: [0.5, 0.5, 0.5] }));
    const E = { de: vacio(), a: vacio(), tCambio: 0, cambio: 1, entra: 0, tEntra: 0, giro: 0, giroObj: 0, vGiro: 0, sel: -1, sube: new Float32Array(NSEG), luz: new Float32Array(NSEG).fill(1), metal: 0, vivo: false, lx: -0.3, ly: 0.75, tlx: -0.3, raf: 0, t0: 0, visible: true, pintado: false, roto: false, arrastra: null, asp: 1.3, fr: [] };
    const repartir = (lista) => {   // de pesos a fracciones de vuelta, con un mínimo para que lo pequeño se vea
      const tot = lista.reduce((s, x) => s + x.v, 0) || 1; let f = lista.map((x) => (x.v > 0 ? max(MINIMO, x.v / tot) : 0)); const s = f.reduce((p, x) => p + x, 0) || 1; return f.map((x) => x / s);
    };
    function actual(t) {
      const k = E.cambio = suave((t - E.tCambio) / 650), fa = repartir(E.a), fd = repartir(E.de), out = []; let ac = 0;
      for (let i = 0; i < NSEG; i++) { const f = fd[i] + (fa[i] - fd[i]) * k, c = E.de[i].c.map((x, j) => x + (E.a[i].c[j] - x) * k); out.push({ ini: ac, fin: ac + f, c }); ac += f; }
      return out;
    }
    function pinta(t) {
      E.raf = 0; if (E.roto) return;
      const dt = min(0.05, E.t0 ? (t - E.t0) / 1000 : 0.016); E.t0 = t; fps.marca(t, lienzo);
      if (!E.tEntra) E.tEntra = t; if (!E.tCambio) E.tCambio = t - 1000;
      const p = quieto() ? 1 : min(1, (t - E.tEntra) / 1150), barrido = suave(p);
      const fr = E.fr = actual(t);
      if (E.vivo && !quieto() && !E.arrastra && E.sel < 0) E.giroObj += dt * 0.16;
      if (!E.arrastra) { E.vGiro += ((E.giroObj - E.giro) * 46 - E.vGiro * 11) * dt; E.giro += E.vGiro * dt; }
      const k = 1 - Math.exp(-dt * 10); let mueve = false;
      E.lx += (E.tlx - E.lx) * (1 - Math.exp(-dt * 5));
      const seg = new Float32Array(NSEG * 4), col = new Float32Array(NSEG * 4);
      for (let i = 0; i < NSEG; i++) {
        const os = E.sel === i ? 0.11 : 0, ol = E.sel < 0 || E.sel === i ? 1 : 0.45;
        if (abs(os - E.sube[i]) > 0.0005 || abs(ol - E.luz[i]) > 0.002) mueve = true;
        E.sube[i] += (os - E.sube[i]) * k; E.luz[i] += (ol - E.luz[i]) * k;
        const ancho = (fr[i].fin - fr[i].ini) * TAU, h = ancho > HUECO * 2.2 ? HUECO / 2 : ancho * 0.2;
        seg[i * 4] = PI / 2 - (fr[i].ini * TAU + h) * barrido; seg[i * 4 + 1] = PI / 2 - (fr[i].fin * TAU - h) * barrido;
        seg[i * 4 + 2] = E.sube[i]; seg[i * 4 + 3] = ancho > 0 ? conRebote((p * 1.5 - i * 0.07) / 0.62) : 0;
        col[i * 4] = fr[i].c[0]; col[i * 4 + 1] = fr[i].c[1]; col[i * 4 + 2] = fr[i].c[2]; col[i * 4 + 3] = E.luz[i];
      }
      E.asp = medir(lienzo, g, 3, 2);
      const mv = mul(tras(0, 0.04, -DIST), mul(rotX(-INCL), rotZ(E.giro)));
      g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
      g.useProgram(pr.p);
      g.bindBuffer(g.ARRAY_BUFFER, vb); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ib);
      g.enableVertexAttribArray(pr.a.aP); g.vertexAttribPointer(pr.a.aP, 4, g.FLOAT, false, 28, 0);
      g.enableVertexAttribArray(pr.a.aN); g.vertexAttribPointer(pr.a.aN, 3, g.FLOAT, false, 28, 16);
      g.uniformMatrix4fv(pr.u.uMV, false, mv); g.uniformMatrix4fv(pr.u.uPr, false, persp(FOV, E.asp, 0.5, 20)); g.uniformMatrix3fv(pr.u.uNM, false, m3(mv));
      g.uniform4fv(pr.u.uSeg, seg); g.uniform4fv(pr.u.uCol, col);
      g.uniform3fv(pr.u.uLuz, norm3([E.lx, E.ly, 0.62])); g.uniform1f(pr.u.uMetal, E.metal);
      g.drawElements(g.TRIANGLES, malla.i.length, g.UNSIGNED_SHORT, 0);
      if (!E.pintado) { E.pintado = true; if (op.alPintar) op.alPintar(); }
      const sigue = p < 1 || E.cambio < 1 || mueve || abs(E.giroObj - E.giro) > 0.002 || abs(E.vGiro) > 0.01 || abs(E.tlx - E.lx) > 0.004 || (E.vivo && !quieto() && E.sel < 0);
      if (sigue && E.visible && !document.hidden) pide(); else E.t0 = 0;
    }
    const pide = () => { if (!E.raf && !E.roto) E.raf = requestAnimationFrame(pinta); };
    /* qué trozo hay debajo del dedo: el rayo de la cámara, cortado con la cara de arriba del anillo */
    function trozoEn(cx, cy) {
      const r = lienzo.getBoundingClientRect(), nx = ((cx - r.left) / r.width) * 2 - 1, ny = 1 - ((cy - r.top) / r.height) * 2, th = tan(FOV / 2);
      const d = [nx * th * E.asp, ny * th, -1], o = [0, -0.04, DIST];
      const ci = cos(INCL), si = sin(INCL), gx = (v) => [v[0], v[1] * ci - v[2] * si, v[1] * si + v[2] * ci];   // deshace rotX(-INCL)
      const cg = cos(-E.giro), sg = sin(-E.giro), gz = (v) => [v[0] * cg - v[1] * sg, v[0] * sg + v[1] * cg, v[2]];   // deshace rotZ(giro)
      const o2 = gz(gx(o)), d2 = gz(gx(d)); if (abs(d2[2]) < 1e-5) return -1;
      const t = (HH - o2[2]) / d2[2], x = o2[0] + d2[0] * t, y = o2[1] + d2[1] * t, rad = hypot(x, y);
      if (t < 0 || rad < RI - 0.05 || rad > RO + 0.06) return -1;
      const f = (((PI / 2 - atan2(y, x)) % TAU) + TAU) % TAU / TAU;
      return E.fr.findIndex((s) => f >= s.ini && f < s.fin && s.fin - s.ini > 0);
    }
    const alFrente = (i) => { const s = E.fr[i]; if (!s) return; const medio = PI / 2 - (s.ini + s.fin) / 2 * TAU; let obj = -PI / 2 - medio; obj += Math.round((E.giro - obj) / TAU) * TAU; E.giroObj = obj; };
    function elegir(i, callar) { E.sel = i === E.sel ? -1 : i; if (E.sel >= 0 && !quieto()) alFrente(E.sel); if (!callar && op.alElegir) op.alElegir(E.sel); pide(); }
    // tocar elige; arrastrar gira (con el dedo o con el ratón)
    lienzo.addEventListener('pointerdown', (e) => { E.arrastra = { x: e.clientX, g: E.giro, mov: 0, t: performance.now(), vx: 0 }; try { lienzo.setPointerCapture(e.pointerId); } catch (x) { /* da igual */ } });
    lienzo.addEventListener('pointermove', (e) => {
      const r = lienzo.getBoundingClientRect(); E.tlx = -0.3 + (((e.clientX - r.left) / r.width) - 0.5) * 0.9;
      const a = E.arrastra; if (a) { const dx = e.clientX - a.x; a.mov = max(a.mov, abs(dx)); if (a.mov > 6 && !quieto()) { const n = a.g + dx / r.width * 3.2; a.vx = (n - E.giro) / max(0.008, (performance.now() - a.t) / 1000); a.t = performance.now(); E.giro = E.giroObj = n; } }
      pide();
    });
    const suelta = (e) => { const a = E.arrastra; if (!a) return; E.arrastra = null; if (a.mov <= 6) { const i = trozoEn(e.clientX, e.clientY); if (i >= 0) elegir(i); else if (E.sel >= 0) elegir(E.sel); } else { E.vGiro = max(-6, min(6, a.vx || 0)); E.giroObj = E.giro + E.vGiro * 0.09; if (E.sel >= 0) { E.sel = -1; if (op.alElegir) op.alElegir(-1); } } pide(); };
    lienzo.addEventListener('pointerup', suelta); lienzo.addEventListener('pointercancel', () => { E.arrastra = null; });
    lienzo.addEventListener('pointerleave', () => { E.tlx = -0.3; pide(); });
    lienzo.addEventListener('webglcontextlost', (e) => { e.preventDefault(); E.roto = true; if (op.alFallar) op.alFallar(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pide(); });
    if ('IntersectionObserver' in window) new IntersectionObserver((x) => { E.visible = x[0].isIntersecting; if (E.visible) pide(); }).observe(lienzo);
    return {
      poner(lista, sinMover) {   // lista: [{ v, c: [r, g, b] }]
        const ahora = performance.now(), fr = E.fr.length ? E.fr : null;
        E.de = fr && !sinMover ? fr.map((s, i) => ({ v: s.fin - s.ini, c: s.c })) : vacio();
        E.a = vacio().map((x, i) => (lista[i] ? { v: lista[i].v, c: lista[i].c } : { v: 0, c: (lista[lista.length - 1] || x).c }));
        if (!fr || sinMover) E.de = E.a;
        E.tCambio = sinMover || quieto() ? ahora - 1000 : ahora; E.sel = -1; pide();
      },
      entrar() { E.tEntra = 0; E.giro = E.giroObj = quieto() ? 0 : -0.9; E.giroObj = 0; E.vGiro = 0; E.sel = -1; pide(); },
      elegir, material(metal, vivo) { E.metal = metal; E.vivo = !!vivo; pide(); },
      pintar: pide,
      destruir() { E.roto = true; cancelAnimationFrame(E.raf); const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); },
    };
  }
  window.T3D = { moneda: crearMoneda, anillo: crearAnillo, fps };
})();
