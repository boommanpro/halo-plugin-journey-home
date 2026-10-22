import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { layoutStations } from './data.js';

export function createScene(container, { stations = [], onSelect, onReady, onSit } = {}) {
  const opts = { onSelect, onReady, onSit };
  if (!container || typeof container.appendChild !== 'function') {
    throw new TypeError('createScene 需要一个 DOM 容器');
  }

  const layout = layoutStations(stations);
  const extent = layout.width / 2;
  const scene = new THREE.Scene();
  // 背景与宿主页面（主题）背景色保持一致，实现无缝内嵌
  const pageBackground = () => {
    const color = getComputedStyle(document.body).backgroundColor;
    return color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent'
      ? new THREE.Color(color)
      : new THREE.Color('#eee8db');
  };
  const dayBackground = pageBackground();
  scene.background = dayBackground;
  const world = new THREE.Group();
  world.name = 'paper-ink-street';
  scene.add(world);
  const geometries = new Map();
  const materials = new Set();
  const textures = new Set();
  const obstacles = [];
  const buildings = new Map();
  const lamps = [];
  const keys = new Set();
  const palette = {
    paper: '#eee6d5', cream: '#fff4dc', base: '#c8bba3', ink: '#3b403c',
    roof: '#a95038', tile: '#c97855', wood: '#977355', green: '#7c8c70',
    leaf: '#a6af83', blue: '#74918d', sand: '#dbcfb7', skin: '#d9ac87',
    glass: '#abc0af', gold: '#c49a57', soil: '#746454', white: '#fff7e6',
  };
  const paint = Object.fromEntries(Object.entries(palette).map(([key, color]) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.92 });
    materials.add(material);
    return [key, material];
  }));
  paint.glass.emissive.set('#ffce7b');
  const bulb = new THREE.MeshStandardMaterial({ color: '#fff0bc', emissive: '#ffd283', emissiveIntensity: 0.2 });
  materials.add(bulb);
  const ink = new THREE.LineBasicMaterial({ color: '#41433c', transparent: true, opacity: 0.38 });
  materials.add(ink);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '纸墨小街：拖动旋转，滚轮缩放，点击建筑查看，点击地面或使用方向键行走');
  container.appendChild(canvas);

  const camera = new THREE.OrthographicCamera(-18, 18, 14, -14, 0.1, Math.max(160, layout.width * 4));
  const home = new THREE.Vector3(26, 25, 31);
  const homeTarget = new THREE.Vector3(0, 0.8, 0);
  camera.position.copy(home);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(homeTarget);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  controls.enableDamping = !reducedMotion.matches;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI / 7;
  controls.maxPolarAngle = Math.PI / 2.6;
  controls.minZoom = 0.65;
  controls.maxZoom = 3.2;
  // 默认放大一档，确保小人一眼可见
  camera.zoom = 1.3;
  camera.updateProjectionMatrix();
  controls.update();

  function geometry(key, make) {
    if (!geometries.has(key)) geometries.set(key, make());
    return geometries.get(key);
  }

  function mesh(shape, material, x, y, z, parent = world, outline = false) {
    const item = new THREE.Mesh(shape, typeof material === 'string' ? paint[material] : material);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    if (outline) {
      const edges = geometry(`edges:${shape.uuid}`, () => new THREE.EdgesGeometry(shape, 28));
      item.add(new THREE.LineSegments(edges, ink));
    }
    return item;
  }

  function box(w, h, d, x, y, z, material, parent = world, outline = false) {
    return mesh(geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)), material, x, y, z, parent, outline);
  }

  function cylinder(top, bottom, h, x, y, z, material, parent = world, sides = 10) {
    return mesh(geometry(`cylinder:${top}:${bottom}:${h}:${sides}`, () => new THREE.CylinderGeometry(top, bottom, h, sides)), material, x, y, z, parent);
  }

  function sphere(radius, x, y, z, material, parent = world) {
    return mesh(geometry(`sphere:${radius}`, () => new THREE.IcosahedronGeometry(radius, 1)), material, x, y, z, parent);
  }

  function obstacle(x, z, w, d) {
    obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  function sign(text, subtitle, w, h, x, y, z, parent) {
    const surface = document.createElement('canvas');
    surface.width = 768;
    surface.height = 256;
    const ctx = surface.getContext('2d');
    ctx.fillStyle = '#f6edda';
    ctx.fillRect(0, 0, 768, 256);
    ctx.strokeStyle = '#45463e';
    ctx.lineWidth = 5;
    ctx.strokeRect(14, 14, 740, 228);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#363d37';
    ctx.font = '600 86px Georgia, serif';
    ctx.fillText(text, 384, 119);
    ctx.fillStyle = '#9c513c';
    ctx.font = '26px sans-serif';
    ctx.fillText(subtitle, 384, 188);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
    materials.add(material);
    box(w + 0.12, h + 0.12, 0.12, x, y, z - 0.04, 'wood', parent, true);
    return mesh(geometry(`plane:${w}:${h}`, () => new THREE.PlaneGeometry(w, h)), material, x, y, z + 0.03, parent);
  }

  box(layout.width, 0.65, 18, 0, -0.38, 0, 'base', world, true);
  box(layout.width - 0.1, 0.12, 17.9, 0, -0.005, 0, 'paper');
  box(layout.width - 0.4, 0.035, 3.2, 0, 0.07, 0, 'sand');
  box(3.2, 0.035, 17.6, 0, 0.071, 0, 'sand');
  for (let x = -extent + 1; x <= extent - 1; x += 1) {
    box(0.016, 0.008, 3.1, x, 0.093, 0, 'base');
  }
  for (let z = -8; z <= 8; z += 1) {
    box(3.1, 0.008, 0.016, 0, 0.094, z, 'base');
  }
  [-1.7, 1.7].forEach((offset) => {
    box(layout.width - 0.4, 0.09, 0.12, 0, 0.08, offset, 'cream');
    box(0.12, 0.09, 17.6, offset, 0.08, 0, 'cream');
  });

  function building(id, label, subtitle, x, z, { height: h, wall, roof, width: w, facing, type }) {
    const group = new THREE.Group();
    group.name = id;
    group.userData.buildingId = id;
    group.position.set(x, 0.1, z);
    group.rotation.y = facing;
    world.add(group);
    const d = 3.6;
    const winOffset = (w - 1.8) / 2;
    const flatTop = roof !== 'gable';
    const topY = flatTop ? h + 0.36 : h + 0.2;
    box(w + 0.3, 0.25, d + 0.3, 0, 0.08, 0, 'base', group, true);
    box(w, h, d, 0, h / 2 + 0.2, 0, wall, group, true);
    box(w + 0.08, 0.22, d + 0.08, 0, 0.4, 0, 'wood', group);
    [-w / 2 + 0.1, w / 2 - 0.1].forEach((side) => box(0.14, h, 0.12, side, h / 2 + 0.2, d / 2 + 0.04, 'cream', group));
    if (roof === 'skillion') {
      // 单坡屋顶：前低后高的一面斜板
      const slopeHeight = 1.15;
      const slopeLen = Math.hypot(w / 2 + 0.3, slopeHeight);
      const panel = box(slopeLen, 0.14, d + 0.6, 0, h + 0.2 + slopeHeight / 2, 0, 'roof', group, true);
      panel.rotation.z = Math.atan2(slopeHeight, w / 2 + 0.3);
      for (let row = 0; row <= 6; row += 1) {
        const rib = box(slopeLen, 0.035, 0.04, 0, h + 0.2 + slopeHeight / 2, -d / 2 - 0.28 + row * 0.62, 'tile', group);
        rib.rotation.z = panel.rotation.z;
      }
      cylinder(0.1, 0.1, d + 0.7, 0, h + 0.3, 0, 'tile', group).rotation.x = Math.PI / 2;
    } else if (roof === 'flat') {
      // 平顶：顶板 + 矮护栏围合 + 屋顶小机房
      box(w + 0.3, 0.16, d + 0.5, 0, h + 0.28, 0, 'roof', group, true);
      [d / 2 + 0.2, -d / 2 - 0.2].forEach((zz) => box(w + 0.3, 0.34, 0.1, 0, h + 0.52, zz, 'cream', group, true));
      [w / 2 + 0.15, -w / 2 - 0.15].forEach((xx) => box(0.1, 0.34, d + 0.5, xx, h + 0.52, 0, 'cream', group));
      box(1.3, 0.5, 0.95, w / 2 - 1.1, h + 0.6, -0.4, 'cream', group, true);
      box(1.42, 0.07, 1.05, w / 2 - 1.1, h + 0.88, -0.4, 'wood', group);
    } else {
      // 三角坡顶（默认）
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-w / 2 - 0.3, 0);
      roofShape.lineTo(w / 2 + 0.3, 0);
      roofShape.lineTo(0, 1.55);
      roofShape.closePath();
      const roofGeometry = geometry(`gable:${w}`, () => new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.6, bevelEnabled: false }));
      mesh(roofGeometry, 'roof', 0, h + 0.2, -d / 2 - 0.3, group, true);
      const slope = Math.atan2(1.55, w / 2 + 0.3);
      const length = Math.hypot(w / 2 + 0.3, 1.55);
      for (let row = 0; row <= 9; row += 1) {
        [-1, 1].forEach((side) => {
          const rib = box(length, 0.035, 0.04, side * (w / 2 + 0.3) / 2, h + 0.2 + 0.795, -d / 2 - 0.28 + row * 0.46, 'tile', group);
          rib.rotation.z = -side * slope;
        });
      }
      cylinder(0.1, 0.1, d + 0.7, 0, h + 1.78, 0, 'tile', group).rotation.x = Math.PI / 2;
    }
    box(0.55, 1.1, 0.55, -w / 2 + 1.05, topY + 0.95, -0.7, 'wood', group, true);
    box(0.7, 0.16, 0.7, -w / 2 + 1.05, topY + 1.52, -0.7, 'cream', group);
    const front = d / 2 + 0.04;
    box(0.98, 1.86, 0.13, 0, 1.17, front, 'ink', group, true);
    box(0.78, 1.65, 0.06, 0, 1.17, front + 0.08, 'wood', group);
    box(0.57, 0.85, 0.04, 0, 1.42, front + 0.12, 'glass', group);
    sphere(0.045, 0.29, 0.94, front + 0.18, 'gold', group);
    box(1.3, 0.12, 0.5, 0, 0.16, front + 0.2, 'cream', group, true);
    [-winOffset, winOffset].forEach((wx) => {
      box(1.24, 1.44, 0.12, wx, 1.54, front, 'ink', group, true);
      box(1.08, 1.28, 0.06, wx, 1.54, front + 0.08, 'glass', group);
      box(0.065, 1.3, 0.06, wx, 1.54, front + 0.13, 'cream', group);
      box(1.08, 0.065, 0.06, wx, 1.54, front + 0.13, 'cream', group);
      box(1.4, 0.12, 0.4, wx, 0.81, front + 0.12, 'wood', group, true);
      box(1.24, 0.24, 0.28, wx, 0.68, front + 0.14, 'roof', group);
      for (let i = 0; i < 4; i += 1) sphere(0.18, wx - 0.42 + i * 0.28, 0.9, front + 0.17, i % 2 ? 'leaf' : 'green', group);
    });
    sign(label, subtitle, 2.6, 0.67, 0, h - 0.35, front + 0.12, group);
    const awning = box(3.05, 0.1, 0.8, 0, 2.36, front + 0.34, 'roof', group, true);
    awning.rotation.x = 0.13;
    for (let i = 0; i < 7; i += 1) box(0.22, 0.2, 0.08, -1.35 + i * 0.45, 2.22, front + 0.73, 'cream', group);
    [-1, 1].forEach((side) => {
      const sideWindow = box(0.08, 1.2, 1.1, side * (w / 2 + 0.03), 1.9, -0.3, 'wood', group, true);
      box(0.09, 1.02, 0.9, sideWindow.position.x + side * 0.05, 1.9, -0.3, 'glass', group);
      box(0.1, 1.05, 0.06, sideWindow.position.x + side * 0.1, 1.9, -0.3, 'cream', group);
    });
    const rear = new THREE.Group();
    rear.rotation.y = Math.PI;
    group.add(rear);
    [-(winOffset - 0.1), winOffset - 0.1].forEach((wx) => {
      box(1.3, 1.45, 0.12, wx, 1.55, front, 'wood', rear, true);
      box(1.12, 1.27, 0.06, wx, 1.55, front + 0.09, 'glass', rear);
      box(0.07, 1.3, 0.06, wx, 1.55, front + 0.14, 'cream', rear);
      box(1.14, 0.07, 0.06, wx, 1.55, front + 0.14, 'cream', rear);
      box(1.45, 0.12, 0.32, wx, 0.8, front + 0.1, 'wood', rear);
    });
    sign(label, subtitle, 2.6, 0.67, 0, h - 0.35, front + 0.12, rear);
    if (type === 'studio') {
      box(0.85, 1.05, 0.09, -w / 2 + 0.45, 1, front + 0.65, 'wood', group, true).rotation.z = -0.08;
      box(0.68, 0.83, 0.06, -w / 2 + 0.45, 1.04, front + 0.72, 'cream', group);
      sphere(0.2, -w / 2 + 0.45, 1.13, front + 0.78, 'roof', group).scale.z = 0.12;
    } else if (type === 'workshop') {
      box(1.25, 0.15, 0.65, w / 2 - 0.8, 0.72, front + 0.6, 'wood', group, true);
      [-0.48, 0.48].forEach((offset) => box(0.1, 0.65, 0.5, w / 2 - 0.8 + offset, 0.35, front + 0.6, 'ink', group));
      [0, 1, 2].forEach((i) => cylinder(0.12, 0.18, 0.28 + i * 0.09, w / 2 - 1.15 + i * 0.34, 0.94, front + 0.6, i % 2 ? 'cream' : 'roof', group));
      if (!flatTop) {
        const skylight = new THREE.Group();
        skylight.position.set(1.3, h + 1.1, 0);
        skylight.rotation.z = -Math.atan2(1.55, w / 2 + 0.3);
        group.add(skylight);
        box(1.7, 0.14, 1.9, 0, 0, 0, 'wood', skylight, true);
        box(1.5, 0.06, 1.7, 0, 0.1, 0, 'glass', skylight);
        box(0.07, 0.07, 1.7, 0, 0.15, 0, 'cream', skylight);
        box(1.5, 0.07, 0.07, 0, 0.15, 0, 'cream', skylight);
      }
      const gear = new THREE.Group();
      gear.position.set(0, topY + 0.5, front + 0.3);
      group.add(gear);
      cylinder(0.42, 0.42, 0.12, 0, 0, 0, 'gold', gear, 24).rotation.x = Math.PI / 2;
      for (let i = 0; i < 10; i += 1) {
        const angle = i * Math.PI / 5;
        box(0.18, 0.24, 0.14, Math.sin(angle) * 0.45, Math.cos(angle) * 0.45, 0, 'gold', gear).rotation.z = -angle;
      }
      cylinder(0.15, 0.15, 0.15, 0, 0, 0.02, 'ink', gear, 24).rotation.x = Math.PI / 2;
    } else if (type === 'archive') {
      box(1.3, 0.85, 0.45, -w / 2 + 0.75, 0.55, front + 0.6, 'wood', group, true);
      for (let i = 0; i < 7; i += 1) box(0.12, 0.4 + i % 3 * 0.08, 0.3, -w / 2 + 0.25 + i * 0.16, 0.9, front + 0.6, ['blue', 'roof', 'cream'][i % 3], group);
      [-winOffset, winOffset].forEach((wx) => {
        box(1.1, 1.3, 0.08, wx, 1.54, front + 0.18, 'ink', group);
        for (let row = 0; row < 2; row += 1) {
          const shelfY = 0.95 + row * 0.6;
          box(1.15, 0.07, 0.25, wx, shelfY, front + 0.24, 'wood', group);
          for (let i = 0; i < 6; i += 1) {
            const bookHeight = 0.3 + i % 3 * 0.065;
            box(0.12, bookHeight, 0.15, wx - 0.44 + i * 0.17, shelfY + 0.04 + bookHeight / 2, front + 0.25, ['blue', 'roof', 'cream'][i % 3], group);
          }
        }
      });
      const baseBookY = flatTop ? topY + 0.26 : h + 1.95;
      const bookStep = flatTop ? 0.31 : 0.29;
      for (let i = 0; i < 3; i += 1) {
        const book = new THREE.Group();
        book.position.set(0, baseBookY + i * bookStep, 0);
        book.rotation.y = (i - 1) * 0.18;
        group.add(book);
        box(2.1, 0.19, 1.25, 0, 0, 0, 'cream', book, true);
        [-0.12, 0.12].forEach((y) => box(2.22, 0.05, 1.35, 0, y, 0, ['blue', 'roof', 'green'][i], book));
        box(0.09, 0.27, 1.35, -1.07, 0, 0, ['blue', 'roof', 'green'][i], book);
      }
    } else {
      const record = cylinder(0.42, 0.42, 0.06, -w / 2 + 0.85, h - 0.35, front + 0.15, 'ink', group, 32);
      record.rotation.x = Math.PI / 2;
      cylinder(0.13, 0.13, 0.07, 0, 0.01, 0, 'gold', record, 24);
      const rooftopRecordY = flatTop ? topY + 0.5 : h + 2.25;
      const rooftopRecord = cylinder(0.88, 0.88, 0.14, 0, rooftopRecordY, 0, 'ink', group, 48);
      rooftopRecord.rotation.x = Math.PI / 2;
      [-1, 1].forEach((side) => {
        cylinder(0.29, 0.29, 0.02, 0, side * 0.08, 0, 'gold', rooftopRecord, 32);
        cylinder(0.07, 0.07, 0.025, 0, side * 0.095, 0, 'cream', rooftopRecord, 24);
        [0.5, 0.65, 0.77].forEach((radius) => {
          const groove = mesh(geometry(`record-groove:${radius}`, () => new THREE.TorusGeometry(radius, 0.009, 4, 48)), 'wood', 0, side * 0.08, 0, rooftopRecord);
          groove.rotation.x = Math.PI / 2;
        });
      });
    }
    obstacle(x, z, w + 0.35, d + 0.35);
    obstacle(x, z + Math.cos(facing) * 2.2, w, 0.7);
    buildings.set(id, group);
  }

  // 建筑变体轮换表：让每栋房子在高度、墙色、屋顶与开间上都不重样（主建筑由数据指定覆盖）
  const WALL_VARIANTS = ['cream', 'paper', 'white', 'sand'];
  const ROOF_VARIANTS = ['gable', 'skillion', 'flat'];

  layout.buildings.forEach((station, index) => {
    building(station.id, station.signName || station.name, station.period, station.x, station.z, {
      height: station.height ?? 3.0 + (index * 7 % 5) * 0.5,
      wall: station.accent ?? WALL_VARIANTS[index % WALL_VARIANTS.length],
      roof: station.roof ?? ROOF_VARIANTS[(index + 1) % ROOF_VARIANTS.length],
      width: station.width ?? (index % 3 === 1 ? 6.2 : 5.1),
      facing: station.facing,
      type: station.type,
    });
  });

  function tree(x, z, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0.1, z);
    group.scale.setScalar(scale);
    world.add(group);
    cylinder(0.65, 0.72, 0.22, 0, 0.11, 0, 'sand', group);
    cylinder(0.12, 0.18, 2.4, 0, 1.2, 0, 'wood', group);
    const branch = cylinder(0.05, 0.08, 1.1, 0.25, 1.9, 0, 'wood', group);
    branch.rotation.z = -0.55;
    sphere(1, 0, 2.8, 0, 'green', group).scale.set(0.95, 1.2, 0.85);
    sphere(0.7, 0.6, 2.55, 0.12, 'leaf', group);
    sphere(0.65, -0.55, 2.4, -0.18, 'leaf', group);
    obstacle(x, z, 1.3 * scale, 1.3 * scale);
  }
  [[-10, -6.6, 1.1], [10, -6.5, 0.95], [-10, 6.4, 0.9], [10, 6.6, 1.12], [-10.5, -2.3, 0.72], [10.4, 2.5, 0.78]].forEach((args) => tree(...args));

  const benches = [];
  function bench(x, z, rotation) {
    const group = new THREE.Group();
    group.name = `bench-${benches.length}`;
    group.userData.benchIndex = benches.length;
    group.position.set(x, 0.1, z);
    group.rotation.y = rotation;
    world.add(group);
    for (let i = 0; i < 3; i += 1) box(1.9, 0.09, 0.14, 0, 0.57, -0.2 + i * 0.19, 'wood', group, true);
    // 靠背横条略前移，避免与 z=-0.32 的椅腿支撑共面产生 z-fighting 闪烁
  [0.9, 1.12].forEach((y) => box(1.9, 0.16, 0.09, 0, y, -0.29, 'wood', group, true));
    [-0.72, 0.72].forEach((bx) => {
      box(0.09, 1.12, 0.09, bx, 0.56, -0.32, 'ink', group);
      box(0.09, 0.55, 0.09, bx, 0.27, 0.24, 'ink', group);
    });
    group.scale.setScalar(1.5);
    obstacle(x, z, 3.1, 1.3);
    benches.push(group);
  }
  bench(-4.1, -1.95, 0);
  bench(4.1, 1.95, Math.PI);

  // 房屋门口的交互圈：小人走近时才淡入显示（不常驻，保持画面干净）
  const doorCircles = new Map();
  const doorMarkers = [];
  buildings.forEach((group, id) => {
    const facing = group.rotation.y;
    const cx = group.position.x;
    const cz = group.position.z + Math.cos(facing) * 3.05;
    const pos = new THREE.Vector3(cx, 0, cz);
    const material = new THREE.MeshBasicMaterial({ color: '#a95038', transparent: true, opacity: 0, depthWrite: false });
    materials.add(material);
    const ring = mesh(geometry('door-ring', () => new THREE.RingGeometry(0.58, 0.7, 40)), material, cx, 0.115, cz);
    ring.rotation.x = -Math.PI / 2;
    ring.castShadow = false;
    const dot = mesh(geometry('door-dot', () => new THREE.CircleGeometry(0.14, 24)), material, cx, 0.115, cz);
    dot.rotation.x = -Math.PI / 2;
    dot.castShadow = false;
    ring.visible = false;
    dot.visible = false;
    doorCircles.set(id, pos);
    doorMarkers.push({ id, ring, dot, material, pos });
  });
  [[-8.9, -1.7], [8.9, 1.7], [-1.8, 7.1], [1.8, -7.1]].forEach(([x, z]) => {
    cylinder(0.22, 0.32, 0.18, x, 0.16, z, 'ink');
    cylinder(0.055, 0.09, 2.7, x, 1.5, z, 'ink');
    box(0.42, 0.54, 0.42, x, 2.95, z, 'ink', world, true);
    box(0.32, 0.4, 0.32, x, 2.95, z, bulb);
    cylinder(0, 0.36, 0.25, x, 3.34, z, 'ink', world, 4).rotation.y = Math.PI / 4;
    const light = new THREE.PointLight('#ffd496', 0, 6, 2);
    light.position.set(x, 2.9, z);
    world.add(light);
    lamps.push(light);
    obstacle(x, z, 0.6, 0.6);
  });
  for (let i = 0; i < 24; i += 1) {
    const x = -11.1 + (i % 12) * 2;
    const z = i < 12 ? -8 : 8;
    box(0.5 + i % 3 * 0.12, 0.025, 0.13, x, 0.07, z, i % 2 ? 'base' : 'sand').rotation.y = i * 1.3;
  }

  const person = new THREE.Group();
  person.name = 'walker';
  person.position.set(0, 0.1, 2.2);
  // 内嵌视野较宽，小人放大保证在全景中清晰可辨（脚下不再显示光环）
  person.scale.setScalar(1.8);
  world.add(person);
  const legs = [];
  const arms = [];
  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.58, 0);
    person.add(leg);
    box(0.16, 0.43, 0.19, 0, -0.2, 0, 'ink', leg);
    box(0.18, 0.12, 0.29, 0, -0.46, 0.05, 'wood', leg);
    legs.push(leg);
    const arm = new THREE.Group();
    arm.position.set(side * 0.28, 1, 0);
    person.add(arm);
    box(0.15, 0.4, 0.18, 0, -0.15, 0, 'roof', arm);
    sphere(0.09, 0, -0.38, 0, 'skin', arm);
    arms.push(arm);
  });
  box(0.46, 0.55, 0.3, 0, 0.83, 0, 'roof', person, true);
  sphere(0.22, 0, 1.34, 0, 'skin', person);
  cylinder(0.29, 0.29, 0.065, 0, 1.49, 0, 'cream', person, 16);
  cylinder(0.19, 0.22, 0.16, 0, 1.58, 0, 'cream', person, 16);
  box(0.27, 0.32, 0.13, 0, 0.84, -0.22, 'blue', person, true);

  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#a95038', transparent: true, opacity: 0.6, depthWrite: false });
  materials.add(markerMaterial);
  const marker = mesh(geometry('destination', () => new THREE.RingGeometry(0.21, 0.3, 32)), markerMaterial, 0, 0.11, 0);
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  marker.castShadow = false;

  const hemi = new THREE.HemisphereLight('#fff7e3', '#aaa38c', 2.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d0', 3.2);
  sun.position.set(-10, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 65 });
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.00015;
  scene.add(sun);

  let destroyed = false;
  let frame = 0;
  let lastTime = 0;
  let walkTime = 0;
  let path = [];
  let transition = null;
  let viewMode = 'overview';
  let followSuspended = false;
  let pointerStart = null;
  const pointers = new Set();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const movement = new THREE.Vector3();
  const radius = 0.28;

  function walkable(x, z) {
    return Math.abs(x) <= extent - 0.45 && Math.abs(z) <= 8.55 && !obstacles.some((o) =>
      x > o.minX - radius && x < o.maxX + radius && z > o.minZ - radius && z < o.maxZ + radius);
  }

  function clearSegment(ax, az, bx, bz) {
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.12));
    for (let i = 1; i <= steps; i += 1) {
      if (!walkable(ax + (bx - ax) * i / steps, az + (bz - az) * i / steps)) return false;
    }
    return true;
  }

  function findPath(destination) {
    if (!walkable(destination.x, destination.z)) return [];
    const start = person.position;
    if (clearSegment(start.x, start.z, destination.x, destination.z)) return [destination.clone()];
    const nodes = [];
    const visited = new Set();
    const queue = [];
    const cell = 0.2;
    const key = (x, z) => `${x},${z}`;
    const sx = Math.round(start.x / cell);
    const sz = Math.round(start.z / cell);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const x = sx + dx;
        const z = sz + dz;
        if (!clearSegment(start.x, start.z, x * cell, z * cell)) continue;
        nodes.push({ x, z, parent: -1 });
        queue.push(nodes.length - 1);
        visited.add(key(x, z));
      }
    }
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      const node = nodes[index];
      const x = node.x * cell;
      const z = node.z * cell;
      if (Math.hypot(x - destination.x, z - destination.z) < 0.8 && clearSegment(x, z, destination.x, destination.z)) {
        const result = [destination.clone()];
        for (let current = index; current !== -1; current = nodes[current].parent) {
          result.unshift(new THREE.Vector3(nodes[current].x * cell, 0.1, nodes[current].z * cell));
        }
        const simplified = [];
        let anchor = start;
        for (let i = 0; i < result.length;) {
          let next = i;
          for (let j = i + 1; j < result.length; j += 1) {
            if (clearSegment(anchor.x, anchor.z, result[j].x, result[j].z)) next = j;
          }
          simplified.push(result[next]);
          anchor = result[next];
          i = next + 1;
        }
        return simplified;
      }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = node.x + dx;
        const nz = node.z + dz;
        const id = key(nx, nz);
        if (visited.has(id) || !clearSegment(x, z, nx * cell, nz * cell)) continue;
        visited.add(id);
        nodes.push({ x: nx, z: nz, parent: index });
        queue.push(nodes.length - 1);
      }
    }
    return [];
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...buildings.values(), ...benches], true).find((entry) => entry.object.isMesh);
    if (hit) {
      let object = hit.object;
      while (object && !object.userData.buildingId && object.userData.benchIndex === undefined) object = object.parent;
      if (object?.userData.buildingId) return { id: object.userData.buildingId };
      if (object?.userData.benchIndex !== undefined) return { id: `bench-${object.userData.benchIndex}` };
    }
    const point = raycaster.ray.intersectPlane(ground, new THREE.Vector3());
    return point && walkable(point.x, point.z) ? { point } : null;
  }

  function pointerDown(event) {
    pointers.add(event.pointerId);
    if (pointers.size > 1) pointerStart = null;
    else if (event.button === 0) pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false };
    canvas.focus({ preventScroll: true });
  }

  function pointerMove(event) {
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) pointerStart.moved = true;
    if (pointers.size) return;
    canvas.style.cursor = pick(event)?.id ? 'pointer' : 'grab';
  }

  function pointerUp(event) {
    const start = pointerStart;
    pointers.delete(event.pointerId);
    pointerStart = null;
    if (!start || start.id !== event.pointerId || start.moved || event.type !== 'pointerup') return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const hit = pick(event);
    if (hit?.id) {
      if (typeof opts.onSelect === 'function') opts.onSelect(hit.id);
    } else if (hit?.point) {
      if (sitting) standUp();
      path = findPath(hit.point);
      marker.visible = path.length > 0;
      marker.position.set(hit.point.x, 0.115, hit.point.z);
    }
  }

  const keyCodes = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
  function keyDown(event) {
    if (!keyCodes.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    // 页面级全局监听：即使焦点在页面其他位置也能操控小人
    event.preventDefault();
    if (sitting) standUp();
    keys.add(event.code);
    path = [];
    marker.visible = false;
  }
  function keyUp(event) { keys.delete(event.code); }
  function clearInput() {
    keys.clear();
    pointers.clear();
    pointerStart = null;
    lastTime = 0;
  }
  function cancelTransition() { transition = null; }

  function finishTransition() {
    if (!transition) return;
    controls.enableDamping = false;
    controls.update();
    if (transition.position) {
      camera.position.copy(transition.position);
      controls.target.copy(transition.target);
    } else {
      camera.position.add(transition.target.clone().sub(controls.target));
      controls.target.copy(transition.target);
    }
    camera.zoom = transition.zoom;
    camera.updateProjectionMatrix();
    controls.update();
    controls.enableDamping = !reducedMotion.matches;
    transition = null;
  }

  function motionPreferenceChanged() {
    if (destroyed) return;
    controls.enableDamping = !reducedMotion.matches;
    if (reducedMotion.matches) finishTransition();
  }

  function visibilityChanged() {
    clearInput();
    cancelAnimationFrame(frame);
    frame = 0;
    if (!destroyed && !document.hidden) frame = requestAnimationFrame(animate);
  }

  function resize() {
    if (destroyed) return;
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const aspect = width / height;
    const halfHeight = Math.max(12.5, (extent + 5) / aspect, extent * 0.65);
    Object.assign(camera, { left: -halfHeight * aspect, right: halfHeight * aspect, top: halfHeight, bottom: -halfHeight });
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
  }

  function setNight(value) {
    if (destroyed) return;
    const night = Boolean(value);
    scene.background.set(night ? '#202d35' : '');
    if (!night) scene.background.copy(dayBackground);
    hemi.color.set(night ? '#a3b6d8' : '#fff7e3');
    hemi.groundColor.set(night ? '#45454e' : '#aaa38c');
    hemi.intensity = night ? 0.8 : 2.5;
    sun.color.set(night ? '#adc5ed' : '#fff0d0');
    sun.intensity = night ? 0.7 : 3.2;
    paint.glass.emissiveIntensity = night ? 1.8 : 0;
    bulb.emissiveIntensity = night ? 3 : 0.2;
    lamps.forEach((light) => { light.intensity = night ? 12 : 0; });
    renderer.toneMappingExposure = night ? 1 : 1.15;
  }

  function focus(id) {
    if (destroyed || !buildings.has(id)) return false;
    followSuspended = viewMode === 'follow';
    const target = buildings.get(id).position.clone();
    target.y = 1.2;
    transition = { target, zoom: 1.65 };
    if (reducedMotion.matches) finishTransition();
    return true;
  }

  /** 视角切换：overview 俯瞰全景 / follow 跟随小人的玩家视角。 */
  function setView(mode) {
    if (destroyed) return;
    if (mode === 'follow') {
      const resume = viewMode === 'follow';
      viewMode = 'follow';
      followSuspended = false;
      // 跟随（玩家）视角允许更低平的环顾角度，避免与极角钳制打架
      controls.maxPolarAngle = Math.PI / 2.08;
      if (resume && !transition) return;
      const center = person.position.clone().add(new THREE.Vector3(0, 1.15, 0));
      transition = {
        target: center,
        zoom: 2.1,
        position: person.position.clone().add(new THREE.Vector3(4.4, 2.9, 5.4)),
      };
      if (reducedMotion.matches) finishTransition();
    } else {
      viewMode = 'overview';
      followSuspended = false;
      controls.maxPolarAngle = Math.PI / 2.6;
      transition = { target: homeTarget.clone(), zoom: 1.3, position: home.clone() };
      if (reducedMotion.matches) finishTransition();
    }
  }

  function reset() {
    if (destroyed) return;
    standUp();
    approachCallback = null;
    approachTarget = null;
    jumpHeight = 0;
    jumpVelocity = 0;
    viewMode = 'overview';
    followSuspended = false;
    controls.maxPolarAngle = Math.PI / 2.6;
    controls.reset();
    camera.position.copy(home);
    controls.target.copy(homeTarget);
    camera.zoom = 1.3;
    camera.updateProjectionMatrix();
    controls.update();
    transition = null;
    path = [];
    clearInput();
    person.position.set(0, 0.1, 2.2);
    person.rotation.y = 0;
    marker.visible = false;
  }

  function animate(time) {
    if (destroyed || document.hidden) {
      frame = 0;
      return;
    }
    frame = requestAnimationFrame(animate);
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    if (transition) {
      const factor = 1 - Math.exp(-dt * 6);
      const delta = transition.target.clone().sub(controls.target).multiplyScalar(factor);
      camera.position.add(delta);
      controls.target.add(delta);
      if (transition.position) camera.position.lerp(transition.position, factor);
      camera.zoom = THREE.MathUtils.lerp(camera.zoom, transition.zoom, factor);
      camera.updateProjectionMatrix();
      if (controls.target.distanceTo(transition.target) < 0.005 && Math.abs(camera.zoom - transition.zoom) < 0.005) transition = null;
    }
    if (viewMode === 'follow' && !followSuspended && !transition) {
      const want = person.position.clone().add(new THREE.Vector3(0, 1.15, 0));
      const follow = want.sub(controls.target).multiplyScalar(Math.min(1, dt * 8));
      controls.target.add(follow);
      camera.position.add(follow);
      controls.update();
    } else if (!transition) {
      controls.update();
    }
    // transition 期间不调用 controls.update()，避免阻尼与过渡动画互相拉扯导致画面抖动丢帧
    movement.set(0, 0, 0);
    let step = 2.6 * dt;
    if (approachCallback && path.length === 0) settleApproach();
    // 门口交互圈：靠近淡入并轻微呼吸，离开淡出
    doorMarkers.forEach((marker2) => {
      const near = !sitting && marker2.pos.distanceTo(
        new THREE.Vector3(person.position.x, 0, person.position.z)) < 2.6;
      marker2.material.opacity += ((near ? 0.55 : 0) - marker2.material.opacity) * Math.min(1, dt * 6);
      const visible = marker2.material.opacity > 0.02;
      marker2.ring.visible = visible;
      marker2.dot.visible = visible;
      if (visible) {
        const pulse = 1 + Math.sin(time * 0.004) * 0.07;
        marker2.ring.scale.setScalar(pulse);
      }
    });
    // 跳跃竖抛物理
    if (jumpVelocity !== 0 || jumpHeight > 0) {
      jumpVelocity -= 13 * dt;
      jumpHeight += jumpVelocity * dt;
      if (jumpHeight <= 0) {
        jumpHeight = 0;
        jumpVelocity = 0;
      }
    }
    person.position.y = (sitting ? 0.12 : 0.1) + jumpHeight;
    if (sitting) {
      // 坐着时不移动（起身由按键/点击触发）
      renderer.render(scene, camera);
      return;
    }
    if (keys.size) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, camera.up).normalize();
      const vertical = Number(keys.has('ArrowUp') || keys.has('KeyW')) - Number(keys.has('ArrowDown') || keys.has('KeyS'));
      const horizontal = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
      movement.addScaledVector(forward, vertical).addScaledVector(right, horizontal).normalize();
    } else if (path.length) {
      movement.subVectors(path[0], person.position);
      movement.y = 0;
      const distance = movement.length();
      if (distance < 0.06) {
        path.shift();
        marker.visible = path.length > 0;
        movement.set(0, 0, 0);
      } else {
        movement.normalize();
        step = Math.min(step, distance);
      }
    }
    const oldX = person.position.x;
    const oldZ = person.position.z;
    const nextX = oldX + movement.x * step;
    const nextZ = oldZ + movement.z * step;
    if (walkable(nextX, oldZ)) person.position.x = nextX;
    if (walkable(person.position.x, nextZ)) person.position.z = nextZ;
    const distance = Math.hypot(person.position.x - oldX, person.position.z - oldZ);
    if (distance > 0.0001) {
      walkTime += distance * 5;
      const heading = Math.atan2(person.position.x - oldX, person.position.z - oldZ);
      const turn = Math.atan2(Math.sin(heading - person.rotation.y), Math.cos(heading - person.rotation.y));
      person.rotation.y += turn * Math.min(dt * 14, 1);
    }
    const swing = distance > 0.0001 ? Math.sin(walkTime) * 0.6 : 0;
    legs.forEach((leg, i) => { leg.rotation.x = i ? -swing : swing; });
    arms.forEach((arm, i) => { arm.rotation.x = i ? swing : -swing; });
    marker.scale.setScalar(1 + Math.sin(time * 0.006) * 0.1);
    renderer.render(scene, camera);
  }

  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', visibilityChanged);
  reducedMotion.addEventListener('change', motionPreferenceChanged);
  controls.addEventListener('start', cancelTransition);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('pointerup', pointerUp);
    window.removeEventListener('pointercancel', pointerUp);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('blur', clearInput);
    document.removeEventListener('visibilitychange', visibilityChanged);
    reducedMotion.removeEventListener('change', motionPreferenceChanged);
    controls.removeEventListener('start', cancelTransition);
    controls.dispose();
    clearInput();
    path = [];
    transition = null;
    geometries.forEach((item) => item.dispose());
    materials.forEach((item) => item.dispose());
    textures.forEach((item) => item.dispose());
    sun.shadow.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    scene.clear();
    world.clear();
    buildings.clear();
    geometries.clear();
    materials.clear();
    textures.clear();
    obstacles.length = 0;
    lamps.length = 0;
  }

  const api = { setNight, focus, reset, setView, space, approach, destroy };
  // 开场：小人从街口踱步到街心站定，让访客第一眼就注意到他
  setTimeout(() => {
    if (destroyed) return;
    person.position.set(-6.5, 0.1, 1.6);
    path = [new THREE.Vector3(0, 0.1, 2.2)];
  }, 700);

  let jumpHeight = 0;
  let jumpVelocity = 0;
  let sitting = false;
  let sittingBench = -1;
  let approachCallback = null;
  let approachTarget = null;

  function standUp() {
    if (!sitting) return;
    sitting = false;
    sittingBench = -1;
    // 从椅子上起身：向椅子面向方向迈出一步，站到可走位置
    person.position.y = 0.1;
    person.position.x += Math.sin(person.rotation.y) * 2.1;
    person.position.z += Math.cos(person.rotation.y) * 2.1;
    legs.forEach((leg) => { leg.rotation.x = 0; });
    arms.forEach((arm) => { arm.rotation.x = 0; });
    if (typeof opts.onSit === 'function') opts.onSit(false);
  }

  function sitDown(benchIndex) {
    const benchGroup = benches[benchIndex];
    sitting = true;
    sittingBench = benchIndex;
    keys.clear();
    path = [];
    marker.visible = false;
    // 坐姿（精确计算）：髋关节在人局部 y=0.58，1.8 倍缩放后髋高 = posY + 1.044，
    // 放大长椅（1.5x）座面高约 1.02 → posY ≈ 0 时臀部正好落座。
    // 腿 rotation.x = -1.35 使 (0,-1,0) 转为 (0,-0.22,+0.49)：朝人物面朝方向（椅子面向、街道一侧）前伸。
    // 身体中心沿椅子面向前移 0.1，离开靠背（靠背在局部 -0.48，人背厚半 0.27，仍有 0.3 间隙）。
    const offsetX = Math.sin(benchGroup.rotation.y) * 0.1;
    const offsetZ = Math.cos(benchGroup.rotation.y) * 0.1;
    // 髋高 = 0.12 + 0.58×1.8 = 1.164；腿完全水平前伸时腿底 = 1.164 − 0.095 = 1.070，
    // 恰好贴在放大座板顶面（≈1.065）上方，公园长椅伸腿坐姿，不穿模
    person.position.set(benchGroup.position.x + offsetX, 0.12, benchGroup.position.z + offsetZ);
    person.rotation.y = benchGroup.rotation.y;
    legs.forEach((leg) => { leg.rotation.x = -Math.PI / 2; });
    arms.forEach((arm) => { arm.rotation.x = -0.3; });
    if (typeof opts.onSit === 'function') opts.onSit(true);
  }

  /** 让小人走到建筑门口（或长椅）旁，到达后回调。 */
  function approach(id, onArrive) {
    if (destroyed) return;
    if (sitting) standUp();
    approachTarget = id;
    approachCallback = onArrive;
    if (id.startsWith('bench-')) {
      const benchGroup = benches[Number(id.slice(6))];
      const ahead = new THREE.Vector3(
        benchGroup.position.x + Math.sin(benchGroup.rotation.y) * 1.75, 0.1,
        benchGroup.position.z + Math.cos(benchGroup.rotation.y) * 1.75);
      path = findPath(ahead);
    } else if (doorCircles.has(id)) {
      const door = doorCircles.get(id);
      path = findPath(door.clone().setY(0.1));
    } else {
      path = [];
    }
    marker.visible = path.length > 0;
    if (!path.length) {
      // 目标不可达或已在场：立即结算
      settleApproach();
    }
  }

  function settleApproach() {
    const callback = approachCallback;
    const target = approachTarget;
    approachCallback = null;
    approachTarget = null;
    if (!callback) return;
    if (target?.startsWith('bench-')) {
      sitDown(Number(target.slice(6)));
      callback(target);
    } else {
      // 面向房门
      const building = buildings.get(target);
      if (building) {
        const facing = building.rotation.y;
        person.rotation.y = Math.atan2(
          building.position.x - person.position.x,
          building.position.z - person.position.z);
        void facing;
      }
      callback(target);
    }
  }

  /** 空格键：坐下时起身；在房门口时返回建筑 id（由宿主打开卡片）；否则起跳。 */
  function space() {
    if (destroyed) return null;
    if (sitting) {
      standUp();
      return null;
    }
    for (const [id, door] of doorCircles) {
      if (person.position.distanceTo(new THREE.Vector3(door.x, person.position.y, door.z)) < 1.25) return id;
    }
    if (jumpHeight <= 0.001) {
      jumpVelocity = 4.4;
      path = [];
      marker.visible = false;
    }
    return null;
  }
  resize();
  setNight(false);
  controls.saveState();
  if (!document.hidden) {
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }
  queueMicrotask(() => {
    if (!destroyed && typeof opts.onReady === 'function') opts.onReady(api);
  });
  return api;
}

export default createScene;
