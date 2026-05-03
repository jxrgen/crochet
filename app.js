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
  static applyKnitPattern(geometry, scale, depth, resolution) {
    const posAttr = geometry.attributes.position;
    const normalAttr = geometry.attributes.normal;
    const vertexCount = posAttr.count;
    const newPositions = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const nx = normalAttr.getX(i);
      const ny = normalAttr.getY(i);
      const nz = normalAttr.getZ(i);

      const u = x / scale;
      const v = y / scale;
      const pattern = this.knitNoise(u, v, resolution);

      newPositions[i * 3] = x + nx * pattern * depth;
      newPositions[i * 3 + 1] = y + ny * pattern * depth;
      newPositions[i * 3 + 2] = z + nz * pattern * depth;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  static applyCrochetPattern(geometry, scale, depth, resolution) {
    const posAttr = geometry.attributes.position;
    const normalAttr = geometry.attributes.normal;
    const vertexCount = posAttr.count;
    const newPositions = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const nx = normalAttr.getX(i);
      const ny = normalAttr.getY(i);
      const nz = normalAttr.getZ(i);

      const u = x / scale;
      const v = y / scale;
      const pattern = this.crochetNoise(u, v, resolution);

      newPositions[i * 3] = x + nx * pattern * depth;
      newPositions[i * 3 + 1] = y + ny * pattern * depth;
      newPositions[i * 3 + 2] = z + nz * pattern * depth;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  static knitNoise(x, y, res) {
    const sx = Math.sin(x * res) * Math.cos(y * res * 0.7);
    const sy = Math.sin(y * res * 1.1) * Math.cos(x * res * 0.9);
    const weave = Math.sin((x + y) * res * 0.5) * 0.3;
    return (sx + sy + weave) * 0.33;
  }

  static crochetNoise(x, y, res) {
    const angle = Math.atan2(y, x) * 3;
    const radius = Math.sqrt(x * x + y * y) * res;
    const spiral = Math.sin(radius + angle) * 0.5;
    const bumps = Math.sin(x * res * 2) * Math.sin(y * res * 2) * 0.5;
    return spiral + bumps * 0.5;
  }

  static bobbleNoise(x, y, res) {
    const dx = Math.sin(x * res * 0.5) * 2;
    const dy = Math.sin(y * res * 0.5) * 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, 1 - dist) * Math.sin(dist * Math.PI);
  }

  static ribNoise(x, y, res) {
    return Math.sin(y * res * 2) * 0.7 + Math.sin(x * res) * 0.3;
  }

  static cableNoise(x, y, res) {
    const twist = Math.sin((x + Math.sin(y * res) * 0.5) * res * 1.5);
    const base = Math.sin(y * res * 0.8) * 0.4;
    return twist * 0.6 + base;
  }

  static applyPattern(geometry, patternType, scale, depth, resolution) {
    switch (patternType) {
      case 'knit': return this.applyKnitPattern(geometry, scale, depth, resolution);
      case 'crochet': return this.applyCrochetPattern(geometry, scale, depth, resolution);
      case 'bobble': return this.applyGenericPattern(geometry, scale, depth, resolution, (x, y, r) => this.bobbleNoise(x, y, r));
      case 'rib': return this.applyGenericPattern(geometry, scale, depth, resolution, (x, y, r) => this.ribNoise(x, y, r));
      case 'cable': return this.applyGenericPattern(geometry, scale, depth, resolution, (x, y, r) => this.cableNoise(x, y, r));
      default: return geometry;
    }
  }

  static applyGenericPattern(geometry, scale, depth, resolution, noiseFn) {
    const posAttr = geometry.attributes.position;
    const normalAttr = geometry.attributes.normal;
    const vertexCount = posAttr.count;
    const newPositions = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const nx = normalAttr.getX(i);
      const ny = normalAttr.getY(i);
      const nz = normalAttr.getZ(i);

      const u = x / scale;
      const v = y / scale;
      const pattern = noiseFn(u, v, resolution);

      newPositions[i * 3] = x + nx * pattern * depth;
      newPositions[i * 3 + 1] = y + ny * pattern * depth;
      newPositions[i * 3 + 2] = z + nz * pattern * depth;
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
    const writer = new TextEncoder().encodeInto('Crothet Export', new Uint8Array(buffer, 0, 80));
    view.setUint32(80, triangleCount, true);

    for (let i = 0; i < triangleCount; i++) {
      const offset = 84 + i * 50;
      const i3 = i * 9;
      const i9 = i * 9;

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
let isInitialized = false;

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

  isInitialized = true;
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
  const resolution = parseFloat(document.getElementById('resolution').value);

  showStatus('Anvender tekstur...', 'success');

  setTimeout(() => {
    try {
      const newGeometry = originalGeometry.clone();
      TextureGenerator.applyPattern(newGeometry, patternType, scale, depth, resolution);
      
      currentMesh.geometry.dispose();
      currentMesh.geometry = newGeometry;
      
      currentMesh.material.color.setHex(patternType === 'crochet' ? 0xf4a460 : patternType === 'bobble' ? 0x9b59b6 : patternType === 'rib' ? 0x3498db : patternType === 'cable' ? 0x2ecc71 : 0xe94560);

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
  ['scale', 'depth', 'resolution'].forEach(id => {
    const slider = document.getElementById(id);
    const valueSpan = document.getElementById(id + 'Value');
    slider.addEventListener('input', () => { valueSpan.textContent = slider.value; });
  });
});
