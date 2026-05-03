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

// ========== Texture Generator ==========
class TextureGenerator {

  // Knit pattern (Stockinette): V-shaped stitches in columns, purl bumps on alternate rows
  // Each stitch is a V on right side, horizontal bump on wrong side
  static knitPattern(x, y, scale, depth) {
    const stitchWidth = scale;
    const stitchHeight = scale * 1.4; // Knit stitches are taller than wide

    const col = x / stitchWidth;
    const row = y / stitchHeight;

    const colIdx = Math.floor(col);
    const rowIdx = Math.floor(row);

    const colFrac = col - colIdx; // 0..1 within stitch
    const rowFrac = row - rowIdx; // 0..1 within row

    const isEvenRow = (rowIdx % 2) === 0;

    // Create V-shape for knit side (right side)
    // The V is formed by two legs meeting at the bottom
    const centerX = colFrac - 0.5; // -0.5 to 0.5
    const normalizedCenterX = centerX * 2; // -1 to 1

    // V shape: the stitch narrows as we go "up" (higher rowFrac means higher on stitch)
    // In knitting, V narrows toward the bottom (decreasing rowFrac)
    const vWidth = 0.3 + rowFrac * 0.7; // V gets wider toward top of stitch
    const distFromCenter = Math.abs(normalizedCenterX);

    // Main V shape
    let vShape = 0;
    if (distFromCenter < vWidth) {
      vShape = Math.cos((distFromCenter / vWidth) * Math.PI / 2);
    }

    // Horizontal bar at top of stitch (the "run" between stitches)
    const topBar = Math.max(0, 1 - Math.abs(rowFrac - 0.1) * 10) * 0.3;

    // Purl bumps on alternate rows (wrong side effect)
    const purlBump = isEvenRow ? 0 : Math.max(0, 1 - Math.sqrt(centerX*centerX + (rowFrac-0.5)*(rowFrac-0.5)) * 3) * 0.4;

    // Stitch definition: vertical lines between stitches
    const stitchEdge = Math.max(0, 1 - Math.abs(colFrac - 0.5) * 20) * 0.15;

    // Combine: V-shape with bar and purl texture
    const result = vShape * 0.6 + topBar + purlBump * 0.4 + stitchEdge;

    return (result - 0.2) * depth; // Center around 0, scale by depth
  }

  // Crochet pattern: Interlocking loops with horizontal bars and V tops
  // Single crochet creates dense fabric with visible V tops and horizontal bars
  static crochetPattern(x, y, scale, depth) {
    const stitchWidth = scale * 0.85;
    const stitchHeight = scale * 0.75; // Crochet stitches are shorter

    const col = x / stitchWidth;
    const row = y / stitchHeight;

    const colIdx = Math.floor(col);
    const rowIdx = Math.floor(row);

    const colFrac = col - colIdx;
    const rowFrac = row - rowIdx;

    const isEvenRow = (rowIdx % 2) === 0;

    // Offset every other row (crochet stitch offset)
    const offsetColFrac = isEvenRow ? colFrac : (colFrac + 0.5) % 1.0;

    // Main loop shape: circular/oval
    const dx = (offsetColFrac - 0.5) * 2; // -1 to 1
    const dy = (rowFrac - 0.5) * 2;     // -1 to 1

    // Loop is oval shaped
    const loopDist = Math.sqrt(dx * dx * 1.3 + dy * dy * 0.7);

    // Loop bump (the actual crochet loop)
    const loop = Math.max(0, 1 - loopDist * 1.5);

    // Horizontal bar (the top of the stitch where hook goes through)
    // This creates the "V" shape on top
    const barWidth = 0.4;
    const barHeight = 0.15;
    const barX = Math.abs(offsetColFrac - 0.5) * 2;
    const barY = Math.abs(rowFrac - 0.2) * 2;

    const horizontalBar = (barX < barWidth && barY < barHeight) ?
      Math.cos(barX / barWidth * Math.PI / 2) * Math.cos(barY / barHeight * Math.PI / 2) * 0.5 : 0;

    // Vertical post (the body of the stitch)
    const postWidth = 0.2;
    const postX = Math.abs(offsetColFrac - 0.5) * 2;
    const post = (postX < postWidth) ? Math.cos(postX / postWidth * Math.PI / 2) * 0.3 * (1 - Math.abs(rowFrac - 0.5)) : 0;

    // Twist/lean from crochet (slight diagonal)
    const lean = dx * 0.1 * Math.sin(rowFrac * Math.PI);

    // Combine all elements
    const result = loop * 0.5 + horizontalBar + post + lean;

    return (result - 0.15) * depth;
  }

  // Bobble stitch: Raised bobbles (crochet)
  static bobblePattern(x, y, scale, depth) {
    const bobbleW = scale * 1.8;
    const bobbleH = scale * 1.8;

    const col = x / bobbleW;
    const row = y / bobbleH;

    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);

    // Bobble is a raised hemisphere
    const dx = (colFrac - 0.5) * 2;
    const dy = (rowFrac - 0.5) * 2;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.8) {
      // Hemisphere shape
      const bobble = Math.cos(dist / 0.8 * Math.PI / 2);
      return bobble * depth * 0.8;
    }

    // Fabric between bobbles (slight depression)
    const depression = -0.1 * depth * Math.exp(-(dist - 0.8) * 5);
    return depression;
  }

  // Rib stitch: Alternating knit and purl columns (vertical ribs)
  static ribPattern(x, y, scale, depth) {
    const ribW = scale * 0.7;
    const col = x / ribW;
    const colIdx = Math.floor(col);
    const colFrac = col - colIdx;

    const isKnitColumn = (colIdx % 2) === 0;

    if (isKnitColumn) {
      // Knit stitch V-shape (vertical column)
      const centerX = colFrac - 0.5;
      const vShape = Math.max(0, 1 - Math.abs(centerX) * 4) * 0.6;
      // Add horizontal texture
      const rowFrac = (y / scale * 1.4) - Math.floor(y / scale * 1.4);
      const hBar = Math.max(0, 1 - Math.abs(rowFrac - 0.1) * 10) * 0.2;
      return (vShape + hBar) * depth * 0.4;
    } else {
      // Purl column (bumpy)
      const dx = (colFrac - 0.5) * 2;
      const dy = ((y / scale * 1.4) - Math.floor(y / scale * 1.4) - 0.5) * 2;
      const dist = Math.sqrt(dx * dx + dy * dy * 0.5);
      const purl = Math.max(0, 1 - dist * 2) * 0.5;
      return purl * depth * 0.3;
    }
  }

  // Cable stitch: Twisted ropes
  static cablePattern(x, y, scale, depth) {
    const cableW = scale * 3;
    const cableH = scale * 1.5;

    const col = x / cableW;
    const row = y / cableH;

    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);

    // Create twisted cable appearance
    const twistPhase = Math.sin(row * Math.PI * 0.5) * 0.3;
    const twistedColFrac = (colFrac + twistPhase) % 1;

    // Rope shape (two strands)
    const strand1 = Math.sqrt(Math.pow((twistedColFrac - 0.25) * 4, 2) + Math.pow((rowFrac - 0.5) * 2, 2));
    const strand2 = Math.sqrt(Math.pow((twistedColFrac - 0.75) * 4, 2) + Math.pow((rowFrac - 0.5) * 2, 2));

    const rope1 = Math.max(0, 1 - strand1 * 1.5);
    const rope2 = Math.max(0, 1 - strand2 * 1.5);

    // Combine strands
    const cable = Math.max(rope1, rope2) * 0.7;

    // Add twist detail
    const twist = Math.sin(colFrac * Math.PI * 4 + row * Math.PI * 2) * 0.1;

    return (cable + twist) * depth * 0.5;
  }

  // Seed stitch: Alternating knit and purl in checkerboard
  static seedPattern(x, y, scale, depth) {
    const stitchW = scale;
    const stitchH = scale * 1.4;

    const col = Math.floor(x / stitchW);
    const row = Math.floor(y / stitchH);

    const colFrac = (x / stitchW) - col;
    const rowFrac = (y / stitchH) - row;

    const isPurl = (col + row) % 2 === 0;

    if (isPurl) {
      // Purl bump
      const dx = (colFrac - 0.5) * 2;
      const dy = (rowFrac - 0.5) * 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return Math.max(0, 1 - dist * 2) * depth * 0.4;
    } else {
      // Knit V
      const centerX = colFrac - 0.5;
      const vShape = Math.max(0, 1 - Math.abs(centerX) * 4) *
                    Math.cos(rowFrac * Math.PI * 0.8);
      return vShape * depth * 0.3;
    }
  }

  // Garter stitch: Horizontal ridges on every row (both sides same)
  static garterPattern(x, y, scale, depth) {
    const ridgeH = scale * 0.7;
    const rowFrac = (y / ridgeH) - Math.floor(y / ridgeH);

    // Horizontal ridge (every row is knit, creates ridges)
    const ridge = Math.cos(rowFrac * Math.PI * 2) * 0.5 + 0.5;

    // Light V texture within ridge
    const stitchW = scale;
    const colFrac = (x / stitchW) - Math.floor(x / stitchW);
    const vTex = Math.max(0, 1 - Math.abs(colFrac - 0.5) * 4) * 0.2;

    return (ridge * 0.6 + vTex) * depth * 0.3;
  }

  // Shell stitch (crochet): Fan-like shells
  static shellPattern(x, y, scale, depth) {
    const shellW = scale * 2.5;
    const shellH = scale * 1.2;

    const col = x / shellW;
    const row = y / shellH;

    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);

    // Fan shape: multiple stitches spreading out
    const fanSpread = Math.sin(colFrac * Math.PI * 3) * 0.5 + 0.5;
    const curve = Math.sin(rowFrac * Math.PI);

    // Shell detail: 5-7 stitches per shell
    const detail = Math.sin(colFrac * Math.PI * 5) * Math.sin(rowFrac * Math.PI * 2) * 0.2;

    return (fanSpread * curve + detail) * depth * 0.6;
  }

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

      // Use the two most significant components for UV mapping
      // This projects 3D surface to 2D based on dominant normal
      let u, v;
      const absNx = Math.abs(nx);
      const absNy = Math.abs(ny);
      const absNz = Math.abs(nz);

      if (absNx > absNy && absNx > absNz) {
        u = py; v = pz;
      } else if (absNy > absNx && absNy > absNz) {
        u = px; v = pz;
      } else {
        u = px; v = py;
      }

      // Calculate pattern displacement
      let displacement = 0;
      switch (patternType) {
        case 'knit':
          displacement = this.knitPattern(u, v, scale, depth);
          break;
        case 'crochet':
          displacement = this.crochetPattern(u, v, scale, depth);
          break;
        case 'bobble':
          displacement = this.bobblePattern(u, v, scale, depth);
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
        case 'shell':
          displacement = this.shellPattern(u, v, scale, depth);
          break;
        default:
          displacement = this.knitPattern(u, v, scale, depth);
      }

      // Apply displacement along normal direction
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

  // Center and fit camera
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

  showStatus('Anvender tekstur...', 'success');

  setTimeout(() => {
    try {
      const newGeometry = originalGeometry.clone();
      TextureGenerator.applyPattern(newGeometry, patternType, scale, depth);

      currentMesh.geometry.dispose();
      currentMesh.geometry = newGeometry;

      // Color based on pattern
      const colors = {
        'knit': 0xe94560,
        'crochet': 0xf4a460,
        'bobble': 0x9b59b6,
        'rib': 0x3498db,
        'cable': 0x2ecc71,
        'seed': 0xe67e22,
        'garter': 0x1abc9c,
        'shell': 0xf39c12
      };
      currentMesh.material.color.setHex(colors[patternType] || 0xe94560);

      showStatus('Tekstur anvendt!', 'success');
      document.getElementById('downloadBtn').disabled = false;
    } catch (err) {
      showStatus('Fejl ved anvendelse af tekstur: ' + err.message, 'error');
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

  // Slider value updates
  ['scale', 'depth'].forEach(id => {
    const slider = document.getElementById(id);
    const valueSpan = document.getElementById(id + 'Value');
    slider.addEventListener('input', () => { valueSpan.textContent = slider.value; });
  });
});
