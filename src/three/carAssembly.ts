import * as THREE from 'three';
import { CarSimState, MECHANIC_TOOLS, ToolId } from '../types/mechanic';
import { GarageMaterials } from './materials';
import { buildToolModel } from './toolModels';

export interface GarageAssemblyRefs {
  root: THREE.Group;
  liftCarriageGroup: THREE.Group; // Car + lift arms move together on Y
  liftArms: THREE.Group[];
  carGroup: THREE.Group;
  engineBlockGroup: THREE.Group;
  hoodPivot: THREE.Group;
  hoodPropRod: THREE.Mesh;
  pulleyMeshes: THREE.Mesh[];

  // Interactive parts & bolts for smooth damping animation
  boltMeshes: Record<string, { mesh: THREE.Group; basePos: THREE.Vector3; axis: 'y' | 'x' }>;
  valveCoverGroup: THREE.Group;
  coilGroups: THREE.Group[];
  sparkGroups: Array<{ group: THREE.Group; insulator: THREE.Mesh }>;
  oilCapGroup: THREE.Group;
  oilPourStream: THREE.Mesh;
  airboxCoverGroup: THREE.Group;
  airFilterMesh: THREE.Mesh;
  batteryGroup: THREE.Group;
  batteryCaseMesh: THREE.Mesh;
  obdPlugDongle: THREE.Group;

  // Front-right wheel & brake
  wheelGroup: THREE.Group;
  caliperGroup: THREE.Group;
  brakePadsGroup: THREE.Group;
  padMeshes: THREE.Mesh[];

  // Underbody
  oilFilterMesh: THREE.Mesh;
  oilDrainStream: THREE.Mesh;
  oilCatchStand: THREE.Group;

  // Raycast interactive targets (all on layer 1)
  interactiveObjects: THREE.Object3D[];
}

function tagInteractive(obj: THREE.Object3D, partId: string, list: THREE.Object3D[]) {
  obj.userData.partId = partId;
  obj.layers.enable(1);
  obj.traverse((child) => {
    child.userData.partId = partId;
    child.layers.enable(1);
  });
  list.push(obj);
}

function addHitProxy(
  parent: THREE.Object3D,
  partId: string,
  size: [number, number, number],
  offset: [number, number, number],
  list: THREE.Object3D[]
) {
  const proxyMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), proxyMat);
  proxy.position.set(offset[0], offset[1], offset[2]);
  proxy.userData.partId = partId;
  proxy.userData.isProxy = true;
  proxy.layers.set(1); // Only raycaster sees layer 1
  parent.add(proxy);
  list.push(proxy);
}

function createHexBoltMesh(mats: GarageMaterials, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const washer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018 * scale, 0.018 * scale, 0.004 * scale, 14),
    mats.boltHexSteel
  );
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013 * scale, 0.013 * scale, 0.012 * scale, 6),
    mats.boltHexSteel
  );
  head.position.y = 0.008 * scale;
  const thread = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007 * scale, 0.007 * scale, 0.026 * scale, 10),
    mats.chassisSteel
  );
  thread.position.y = -0.014 * scale;
  g.add(washer, head, thread);
  g.userData.headMesh = head;
  return g;
}

export function buildGarageAssembly(mats: GarageMaterials): GarageAssemblyRefs {
  const root = new THREE.Group();
  const interactiveObjects: THREE.Object3D[] = [];
  const boltMeshes: GarageAssemblyRefs['boltMeshes'] = {};
  const pulleyMeshes: THREE.Mesh[] = [];

  // 1. Workshop Floor & Bay Architecture
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), mats.floorEpoxy);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Safety yellow service bay border stripes (polygonOffset to prevent Z-fighting)
  const bayBorderMat = mats.safetyYellow.clone();
  bayBorderMat.polygonOffset = true;
  bayBorderMat.polygonOffsetFactor = -1;
  bayBorderMat.polygonOffsetUnits = -1;

  const leftLine = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 6.2), bayBorderMat);
  leftLine.rotation.x = -Math.PI / 2;
  leftLine.position.set(-1.65, 0.003, 0.1);
  const rightLine = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 6.2), bayBorderMat);
  rightLine.rotation.x = -Math.PI / 2;
  rightLine.position.set(1.65, 0.003, 0.1);
  root.add(leftLine, rightLine);

  // Contact shadow grounding plane under car & lift
  const carContactShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.8), mats.contactShadow);
  carContactShadow.rotation.x = -Math.PI / 2;
  carContactShadow.position.set(0, 0.005, 0.1);
  root.add(carContactShadow);

  // Workshop Rear Wall & Industrial Pillars (adds genuine VR room depth)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(14, 4.8, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x161920, roughness: 0.85, metalness: 0.15 })
  );
  backWall.position.set(0, 2.4, -5.2);
  backWall.receiveShadow = true;
  root.add(backWall);

  // Pegboard & Overhead Light Bar Fixtures on Ceiling
  for (let z = -1.6; z <= 1.8; z += 1.7) {
    const fixtureFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.06, 0.28),
      mats.chassisSteel
    );
    fixtureFrame.position.set(0, 3.85, z);
    const ledStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(2.05, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3 })
    );
    ledStrip.rotation.x = Math.PI / 2;
    ledStrip.position.set(0, 3.81, z);
    root.add(fixtureFrame, ledStrip);
  }

  // 2. Two-Post Hydraulic Lift (เสาลิฟต์ยกรถไฮดรอลิก 2 เสา)
  const liftStaticGroup = new THREE.Group();
  const postPositions = [-1.48, 1.48];
  postPositions.forEach((px, idx) => {
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.56), mats.chassisSteel);
    basePlate.position.set(px, 0.0175, 0.05);
    basePlate.receiveShadow = true;

    const column = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.25, 0.28), mats.liftPostBlue);
    column.position.set(px, 1.625, 0.05);
    column.castShadow = true;
    column.receiveShadow = true;

    const hydraulicCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 2.9, 14),
      mats.chromePolished
    );
    hydraulicCylinder.position.set(px + (idx === 0 ? 0.08 : -0.08), 1.5, 0.05);

    liftStaticGroup.add(basePlate, column, hydraulicCylinder);

    // Control Box on Right Post (interactive 3D lift switch!)
    if (idx === 1) {
      const ctrlBox = new THREE.Group();
      const boxBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.14), mats.safetyYellow);
      const upBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), mats.boltTorquedEmerald);
      upBtn.rotation.x = Math.PI / 2;
      upBtn.position.set(0, 0.05, 0.075);
      const dnBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), mats.copperRed);
      dnBtn.rotation.x = Math.PI / 2;
      dnBtn.position.set(0, -0.04, 0.075);
      ctrlBox.add(boxBody, upBtn, dnBtn);
      ctrlBox.position.set(px + 0.04, 1.32, 0.24);
      liftStaticGroup.add(ctrlBox);
      tagInteractive(ctrlBox, 'lift_switch', interactiveObjects);
    }
  });
  const topCrossbeam = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.14, 0.22), mats.liftPostBlue);
  topCrossbeam.position.set(0, 3.3, 0.05);
  liftStaticGroup.add(topCrossbeam);
  root.add(liftStaticGroup);

  // 3. Rolling Mechanic Tool Chest (ตู้เครื่องมือช่างล้อเลื่อนพร้อมเครื่องมือ 3D ทั้ง 8 ชิ้น!)
  const toolCart = new THREE.Group();
  toolCart.position.set(2.15, 0, 1.15);
  toolCart.rotation.y = -0.38;

  const cartShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9), mats.contactShadow);
  cartShadow.rotation.x = -Math.PI / 2;
  cartShadow.position.y = 0.004;
  toolCart.add(cartShadow);

  const cabinetBody = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.82, 0.56), mats.toolRedGloss);
  cabinetBody.position.y = 0.49;
  cabinetBody.castShadow = true;
  cabinetBody.receiveShadow = true;
  toolCart.add(cabinetBody);

  // Chrome drawer pulls
  for (let d = 0; d < 4; d++) {
    const drawerTrim = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.018, 0.02), mats.chromePolished);
    drawerTrim.position.set(0, 0.22 + d * 0.17, 0.29);
    toolCart.add(drawerTrim);
  }

  // Rubber top mat on tool chest
  const topMat = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.02, 0.54), mats.rubberMatte);
  topMat.position.y = 0.91;
  toolCart.add(topMat);

  // Caster wheels
  [
    [-0.44, -0.22],
    [0.44, -0.22],
    [-0.44, 0.22],
    [0.44, 0.22],
  ].forEach(([wx, wz]) => {
    const caster = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), mats.rubberMatte);
    caster.rotation.z = Math.PI / 2;
    caster.position.set(wx, 0.04, wz);
    toolCart.add(caster);
  });

  // Place all 8 3D tools on top of the tool chest as clickable pickups!
  MECHANIC_TOOLS.forEach((spec, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const toolMesh = buildToolModel(spec.id as ToolId, mats);
    toolMesh.scale.setScalar(0.95);
    toolMesh.position.set(-0.36 + col * 0.24, 0.945, -0.13 + row * 0.25);
    toolCart.add(toolMesh);
    addHitProxy(
      toolCart,
      `tool_pickup_${spec.id}`,
      [0.21, 0.14, 0.22],
      [-0.36 + col * 0.24, 0.96, -0.13 + row * 0.25],
      interactiveObjects
    );
  });
  root.add(toolCart);

  // 4. Lift Carriage Group (Lift Swing Arms + Entire Sports Sedan)
  const liftCarriageGroup = new THREE.Group();
  const liftArms: THREE.Group[] = [];

  // 4 Swing Arms reaching under the car rocker jack points
  [
    { px: -1.42, pz: 0.05, tx: -0.78, tz: 0.78 },
    { px: -1.42, pz: 0.05, tx: -0.78, tz: -0.68 },
    { px: 1.42, pz: 0.05, tx: 0.78, tz: 0.78 },
    { px: 1.42, pz: 0.05, tx: 0.78, tz: -0.68 },
  ].forEach((cfg) => {
    const armGroup = new THREE.Group();
    const dx = cfg.tx - cfg.px;
    const dz = cfg.tz - cfg.pz;
    const len = Math.hypot(dx, dz);
    const armBar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.065, len), mats.safetyYellow);
    armBar.position.set((cfg.px + cfg.tx) / 2, 0.14, (cfg.pz + cfg.tz) / 2);
    armBar.rotation.y = Math.atan2(dx, dz);
    armBar.castShadow = true;

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 16), mats.rubberMatte);
    pad.position.set(cfg.tx, 0.18, cfg.tz);
    armGroup.add(armBar, pad);
    liftArms.push(armGroup);
    liftCarriageGroup.add(armGroup);
  });

  // 5. Vehicle Chassis & Bodywork (Composite Multi-Part Sports Sedan)
  const carGroup = new THREE.Group();
  liftCarriageGroup.add(carGroup);

  // Underbody structural frame & exhaust system
  const undertray = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.09, 3.65), mats.chassisSteel);
  undertray.position.set(0, 0.25, -0.05);
  undertray.castShadow = true;
  undertray.receiveShadow = true;
  carGroup.add(undertray);

  // Stainless Exhaust Pipe + Catalytic Converter + Rear Muffler (visible when lifted!)
  const exhaustPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.08, 0.22, 1.05),
    new THREE.Vector3(0.08, 0.19, 0.2),
    new THREE.Vector3(0.22, 0.19, -0.9),
    new THREE.Vector3(0.38, 0.2, -1.95),
  ]);
  const exhaustPipe = new THREE.Mesh(
    new THREE.TubeGeometry(exhaustPath, 28, 0.032, 10, false),
    mats.chromePolished
  );
  const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.42, 16), mats.chromePolished);
  muffler.rotation.x = Math.PI / 2;
  muffler.position.set(0.38, 0.21, -1.78);
  carGroup.add(exhaustPipe, muffler);

  // Left/Right Fenders surrounding open engine bay (+Z is front of car!)
  const leftFender = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 1.38), mats.carBodyPaint);
  leftFender.position.set(-0.77, 0.62, 1.22);
  leftFender.castShadow = true;

  const rightFender = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 1.38), mats.carBodyPaint);
  rightFender.position.set(0.77, 0.62, 1.22);
  rightFender.castShadow = true;

  // Front Bumper, Splitter, Intercooler & LED Headlights
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.34, 0.26), mats.carBodyPaint);
  frontBumper.position.set(0, 0.42, 1.92);
  frontBumper.castShadow = true;

  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.04, 0.32), mats.rubberMatte);
  frontSplitter.position.set(0, 0.24, 1.95);

  const intercooler = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.22, 0.08), mats.castAluminum);
  intercooler.position.set(0, 0.41, 2.02);

  [-0.58, 0.58].forEach((hx) => {
    const headlampHousing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.14), mats.rubberMatte);
    headlampHousing.position.set(hx, 0.64, 1.91);
    const drlStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.025, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
    );
    drlStrip.position.set(hx, 0.62, 1.98);
    carGroup.add(headlampHousing, drlStrip);
  });

  // Engine Bay Firewall & Cabin Silhouette (Rear of Z = +0.52)
  const firewall = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.64, 0.12), mats.chassisSteel);
  firewall.position.set(0, 0.62, 0.52);

  const cabinLower = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.58, 2.48), mats.carBodyPaint);
  cabinLower.position.set(0, 0.61, -0.78);
  cabinLower.castShadow = true;
  cabinLower.receiveShadow = true;

  // Sleek Greenhouse / Roof / Windshield
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-1.05, 0);
  roofShape.lineTo(0.95, 0);
  roofShape.lineTo(0.45, 0.52);
  roofShape.lineTo(-0.55, 0.52);
  roofShape.closePath();
  const cabinGlassGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: 1.46,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  cabinGlassGeo.rotateY(Math.PI / 2);
  cabinGlassGeo.translate(-0.73, 0.9, -0.72);
  const cabinTop = new THREE.Mesh(
    cabinGlassGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.35,
      roughness: 0.12,
      clearcoat: 1.0,
    })
  );
  cabinTop.castShadow = true;

  carGroup.add(
    leftFender,
    rightFender,
    frontBumper,
    frontSplitter,
    intercooler,
    firewall,
    cabinLower,
    cabinTop
  );

  // Hinged Front Hood (ฝากระโปรงหน้ารถ) — Pivots at Z = 0.56, Y = 0.90
  const hoodPivot = new THREE.Group();
  hoodPivot.position.set(0, 0.89, 0.56);

  const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.035, 1.36), mats.carHoodPaint);
  hoodPanel.position.set(0, 0.015, 0.68);
  hoodPanel.castShadow = true;

  const hoodRib = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.028, 1.05), mats.carBodyPaint);
  hoodRib.position.set(0, 0.035, 0.65);
  hoodPivot.add(hoodPanel, hoodRib);
  carGroup.add(hoodPivot);
  tagInteractive(hoodPivot, 'hood', interactiveObjects);

  const hoodPropRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.88, 8),
    mats.chromePolished
  );
  hoodPropRod.position.set(-0.66, 1.24, 1.28);
  hoodPropRod.rotation.x = 0.32;
  hoodPropRod.visible = false;
  carGroup.add(hoodPropRod);

  // 6. 2.0T DOHC 4-Cylinder Engine Assembly (ห้องเครื่องยนต์)
  const engineBlockGroup = new THREE.Group();
  engineBlockGroup.position.set(-0.04, 0.56, 1.18);
  carGroup.add(engineBlockGroup);

  // Cast Aluminum Short Block + Cylinder Head
  const shortBlock = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.58), mats.castAluminum);
  shortBlock.castShadow = true;
  const cylinderHead = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.6), mats.castAluminum);
  cylinderHead.position.y = 0.21;
  cylinderHead.castShadow = true;

  // Intake Manifold Runners (4 curved aluminum runners on left side)
  for (let i = 0; i < 4; i++) {
    const runner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.18, 12),
      mats.castAluminum
    );
    runner.rotation.z = Math.PI / 2 - 0.35;
    runner.position.set(-0.27, 0.18, -0.21 + i * 0.14);
    engineBlockGroup.add(runner);
  }

  // Front Timing Belt Pulleys (spin when engine is running!)
  [
    { x: 0, y: -0.05, r: 0.075 },
    { x: -0.09, y: 0.18, r: 0.055 },
    { x: 0.09, y: 0.18, r: 0.055 },
  ].forEach((p) => {
    const pulley = new THREE.Mesh(
      new THREE.CylinderGeometry(p.r, p.r, 0.032, 18),
      mats.chassisSteel
    );
    pulley.rotation.x = Math.PI / 2;
    pulley.position.set(p.x, p.y, 0.32);
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(p.r * 1.6, 0.012, 0.036),
      mats.chromePolished
    );
    spoke.rotation.x = -Math.PI / 2;
    pulley.add(spoke);
    pulleyMeshes.push(pulley);
    engineBlockGroup.add(pulley);
  });

  // Underbody Oil Sump Pan + 17mm Drain Plug + Oil Filter (at bottom of engineBlockGroup!)
  const oilPan = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.52), mats.chassisSteel);
  oilPan.position.set(0, -0.23, 0);
  engineBlockGroup.add(shortBlock, cylinderHead, oilPan);

  // Oil Drain Plug (17mm) on bottom-side of sump
  const drainBolt = createHexBoltMesh(mats, 1.25);
  drainBolt.rotation.x = Math.PI; // Facing downward!
  const drainBasePos = new THREE.Vector3(0.08, -0.315, 0.08);
  drainBolt.position.copy(drainBasePos);
  engineBlockGroup.add(drainBolt);
  boltMeshes['oil_drain_plug'] = { mesh: drainBolt, basePos: drainBasePos, axis: 'y' };
  tagInteractive(drainBolt, 'oil_drain_plug', interactiveObjects);
  addHitProxy(engineBlockGroup, 'oil_drain_plug', [0.12, 0.1, 0.12], [0.08, -0.33, 0.08], interactiveObjects);

  // Spin-on Oil Filter Canister underneath engine
  const oilFilterMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.13, 18),
    mats.oilFilterClean
  );
  oilFilterMesh.position.set(-0.14, -0.29, 0.14);
  engineBlockGroup.add(oilFilterMesh);
  tagInteractive(oilFilterMesh, 'oil_filter', interactiveObjects);
  addHitProxy(engineBlockGroup, 'oil_filter', [0.14, 0.16, 0.14], [-0.14, -0.29, 0.14], interactiveObjects);

  // Animated 3D Oil Stream (draining downward when plug removed)
  const oilDrainStream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.014, 0.85, 10),
    mats.oilFluidOld
  );
  oilDrainStream.position.set(0.08, -0.74, 0.08);
  oilDrainStream.visible = false;
  engineBlockGroup.add(oilDrainStream);

  // Telescoping Oil Drain Pan Stand on Workshop Floor (visible when lift is high)
  const oilCatchStand = new THREE.Group();
  const catchBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.38, 18), mats.toolRedGloss);
  catchBase.position.y = 0.19;
  const catchPole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.92, 12), mats.chromePolished);
  catchPole.position.y = 0.78;
  const catchFunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.04, 0.14, 18), mats.rubberMatte);
  catchFunnel.position.y = 1.24;
  oilCatchStand.add(catchBase, catchPole, catchFunnel);
  oilCatchStand.position.set(0.04, 0, 1.26);
  oilCatchStand.visible = false;
  root.add(oilCatchStand);

  // Spark Plugs (4x inside cylinder head wells) + Ignition Coils (4x on top)
  const sparkGroups: GarageAssemblyRefs['sparkGroups'] = [];
  const coilGroups: THREE.Group[] = [];

  for (let i = 0; i < 4; i++) {
    const zOff = -0.2 + i * 0.135;

    // Spark Plug Well Recess Ring
    const wellRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 0.03, 14),
      mats.chassisSteel
    );
    wellRing.position.set(0, 0.285, zOff);
    engineBlockGroup.add(wellRing);

    // Spark Plug 3D Composite Mesh
    const spGroup = new THREE.Group();
    const spHex = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.022, 6), mats.chromePolished);
    const spInsulator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.011, 0.042, 12),
      mats.sparkCeramicClean
    );
    spInsulator.position.y = 0.028;
    const spTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.012, 8),
      mats.chromePolished
    );
    spTerminal.position.y = 0.052;
    spGroup.add(spHex, spInsulator, spTerminal);
    spGroup.position.set(0, 0.29, zOff);
    engineBlockGroup.add(spGroup);
    sparkGroups.push({ group: spGroup, insulator: spInsulator });
    tagInteractive(spGroup, `spark_${i}`, interactiveObjects);
    addHitProxy(engineBlockGroup, `spark_${i}`, [0.08, 0.09, 0.08], [0, 0.31, zOff], interactiveObjects);

    // Ignition Coil-On-Plug Pack
    const coilGroup = new THREE.Group();
    const coilBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.015, 0.055, 12), mats.rubberMatte);
    coilBoot.position.y = 0.02;
    const coilTop = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.026, 0.068), mats.rubberMatte);
    coilTop.position.y = 0.058;
    const coilAccent = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.008, 0.042), mats.copperRed);
    coilAccent.position.y = 0.073;
    coilGroup.add(coilBoot, coilTop, coilAccent);
    coilGroup.position.set(0, 0.31, zOff);
    engineBlockGroup.add(coilGroup);
    coilGroups.push(coilGroup);
    tagInteractive(coilGroup, `coil_${i}`, interactiveObjects);
    addHitProxy(engineBlockGroup, `coil_${i}`, [0.09, 0.08, 0.09], [0, 0.36, zOff], interactiveObjects);
  }

  // Red Anodized DOHC Valve Cover + 4x 10mm Valve Cover Bolts + Oil Filler Cap
  const valveCoverGroup = new THREE.Group();
  valveCoverGroup.position.set(0, 0.34, 0);

  const vcLeftCam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.085, 0.62), mats.valveCoverRed);
  vcLeftCam.position.set(-0.14, 0.04, 0);
  vcLeftCam.castShadow = true;

  const vcRightCam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.085, 0.62), mats.valveCoverRed);
  vcRightCam.position.set(0.14, 0.04, 0);
  vcRightCam.castShadow = true;

  const vcCenterCover = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.065, 0.6), mats.chassisSteel);
  vcCenterCover.position.set(0, 0.05, 0);

  valveCoverGroup.add(vcLeftCam, vcRightCam, vcCenterCover);
  engineBlockGroup.add(valveCoverGroup);
  tagInteractive(valveCoverGroup, 'valve_cover', interactiveObjects);
  addHitProxy(engineBlockGroup, 'valve_cover', [0.44, 0.1, 0.62], [0, 0.39, 0], interactiveObjects);

  // Oil Filler Cap on Front-Right of Valve Cover
  const oilCapGroup = new THREE.Group();
  const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.024, 16), mats.rubberMatte);
  const capGrip = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.014, 0.018), mats.safetyYellow);
  capGrip.position.y = 0.016;
  oilCapGroup.add(capBase, capGrip);
  oilCapGroup.position.set(0.14, 0.435, 0.21);
  engineBlockGroup.add(oilCapGroup);
  tagInteractive(oilCapGroup, 'oil_cap', interactiveObjects);
  addHitProxy(engineBlockGroup, 'oil_cap', [0.1, 0.08, 0.1], [0.14, 0.44, 0.21], interactiveObjects);

  // Oil Filler Port Target (for pouring synthetic 5W-30 oil when cap is open!)
  const fillerNeck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.025, 14),
    mats.castAluminum
  );
  fillerNeck.position.set(0.14, 0.415, 0.21);
  engineBlockGroup.add(fillerNeck);
  tagInteractive(fillerNeck, 'oil_filler_port', interactiveObjects);
  addHitProxy(engineBlockGroup, 'oil_filler_port', [0.1, 0.07, 0.1], [0.14, 0.42, 0.21], interactiveObjects);

  // Animated Fresh Golden Oil Pour Stream
  const oilPourStream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.012, 0.22, 10),
    mats.oilFluidFresh
  );
  oilPourStream.position.set(0.14, 0.53, 0.21);
  oilPourStream.visible = false;
  engineBlockGroup.add(oilPourStream);

  // Yellow Dipstick Loop on Right of Block
  const dipstickGroup = new THREE.Group();
  const dipTube = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.22, 8), mats.chassisSteel);
  const dipRing = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 8, 16), mats.safetyYellow);
  dipRing.position.y = 0.125;
  dipstickGroup.add(dipTube, dipRing);
  dipstickGroup.position.set(0.24, 0.3, 0.05);
  engineBlockGroup.add(dipstickGroup);
  tagInteractive(dipstickGroup, 'dipstick', interactiveObjects);
  addHitProxy(engineBlockGroup, 'dipstick', [0.09, 0.12, 0.09], [0.24, 0.4, 0.05], interactiveObjects);

  // 4x 10mm Valve Cover Bolts
  const vcBoltCoords: Array<[string, number, number]> = [
    ['vc_bolt_1', -0.18, 0.27],
    ['vc_bolt_2', 0.18, 0.27],
    ['vc_bolt_3', -0.18, -0.27],
    ['vc_bolt_4', 0.18, -0.27],
  ];
  vcBoltCoords.forEach(([id, bx, bz]) => {
    const bMesh = createHexBoltMesh(mats, 1.05);
    const basePos = new THREE.Vector3(bx, 0.43, bz);
    bMesh.position.copy(basePos);
    engineBlockGroup.add(bMesh);
    boltMeshes[id] = { mesh: bMesh, basePos, axis: 'y' };
    tagInteractive(bMesh, id, interactiveObjects);
    addHitProxy(engineBlockGroup, id, [0.085, 0.08, 0.085], [bx, 0.44, bz], interactiveObjects);
  });

  // 7. Air Intake Filter Box (หม้อกรองอากาศ — Left Side of Engine Bay, X = -0.48)
  const airboxBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.34), mats.rubberMatte);
  airboxBase.position.set(-0.48, 0.62, 1.38);
  carGroup.add(airboxBase);

  // Pleated Air Filter Element inside Airbox
  const airFilterMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.23, 0.045, 0.29),
    mats.airFilterClean
  );
  airFilterMesh.position.set(-0.48, 0.71, 1.38);
  carGroup.add(airFilterMesh);
  tagInteractive(airFilterMesh, 'air_filter', interactiveObjects);
  addHitProxy(carGroup, 'air_filter', [0.25, 0.09, 0.31], [-0.48, 0.72, 1.38], interactiveObjects);

  // Airbox Lid + Intake Hose
  const airboxCoverGroup = new THREE.Group();
  airboxCoverGroup.position.set(-0.48, 0.75, 1.38);
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.06, 0.35), mats.rubberMatte);
  const intakePipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.26, 14),
    mats.rubberMatte
  );
  intakePipe.rotation.z = Math.PI / 2;
  intakePipe.position.set(0.22, 0.01, -0.05);
  airboxCoverGroup.add(lidMesh, intakePipe);
  carGroup.add(airboxCoverGroup);
  tagInteractive(airboxCoverGroup, 'airbox_cover', interactiveObjects);
  addHitProxy(carGroup, 'airbox_cover', [0.3, 0.08, 0.36], [-0.48, 0.76, 1.38], interactiveObjects);

  // 2x 10mm Airbox Bolts
  [
    ['airbox_bolt_1', -0.48, 1.54],
    ['airbox_bolt_2', -0.48, 1.22],
  ].forEach(([id, ax, az]) => {
    const bMesh = createHexBoltMesh(mats, 0.95);
    const basePos = new THREE.Vector3(ax as number, 0.79, az as number);
    bMesh.position.copy(basePos);
    carGroup.add(bMesh);
    boltMeshes[id as string] = { mesh: bMesh, basePos, axis: 'y' };
    tagInteractive(bMesh, id as string, interactiveObjects);
    addHitProxy(carGroup, id as string, [0.08, 0.08, 0.08], [ax as number, 0.8, az as number], interactiveObjects);
  });

  // 8. 12V Automotive Battery + Clamp Bolts (Right Side of Engine Bay, X = +0.46, Z = 1.44)
  const batteryTray = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.24), mats.chassisSteel);
  batteryTray.position.set(0.46, 0.56, 1.44);
  carGroup.add(batteryTray);

  const batteryGroup = new THREE.Group();
  batteryGroup.position.set(0.46, 0.67, 1.44);
  const batteryCaseMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.27, 0.19, 0.2),
    mats.batteryCaseGood
  );
  batteryCaseMesh.castShadow = true;
  const posPost = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.03, 12), mats.copperRed);
  posPost.position.set(-0.08, 0.11, -0.05);
  const negPost = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.03, 12), mats.chassisSteel);
  negPost.position.set(0.08, 0.11, -0.05);
  batteryGroup.add(batteryCaseMesh, posPost, negPost);
  carGroup.add(batteryGroup);
  tagInteractive(batteryGroup, 'battery', interactiveObjects);
  addHitProxy(carGroup, 'battery', [0.29, 0.21, 0.22], [0.46, 0.67, 1.44], interactiveObjects);

  // Positive & Negative Clamp Bolts
  [
    ['batt_bolt_pos', 0.38, 1.39],
    ['batt_bolt_neg', 0.54, 1.39],
  ].forEach(([id, bx, bz]) => {
    const bMesh = createHexBoltMesh(mats, 0.95);
    const basePos = new THREE.Vector3(bx as number, 0.79, bz as number);
    bMesh.position.copy(basePos);
    carGroup.add(bMesh);
    boltMeshes[id as string] = { mesh: bMesh, basePos, axis: 'y' };
    tagInteractive(bMesh, id as string, interactiveObjects);
    addHitProxy(carGroup, id as string, [0.08, 0.08, 0.08], [bx as number, 0.8, bz as number], interactiveObjects);
  });

  // 9. ECU / OBD-II Service Diagnostic Port on Firewall (X = +0.44, Y = 0.82, Z = 0.62)
  const ecuBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), mats.castAluminum);
  ecuBox.position.set(0.44, 0.78, 0.61);
  const obdSocketFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.04), mats.safetyYellow);
  obdSocketFrame.position.set(0.44, 0.78, 0.665);
  carGroup.add(ecuBox, obdSocketFrame);
  tagInteractive(obdSocketFrame, 'obd_port', interactiveObjects);
  addHitProxy(carGroup, 'obd_port', [0.16, 0.14, 0.12], [0.44, 0.78, 0.68], interactiveObjects);

  // 3D OBD-II Plugged-in Wireless Dongle (visible when connected)
  const obdPlugDongle = new THREE.Group();
  const dongleBody = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.038, 0.075), mats.toolRedGloss);
  const dongleLed = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.01), mats.boltTorquedEmerald);
  dongleLed.position.set(0, 0.016, 0.038);
  obdPlugDongle.add(dongleBody, dongleLed);
  obdPlugDongle.position.set(0.44, 0.78, 0.705);
  obdPlugDongle.visible = false;
  carGroup.add(obdPlugDongle);

  // 10. Wheels — 3 Static Wheels + 1 Fully Interactive Front-Right Wheel & Disc Brake Assembly!
  function createWheelVisual(): THREE.Group {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 28), mats.tireRubber);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;

    const rimOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.245, 24),
      mats.castAluminum
    );
    rimOuter.rotation.z = Math.PI / 2;

    const hubCenter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.068, 0.252, 16),
      mats.chromePolished
    );
    hubCenter.rotation.z = Math.PI / 2;
    wg.add(tire, rimOuter, hubCenter);

    for (let s = 0; s < 5; s++) {
      const angle = (s / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.248, 0.036, 0.21), mats.chromePolished);
      spoke.rotation.x = angle;
      spoke.position.set(0, Math.sin(angle) * 0.11, Math.cos(angle) * 0.11);
      wg.add(spoke);
    }
    return wg;
  }

  // Front-Left, Rear-Left, Rear-Right static wheels
  [
    [-0.86, 0.34, 1.22],
    [-0.86, 0.34, -1.25],
    [0.86, 0.34, -1.25],
  ].forEach(([wx, wy, wz]) => {
    const w = createWheelVisual();
    w.position.set(wx, wy, wz);
    carGroup.add(w);
  });

  // Interactive Front-Right Brake Hub Assembly (X = +0.86, Y = 0.34, Z = +1.22)
  const hubX = 0.78;
  const hubY = 0.34;
  const hubZ = 1.22;

  // Ventilated Slotted Brake Rotor
  const rotorDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.185, 0.185, 0.032, 28),
    mats.brakeRotorSteel
  );
  rotorDisc.rotation.z = Math.PI / 2;
  rotorDisc.position.set(hubX, hubY, hubZ);
  const rotorHat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.055, 20),
    mats.chassisSteel
  );
  rotorHat.rotation.z = Math.PI / 2;
  rotorHat.position.set(hubX + 0.015, hubY, hubZ);
  carGroup.add(rotorDisc, rotorHat);

  // Dual Brake Pads straddling the front arc of the rotor
  const brakePadsGroup = new THREE.Group();
  brakePadsGroup.position.set(hubX, hubY + 0.02, hubZ + 0.135);
  const outerPad = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.11, 0.068), mats.padGoodCeramic);
  outerPad.position.x = 0.025;
  const innerPad = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.11, 0.068), mats.padGoodCeramic);
  innerPad.position.x = -0.025;
  brakePadsGroup.add(outerPad, innerPad);
  const padMeshes = [outerPad, innerPad];
  carGroup.add(brakePadsGroup);
  tagInteractive(brakePadsGroup, 'brake_pads_fr', interactiveObjects);
  addHitProxy(carGroup, 'brake_pads_fr', [0.09, 0.15, 0.11], [hubX, hubY + 0.02, hubZ + 0.135], interactiveObjects);

  // Gold 4-Piston Brake Caliper + 2x 14mm Slide Bolts
  const caliperGroup = new THREE.Group();
  caliperGroup.position.set(hubX + 0.01, hubY + 0.02, hubZ + 0.145);
  const caliperBody = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.165, 0.095), mats.caliperGold);
  caliperBody.castShadow = true;
  caliperGroup.add(caliperBody);
  carGroup.add(caliperGroup);
  tagInteractive(caliperGroup, 'caliper_fr', interactiveObjects);
  addHitProxy(carGroup, 'caliper_fr', [0.12, 0.18, 0.12], [hubX + 0.01, hubY + 0.02, hubZ + 0.145], interactiveObjects);

  // 2x 14mm Caliper Slide Bolts (pointing inward along -X)
  [
    ['caliper_bolt_top', hubY + 0.075],
    ['caliper_bolt_bot', hubY - 0.035],
  ].forEach(([id, cy]) => {
    const bMesh = createHexBoltMesh(mats, 1.0);
    bMesh.rotation.z = -Math.PI / 2; // Head faces +X outward so mechanic can reach easily!
    const basePos = new THREE.Vector3(hubX + 0.062, cy as number, hubZ + 0.11);
    bMesh.position.copy(basePos);
    carGroup.add(bMesh);
    boltMeshes[id as string] = { mesh: bMesh, basePos, axis: 'x' };
    tagInteractive(bMesh, id as string, interactiveObjects);
    addHitProxy(carGroup, id as string, [0.08, 0.075, 0.08], [hubX + 0.07, cy as number, hubZ + 0.11], interactiveObjects);
  });

  // Front-Right Alloy Wheel + 5x 19mm Lug Nuts
  const wheelGroup = createWheelVisual();
  wheelGroup.position.set(0.86, hubY, hubZ);
  carGroup.add(wheelGroup);
  tagInteractive(wheelGroup, 'wheel_fr', interactiveObjects);
  addHitProxy(carGroup, 'wheel_fr', [0.24, 0.66, 0.66], [0.88, hubY, hubZ], interactiveObjects);

  for (let l = 0; l < 5; l++) {
    const id = `lug_${l + 1}`;
    const angle = (l / 5) * Math.PI * 2;
    const ly = hubY + Math.sin(angle) * 0.052;
    const lz = hubZ + Math.cos(angle) * 0.052;
    const lugMesh = createHexBoltMesh(mats, 1.1);
    lugMesh.rotation.z = -Math.PI / 2;
    const basePos = new THREE.Vector3(0.985, ly, lz);
    lugMesh.position.copy(basePos);
    carGroup.add(lugMesh);
    boltMeshes[id] = { mesh: lugMesh, basePos, axis: 'x' };
    tagInteractive(lugMesh, id, interactiveObjects);
    addHitProxy(carGroup, id, [0.075, 0.065, 0.065], [1.0, ly, lz], interactiveObjects);
  }

  root.add(liftCarriageGroup);

  return {
    root,
    liftCarriageGroup,
    liftArms,
    carGroup,
    engineBlockGroup,
    hoodPivot,
    hoodPropRod,
    pulleyMeshes,
    boltMeshes,
    valveCoverGroup,
    coilGroups,
    sparkGroups,
    oilCapGroup,
    oilPourStream,
    airboxCoverGroup,
    airFilterMesh,
    batteryGroup,
    batteryCaseMesh,
    obdPlugDongle,
    wheelGroup,
    caliperGroup,
    brakePadsGroup,
    padMeshes,
    oilFilterMesh,
    oilDrainStream,
    oilCatchStand,
    interactiveObjects,
  };
}

// Frame-rate independent smooth kinematics & state visual updates (Zero GC allocations!)
export function updateGarageAssemblyVisuals(
  refs: GarageAssemblyRefs,
  mats: GarageMaterials,
  state: CarSimState,
  dt: number,
  elapsedTime: number,
  pouringOilNow: boolean
) {
  // 1. Lift Carriage Height (0 -> 0.0m, 1 -> 0.56m, 2 -> 1.48m)
  const targetLiftY = state.liftLevel === 0 ? 0 : state.liftLevel === 1 ? 0.56 : 1.48;
  refs.liftCarriageGroup.position.y = THREE.MathUtils.damp(
    refs.liftCarriageGroup.position.y,
    targetLiftY,
    5.5,
    dt
  );

  // Show oil catch stand under sump when lift is at full height
  refs.oilCatchStand.visible = refs.liftCarriageGroup.position.y > 1.05;

  // 2. Hood Hinge Angle
  const targetHoodRot = state.hoodOpen ? -1.12 : 0;
  refs.hoodPivot.rotation.x = THREE.MathUtils.damp(refs.hoodPivot.rotation.x, targetHoodRot, 7, dt);
  refs.hoodPropRod.visible = refs.hoodPivot.rotation.x < -0.85;

  // 3. Engine Running Vibration & Pulley Rotation
  const hasMisfire =
    !state.sparkPlugsInstalled.every(Boolean) ||
    !state.coilsInstalled.every(Boolean) ||
    state.sparkPlugConditions.some((c) => c !== 'good');

  if (state.engineRunning) {
    const rpmSpeed = hasMisfire ? 11 : 22;
    for (let i = 0; i < refs.pulleyMeshes.length; i++) {
      refs.pulleyMeshes[i].rotation.y += dt * rpmSpeed;
    }
    const vibAmp = hasMisfire ? 0.011 : 0.0018;
    const vibFreq = hasMisfire ? 34 : 62;
    refs.engineBlockGroup.position.x = -0.04 + Math.sin(elapsedTime * vibFreq) * vibAmp;
    refs.engineBlockGroup.rotation.z = Math.cos(elapsedTime * (vibFreq * 0.8)) * (vibAmp * 1.8);
  } else {
    refs.engineBlockGroup.position.x = THREE.MathUtils.damp(
      refs.engineBlockGroup.position.x,
      -0.04,
      10,
      dt
    );
    refs.engineBlockGroup.rotation.z = THREE.MathUtils.damp(
      refs.engineBlockGroup.rotation.z,
      0,
      10,
      dt
    );
  }

  // 4. All Bolts Position & Torque Highlight Color
  const boltKeys = Object.keys(refs.boltMeshes);
  for (let i = 0; i < boltKeys.length; i++) {
    const id = boltKeys[i];
    const bState = state.bolts[id];
    const bRef = refs.boltMeshes[id];
    if (!bState || !bRef) continue;

    // Hide wheel/caliper bolts if parent assembly shouldn't show loosened floating bolts awkwardly,
    // actually keeping loosened bolts slightly backed out by 2.4cm looks super clear and tactile!
    let boltVisible = true;
    if (bState.group === 'wheel' && !state.wheelInstalled) boltVisible = false;
    if (bState.group === 'caliper' && !state.caliperInstalled) boltVisible = false;
    bRef.mesh.visible = boltVisible;

    const offsetDist = bState.tightened ? 0 : id === 'oil_drain_plug' ? -0.042 : 0.032;
    if (bRef.axis === 'y') {
      bRef.mesh.position.y = THREE.MathUtils.damp(
        bRef.mesh.position.y,
        bRef.basePos.y + offsetDist,
        12,
        dt
      );
    } else {
      bRef.mesh.position.x = THREE.MathUtils.damp(
        bRef.mesh.position.x,
        bRef.basePos.x + offsetDist,
        12,
        dt
      );
    }

    const headMesh = bRef.mesh.userData.headMesh as THREE.Mesh | undefined;
    if (headMesh) {
      headMesh.material =
        bState.tightened && bState.torqued ? mats.boltTorquedEmerald : mats.boltHexSteel;
    }
  }

  // 5. Valve Cover, Coils, Spark Plugs
  refs.valveCoverGroup.visible = state.valveCoverInstalled;
  const targetVcY = state.valveCoverInstalled ? 0.34 : 0.52;
  refs.valveCoverGroup.position.y = THREE.MathUtils.damp(
    refs.valveCoverGroup.position.y,
    targetVcY,
    10,
    dt
  );

  for (let i = 0; i < 4; i++) {
    refs.coilGroups[i].visible = state.coilsInstalled[i];
    const sp = refs.sparkGroups[i];
    sp.group.visible = state.sparkPlugsInstalled[i];
    sp.insulator.material =
      state.sparkPlugConditions[i] === 'good' ? mats.sparkCeramicClean : mats.sparkFouledCarbon;
  }

  // 6. Oil Cap, Drain Stream & Pour Stream
  const targetCapY = state.oilCapOpen ? 0.485 : 0.435;
  const targetCapX = state.oilCapOpen ? 0.21 : 0.14;
  refs.oilCapGroup.position.y = THREE.MathUtils.damp(refs.oilCapGroup.position.y, targetCapY, 10, dt);
  refs.oilCapGroup.position.x = THREE.MathUtils.damp(refs.oilCapGroup.position.x, targetCapX, 10, dt);

  refs.oilDrainStream.visible = state.oilDraining && state.oilLevelPercent > 0;
  refs.oilPourStream.visible = pouringOilNow && state.oilCapOpen;

  refs.oilFilterMesh.visible = state.oilFilterInstalled;
  refs.oilFilterMesh.material =
    state.oilFilterCondition === 'good' ? mats.oilFilterClean : mats.oilFilterDirty;

  // 7. Airbox & Filter
  refs.airboxCoverGroup.visible = state.airboxCoverInstalled;
  refs.airFilterMesh.visible = state.airFilterInstalled;
  refs.airFilterMesh.material =
    state.airFilterCondition === 'good' ? mats.airFilterClean : mats.airFilterDirty;

  // 8. Battery & OBD-II Dongle
  refs.batteryGroup.visible = state.batteryInstalled;
  refs.batteryCaseMesh.material =
    state.batteryCondition === 'good' ? mats.batteryCaseGood : mats.batteryCaseWeak;
  refs.obdPlugDongle.visible = state.obdConnected;

  // 9. Front-Right Wheel, Caliper & Ceramic Brake Pads
  refs.wheelGroup.visible = state.wheelInstalled;
  refs.caliperGroup.visible = state.caliperInstalled;
  refs.brakePadsGroup.visible = state.brakePadsInstalled;
  const padMat = state.brakePadsCondition === 'good' ? mats.padGoodCeramic : mats.padWornScorched;
  const padThicknessScale = state.brakePadsCondition === 'good' ? 1.0 : 0.42;
  for (let i = 0; i < refs.padMeshes.length; i++) {
    refs.padMeshes[i].material = padMat;
    refs.padMeshes[i].scale.x = padThicknessScale;
  }
}
