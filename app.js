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

// ========== Texture Generator with Real Displacement Maps ==========
class TextureGenerator {
  static displacementCanvas = null;
  static displacementCtx = null;
  static displacementImageData = null;
  static mapSize = 512; // Match the displacement map size

  static initDisplacementMap() {
    if (this.displacementCanvas) return;
    
    // Create canvas and load the displacement map
    this.displacementCanvas = document.createElement('canvas');
    this.displacementCanvas.width = this.mapSize;
    this.displacementCanvas.height = this.mapSize;
    this.displacementCtx = this.displacementCanvas.getContext('2d');
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.displacementCtx.drawImage(img, 0, 0, this.mapSize, this.mapSize);
      this.displacementImageData = this.displacementCtx.getImageData(0, 0, this.mapSize, this.mapSize);
    };
    img.src = 'displacement-maps/front.jpg'; // Use the front displacement map
  }

  static getDisplacementAt(u, v) {
    if (!this.displacementImageData) return 0;
    
    // Convert UV (0-1) to pixel coordinates
    let x = Math.floor(u * this.mapSize);
    let y = Math.floor(v * this.mapSize);
    
    // Wrap around (tileable)
    x = ((x % this.mapSize) + this.mapSize) % this.mapSize;
    y = ((y % this.mapSize) + this.mapSize) % this.mapSize;
    
    const idx = (y * this.mapSize + x) * 4; // RGBA
    const r = this.displacementImageData.data[idx];
    // Convert 0-255 to -0.5 to 0.5 range (displacement)
    return (r / 255.0 - 0.5) * 2.0;
  }

  // Apply real displacement map to geometry
  static applyRealDisplacement(geometry, scale, depth) {
    const posAttr = geometry.attributes.position;
    const normalAttr = geometry.attributes.normal;
    const vertexCount = posAttr.count;
    const newPositions = new Float32Array(vertexCount * 3);

    // Initialize displacement map if not already done
    this.initDisplacementMap();

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

      // Convert to 0-1 range (tileable)
      u = (u / scale) % 1.0;
      v = (v / scale) % 1.0;
      if (u < 0) u += 1.0;
      if (v < 0) v += 1.0;

      // Get displacement from map
      const displacement = this.getDisplacementAt(u, v) * depth;

      newPositions[i * 3] = px + nx * displacement;
      newPositions[i * 3 + 1] = py + ny * displacement;
      newPositions[i * 3 + 2] = pz + nz * displacement;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  // Fallback procedural patterns (if displacement map not loaded)
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

      let u, v;
      const absNx = Math.abs(nx);
      const absNy = Math.abs(ny);
      const absNz = Math.abs(nz);

      if (absNx > absNy && absNx > absNz) { u = py; v = pz; }
      else if (absNy > absNx && absNy > absNz) { u = px; v = pz; }
      else { u = px; v = py; }

      let displacement = 0;
      switch (patternType) {
        case 'knit':
          displacement = this.simpleKnit(u, v, scale, depth);
          break;
        case 'crochet':
          displacement = this.simpleCrochet(u, v, scale, depth);
          break;
        default:
          displacement = this.simpleKnit(u, v, scale, depth);
      }

      newPositions[i * 3] = px + nx * displacement;
      newPositions[i * 3 + 1] = py + ny * displacement;
      newPositions[i * 3 + 2] = pz + nz * displacement;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  // Simple fallback knit pattern
  static simpleKnit(x, y, scale, depth) {
    const w = scale;
    const h = scale * 1.3;
    const col = x / w;
    const row = y / h;
    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);

    const cx = (colFrac - 0.5) * 2;
    const vy = rowFrac;
    const vLegPos = 0.8 - vy * 0.8;
    const distFromCenter = Math.abs(cx);

    let vShape = 0;
    if (distFromCenter < vLegPos) {
      const t = distFromCenter / vLegPos;
      vShape = Math.cos(t * Math.PI / 2);
    }

    const topBar = (vy < 0.05) ? Math.cos(vy / 0.05 * Math.PI / 2) * 0.3 : 0;
    const colEdge = Math.max(0, 1 - Math.abs(colFrac - 0.5) * 8) * 0.15;

    return (vShape * 0.9 + topBar - colEdge * 0.3 - 0.3) * depth;
  }

  // Simple fallback crochet pattern
  static simpleCrochet(x, y, scale, depth) {
    const w = scale * 0.85;
    const h = scale * 0.7;
    const col = x / w;
    const row = y / h;
    let colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);
    const rowIdx = Math.floor(row);

    if (rowIdx % 2 === 1) {
      colFrac = (colFrac + 0.5) % 1.0;
    }

    const cx = (colFrac - 0.5) * 2;
    const cy = (rowFrac - 0.5) * 2;

    // V-shape at top
    const vY = 0.15;
    const vDistX = Math.abs(cx);
    const vDistY = Math.abs(rowFrac - vY);
    const vShape = (vDistX < 0.38 && vDistY < 0.09) ?
      Math.cos(vDistX / 0.38 * Math.PI / 2) * Math.cos(vDistY / 0.09 * Math.PI / 2) * 0.6 : 0;

    // Loop bump
    const loopDist = Math.sqrt(Math.pow(cx / 0.32, 2) + Math.pow((cy + 0.05) / 0.22, 2));
    const loopBump = Math.max(0, 1 - loopDist * 1.7) * 0.6;

    // Lean
    const lean = cx * 0.07 * Math.sin(rowFrac * Math.PI);

    return (vShape + loopBump + lean - 0.4) * depth;
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
      const offset = 84 + i * 50;
      const i3 = i * 9;

      if (geometry.attributes.normal) {
        view.setFloat32(offset, geometry.attributes.normal.getX(i3), true);
        view.setFloat32(offset + 4, geometry.attributes.normal.getY(i3), true);
        view.setFloat32(offset + 8, geometry.attributes.normal.getZ(i3), true);
      }

      for (let v = 0; v < 3; v++) {
        const vo = offset + 12 + v * 12;
        view.setFloat32(vo, posAttr.getX(i3 + v * 3), true);
        view.setFloat32(vo + 4, posAttr.getY(i3 + v * 3), true);
        view.setFloat32(vo + 8, posAttr.getZ(i3 + v * 3), true);
      }
      view.setUint16(offset + 48, 0, true);
    }
    return buffer;
  }
}

// ========== App State ==========
let scene, camera, renderer, controls;
let currentMesh = null;
let originalGeometry = null;

// ========== Three.js Init ==========
function initViewer() {
  const container = document.getElementById('viewer');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f0f1a);

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(50, 50, 50);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8);
  dl.position.set(50, 100, 50);
  scene.add(dl);

  scene.add(new THREE.GridHelper(100, 20, 0x333333, 0x222222));

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  (function anim() {
    requestAnimationFrame(anim);
    controls.update();
    renderer.render(scene, camera);
  })();
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
  currentMesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    color: 0xe94560, specular: 0x222222, shininess: 30, side: THREE.DoubleSide
  }));
  scene.add(currentMesh);
  const box = new THREE.Box3().setFromObject(currentMesh);
  const cen = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  camera.position.copy(cen).add(new THREE.Vector3(size.x, size.y, size.z));
  controls.target.copy(cen);
  controls.update();
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
      // Use real displacement map for knit, fallback for others
      if (type === 'knit') {
        TextureGenerator.applyRealDisplacement(geo, scale, depth);
      } else {
        TextureGenerator.applyPattern(geo, type, scale, depth);
      }
      currentMesh.geometry.dispose();
      currentMesh.geometry = geo;
      const colors = {
        'knit': 0xe94560, 'crochet': 0xf4a460, 'rib': 0x3498db,
        'cable': 0x2ecc71, 'seed': 0xe67e22, 'garter': 0x1abc9c,
        'bobble': 0x9b59b6, 'shell': 0xf39c12
      };
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
    const a = document.createElement('a');
    a.href = url; a.download = 'crothet_output.stl';
    a.click();
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
  initViewer();
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
  document.getElementById('applyBtn').addEventListener('click', applyTexture);
  document.getElementById('downloadBtn').addEventListener('click', downloadSTL);
  ['scale', 'depth'].forEach(id => {
    const sl = document.getElementById(id);
    const vs = document.getElementById(id + 'Value');
    sl.addEventListener('input', () => { vs.textContent = sl.value; });
  });
});
