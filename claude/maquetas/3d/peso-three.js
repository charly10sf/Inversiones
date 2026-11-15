// lo mínimo para una moneda y un anillo con three.js: para saber cuánto pesaría de verdad
import { WebGLRenderer, Scene, PerspectiveCamera, Mesh, LatheGeometry, ExtrudeGeometry, Shape, MeshStandardMaterial, DirectionalLight, AmbientLight, CanvasTexture, Vector2, PMREMGenerator, Color, Raycaster } from 'three';
const r = new WebGLRenderer({ antialias: true, alpha: true }), s = new Scene(), c = new PerspectiveCamera(24, 1.3, 0.1, 50);
const pm = new PMREMGenerator(r); s.environment = pm.fromScene(new Scene()).texture;
const moneda = new Mesh(new LatheGeometry([new Vector2(0, 0.05), new Vector2(1, 0.05)], 72), new MeshStandardMaterial({ color: new Color('#e3b45f'), metalness: 1, roughness: 0.3, bumpMap: new CanvasTexture(document.createElement('canvas')) }));
const sh = new Shape(); sh.absarc(0, 0, 1, 0, 1, false);
const anillo = new Mesh(new ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: true }), new MeshStandardMaterial({ color: 0x7fa7d6 }));
s.add(moneda, anillo, new DirectionalLight(0xffffff, 2), new AmbientLight(0xffffff, 0.4));
new Raycaster().setFromCamera(new Vector2(0, 0), c);
r.setAnimationLoop(() => r.render(s, c)); document.body.appendChild(r.domElement);
