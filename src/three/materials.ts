import * as THREE from 'three';

export interface GarageMaterials {
  floorEpoxy: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  carBodyPaint: THREE.MeshPhysicalMaterial;
  carHoodPaint: THREE.MeshPhysicalMaterial;
  chassisSteel: THREE.MeshStandardMaterial;
  castAluminum: THREE.MeshStandardMaterial;
  chromePolished: THREE.MeshStandardMaterial;
  valveCoverRed: THREE.MeshPhysicalMaterial;
  rubberMatte: THREE.MeshStandardMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  brakeRotorSteel: THREE.MeshStandardMaterial;
  caliperGold: THREE.MeshPhysicalMaterial;
  padGoodCeramic: THREE.MeshStandardMaterial;
  padWornScorched: THREE.MeshStandardMaterial;
  boltHexSteel: THREE.MeshStandardMaterial;
  boltTorquedEmerald: THREE.MeshStandardMaterial;
  sparkCeramicClean: THREE.MeshStandardMaterial;
  sparkFouledCarbon: THREE.MeshStandardMaterial;
  airFilterClean: THREE.MeshStandardMaterial;
  airFilterDirty: THREE.MeshStandardMaterial;
  oilFilterClean: THREE.MeshStandardMaterial;
  oilFilterDirty: THREE.MeshStandardMaterial;
  batteryCaseGood: THREE.MeshStandardMaterial;
  batteryCaseWeak: THREE.MeshStandardMaterial;
  copperRed: THREE.MeshStandardMaterial;
  liftPostBlue: THREE.MeshStandardMaterial;
  safetyYellow: THREE.MeshStandardMaterial;
  toolRedGloss: THREE.MeshPhysicalMaterial;
  oilFluidOld: THREE.MeshStandardMaterial;
  oilFluidFresh: THREE.MeshStandardMaterial;
  highlightHover: THREE.MeshBasicMaterial;
  disposableTextures: THREE.Texture[];
  disposableMaterials: THREE.Material[];
}

function createWorkshopFloorTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark slate epoxy base
  ctx.fillStyle = '#1b1e24';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle tile grid
  ctx.strokeStyle = '#272b34';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Subtle speckle grain
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAniso;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBrakeRotorTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#aeb6c2';
  ctx.fillRect(0, 0, 256, 256);

  // Concentric machined friction rings
  for (let r = 36; r < 122; r += 4) {
    ctx.strokeStyle = r % 8 === 0 ? '#939ca8' : '#c5cdd8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Drilled / slotted cooling vents
  ctx.strokeStyle = '#383d47';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 58, 128 + Math.sin(a) * 58);
    ctx.lineTo(128 + Math.cos(a + 0.24) * 110, 128 + Math.sin(a + 0.24) * 110);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createFilterPleatTexture(colorHex: string, streakHex: string, maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = streakHex;
  for (let x = 0; x < 256; x += 12) {
    ctx.fillRect(x, 0, 5, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createGarageMaterials(renderer: THREE.WebGLRenderer): GarageMaterials {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const disposableTextures: THREE.Texture[] = [];
  const disposableMaterials: THREE.Material[] = [];

  const regTex = <T extends THREE.Texture>(t: T): T => {
    disposableTextures.push(t);
    return t;
  };
  const regMat = <T extends THREE.Material>(m: T): T => {
    disposableMaterials.push(m);
    return m;
  };

  const floorTex = regTex(createWorkshopFloorTexture(maxAniso));
  const shadowTex = regTex(createContactShadowTexture());
  const rotorTex = regTex(createBrakeRotorTexture(maxAniso));
  const cleanPleatTex = regTex(createFilterPleatTexture('#f59e0b', '#d97706', maxAniso));
  const dirtyPleatTex = regTex(createFilterPleatTexture('#44403c', '#1c1917', maxAniso));

  const floorEpoxy = regMat(
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.42,
      metalness: 0.12,
    })
  );

  const contactShadow = regMat(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );

  const carBodyPaint = regMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x2563eb,
      metalness: 0.72,
      roughness: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    })
  );

  const carHoodPaint = regMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      metalness: 0.75,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
    })
  );

  const chassisSteel = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x22262e,
      metalness: 0.65,
      roughness: 0.58,
    })
  );

  const castAluminum = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.84,
      roughness: 0.36,
    })
  );

  const chromePolished = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      metalness: 0.96,
      roughness: 0.12,
    })
  );

  const valveCoverRed = regMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      metalness: 0.68,
      roughness: 0.28,
      clearcoat: 0.65,
      clearcoatRoughness: 0.2,
    })
  );

  const rubberMatte = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.06,
      roughness: 0.86,
    })
  );

  const tireRubber = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x16171a,
      metalness: 0.05,
      roughness: 0.9,
    })
  );

  const brakeRotorSteel = regMat(
    new THREE.MeshStandardMaterial({
      map: rotorTex,
      metalness: 0.88,
      roughness: 0.26,
    })
  );

  const caliperGold = regMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.72,
      roughness: 0.25,
      clearcoat: 0.8,
    })
  );

  const padGoodCeramic = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      metalness: 0.35,
      roughness: 0.55,
    })
  );

  const padWornScorched = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x451a03,
      metalness: 0.25,
      roughness: 0.88,
    })
  );

  const boltHexSteel = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.92,
      roughness: 0.2,
    })
  );

  const boltTorquedEmerald = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      metalness: 0.88,
      roughness: 0.22,
    })
  );

  const sparkCeramicClean = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.08,
      roughness: 0.22,
    })
  );

  const sparkFouledCarbon = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x292524,
      metalness: 0.15,
      roughness: 0.92,
    })
  );

  const airFilterClean = regMat(
    new THREE.MeshStandardMaterial({
      map: cleanPleatTex,
      roughness: 0.72,
      metalness: 0.05,
    })
  );

  const airFilterDirty = regMat(
    new THREE.MeshStandardMaterial({
      map: dirtyPleatTex,
      roughness: 0.92,
      metalness: 0.05,
    })
  );

  const oilFilterClean = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.55,
      roughness: 0.32,
    })
  );

  const oilFilterDirty = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.35,
      roughness: 0.82,
    })
  );

  const batteryCaseGood = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.18,
      roughness: 0.55,
    })
  );

  const batteryCaseWeak = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x3f2e2e,
      metalness: 0.15,
      roughness: 0.78,
    })
  );

  const copperRed = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.5,
      roughness: 0.38,
    })
  );

  const liftPostBlue = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      metalness: 0.58,
      roughness: 0.38,
    })
  );

  const safetyYellow = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.35,
      roughness: 0.45,
    })
  );

  const toolRedGloss = regMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xb91c1c,
      metalness: 0.62,
      roughness: 0.25,
      clearcoat: 0.85,
    })
  );

  const oilFluidOld = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x1c140d,
      metalness: 0.2,
      roughness: 0.12,
    })
  );

  const oilFluidFresh = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.15,
      roughness: 0.1,
      transparent: true,
      opacity: 0.88,
    })
  );

  const highlightHover = regMat(
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    })
  );

  return {
    floorEpoxy,
    contactShadow,
    carBodyPaint,
    carHoodPaint,
    chassisSteel,
    castAluminum,
    chromePolished,
    valveCoverRed,
    rubberMatte,
    tireRubber,
    brakeRotorSteel,
    caliperGold,
    padGoodCeramic,
    padWornScorched,
    boltHexSteel,
    boltTorquedEmerald,
    sparkCeramicClean,
    sparkFouledCarbon,
    airFilterClean,
    airFilterDirty,
    oilFilterClean,
    oilFilterDirty,
    batteryCaseGood,
    batteryCaseWeak,
    copperRed,
    liftPostBlue,
    safetyYellow,
    toolRedGloss,
    oilFluidOld,
    oilFluidFresh,
    highlightHover,
    disposableTextures,
    disposableMaterials,
  };
}
