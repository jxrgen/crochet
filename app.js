// ========== STL Parser ==========
class STParser {
  static parse(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const header = new TextDecoder().decode(new Uint8Array(arrayBuffer, 0, 5));
    if (header.includes('solid')) {
      return this.parseASCII(new TextDecoder().decode(new Uint8Array(arrayBuffer)));
    }
    return this.parseBinary(arrayBuffer);
  }

  static parseBinary(buffer) {
    const view = new DataView(buffer);
    const triangles = view.getUint32(80, true);
    const vertices = [];
    const normals = [];
    for (let i = 0; i < triangles; i++) {
      const base = 84 + i * 50;
      const nx = view.getFloat32(base, true);
      const ny = view.getFloat32(base + 4, true);
      const nz = view.getFloat32(base + 8, true);
      for (let j = 0; j < 3; j++) {
        const vBase = base + 12 + j * 12;
        vertices.push(view.getFloat32(vBase, true), view.getFloat32(vBase + 4, true), view.getFloat32(vBase + 8, true));
        normals.push(nx, ny, nz);
      }
    }
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), isBinary: true, triangleCount: triangles };
  }

  static parseASCII(text) {
    const vertices = [];
    const normals = [];
    const lines = text.split('\n');
    let currentNormal = [0, 0, 0];
    for (const line of lines) {
      const nMatch = line.match(/normal\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/);
      if (nMatch) currentNormal = [parseFloat(nMatch[1]), parseFloat(nMatch[2]), parseFloat(nMatch[3])];
      const vMatch = line.match(/vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/);
      if (vMatch) {
        vertices.push(parseFloat(vMatch[1]), parseFloat(vMatch[2]), parseFloat(vMatch[3]));
        normals.push(...currentNormal);
      }
    }
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), isBinary: false, triangleCount: vertices.length / 9 };
  }
}

// ========== Texture Generator v2 - Realistic Knit & Crochet ==========
class TextureGenerator {
  
  // ========== KNIT STITCH (Stockinette) ==========
  // Real knit has: V-shaped stitches in vertical columns
  // Each V is ~1.2-1.4x taller than wide
  // Rows stack perfectly aligned
  static knitPattern(x, y, scale, depth) {
    const w = scale;           // stitch width
    const h = scale * 1.3;    // stitch height (knit is taller)
    
    // Get position within stitch grid
    const col = x / w;
    const row = y / h;
    const colFrac = col - Math.floor(col);  // 0-1 within stitch width
    const rowFrac = row - Math.floor(row); // 0-1 within stitch height
    
    // V-shape: The stitch forms a V that points DOWNWARD
    // At top of stitch (rowFrac=0), V is wide
    // At bottom of stitch (rowFrac=1), V comes to point
    
    const cx = (colFrac - 0.5) * 2;  // -1 to 1, center x
    const vy = rowFrac;                   // 0 (top) to 1 (bottom)
    
    // V leg position: at top (vy=0), legs are at cx = ±0.8
    //                 at bottom (vy=1), legs meet at cx = 0
    const vLegPos = 0.8 - vy * 0.8;  // How far from center the leg is
    const distFromCenter = Math.abs(cx);
    
    let vShape = 0;
    if (distFromCenter < vLegPos) {
      // Inside the V - create the V shape
      const t = distFromCenter / vLegPos;  // 0 at center, 1 at leg
      vShape = Math.cos(t * Math.PI / 2);
    }
    
    // Horizontal bar at top of stitch (where yarn runs between stitches)
    const topBar = (vy < 0.05) ? Math.cos(vy / 0.05 * Math.PI / 2) * 0.3 : 0;
    
    // Column separation (valley between stitch columns)
    const colEdge = Math.max(0, 1 - Math.abs(colFrac - 0.5) * 8) * 0.15;
    
    // Combine: V is raised, bar slightly raised, edges slightly lowered
    const result = vShape * 0.9 + topBar - colEdge * 0.3;
    
    return (result - 0.3) * depth;
  }

  // ========== CROCHET STITCH (Single Crochet) ==========
  // Real crochet: dense fabric with V tops and interlocking loops
  // Each stitch: V at top, post going down, loop bump
  static crochetPattern(x, y, scale, depth) {
    const w = scale * 0.85;  // crochet stitches are narrower
    const h = scale * 0.7;   // crochet stitches are shorter
    
    const col = x / w;
    const row = y / h;
    let colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);
    const rowIdx = Math.floor(row);
    
    // Offset alternate rows (crochet interlocks)
    if (rowIdx % 2 === 1) {
      colFrac = (colFrac + 0.5) % 1.0;
    }
    
    const cx = (colFrac - 0.5) * 2;  // -1 to 1
    const cy = (rowFrac - 0.5) * 2;  // -1 to 1
    
    // === 1. V-SHAPE AT TOP (front & back loops) ===
    // Located at rowFrac ≈ 0.15 (near top of stitch)
    const vCenter = 0.15;
    const vDistX = Math.abs(cx);
    const vDistY = Math.abs(rowFrac - vCenter);
    const vWidth = 0.35;
    const vHeight = 0.08;
    const vShape = (vDistX < vWidth && vDistY < vHeight) ?
      Math.cos(vDistX / vWidth * Math.PI / 2) * Math.cos(vDistY / vHeight * Math.PI / 2) * 0.6 : 0;
    
    // === 2. HORIZONTAL BAR (the "third loop" behind) ===
    const barY = 0.20;
    const barShape = (Math.abs(cx) < 0.42 && Math.abs(rowFrac - barY) < 0.06) ?
      Math.cos((rowFrac - barY) / 0.06 * Math.PI / 2) * Math.cos(cx / 0.42 * Math.PI / 2) * 0.5 : 0;
    
    // === 3. POST (vertical stem going down) ===
    const postW = 0.18;
    const post = (Math.abs(cx) < postW) ?
      Math.cos(cx / postW * Math.PI / 2) * 0.35 * (1 - Math.abs(rowFrac - 0.5)) : 0;
    
    // === 4. MAIN LOOP BUMP ===
    const loopDist = Math.sqrt(Math.pow(cx / 0.32, 2) + Math.pow((cy + 0.05) / 0.22, 2));
    const loopBump = Math.max(0, 1 - loopDist * 1.7) * 0.6;
    
    // === 5. RIGHT LEAN (characteristic of crochet) ===
    const lean = cx * 0.06 * Math.sin(rowFrac * Math.PI);
    
    const result = vShape + barShape + post + loopBump + lean;
    return (result - 0.4) * depth;
  }

  // ========== RIB STITCH ==========
  static ribPattern(x, y, scale, depth) {
    const w = scale * 0.65;
    const h = scale * 1.3;
    const col = x / w;
    const colIdx = Math.floor(col);
    const colFrac = col - colIdx;
    const rowFrac = (y / h) - Math.floor(y / h);
    
    if (colIdx % 2 === 0) {
      // Knit column (V shapes)
      const cx = (colFrac - 0.5) * 2;
      const vShape = Math.max(0, 1 - Math.abs(cx) * 3.5) * 0.75;
      const bar = (rowFrac < 0.05) ? Math.cos(rowFrac / 0.05 * Math.PI / 2) * 0.25 : 0;
      return (vShape + bar) * depth * 0.5;
    } else {
      // Purl column (bumpy)
      const cx = (colFrac - 0.5) * 2;
      const cy = (rowFrac - 0.5) * 2;
      const dist = Math.sqrt(cx * cx * 0.7 + cy * cy * 1.3);
      return Math.max(0, 1 - dist * 2.2) * depth * 0.45;
    }
  }

  // ========== CABLE STITCH ==========
  static cablePattern(x, y, scale, depth) {
    const w = scale * 3.0;
    const h = scale * 1.5;
    const col = x / w;
    const row = y / h;
    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);
    
    const twist = Math.sin(row * Math.PI * 0.35) * 0.35;
    const tCol = (colFrac + twist) % 1;
    
    const s1x = (tCol - 0.25) * 4;
    const s2x = (tCol - 0.75) * 4;
    const sy = (rowFrac - 0.5) * 2;
    
    const s1 = Math.sqrt(s1x * s1x + sy * sy);
    const s2 = Math.sqrt(s2x * s2x + sy * sy);
    const r1 = Math.max(0, 1 - s1 * 1.8) * 0.65;
    const r2 = Math.max(0, 1 - s2 * 1.8) * 0.65;
    
    const cross = Math.abs(Math.sin(row * Math.PI * 0.5)) * Math.max(0, 1 - Math.abs(colFrac - 0.5) * 5) * 0.3;
    
    return Math.max(r1, r2) * depth * 0.7;
  }

  // ========== SEED STITCH ==========
  static seedPattern(x, y, scale, depth) {
    const w = scale * 1.1;
    const h = scale * 1.3;
    const col = Math.floor(x / w);
    const row = Math.floor(y / h);
    const colFrac = (x / w) - col;
    const rowFrac = (y / h) - row;
    
    if ((col + row) % 2 === 0) {
      // Purl bump
      const cx = (colFrac - 0.5) * 2;
      const cy = (rowFrac - 0.5) * 2;
      return Math.max(0, 1 - Math.sqrt(cx * cx + cy * cy) * 2.2) * depth * 0.55;
    } else {
      // Knit V
      const cx = (colFrac - 0.5) * 2;
      const vShape = Math.max(0, 1 - Math.abs(cx) * 3.5) * Math.cos(rowFrac * Math.PI * 0.9);
      return vShape * depth * 0.4;
    }
  }

  // ========== GARTER STITCH ==========
  static garterPattern(x, y, scale, depth) {
    const h = scale * 0.65;
    const rowFrac = (y / h) - Math.floor(y / h);
    const ridge = (Math.cos(rowFrac * Math.PI * 2) * 0.5 + 0.5) * 0.7;
    const w = scale * 1.1;
    const colFrac = (x / w) - Math.floor(x / w);
    const vTex = Math.max(0, 1 - Math.abs(colFrac - 0.5) * 5) * 0.25;
    return (ridge + vTex) * depth * 0.4;
  }

  // ========== BOBBLE STITCH ==========
  static bobblePattern(x, y, scale, depth) {
    const w = scale * 1.6;
    const h = scale * 1.6;
    const colFrac = (x / w) - Math.floor(x / w);
    const rowFrac = (y / h) - Math.floor(y / h);
    const dx = (colFrac - 0.5) * 2;
    const dy = (rowFrac - 0.5) * 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.75) {
      return Math.cos(dist / 0.75 * Math.PI / 2) * depth * 0.95;
    }
    return -0.2 * depth;
  }

  // ========== SHELL STITCH ==========
  static shellPattern(x, y, scale, depth) {
    const w = scale * 2.3;
    const h = scale * 1.1;
    const colFrac = (x / w) - Math.floor(x / w);
    const rowFrac = (y / h) - Math.floor(y / h);
    const fan = (Math.sin((colFrac - 0.5) * Math.PI * 3) * 0.5 + 0.5) * Math.sin(rowFrac * Math.PI) * 0.75;
    const detail = Math.sin(colFrac * Math.PI * 5) * Math.cos(rowFrac * Math.PI * 2.5) * 0.18;
    return (fan + detail) * depth * 0.65;
  }

  // ========== APPLY TO GEOMETRY ==========
  static applyPattern(geometry, patternType, scale, depth) {
    const posAttr = geometry.attributes.position;
    const normalAttr = geometry.attributes.normal;
    const vertexCount = posAttr.count;
    const newPositions = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const pz = posAttr.getZ(i);
      const nx = normalAttr.getX(i);
      const ny = normalAttr.getY(i);
      const nz = normalAttr.getZ(i);

      // Project to 2D based on dominant normal
      let u, v;
      const absNx = Math.abs(nx);
      const absNy = Math.abs(ny);
      const absNz = Math.abs(nz);
      
      if (absNx > absNy && absNx > absNz) { u = py; v = pz; }
      else if (absNy > absNx && absNy > absNz) { u = px; v = pz; }
      else { u = px; v = py; }

      let displacement = 0;
      switch (patternType) {
        case 'knit': displacement = this.knitPattern(u, v, scale, depth); break;
        case 'crochet': displacement = this.crochetPattern(u, v, scale, depth); break;
        case 'rib': displacement = this.ribPattern(u, v, scale, depth); break;
        case 'cable': displacement = this.cablePattern(u, v, scale, depth); break;
        case 'seed': displacement = this.seedPattern(u, v, scale, depth); break;
        case 'garter': displacement = this.garterPattern(u, v, scale, depth); break;
        case 'bobble': displacement = this.bobblePattern(u, v, scale, depth); break;
        case 'shell': displacement = this.shellPattern(u, v, scale, depth); break;
        default: displacement = this.knitPattern(u, v, scale, depth);
      }

      newPositions[i * 3] = px + nx * displacement;
      newPositions[i * 3 + 1] = py + ny * displacement;
      newPositions[i * 3 + 2] = pz + nz * displacement;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
}

// ========== STL Exporter ==========
class STLExporter {
  static exportBinary(geometry) {
    const posAttr = geometry.attributes.position;
    const vertexCount = posAttr.count;
    const triangleCount = vertexCount / 3;
    const buffer = new ArrayBuffer(84 + triangleCount * 50);
    const view = new DataView(buffer);
    new TextEncoder().encodeInto('Crothet Export', new Uint8Array(buffer, 0, 80));
    view.setUint32(80, triangleCount, true);

    for (let i = 0; i < triangleCount; i++) {
      const off = 84 + i * 50;
      const i3 = i * 9;
      if (geometry.attributes.normal) {
        view.setFloat32(off, geometry.attributes.normal.getX(i3), true);
        view.setFloat32(off + 4, geometry.attributes.normal.getY(i3), true);
        view.setFloat32(off + 8, geometry.attributes.normal.getZ(i3), true);
      }
      for (let v = 0; v < 3; v++) {
        const vo = off + 12 + v * 12;
        view.setFloat32(vo, posAttr.getX(i3 + v * 3), true);
        view.setFloat32(vo + 4, posAttr.getY(i3 + v * 3), true);
        view.setFloat32(vo + 8, posAttr.getZ(i3 + v * 3), true);
      }
      view.setUint16(off + 48, 0, true);
    }
    return buffer;
  }
}

// ========== App ==========
let scene, camera, renderer, controls, currentMesh, originalGeometry;

function initViewer() {
  const c = document.getElementById('viewer');
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x0f0f1a);
  camera = new THREE.PerspectiveCamera(45, c.clientWidth / c.clientHeight, 0.1, 1000);
  camera.position.set(50, 50, 50);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(c.clientWidth, c.clientHeight);
  c.appendChild(renderer.domElement);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(50, 100, 50); scene.add(dl);
  scene.add(new THREE.GridHelper(100, 20, 0x333333, 0x222222));
  window.addEventListener('resize', () => { camera.aspect = c.clientWidth / c.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(c.clientWidth, c.clientHeight); });
  (function anim() { requestAnimationFrame(anim); controls.update(); renderer.render(scene, camera); })();
}

function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.stl')) return showStatus('Vælg STL-fil', 'error');
  const r = new FileReader();
  r.onload = (e) => {
    try {
      const res = STParser.parse(e.target.result);
      loadGeometry(res.vertices, res.normals);
      showStatus(`Indlæst: ${res.triangleCount} trekanter`, 'success');
      document.getElementById('applyBtn').disabled = false;
      document.getElementById('info').innerHTML = `Trekanter: ${res.triangleCount}<br>Type: ${res.isBinary ? 'Binær' : 'ASCII'}`;
    } catch (err) { showStatus('Fejl: ' + err.message, 'error'); }
  };
  r.readAsArrayBuffer(file);
}

function loadGeometry(vertices, normals) {
  if (currentMesh) { scene.remove(currentMesh); currentMesh.geometry.dispose(); currentMesh.material.dispose(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  if (normals) geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.computeVertexNormals();
  originalGeometry = geo.clone();
  currentMesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0xe94560, specular: 0x222222, shininess: 30, side: THREE.DoubleSide }));
  scene.add(currentMesh);
  const box = new THREE.Box3().setFromObject(currentMesh);
  const cen = box.getCenter(new THREE.Vector3());
  camera.position.copy(cen).add(new THREE.Vector3(box.getSize(new THREE.Vector3()).max(), box.getSize(new THREE.Vector3()).max(), box.getSize(new THREE.Vector3()).max()));
  controls.target.copy(cen); controls.update();
}

function applyTexture() {
  if (!originalGeometry || !currentMesh) return;
  const type = document.getElementById('patternType').value;
  const scale = parseFloat(document.getElementById('scale').value);
  const depth = parseFloat(document.getElementById('depth').value);
  showStatus('Anvender tekstur...', 'success');
  setTimeout(() => {
    try {
      const geo = originalGeometry.clone();
      TextureGenerator.applyPattern(geo, type, scale, depth);
      currentMesh.geometry.dispose();
      currentMesh.geometry = geo;
      const colors = { 'knit': 0xe94560, 'crochet': 0xf4a460, 'rib': 0x3498db, 'cable': 0x2ecc71, 'seed': 0xe67e22, 'garter': 0x1abc9c, 'bobble': 0x9b59b6, 'shell': 0xf39c12 };
      currentMesh.material.color.setHex(colors[type] || 0xe94560);
      showStatus('Tekstur anvendt!', 'success');
      document.getElementById('downloadBtn').disabled = false;
    } catch (err) { showStatus('Fejl: ' + err.message, 'error'); }
  }, 50);
}

function downloadSTL() {
  if (!currentMesh) return;
  try {
    const b = STLExporter.exportBinary(currentMesh.geometry);
    const blob = new Blob([b], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'crothet_output.stl'; a.click();
    URL.revokeObjectURL(url); showStatus('Downloadet!', 'success');
  } catch (err) { showStatus('Fejl: ' + err.message, 'error'); }
}

function showStatus(msg, type) {
  const s = document.getElementById('status'); s.textContent = msg; s.className = type;
  if (type === 'success') setTimeout(() => { s.style.display = 'none'; }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  initViewer();
  const ua = document.getElementById('uploadArea');
  const fi = document.getElementById('fileInput');
  ua.addEventListener('click', () => fi.click());
  ua.addEventListener('dragover', (e) => { e.preventDefault(); ua.style.borderColor = '#ff6b81'; });
  ua.addEventListener('dragleave', () => { ua.style.borderColor = '#e94560'; });
  ua.addEventListener('drop', (e) => { e.preventDefault(); ua.style.borderColor = '#e94560'; if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
  fi.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });
  document.getElementById('applyBtn').addEventListener('click', applyTexture);
  document.getElementById('downloadBtn').addEventListener('click', downloadSTL);
  ['scale', 'depth'].forEach(id => {
    const sl = document.getElementById(id);
    const vs = document.getElementById(id + 'Value');
    sl.addEventListener('input', () => { vs.textContent = sl.value; });
  });
});
