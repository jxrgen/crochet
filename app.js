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
  // Knit pattern: Stockinette stitch with alternating rows of v-shaped stitches
  static knitPattern(x, y, scale, depth) {
    const stitchW = scale;
    const stitchH = scale * 1.2;

    // Map to stitch grid
    const col = x / stitchW;
    const row = y / stitchH;
    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);
    const isEvenRow = Math.floor(row) % 2 === 0;

    // Create v-shaped knit stitch
    const centerX = isEvenRow ? colFrac : 1 - colFrac;
    const vShape = Math.max(0, 1 - Math.abs(centerX * 2 - 1) * 1.5);
    const rowWave = Math.sin(rowFrac * Math.PI);
    const stitch = vShape * rowWave;

    return stitch * depth;
  }

  // Crochet pattern: Interlocking loops arranged in offset rows
  static crochetPattern(x, y, scale, depth) {
    const loopW = scale * 0.8;
    const loopH = scale * 0.7;

    const col = x / loopW;
    const row = y / loopH;
    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);
    const isEvenRow = Math.floor(row) % 2 === 0;

    // Offset for even rows (crochet stitch offset)
    const offsetFrac = isEvenRow ? colFrac : (colFrac + 0.5) % 1;

    // Circular loop shape
    const dx = (offsetFrac - 0.5) * 2;
    const dy = (rowFrac - 0.5) * 2;
    const dist = Math.sqrt(dx * dx * 1.2 + dy * dy * 0.8);
    const loop = Math.max(0, 1 - dist * 1.8);

    // Add twist detail
    const twist = Math.sin((offsetFrac + rowFrac) * Math.PI * 2) * 0.15;

    return loop * depth + twist * depth;
  }

  // Bobble pattern: Raised bobble stitches at regular intervals
  static bobblePattern(x, y, scale, depth) {
    const bobbleW = scale * 1.5;
    const bobbleH = scale * 1.5;

    const col = x / bobbleW;
    const row = y / bobbleH;
    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);

    // Circular bobble
    const dx = (colFrac - 0.5) * 2;
    const dy = (rowFrac - 0.5) * 2;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.7) {
      // Bobble shape: rounded dome
      const bobble = Math.cos(dist / 0.7 * Math.PI / 2);
      return bobble * depth;
    }
    // Slight depression between bobbles
    return -0.05 * depth;
  }

  // Rib pattern: Raised vertical columns (knit ribs)
  static ribPattern(x, y, scale, depth) {
    const ribW = scale * 0.6;
    const col = x / ribW;
    const colFrac = col - Math.floor(col);

    // Vertical rib columns
    const rib = Math.cos(colFrac * Math.PI * 2) * 0.5 + 0.5;

    // Slight horizontal compression (rib pull-in)
    const compression = 1 - Math.abs(Math.sin(colFrac * Math.PI)) * 0.1;

    return rib * depth * compression;
  }

  // Cable pattern: Twisted rope-like cables
  static cablePattern(x, y, scale, depth) {
    const cableW = scale * 2.5;
    const cableH = scale * 1.2;

    const col = x / cableW;
    const row = y / cableH;
    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);

    // Create twisted cable appearance
    const twist = Math.sin(rowFrac * Math.PI * 4 + col * Math.PI * 2) * 0.5 + 0.5;
    const cable = Math.cos((colFrac - 0.5) * Math.PI * 3) * 0.5 + 0.5;
    const wave = Math.sin(row * 0.5) * 0.2;

    return (twist * cable + wave) * depth;
  }

  // Seed stitch: Alternating knit and purl bumps
  static seedPattern(x, y, scale, depth) {
    const stitchW = scale;
    const stitchH = scale;

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
      return Math.max(0, 1 - dist * 2) * depth * 0.6;
    } else {
      // Knit stitch (flat with slight texture)
      return Math.sin(colFrac * Math.PI) * Math.sin(rowFrac * Math.PI) * depth * 0.2;
    }
  }

  // Garter stitch: Horizontal ridges on every row
  static garterPattern(x, y, scale, depth) {
    const ridgeH = scale * 0.8;
    const rowFrac = (y / ridgeH) - Math.floor(y / ridgeH);

    // Horizontal ridge
    const ridge = Math.cos(rowFrac * Math.PI * 2) * 0.5 + 0.5;
    return ridge * depth * 0.4;
  }

  // Shell stitch (crochet): Fan-like shell patterns
  static shellPattern(x, y, scale, depth) {
    const shellW = scale * 2;
    const shellH = scale * 1.5;

    const col = x / shellW;
    const row = y / shellH;
    const colFrac = col - Math.floor(col);
    const rowFrac = row - Math.floor(row);

    // Create shell fan shape
    const fan = Math.sin(colFrac * Math.PI * 3) * 0.5 + 0.5;
    const wave = Math.sin(rowFrac * Math.PI);

    return fan * wave * depth;
  }

  static applyPattern(geometry, patternType, scale, depth) {
    const posAttr = geometry.attributes.position;
    const normalAttr = geometry.attributes.normal;
    const vertexCount = posAttr.count;
    const newPositions = new Float32Array(vertexCount * 3);

    // We need UV mapping for proper texture - project to best fit plane
    const box = new THREE.Box3();
    const positions = [];
    for (let i = 0; i < vertexCount; i++) {
      positions.push(new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)));
    }
    box.setFromPoints(positions);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    // Project each vertex to a 2D plane based on dominant normal
    for (let i = 0; i < vertexCount; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const pz = posAttr.getZ(i);
      const nx = normalAttr.getX(i);
      const ny = normalAttr.getY(i);
      const nz = normalAttr.getZ(i);

      // Determine best projection plane based on normal
      const absNx = Math.abs(nx);
      const absNy = Math.abs(ny);
      const absNz = Math.abs(nz);

      let u, v;
      if (absNx >= absNy && absNx >= absNz) {
        // Project to YZ plane
        u = py;
        v = pz;
      } else if (absNy >= absNx && absNy >= absNz) {
        // Project to XZ plane
        u = px;
        v = pz;
      } else {
        // Project to XY plane
        u = px;
        v = py;
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

      // Apply displacement along normal
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
