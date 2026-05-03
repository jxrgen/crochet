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

// ========== Texture Generator - Iteration 1: Proper Knit Structure ==========
class TextureGenerator {
  // Knit pattern (Stockinette) - Iteration 1
  // Based on research: V-shaped stitches in columns, purl bumps on wrong side
  // Each stitch is a V, columns of V's stacked vertically
  // Aspect ratio: stitch width : height ≈ 1 : 1.4
  static knitPattern(x, y, scale, depth) {
    const stitchWidth = scale;
    const stitchHeight = scale * 1.4; // Knit stitches are ~1.4x taller than wide
    
    // Calculate stitch coordinates
    const col = x / stitchWidth;
    const row = y / stitchHeight;
    
    const colIdx = Math.floor(col);
    const rowIdx = Math.floor(row);
    
    const colFrac = col - colIdx; // 0..1 position within stitch width
    const rowFrac = row - rowIdx; // 0..1 position within stitch height
    
    // Determine if this is a knit row (even) or purl row (odd)
    // In stockinette: even rows = knit (V side), odd rows = purl (bump side)
    const isKnitRow = (rowIdx % 2) === 0;
    
    // For knit side (right side): Create V shape
    // The V is narrower at bottom (legs meet) and wider at top
    const centerX = colFrac - 0.5; // -0.5 to 0.5
    const normalizedX = centerX * 2; // -1 to 1
    
    // V shape: legs diverge from bottom (rowFrac=1) to top (rowFrac=0)
    // Actually in knitting, the V is visible from top, so let's think differently:
    // At the TOP of the stitch (rowFrac near 0), we see the full V
    // At the BOTTOM (rowFrac near 1), the V comes to a point
    
    // Let's create the V shape properly:
    // The stitch has two legs that meet at the bottom
    // rowFrac = 0 = top of stitch (where you insert needle)
    // rowFrac = 1 = bottom of stitch (where it connects to stitch below)
    
    let stitchValue = 0;
    
    if (isKnitRow) {
      // Knit stitch (V shape visible)
      // V shape: width increases as we go from bottom to top
      const vWidthAtPosition = 0.15 + rowFrac * 0.7; // V gets wider toward top
      const distFromCenter = Math.abs(normalizedX);
      
      if (distFromCenter < vWidthAtPosition) {
        // Inside the V leg
        const legPosition = distFromCenter / vWidthAtPosition; // 0 at center, 1 at edge
        // The V leg curves slightly
        const vShape = Math.cos(legPosition * Math.PI / 2) * 0.8;
        stitchValue = vShape;
      }
      
      // Add the horizontal bar at top (where yarn runs between stitches)
      const topBar = Math.max(0, 1 - Math.abs(rowFrac - 0.05) * 20) * 0.3;
      stitchValue += topBar;
      
    } else {
      // Purl row (wrong side) - horizontal bumps
      // Purl stitch appears as a bump/ridge
      const dx = (colFrac - 0.5) * 2;
      const dy = (rowFrac - 0.5) * 2;
      const dist = Math.sqrt(dx * dx * 0.8 + dy * dy * 1.2);
      const purlBump = Math.max(0, 1 - dist * 1.8) * 0.6;
      stitchValue = purlBump;
      
      // Slight depression between purl bumps
      const betweenStitch = Math.max(0, 1 - Math.abs(colFrac - 0.5) * 4) * 0.1;
      stitchValue += betweenStitch;
    }
    
    // Add vertical definition between columns (the "valley" between V columns)
    const columnEdge = Math.max(0, 1 - Math.abs(colFrac - 0.5) * 10) * 0.15;
    
    // Combine
    const result = stitchValue + columnEdge * 0.5;
    
    return (result - 0.2) * depth; // Center around 0
  }

  // Crochet pattern (Single Crochet) - Iteration 1
  // Research: Dense fabric, V top, interlocking loops, shorter than knit
  // Stitch ratio: width : height ≈ 1 : 0.85
  static crochetPattern(x, y, scale, depth) {
    const stitchWidth = scale * 0.9;
    const stitchHeight = scale * 0.75; // Crochet stitches are shorter
    
    const col = x / stitchWidth;
    const row = y / stitchHeight;
    
    const colIdx = Math.floor(col);
    const rowIdx = Math.floor(row);
    
    const colFrac = col - colIdx;
    const rowFrac = row - rowIdx;
    
    // Single crochet has a V top and a post (vertical part)
    // Rows are offset (every other row shifts by half stitch)
    const isEvenRow = (rowIdx % 2) === 0;
    const offsetColFrac = isEvenRow ? colFrac : (colFrac + 0.5) % 1.0;
    
    const centerX = (offsetColFrac - 0.5) * 2; // -1 to 1
    const centerY = (rowFrac - 0.5) * 2; // -1 to 1
    
    // Main loop shape (oval)
    const loopDist = Math.sqrt(
      centerX * centerX * 1.2 + 
      centerY * centerY * 0.8
    );
    const loopShape = Math.max(0, 1 - loopDist * 1.5);
    
    // V shape at top of stitch (where you insert hook)
    const vTop = Math.max(0, 1 - Math.abs(offsetColFrac - 0.5) * 4) * 
                 Math.max(0, 1 - Math.abs(rowFrac - 0.15) * 10) * 0.5;
    
    // Post (vertical part of stitch)
    const postWidth = 0.15;
    const postX = Math.abs(offsetColFrac - 0.5) * 2;
    const post = (postX < postWidth) ? 
      Math.cos(postX / postWidth * Math.PI / 2) * 0.4 * (1 - Math.abs(rowFrac - 0.5)) : 0;
    
    // Horizontal bar (the "chain" connecting stitches)
    const hBar = Math.max(0, 1 - Math.abs(rowFrac - 0.9) * 15) *
                 Math.max(0, 1 - Math.abs(offsetColFrac - 0.5) * 3) * 0.3;
    
    // Combine: loop + V + post + bar
    const result = loopShape * 0.5 + vTop + post + hBar;
    
    return (result - 0.25) * depth;
  }

  // Apply pattern to geometry
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

      // Use dominant normal components for UV projection
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

      let displacement = 0;
      switch (patternType) {
        case 'knit':
          displacement = this.knitPattern(u, v, scale, depth);
          break;
        case 'crochet':
          displacement = this.crochetPattern(u, v, scale, depth);
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

  showStatus('Anvender tekstur (Iteration 1)...', 'success');

  setTimeout(() => {
    try {
      const newGeometry = originalGeometry.clone();
      TextureGenerator.applyPattern(newGeometry, patternType, scale, depth);
      
      currentMesh.geometry.dispose();
      currentMesh.geometry = newGeometry;

      const colors = {
        'knit': 0xe94560,
        'crochet': 0xf4a460
      };
      currentMesh.material.color.setHex(colors[patternType] || 0xe94560);

      showStatus('Tekstur anvendt! (Iteration 1)', 'success');
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
