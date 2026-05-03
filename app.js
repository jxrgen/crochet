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
    const offset = 84;

    for (let i = 0; i < triangles; i++) {
      const base = offset + i * 50;
      const nx = view.getFloat32(base, true);
      const ny = view.getFloat32(base + 4, true);
      const nz = view.getFloat32(base + 8, true);

      for (let j = 0; j < 3; j++) {
        const vBase = base + 12 + j * 12;
        vertices.push(
          view.getFloat32(vBase, true),
          view.getFloat32(vBase + 4, true),
          view.getFloat32(vBase + 8, true)
        );
        normals.push(nx, ny, nz);
      }
    }
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), isBinary: true, triangleCount: triangles };
  }

  static parseASCII(text) {
    const vertices = [];
    const normals = [];
    const normalRegex = /normal\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/;
    const vertexRegex = /vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/;
    
    const lines = text.split('\n');
    let currentNormal = [0, 0, 0];
    
    for (const line of lines) {
      const nMatch = line.match(normalRegex);
      if (nMatch) {
        currentNormal = [parseFloat(nMatch[1]), parseFloat(nMatch[2]), parseFloat(nMatch[3])];
      }
      const vMatch = line.match(vertexRegex);
      if (vMatch) {
        vertices.push(parseFloat(vMatch[1]), parseFloat(vMatch[2]), parseFloat(vMatch[3]));
        normals.push(...currentNormal);
      }
    }
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), isBinary: false, triangleCount: vertices.length / 9 };
  }
}

// ========== Texture Generator - Iteration 5 (Final) ==========
// Based on 5 iterations of research and improvement
class TextureGenerator {
  
  // ========== KNIT STITCHES ==========
  
  // Stockinette Stitch (Iteration 5 - Final)
  // Research: V-shaped columns, purl bumps on alternate rows
  // V's on right side, horizontal bumps on wrong side
  static knitPattern(x, y, scale, depth) {
    const sw = scale;          // Stitch width
    const sh = scale * 1.4;   // Stitch height (knit is taller)
    
    const col = x / sw;
    const row = y / sh;
    const colIdx = Math.floor(col);
    const rowIdx = Math.floor(row);
    const colFrac = col - colIdx;
    const rowFrac = row - rowIdx;
    
    const isKnitRow = (rowIdx % 2) === 0; // Even rows = knit (V side)
    
    if (isKnitRow) {
      // === KNIT SIDE (V-shapes) ===
      const cx = (colFrac - 0.5) * 2; // -1..1
      const vWidth = 0.8 - rowFrac * 0.4; // V wider at top
      const vx = Math.abs(cx);
      
      // V-shape with proper taper
      let vShape = 0;
      if (vx < vWidth) {
        const t = vx / vWidth;
        vShape = Math.cos(t * Math.PI / 2) * 0.9;
      }
      
      // Top bar (yarn connecting stitches)
      const topBar = Math.max(0, 1 - Math.abs(rowFrac - 0.05) * 25) * 0.35;
      
      // Vertical line between columns
      const colEdge = Math.max(0, 1 - Math.abs(colFrac - 0.5) * 12) * 0.2;
      
      return (vShape + topBar + colEdge * 0.3 - 0.25) * depth;
      
    } else {
      // === PURL SIDE (Wrong side - bumps) ===
      const cx = (colFrac - 0.5) * 2;
      const cy = (rowFrac - 0.5) * 2;
      
      // Purl bump (horizontal ridge)
      const bumpW = 0.35;
      const bumpH = 0.25;
      const dist = Math.sqrt(
        Math.pow(cx / bumpW, 2) + 
        Math.pow(cy / bumpH, 2)
      );
      const purlBump = Math.max(0, 1 - dist * 2) * 0.7;
      
      // Depression between bumps
      const valley = -Math.max(0, 1 - Math.abs(colFrac - 0.5) * 6) * 0.15;
      
      return (purlBump + valley - 0.2) * depth;
    }
  }

  // Rib Stitch (Iteration 5 - Final)
  // Alternating knit/purl columns create vertical ribs
  static ribPattern(x, y, scale, depth) {
    const ribW = scale * 0.6;
    const ribH = scale * 1.4;
    
    const col = x / ribW;
    const colIdx = Math.floor(col);
    const colFrac = col - colIdx;
    const row = y / ribH;
    const rowFrac = row - Math.floor(row);
    
    const isKnitCol = (colIdx % 2) === 0;
    
    if (isKnitCol) {
      // Knit column (V shapes)
      const cx = (colFrac - 0.5) * 2;
      const vShape = Math.max(0, 1 - Math.abs(cx) * 3) * 0.8;
      const bar = Math.max(0, 1 - Math.abs(rowFrac - 0.08) * 20) * 0.25;
      return (vShape + bar) * depth * 0.45;
    } else {
      // Purl column (bumpy)
      const cx = (colFrac - 0.5) * 2;
      const cy = (rowFrac - 0.5) * 2;
      const dist = Math.sqrt(cx * cx * 0.7 + cy * cy * 1.3);
      const bump = Math.max(0, 1 - dist * 2.2) * 0.65;
      return bump * depth * 0.4;
    }
  }

  // Cable Stitch (Iteration 5 - Final)
  // Twisted rope-like patterns with crossings
  static cablePattern(x, y, scale, depth) {
    const cW = scale * 3.2;
    const cH = scale * 1.6;
    
    const col = x / cW;
    const row = y / cH;
    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);
    
    // Twist phase varies with row
    const twist = Math.sin(row * Math.PI * 0.4) * 0.35;
    const tCol = (colFrac + twist) % 1;
    
    // Two strands twisting around each other
    const s1x = (tCol - 0.25) * 4;
    const s2x = (tCol - 0.75) * 4;
    const sy = (rowFrac - 0.5) * 2;
    
    const s1 = Math.sqrt(s1x * s1x + sy * sy);
    const s2 = Math.sqrt(s2x * s2x + sy * sy);
    
    const strand1 = Math.max(0, 1 - s1 * 1.6) * 0.65;
    const strand2 = Math.max(0, 1 - s2 * 1.6) * 0.65;
    
    // Crossing points
    const cross = Math.abs(Math.sin(row * Math.PI * 0.5));
    const crossing = cross * Math.max(0, 1 - Math.abs(colFrac - 0.5) * 5) * 0.35;
    
    // Twist texture
    const twistDetail = Math.sin(colFrac * Math.PI * 5 + row * Math.PI * 1.5) * 0.08;
    
    return Math.max(strand1, strand2 + crossing) * depth * 0.7 + twistDetail;
  }

  // Seed Stitch (Iteration 5 - Final)
  // Checkerboard of knit and purl
  static seedPattern(x, y, scale, depth) {
    const sw = scale * 1.1;
    const sh = scale * 1.4;
    
    const col = Math.floor(x / sw);
    const row = Math.floor(y / sh);
    const colFrac = (x / sw) - col;
    const rowFrac = (y / sh) - row;
    
    const isPurl = (col + row) % 2 === 0;
    
    if (isPurl) {
      const cx = (colFrac - 0.5) * 2;
      const cy = (rowFrac - 0.5) * 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      return Math.max(0, 1 - dist * 2.2) * depth * 0.55;
    } else {
      const cx = (colFrac - 0.5) * 2;
      const vShape = Math.max(0, 1 - Math.abs(cx) * 3.5) *
                    Math.cos(rowFrac * Math.PI * 0.9);
      return vShape * depth * 0.4;
    }
  }

  // Garter Stitch (Iteration 5 - Final)
  // Horizontal ridges on every row (same both sides)
  static garterPattern(x, y, scale, depth) {
    const ridgeH = scale * 0.6;
    const rowFrac = (y / ridgeH) - Math.floor(y / ridgeH);
    
    // Ridge (horizontal bump)
    const ridge = Math.cos(rowFrac * Math.PI * 2) * 0.5 + 0.5;
    
    // V texture within ridge
    const sw = scale * 1.1;
    const colFrac = (x / sw) - Math.floor(x / sw);
    const vTex = Math.max(0, 1 - Math.abs(colFrac - 0.5) * 5) * 0.25;
    
    return (ridge * 0.75 + vTex) * depth * 0.4;
  }

  // ========== CROCHET STITCHES ==========

  // Single Crochet (Iteration 5 - Final)
  // Research: Dense fabric, V top + horizontal bar + post + loop
  static crochetPattern(x, y, scale, depth) {
    const sw = scale * 0.88;
    const sh = scale * 0.72;
    
    const col = x / sw;
    const row = y / sh;
    const colIdx = Math.floor(col);
    const rowIdx = Math.floor(row);
    let colFrac = col - colIdx;
    const rowFrac = row - rowIdx;
    
    // Offset alternate rows (interlocking)
    if ((rowIdx % 2) === 1) {
      colFrac = (colFrac + 0.5) % 1.0;
    }
    
    const cx = (colFrac - 0.5) * 2; // -1..1
    const cy = (rowFrac - 0.5) * 2; // -1..1
    
    // === 1. V-SHAPE (top of stitch) ===
    const vY = 0.13;
    const vx = Math.abs(cx);
    const vy = Math.abs(rowFrac - vY);
    const vShape = (vx < 0.38 && vy < 0.09) ?
      Math.cos(vx / 0.38 * Math.PI / 2) * Math.cos(vy / 0.09 * Math.PI / 2) * 0.65 : 0;
    
    // === 2. HORIZONTAL BAR (back loop / "third loop") ===
    const barY = 0.19;
    const bar = (Math.abs(cx) < 0.43 && Math.abs(rowFrac - barY) < 0.055) ?
      Math.cos((rowFrac - barY) / 0.055 * Math.PI / 2) * 
      Math.cos(cx / 0.43 * Math.PI / 2) * 0.45 : 0;
    
    // === 3. POST (vertical part) ===
    const postW = 0.17;
    const post = (Math.abs(cx) < postW) ?
      Math.cos(cx / postW * Math.PI / 2) * 0.38 * (1 - Math.abs(rowFrac - 0.5)) : 0;
    
    // === 4. MAIN LOOP (yarn loop) ===
    const loopDist = Math.sqrt(
      Math.pow(cx / 0.32, 2) + 
      Math.pow((cy + 0.08) / 0.21, 2)
    );
    const loop = Math.max(0, 1 - loopDist * 1.7) * 0.55;
    
    // === 5. RIGHT LEAN (characteristic of crochet) ===
    const lean = cx * 0.07 * Math.sin(rowFrac * Math.PI);
    
    // === 6. INTERLOCK (connection to stitch below) ===
    const interlock = (rowFrac > 0.72) ?
      Math.max(0, 1 - (rowFrac - 0.72) / 0.28) * 
      Math.max(0, 1 - Math.abs(cx)) * 0.3 : 0;
    
    const result = vShape + bar + post + loop + lean + interlock;
    return (result - 0.38) * depth;
  }

  // Bobble Stitch (Iteration 5 - Final)
  // Group of stitches creating raised bobbles
  static bobblePattern(x, y, scale, depth) {
    const bw = scale * 1.6;
    const bh = scale * 1.6;
    
    const colFrac = (x / bw) - Math.floor(x / bw);
    const rowFrac = (y / bh) - Math.floor(y / bh);
    
    const dx = (colFrac - 0.5) * 2;
    const dy = (rowFrac - 0.5) * 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 0.75) {
      // Hemisphere shape
      const bobble = Math.cos(dist / 0.75 * Math.PI / 2);
      return bobble * depth * 0.95;
    }
    // Depression between bobbles
    return -0.18 * depth;
  }

  // Shell Stitch (Iteration 5 - Final)
  // Fan-like decorative pattern
  static shellPattern(x, y, scale, depth) {
    const sw = scale * 2.3;
    const sh = scale * 1.1;
    
    const colFrac = (x / sw) - Math.floor(x / sw);
    const rowFrac = (y / sh) - Math.floor(y / sh);
    
    // Fan shape
    const fan = Math.sin((colFrac - 0.5) * Math.PI * 3) * 0.5 + 0.5;
    const curve = Math.sin(rowFrac * Math.PI);
    
    // Shell body
    const shell = fan * curve * 0.75;
    
    // Detail stitches
    const detail = Math.sin(colFrac * Math.PI * 5) * Math.cos(rowFrac * Math.PI * 2.5) * 0.18;
    
    return (shell + detail) * depth * 0.65;
  }

  // ========== UV PROJECTION (Iteration 5 - Improved) ==========
  // Better UV mapping using planar projection based on normal
  static getUVFromPosition(px, py, pz, nx, ny, nz) {
    const absNx = Math.abs(nx);
    const absNy = Math.abs(ny);
    const absNz = Math.abs(nz);
    
    let u, v;
    
    if (absNx > absNy && absNx > absNz) {
      // Project to YZ plane
      u = py;
      v = pz;
    } else if (absNy > absNx && absNy > absNz) {
      // Project to XZ plane
      u = px;
      v = pz;
    } else {
      // Project to XY plane
      u = px;
      v = py;
    }
    
    // Add offset based on normal to avoid mirroring artifacts
    if (nx < 0 || ny < 0 || nz < 0) {
      u += 1000; // Offset negative sides
    }
    
    return { u, v };
  }

  // ========== APPLY PATTERN ==========
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

      const { u, v } = this.getUVFromPosition(px, py, pz, nx, ny, nz);

      let displacement = 0;
      switch (patternType) {
        case 'knit':
          displacement = this.knitPattern(u, v, scale, depth);
          break;
        case 'crochet':
          displacement = this.crochetPattern(u, v, scale, depth);
          break;
        case 'rib':
          displacement = this.ribPattern(u, v, scale, depth);
          break;
        case 'cable':
          displacement = this.cablePattern(u, v, scale, depth);
          break;
        case 'seed':
          displacement = this.seedPattern(u, v, scale, depth);
          break;
        case 'garter':
          displacement = this.garterPattern(u, v, scale, depth);
          break;
        case 'bobble':
          displacement = this.bobblePattern(u, v, scale, depth);
          break;
        case 'shell':
          displacement = this.shellPattern(u, v, scale, depth);
          break;
        default:
          displacement = this.knitPattern(u, v, scale, depth);
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
    const bufferLength = 84 + triangleCount * 50;
    const buffer = new ArrayBuffer(bufferLength);
    const view = new DataView(buffer);
    new TextEncoder().encodeInto('Crothet Export', new Uint8Array(buffer, 0, 80));
    view.setUint32(80, triangleCount, true);

    for (let i = 0; i < triangleCount; i++) {
      const offset = 84 + i * 50;
      const i3 = i * 9;

      let nx = 0, ny = 0, nz = 0;
      if (geometry.attributes.normal) {
        nx = geometry.attributes.normal.getX(i3);
        ny = geometry.attributes.normal.getY(i3);
        nz = geometry.attributes.normal.getZ(i3);
      }

      view.setFloat32(offset, nx, true);
      view.setFloat32(offset + 4, ny, true);
      view.setFloat32(offset + 8, nz, true);

      for (let v = 0; v < 3; v++) {
        const vOffset = offset + 12 + v * 12;
        view.setFloat32(vOffset, posAttr.getX(i3 + v * 3), true);
        view.setFloat32(vOffset + 4, posAttr.getY(i3 + v * 3), true);
        view.setFloat32(vOffset + 8, posAttr.getZ(i3 + v * 3), true);
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

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 100, 50);
  scene.add(dirLight);

  const gridHelper = new THREE.GridHelper(100, 20, 0x333333, 0x222222);
  scene.add(gridHelper);

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ========== File Handling ==========
function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.stl')) {
    showStatus('Vælg venligst en STL-fil', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const result = STParser.parse(e.target.result);
      loadGeometry(result.vertices, result.normals);
      showStatus(`STL indlæst: ${result.triangleCount} trekanter`, 'success');
      document.getElementById('applyBtn').disabled = false;
      document.getElementById('downloadBtn').disabled = true;
      
      const info = document.getElementById('info');
      info.innerHTML = `Trekanter: ${result.triangleCount}<br>Type: ${result.isBinary ? 'Binær' : 'ASCII'}`;
    } catch (err) {
      showStatus('Fejl ved indlæsning af STL: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function loadGeometry(vertices, normals) {
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
    currentMesh.material.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  if (normals) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }
  geometry.computeVertexNormals();

  originalGeometry = geometry.clone();

  const material = new THREE.MeshPhongMaterial({
    color: 0xe94560,
    specular: 0x222222,
    shininess: 30,
    side: THREE.DoubleSide
  });
  currentMesh = new THREE.Mesh(geometry, material);
  scene.add(currentMesh);

  const box = new THREE.Box3().setFromObject(currentMesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.copy(center).add(new THREE.Vector3(maxDim, maxDim, maxDim));
  controls.target.copy(center);
  controls.update();
}

// ========== Apply Texture ==========
function applyTexture() {
  if (!originalGeometry || !currentMesh) return;

  const patternType = document.getElementById('patternType').value;
  const scale = parseFloat(document.getElementById('scale').value);
  const depth = parseFloat(document.getElementById('depth').value);

  showStatus('Anvender tekstur (Iteration 5 - Final)...', 'success');

  setTimeout(() => {
    try {
      const newGeometry = originalGeometry.clone();
      TextureGenerator.applyPattern(newGeometry, patternType, scale, depth);
      
      currentMesh.geometry.dispose();
      currentMesh.geometry = newGeometry;

      const colors = {
        'knit': 0xe94560,
        'crochet': 0xf4a460,
        'rib': 0x3498db,
        'cable': 0x2ecc71,
        'seed': 0xe67e22,
        'garter': 0x1abc9c,
        'bobble': 0x9b59b6,
        'shell': 0xf39c12
      };
      currentMesh.material.color.setHex(colors[patternType] || 0xe94560);

      showStatus('Tekstur anvendt! (Iteration 5 - Final)', 'success');
      document.getElementById('downloadBtn').disabled = false;
    } catch (err) {
      showStatus('Fejl: ' + err.message, 'error');
    }
  }, 50);
}

// ========== Download ==========
function downloadSTL() {
  if (!currentMesh) return;
  try {
    const buffer = STLExporter.exportBinary(currentMesh.geometry);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crothet_output.stl';
    a.click();
    URL.revokeObjectURL(url);
    showStatus('STL downloadet!', 'success');
  } catch (err) {
    showStatus('Fejl ved download: ' + err.message, 'error');
  }
}

// ========== UI Helpers ==========
function showStatus(msg, type) {
  const status = document.getElementById('status');
  status.textContent = msg;
  status.className = type;
  if (type === 'success') {
    setTimeout(() => { status.style.display = 'none'; }, 3000);
  }
}

// ========== Event Listeners ==========
document.addEventListener('DOMContentLoaded', () => {
  initViewer();

  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');

  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#ff6b81'; });
  uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = '#e94560'; });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#e94560';
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  document.getElementById('applyBtn').addEventListener('click', applyTexture);
  document.getElementById('downloadBtn').addEventListener('click', downloadSTL);

  ['scale', 'depth'].forEach(id => {
    const slider = document.getElementById(id);
    const valueSpan = document.getElementById(id + 'Value');
    slider.addEventListener('input', () => { valueSpan.textContent = slider.value; });
  });
});
