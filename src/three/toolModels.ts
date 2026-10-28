import * as THREE from 'three';
import { ToolId } from '../types/mechanic';
import { GarageMaterials } from './materials';

// Composite 4-8 part procedural 3D models for every mechanic tool
export function buildToolModel(toolId: ToolId, mats: GarageMaterials): THREE.Group {
  const root = new THREE.Group();

  switch (toolId) {
    case 'hand': {
      // Tactical Nitrile-Coated Mechanic Glove + Pocket Pry Bar
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.032, 0.11), mats.rubberMatte);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.07, 12), mats.safetyYellow);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.set(0, 0, 0.085);
      root.add(palm, cuff);

      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.009, 0.048, 4, 8),
          mats.rubberMatte
        );
        finger.rotation.x = Math.PI / 2 - 0.15;
        finger.position.set(-0.03 + i * 0.02, -0.004, -0.075);
        root.add(finger);
      }
      const thumb = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.01, 0.042, 4, 8),
        mats.rubberMatte
      );
      thumb.rotation.set(0.3, 0.6, 0);
      thumb.position.set(-0.052, -0.005, -0.025);
      root.add(thumb);
      break;
    }

    case 'ratchet': {
      // Chrome Reversible Ratchet Socket Wrench (6 composite parts)
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.11, 14), mats.toolRedGloss);
      grip.rotation.x = Math.PI / 2;
      grip.position.set(0, 0, 0.09);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.15, 12), mats.chromePolished);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(0, 0, -0.02);

      const pearHead = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.018, 18), mats.chromePolished);
      pearHead.position.set(0, 0, -0.105);

      const selectorSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.006, 0.022), mats.rubberMatte);
      selectorSwitch.position.set(0, 0.012, -0.105);

      const driveAnvil = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.012), mats.castAluminum);
      driveAnvil.position.set(0, -0.016, -0.105);

      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.038, 6), mats.chromePolished);
      socket.position.set(0, -0.036, -0.105);

      root.add(grip, shaft, pearHead, selectorSwitch, driveAnvil, socket);
      break;
    }

    case 'impact': {
      // Pneumatic 1/2" Air Impact Wrench (7 composite parts)
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.15, 16), mats.toolRedGloss);
      body.rotation.x = Math.PI / 2;
      body.position.set(0, 0.025, -0.02);

      const noseCone = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.033, 0.055, 16), mats.castAluminum);
      noseCone.rotation.x = Math.PI / 2;
      noseCone.position.set(0, 0.025, -0.12);

      const impactSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.05, 6), mats.rubberMatte);
      impactSocket.rotation.x = Math.PI / 2;
      impactSocket.position.set(0, 0.025, -0.17);

      const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.115, 0.044), mats.rubberMatte);
      pistolGrip.rotation.x = 0.22;
      pistolGrip.position.set(0, -0.042, 0.015);

      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.026, 0.018), mats.chromePolished);
      trigger.position.set(0, -0.012, -0.012);

      const airNipple = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 10), mats.caliperGold);
      airNipple.position.set(0, -0.105, 0.028);

      root.add(body, noseCone, impactSocket, pistolGrip, trigger, airNipple);
      break;
    }

    case 'torque': {
      // Long Digital Precision Torque Wrench (6 composite parts)
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.017, 0.12, 14), mats.rubberMatte);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0, 0, 0.13);

      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.24, 14), mats.chromePolished);
      beam.rotation.x = Math.PI / 2;
      beam.position.set(0, 0, -0.03);

      const lcdModule = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.022, 0.075), mats.rubberMatte);
      lcdModule.position.set(0, 0.012, 0.025);

      const lcdScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.048), mats.boltTorquedEmerald);
      lcdScreen.rotation.x = -Math.PI / 2;
      lcdScreen.position.set(0, 0.024, 0.025);

      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.018, 16), mats.chromePolished);
      head.position.set(0, 0, -0.155);

      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.04, 6), mats.chromePolished);
      socket.position.set(0, -0.028, -0.155);

      root.add(handle, beam, lcdModule, lcdScreen, head, socket);
      break;
    }

    case 'spark_puller': {
      // Magnetic Deep-Well T-Handle Spark Plug Wrench
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.24, 12), mats.chromePolished);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(0, 0, -0.04);

      const tBar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.15, 12), mats.toolRedGloss);
      tBar.rotation.z = Math.PI / 2;
      tBar.position.set(0, 0, 0.08);

      const deepSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 6), mats.chromePolished);
      deepSocket.rotation.x = Math.PI / 2;
      deepSocket.position.set(0, 0, -0.175);

      const rubberBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 12), mats.rubberMatte);
      rubberBoot.rotation.x = Math.PI / 2;
      rubberBoot.position.set(0, 0, -0.14);

      root.add(shaft, tBar, deepSocket, rubberBoot);
      break;
    }

    case 'oil_kit': {
      // Golden 4L Synthetic 5W-30 Jug + Precision Pour Spout
      const jugBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.065), mats.safetyYellow);
      jugBody.position.set(0, -0.01, 0.02);

      const labelPlate = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.065, 0.042), mats.rubberMatte);
      labelPlate.position.set(0, -0.01, 0.02);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.035, 12), mats.safetyYellow);
      neck.rotation.x = -0.5;
      neck.position.set(0, 0.072, -0.005);

      const funnelSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.095, 12), mats.copperRed);
      funnelSpout.rotation.x = Math.PI / 2 + 0.35;
      funnelSpout.position.set(0, 0.095, -0.055);

      root.add(jugBody, labelPlate, neck, funnelSpout);
      break;
    }

    case 'obd': {
      // Rugged Automotive OBD-II Diagnostic Scanner Tablet
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.18), mats.toolRedGloss);
      const innerBody = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.024, 0.165), mats.rubberMatte);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.115), mats.padGoodCeramic);
      screen.rotation.x = -Math.PI / 2;
      screen.position.set(0, 0.013, -0.012);

      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 10), mats.rubberMatte);
      cable.rotation.x = Math.PI / 2;
      cable.position.set(0, 0, -0.13);

      const obdPlug = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.016, 0.028), mats.safetyYellow);
      obdPlug.position.set(0, 0, -0.175);

      root.add(bumper, innerBody, screen, cable, obdPlug);
      break;
    }

    case 'multimeter': {
      // Industrial Digital Multimeter + Dual Test Leads
      const holster = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.032, 0.155), mats.safetyYellow);
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.034, 0.14), mats.rubberMatte);
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16), mats.castAluminum);
      dial.position.set(0, 0.02, 0.022);

      const probeRed = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.13, 8), mats.copperRed);
      probeRed.rotation.x = Math.PI / 2;
      probeRed.position.set(0.025, 0.008, -0.12);

      const probeTipR = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.028, 8), mats.chromePolished);
      probeTipR.rotation.x = -Math.PI / 2;
      probeTipR.position.set(0.025, 0.008, -0.195);

      const probeBlk = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.13, 8), mats.rubberMatte);
      probeBlk.rotation.x = Math.PI / 2;
      probeBlk.position.set(-0.025, 0.008, -0.12);

      const probeTipB = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.028, 8), mats.chromePolished);
      probeTipB.rotation.x = -Math.PI / 2;
      probeTipB.position.set(-0.025, 0.008, -0.195);

      root.add(holster, face, dial, probeRed, probeTipR, probeBlk, probeTipB);
      break;
    }
  }

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return root;
}
