import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CameraPreset,
  CarSimState,
  HoveredPartInfo,
  MECHANIC_TOOLS,
  ToolId,
} from '../types/mechanic';
import { createGarageMaterials } from '../three/materials';
import { buildToolModel } from '../three/toolModels';
import {
  buildGarageAssembly,
  updateGarageAssemblyVisuals,
} from '../three/carAssembly';
import {
  getHoveredPartInfo,
  resolveBestHitPartId,
} from '../logic/interactionEngine';
import { soundEngine } from '../audio/soundEngine';

interface GarageViewportProps {
  simState: CarSimState;
  activeTool: ToolId;
  cameraPreset: CameraPreset;
  presetTriggerCount: number;
  pouringOilPulse: number;
  xrRequestCount: number;
  onHoverChange: (info: HoveredPartInfo | null) => void;
  onPartInteract: (partId: string) => void;
  onContinuousTorque: (boltId: string, dt: number) => void;
  onWebXrStatus: (supported: boolean, active: boolean) => void;
}

// Reusable module-scope math objects (Zero GC in animation loop!)
const _raycaster = new THREE.Raycaster();
_raycaster.layers.set(1);
const _pointerNdc = new THREE.Vector2(0, 0);
const _box3 = new THREE.Box3();
const _boxSize = new THREE.Vector3();
const _boxCenter = new THREE.Vector3();
const _forwardVec = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _ctrlMatrix = new THREE.Matrix4();
const _eyeOffsetL = new THREE.Vector3(-0.032, 0, 0);
const _eyeOffsetR = new THREE.Vector3(0.032, 0, 0);

export default function GarageViewport({
  simState,
  activeTool,
  cameraPreset,
  presetTriggerCount,
  pouringOilPulse,
  xrRequestCount,
  onHoverChange,
  onPartInteract,
  onContinuousTorque,
  onWebXrStatus,
}: GarageViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Mutable refs so React UI updates never rebuild the WebGL context
  const simStateRef = useRef(simState);
  simStateRef.current = simState;

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  const callbacksRef = useRef({
    onHoverChange,
    onPartInteract,
    onContinuousTorque,
    onWebXrStatus,
  });
  callbacksRef.current = {
    onHoverChange,
    onPartInteract,
    onContinuousTorque,
    onWebXrStatus,
  };

  // Trigger refs read inside the render loop
  const cameraTransitionRef = useRef<{
    active: boolean;
    targetPos: THREE.Vector3;
    targetLook: THREE.Vector3;
  }>({
    active: true,
    targetPos: new THREE.Vector3(0.55, 1.58, 2.75),
    targetLook: new THREE.Vector3(0.05, 0.72, 1.15),
  });

  const actionRecoilRef = useRef(0);
  const pourTimerRef = useRef(0);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const xrSessionRef = useRef<XRSession | null>(null);
  const handToolMeshesRef = useRef<Record<string, THREE.Group>>({});

  // Sync equipped 3D tool visibility in hand when activeTool changes
  useEffect(() => {
    const map = handToolMeshesRef.current;
    Object.keys(map).forEach((id) => {
      map[id].visible = id === activeTool;
    });
    actionRecoilRef.current = 0.35;
  }, [activeTool]);

  // Trigger oil pour visual stream briefly when pouringOilPulse increments
  useEffect(() => {
    if (pouringOilPulse > 0) {
      pourTimerRef.current = 0.85;
      actionRecoilRef.current = 0.65;
    }
  }, [pouringOilPulse]);

  // Apply smooth camera preset targets when preset changes
  useEffect(() => {
    const liftOffset =
      simStateRef.current.liftLevel === 0
        ? 0
        : simStateRef.current.liftLevel === 1
        ? 0.56
        : 1.48;

    const trans = cameraTransitionRef.current;
    switch (cameraPreset) {
      case 'vr_fpv':
        trans.targetPos.set(0.18, 1.56 + liftOffset * 0.25, 2.38);
        trans.targetLook.set(0.0, 0.74 + liftOffset * 0.6, 1.18);
        trans.active = true;
        break;
      case 'engine_bay':
        trans.targetPos.set(0.04, 1.48 + liftOffset, 2.02);
        trans.targetLook.set(0.0, 0.74 + liftOffset, 1.18);
        trans.active = true;
        break;
      case 'wheel_brake':
        trans.targetPos.set(1.78, 0.56 + liftOffset, 1.42);
        trans.targetLook.set(0.82, 0.36 + liftOffset, 1.24);
        trans.active = true;
        break;
      case 'underbody':
        trans.targetPos.set(0.32, 0.88, 1.78);
        trans.targetLook.set(-0.02, 0.28 + Math.max(liftOffset, 1.25), 1.16);
        trans.active = true;
        break;
      case 'orbit_free':
        trans.targetPos.set(2.45, 1.75, 2.95);
        trans.targetLook.set(0.1, 0.75 + liftOffset * 0.5, 0.65);
        trans.active = true;
        break;
    }
  }, [cameraPreset, presetTriggerCount]);

  // Native WebXR Session Toggle Handler
  useEffect(() => {
    if (xrRequestCount === 0) return;
    const renderer = rendererRef.current;
    if (!renderer) return;

    const navXr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!navXr) return;

    if (xrSessionRef.current) {
      xrSessionRef.current.end().catch(() => {});
      return;
    }

    navXr
      .requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      })
      .then((session) => {
        xrSessionRef.current = session;
        renderer.xr.enabled = true;
        renderer.xr.setSession(session);
        callbacksRef.current.onWebXrStatus(true, true);

        session.addEventListener('end', () => {
          xrSessionRef.current = null;
          renderer.xr.enabled = false;
          callbacksRef.current.onWebXrStatus(true, false);
        });
      })
      .catch(() => {
        callbacksRef.current.onWebXrStatus(false, false);
      });
  }, [xrRequestCount]);

  // Main Three.js Scene Initialization (Runs Once)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection per Three.js engineering standard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Check WebXR capability
    const navXr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (navXr && typeof navXr.isSessionSupported === 'function') {
      navXr
        .isSessionSupported('immersive-vr')
        .then((supported) => callbacksRef.current.onWebXrStatus(supported, false))
        .catch(() => callbacksRef.current.onWebXrStatus(false, false));
    } else {
      callbacksRef.current.onWebXrStatus(false, false);
    }

    // 2. Scene, Horizon Fog & Studio RoomEnvironment
    const scene = new THREE.Scene();
    const bgHex = 0x101319;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.055);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // 3. Camera, Stereo Sub-Cameras & OrbitControls
    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.06,
      45
    );
    camera.position.set(0.55, 1.58, 2.75);
    scene.add(camera);

    const eyeCamL = new THREE.PerspectiveCamera(58, 1, 0.06, 45);
    const eyeCamR = new THREE.PerspectiveCamera(58, 1, 0.06, 45);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.minDistance = 0.42;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI * 0.56; // Allows looking slightly upward from underbody!
    controls.target.set(0.05, 0.72, 1.15);

    const onControlStart = () => {
      cameraTransitionRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    // 4. Balanced 3-Point Workshop Lighting + Mechanic Headlamp
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1f242d, 0.85);
    hemiLight.position.set(0, 8, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.65);
    keyLight.position.set(2.8, 5.2, 3.6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    const d = 3.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rimLight.position.set(-3.2, 3.4, -2.5);
    scene.add(rimLight);

    // Under-bay bounce light so underbody sump & oil filter are legible when lifted
    const underFillLight = new THREE.PointLight(0xe2e8f0, 0.9, 4.5, 1.6);
    underFillLight.position.set(0.1, 0.35, 1.25);
    scene.add(underFillLight);

    // Mechanic Headlamp SpotLight attached to Camera!
    const headlamp = new THREE.SpotLight(0xfefce8, 0, 6.5, Math.PI / 5.5, 0.45, 1.4);
    headlamp.position.set(0, 0.06, 0);
    headlamp.target.position.set(0, -0.04, -1.5);
    camera.add(headlamp);
    camera.add(headlamp.target);

    // 5. Build Materials, Garage & Car Assembly
    const mats = createGarageMaterials(renderer);
    const assembly = buildGarageAssembly(mats);
    scene.add(assembly.root);

    // 6. VR / First-Person Mechanic Right-Hand Equipped Tool Rig attached to Camera
    const handRig = new THREE.Group();
    handRig.position.set(0.24, -0.19, -0.44);
    handRig.rotation.set(0.12, -0.18, 0);
    camera.add(handRig);

    const toolMeshMap: Record<string, THREE.Group> = {};
    MECHANIC_TOOLS.forEach((spec) => {
      const m = buildToolModel(spec.id, mats);
      m.visible = spec.id === activeToolRef.current;
      // Ensure first-person hand tool doesn't intercept raycaster layer 1
      m.traverse((c) => c.layers.set(0));
      handRig.add(m);
      toolMeshMap[spec.id] = m;
    });
    handToolMeshesRef.current = toolMeshMap;

    // 7. 3D Target Highlight Selection Box
    const highlightGeo = new THREE.BoxGeometry(1, 1, 1);
    const highlightEdges = new THREE.EdgesGeometry(highlightGeo);
    const highlightBox = new THREE.LineSegments(
      highlightEdges,
      new THREE.LineBasicMaterial({ color: 0xf59e0b })
    );
    highlightBox.visible = false;
    scene.add(highlightBox);

    // 8. Native WebXR Controller Laser Pointers (for Headset Users)
    const xrControllers: THREE.XRTargetRaySpace[] = [];
    for (let c = 0; c < 2; c++) {
      const ctrl = renderer.xr.getController(c);
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -2.5),
      ]);
      const rayLine = new THREE.Line(
        rayGeo,
        new THREE.LineBasicMaterial({ color: 0x38bdf8 })
      );
      ctrl.add(rayLine);

      ctrl.addEventListener('selectstart', () => {
        _ctrlMatrix.identity().extractRotation(ctrl.matrixWorld);
        _raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
        _raycaster.ray.direction.set(0, 0, -1).applyMatrix4(_ctrlMatrix);
        const hits = _raycaster.intersectObjects(assembly.interactiveObjects, true);
        const rawIds = hits.map((h) => h.object.userData.partId as string);
        const bestId = resolveBestHitPartId(
          rawIds,
          simStateRef.current,
          activeToolRef.current
        );
        if (bestId) {
          actionRecoilRef.current = 1.0;
          callbacksRef.current.onPartInteract(bestId);
        }
      });

      scene.add(ctrl);
      xrControllers.push(ctrl);
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 9. Pointer, Throttled Hover Raycast, Click & Hold-to-Torque + Keyboard WASD
    let hoveredPartId: string | null = null;
    let pointerDownPos = { x: 0, y: 0 };
    let holdingBoltId: string | null = null;
    let lastHoverTime = 0;
    const keysPressed: Record<string, boolean> = {};

    const updateRaycastFromPointer = () => {
      _raycaster.setFromCamera(_pointerNdc, camera);
      const hits = _raycaster.intersectObjects(assembly.interactiveObjects, true);
      const rawIds = hits.map((h) => h.object.userData.partId as string);
      const bestId = resolveBestHitPartId(
        rawIds,
        simStateRef.current,
        activeToolRef.current
      );

      if (bestId !== hoveredPartId) {
        hoveredPartId = bestId;
        const info = getHoveredPartInfo(
          bestId,
          simStateRef.current,
          activeToolRef.current
        );
        callbacksRef.current.onHoverChange(info);
        renderer.domElement.style.cursor = bestId ? 'pointer' : 'grab';

        // Position 3D highlight box around non-proxy target mesh
        if (bestId && hits.length > 0) {
          const hitEntry =
            hits.find(
              (h) => h.object.userData.partId === bestId && !h.object.userData.isProxy
            ) || hits.find((h) => h.object.userData.partId === bestId);
          if (hitEntry) {
            _box3.setFromObject(hitEntry.object);
            _box3.getSize(_boxSize);
            _box3.getCenter(_boxCenter);
            highlightBox.position.copy(_boxCenter);
            highlightBox.scale.set(
              Math.max(0.05, _boxSize.x + 0.025),
              Math.max(0.05, _boxSize.y + 0.025),
              Math.max(0.05, _boxSize.z + 0.025)
            );
            highlightBox.visible = true;
          } else {
            highlightBox.visible = false;
          }
        } else {
          highlightBox.visible = false;
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const now = performance.now();
      if (now - lastHoverTime >= 42) {
        lastHoverTime = now;
        updateRaycastFromPointer();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerDownPos = { x: e.clientX, y: e.clientY };

      updateRaycastFromPointer();

      // If holding Digital Torque Wrench over a tightened un-torqued bolt, engage continuous hold-to-torque!
      if (
        activeToolRef.current === 'torque' &&
        hoveredPartId &&
        simStateRef.current.bolts[hoveredPartId]
      ) {
        const b = simStateRef.current.bolts[hoveredPartId];
        if (b.tightened && !b.torqued) {
          holdingBoltId = hoveredPartId;
          controls.enabled = false; // Lock camera drag while pulling torque wrench!
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (holdingBoltId) {
        holdingBoltId = null;
        controls.enabled = true;
        // Refresh tooltip with updated Nm
        callbacksRef.current.onHoverChange(
          getHoveredPartInfo(hoveredPartId, simStateRef.current, activeToolRef.current)
        );
        return;
      }

      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 7 && hoveredPartId) {
        actionRecoilRef.current = 1.0;
        callbacksRef.current.onPartInteract(hoveredPartId);
        // Refresh tooltip immediately on next microtask
        window.setTimeout(() => {
          hoveredPartId = null;
          updateRaycastFromPointer();
        }, 20);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      keysPressed[e.code] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Render Loop with Software-WebGL `afterDraw` Pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let torqueTickAccumulator = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function advanceScene(dt: number, elapsed: number) {
      const st = simStateRef.current;

      // Headlamp intensity
      headlamp.intensity = THREE.MathUtils.damp(
        headlamp.intensity,
        st.headlampOn ? 3.8 : 0,
        12,
        dt
      );

      // Pouring oil visual timer
      if (pourTimerRef.current > 0) {
        pourTimerRef.current = Math.max(0, pourTimerRef.current - dt);
      }

      // Continuous Torque Wrench Ramp when holding pointer down
      if (holdingBoltId) {
        actionRecoilRef.current = 0.55 + Math.sin(elapsed * 22) * 0.2;
        callbacksRef.current.onContinuousTorque(holdingBoltId, dt);
        torqueTickAccumulator += dt;
        if (torqueTickAccumulator > 0.14) {
          torqueTickAccumulator = 0;
          const b = simStateRef.current.bolts[holdingBoltId];
          if (b && !b.torqued) {
            soundEngine.playTorqueBeep(false);
          } else if (b && b.torqued) {
            holdingBoltId = null;
            controls.enabled = true;
          }
        }
      }

      // WASD Spatial Mechanic Movement in Garage Bay
      const moveSpeed = 1.85 * dt;
      let moved = false;
      camera.getWorldDirection(_forwardVec);
      _forwardVec.y = 0;
      if (_forwardVec.lengthSq() > 0.0001) _forwardVec.normalize();
      _rightVec.crossVectors(_forwardVec, camera.up).normalize();

      if (keysPressed['KeyW']) {
        camera.position.addScaledVector(_forwardVec, moveSpeed);
        controls.target.addScaledVector(_forwardVec, moveSpeed);
        moved = true;
      }
      if (keysPressed['KeyS']) {
        camera.position.addScaledVector(_forwardVec, -moveSpeed);
        controls.target.addScaledVector(_forwardVec, -moveSpeed);
        moved = true;
      }
      if (keysPressed['KeyA']) {
        camera.position.addScaledVector(_rightVec, -moveSpeed);
        controls.target.addScaledVector(_rightVec, -moveSpeed);
        moved = true;
      }
      if (keysPressed['KeyD']) {
        camera.position.addScaledVector(_rightVec, moveSpeed);
        controls.target.addScaledVector(_rightVec, moveSpeed);
        moved = true;
      }
      if (moved) {
        cameraTransitionRef.current.active = false;
      }

      // Smooth Camera Preset Glide
      const trans = cameraTransitionRef.current;
      if (trans.active && !renderer.xr.isPresenting) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, trans.targetPos.x, 5.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, trans.targetPos.y, 5.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, trans.targetPos.z, 5.5, dt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, trans.targetLook.x, 6.5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, trans.targetLook.y, 6.5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, trans.targetLook.z, 6.5, dt);

        if (
          camera.position.distanceToSquared(trans.targetPos) < 0.0008 &&
          controls.target.distanceToSquared(trans.targetLook) < 0.0008
        ) {
          trans.active = false;
        }
      }

      if (!renderer.xr.isPresenting) {
        controls.update();
      }

      // First-Person Mechanic Hand Rig Sway & Tool Action Animation
      actionRecoilRef.current = THREE.MathUtils.damp(actionRecoilRef.current, 0, 9, dt);
      const r = actionRecoilRef.current;
      handRig.visible = !renderer.xr.isPresenting;
      handRig.position.set(
        0.24 + _pointerNdc.x * 0.045,
        -0.19 + _pointerNdc.y * 0.035 + Math.sin(elapsed * 2.1) * 0.004,
        -0.44 - r * 0.065
      );
      handRig.rotation.set(
        0.12 - _pointerNdc.y * 0.08 + r * 0.25,
        -0.18 - _pointerNdc.x * 0.08,
        r * (activeToolRef.current === 'ratchet' || activeToolRef.current === 'torque' ? 0.48 : 0.12)
      );

      // Update 3D Car, Lift, Bolts & Fluids
      updateGarageAssemblyVisuals(
        assembly,
        mats,
        st,
        dt,
        elapsed,
        pourTimerRef.current > 0
      );

      // Render: Stereo Split-Screen Visor Mode vs Standard Single Viewport
      const w = container?.clientWidth || window.innerWidth;
      const h = Math.max(1, container?.clientHeight || window.innerHeight);

      if (st.vrStereoSim && !renderer.xr.isPresenting) {
        renderer.setScissorTest(true);
        const halfW = Math.floor(w / 2);

        eyeCamL.aspect = halfW / h;
        eyeCamL.updateProjectionMatrix();
        eyeCamL.position.copy(camera.position).add(
          _rightVec.copy(_eyeOffsetL).applyQuaternion(camera.quaternion)
        );
        eyeCamL.quaternion.copy(camera.quaternion);

        eyeCamR.aspect = (w - halfW) / h;
        eyeCamR.updateProjectionMatrix();
        eyeCamR.position.copy(camera.position).add(
          _rightVec.copy(_eyeOffsetR).applyQuaternion(camera.quaternion)
        );
        eyeCamR.quaternion.copy(camera.quaternion);

        renderer.setViewport(0, 0, halfW, h);
        renderer.setScissor(0, 0, halfW, h);
        renderer.render(scene, eyeCamL);

        renderer.setViewport(halfW, 0, w - halfW, h);
        renderer.setScissor(halfW, 0, w - halfW, h);
        renderer.render(scene, eyeCamR);
      } else {
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
        renderer.render(scene, camera);
      }
    }

    function tick() {
      if (renderer.xr.isPresenting) {
        // Defer to WebXR animation loop while headset is active
        frameId = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.elapsedTime;
      advanceScene(dt, elapsed);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    renderer.setAnimationLoop(() => {
      if (!renderer.xr.isPresenting) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      advanceScene(dt, clock.elapsedTime);
    });

    tick();

    // Clean disposal on unmount
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.setAnimationLoop(null);

      controls.removeEventListener('start', onControlStart);
      controls.dispose();

      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      envTarget.dispose();
      mats.disposableTextures.forEach((t) => t.dispose());
      mats.disposableMaterials.forEach((m) => m.dispose());
      highlightGeo.dispose();
      highlightEdges.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full relative overflow-hidden bg-zinc-950"
      aria-label="3D VR Automotive Repair Garage Viewport"
    />
  );
}
