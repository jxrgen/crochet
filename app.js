// ========== STL Parser ==========
class STParser {
  static parse(buffer) {
    if (buffer.byteLength > 5) {
      const h = new TextDecoder().decode(new Uint8Array(buffer, 0, 5));
      if (h.includes('solid')) return this.parseASCII(new TextDecoder().decode(new Uint8Array(buffer)));
    }
    return this.parseBinary(buffer);
  }

  static parseBinary(buf) {
    const v = new DataView(buf);
    const n = v.getUint32(80, true);
    const verts = [], norms = [];
    for (let i = 0; i < n; i++) {
      const b = 84 + i * 50;
      const nx = v.getFloat32(b, true), ny = v.getFloat32(b+4, true), nz = v.getFloat32(b+8, true);
      for (let j = 0; j < 3; j++) {
        const vb = b + 12 + j * 12;
        verts.push(v.getFloat32(vb, true), v.getFloat32(vb+4, true), v.getFloat32(vb+8, true));
        norms.push(nx, ny, nz);
      }
    }
    return { vertices: new Float32Array(verts), normals: new Float32Array(norms), binary: true, tris: n };
  }

  static parseASCII(text) {
    const verts = [], norms = [];
    const lines = text.split('\n');
    let cn = [0,0,0];
    for (const line of lines) {
      const nm = line.match(/normal\s+([\deE+-]+)\s+([\deE+-]+)\s+([\deE+-]+)/);
      if (nm) cn = [parseFloat(nm[1]), parseFloat(nm[2]), parseFloat(nm[3])];
      const vm = line.match(/vertex\s+([\deE+-]+)\s+([\deE+-]+)\s+([\deE+-]+)/);
      if (vm) {
        verts.push(parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3]));
        norms.push(...cn);
      }
    }
    return { vertices: new Float32Array(verts), normals: new Float32Array(norms), binary: false, tris: verts.length/9 };
  }
}

// ========== Texture Manager ==========
class TextureMgr {
  constructor() {
    this.textures = {};
    this.loaded = false;
    this.loadAll();
  }

  loadAll() {
    const tex = ['knitting', 'knurling'];
    let loaded = 0;
    for (const t of tex) {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        this.textures[t] = {
          data: ctx.getImageData(0, 0, c.width, c.height).data,
          w: c.width, h: c.height
        };
        loaded++;
        if (loaded === tex.length) { this.loaded = true; console.log('Textures loaded!'); }
      };
      img.src = `textures/${t}.png`;
    }
  }

  getDisp(name, u, v) {
    const tex = this.textures[name];
    if (!tex) return 0;
    const x = Math.floor(((u % 1) + 1) % 1 * tex.w);
    const y = Math.floor(((v % 1) + 1) % 1 * tex.h);
    const idx = (y * tex.w + x) * 4;
    return (tex.data[idx] / 128.0) - 1.0; // -1..1
  }
}

// ========== Apply Texture ==========
function applyTextureToGeo(geometry, pattern, scale, depth, texMgr) {
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const count = pos.count;
  const newPos = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const nx = norm.getX(i), ny = norm.getY(i), nz = norm.getZ(i);

    // Project to 2D based on dominant normal
    let u, v;
    const anx = Math.abs(nx), any = Math.abs(ny), anz = Math.abs(nz);
    if (anx > any && anx > anz) { u = py; v = pz; }
    else if (any > anx && any > anz) { u = px; v = pz; }
    else { u = px; v = py; }

    // Scale to stitch grid
    const su = (u / scale) * 0.8;
    const sv = (v / (scale * (pattern === 'knitting' ? 1.3 : 0.72))) * 0.8;

    // Get displacement from texture
    const d = texMgr.getDisp(pattern, su, sv) * depth;

    newPos[i*3]   = px + nx * d;
    newPos[i*3+1] = py + ny * d;
    newPos[i*3+2] = pz + nz * d;
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// ========== STL Exporter ==========
class STLExporter {
  static export(geo) {
    const pos = geo.attributes.position;
    const tri = pos.count / 3;
    const buf = new ArrayBuffer(84 + tri * 50);
    const v = new DataView(buf);
    new TextEncoder().encodeInto('Crothet', new Uint8Array(buf, 0, 80));
    v.setUint32(80, tri, true);

    for (let i = 0; i < tri; i++) {
      const o = 84 + i * 50;
      const i3 = i * 9;
      if (geo.attributes.normal) {
        v.setFloat32(o, geo.attributes.normal.getX(i3), true);
        v.setFloat32(o+4, geo.attributes.normal.getY(i3), true);
        v.setFloat32(o+8, geo.attributes.normal.getZ(i3), true);
      }
      for (let j = 0; j < 3; j++) {
        const vo = o + 12 + j * 12;
        v.setFloat32(vo, pos.getX(i3+j*3), true);
        v.setFloat32(vo+4, pos.getY(i3+j*3), true);
        v.setFloat32(vo+8, pos.getZ(i3+j*3), true);
      }
      v.setUint16(o+48, 0, true);
    }
    return buf;
  }
}

// ========== App ==========
let scene, camera, renderer, controls, mesh, origGeo;
let texMgr = null;

function init() {
  const c = document.getElementById('viewer');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f0f1a);
  camera = new THREE.PerspectiveCamera(45, c.clientWidth/c.clientHeight, 0.1, 1000);
  camera.position.set(50,50,50);
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(c.clientWidth, c.clientHeight);
  c.appendChild(renderer.domElement);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8);
  dl.position.set(50,100,50);
  scene.add(dl);
  scene.add(new THREE.GridHelper(100, 20, 0x333333, 0x222222));
  window.addEventListener('resize', () => {
    camera.aspect = c.clientWidth/c.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(c.clientWidth, c.clientHeight);
  });
  (function anim() { requestAnimationFrame(anim); controls.update(); renderer.render(scene, camera); })();
  texMgr = new TextureMgr();
}

function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.stl')) return showStatus('Vælg STL-fil', 'error');
  const r = new FileReader();
  r.onload = (e) => {
    try {
      const res = STParser.parse(e.target.result);
      loadGeo(res.vertices, res.normals);
      showStatus(`Indlæst: ${res.tris} trekanter`, 'success');
      document.getElementById('applyBtn').disabled = false;
      document.getElementById('info').innerHTML = `Trekanter: ${res.tris}<br>Type: ${res.binary ? 'Binær' : 'ASCII'}`;
    } catch (err) { showStatus('Fejl: ' + err.message, 'error'); }
  };
  r.readAsArrayBuffer(file);
}

function loadGeo(verts, norms) {
  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  if (norms) geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
  geo.computeVertexNormals();
  origGeo = geo.clone();
  mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    color: 0xe94560, specular: 0x222222, shininess: 30, side: THREE.DoubleSide
  }));
  scene.add(mesh);
  const box = new THREE.Box3().setFromObject(mesh);
  const cen = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  camera.position.copy(cen).add(new THREE.Vector3(s.x, s.y, s.z));
  controls.target.copy(cen);
  controls.update();
}

function apply() {
  if (!origGeo || !mesh || !texMgr || !texMgr.loaded) {
    return showStatus('Vent venligst på teksturer loader...', 'error');
  }
  const type = document.getElementById('patternType').value;
  const scale = parseFloat(document.getElementById('scale').value);
  const depth = parseFloat(document.getElementById('depth').value);
  const pattern = type === 'knit' ? 'knitting' : 'knurling';
  showStatus('Anvender tekstur...', 'success');
  setTimeout(() => {
    try {
      const geo = origGeo.clone();
      applyTextureToGeo(geo, pattern, scale, depth, texMgr);
      mesh.geometry.dispose();
      mesh.geometry = geo;
      const colors = { 'knit': 0xe94560, 'crochet': 0xf4a460 };
      mesh.material.color.setHex(colors[type] || 0xe94560);
      showStatus('Tekstur anvendt!', 'success');
      document.getElementById('downloadBtn').disabled = false;
    } catch (err) { showStatus('Fejl: ' + err.message, 'error'); }
  }, 50);
}

function download() {
  if (!mesh) return;
  try {
    const b = STLExporter.export(mesh.geometry);
    const blob = new Blob([b], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'crothet_output.stl'; a.click();
    URL.revokeObjectURL(url);
    showStatus('Downloadet!', 'success');
  } catch (err) { showStatus('Fejl: ' + err.message, 'error'); }
}

function showStatus(msg, type) {
  const s = document.getElementById('status');
  s.textContent = msg; s.className = type;
  if (type === 'success') setTimeout(() => { s.style.display = 'none'; }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  const ua = document.getElementById('uploadArea');
  const fi = document.getElementById('fileInput');
  ua.addEventListener('click', () => fi.click());
  ua.addEventListener('dragover', (e) => { e.preventDefault(); ua.style.borderColor = '#ff6b81'; });
  ua.addEventListener('dragleave', () => { ua.style.borderColor = '#e94560'; });
  ua.addEventListener('drop', (e) => {
    e.preventDefault(); ua.style.borderColor = '#e94560';
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fi.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });
  document.getElementById('applyBtn').addEventListener('click', apply);
  document.getElementById('downloadBtn').addEventListener('click', download);
  ['scale','depth'].forEach(id => {
    const sl = document.getElementById(id);
    const vs = document.getElementById(id+'Value');
    sl.addEventListener('input', () => { vs.textContent = sl.value; });
  });
});
