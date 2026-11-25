import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { StepVisualState } from '../data/cryptoScenarios';

interface CryptoStage3DProps {
  visual: StepVisualState;
  isDark: boolean;
  isPlaying: boolean;
  zoomTrigger: number;
  onCameraMoved?: (isMoved: boolean) => void;
}

function createGearGeometry(teeth = 12, innerR = 0.25, outerR = 0.45, thickness = 0.14): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const steps = teeth * 2;
  for (let i = 0; i < steps; i++) {
    const a1 = (i / steps) * Math.PI * 2;
    const a2 = ((i + 0.5) / steps) * Math.PI * 2;
    const r = i % 2 === 0 ? outerR : outerR * 0.78;
    if (i === 0) shape.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
    else shape.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    shape.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
  }
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, false);
  shape.holes.push(hole);

  return new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
}

function createFloatingBadgeTexture(
  title: string,
  subtitle: string,
  accentColor: string,
  isDark: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 148;
  const ctx = canvas.getContext('2d')!;

  const bg = isDark ? '#25211c' : '#fbf6ef';
  const border = isDark ? '#f4ebe0' : '#1d1b18';
  const textMain = isDark ? '#f4ebe0' : '#1d1b18';
  const textSub = isDark ? '#b8afa2' : '#5e584f';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Drop shadow
  ctx.fillStyle = isDark ? 'rgba(0,0,0,0.65)' : 'rgba(29,27,24,0.85)';
  ctx.beginPath();
  ctx.roundRect(14, 14, 488, 122, 18);
  ctx.fill();

  // Main card
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(8, 8, 488, 122, 18);
  ctx.fill();
  ctx.stroke();

  // Left accent bar inside badge
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(22, 24, 12, 90, 6);
  ctx.fill();

  ctx.font = '800 30px "JetBrains Mono", monospace';
  ctx.fillStyle = textMain;
  ctx.fillText(title, 50, 62);

  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillStyle = textSub;
  ctx.fillText(subtitle, 50, 102);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export const CryptoStage3D: React.FC<CryptoStage3DProps> = ({
  visual,
  isDark,
  isPlaying,
  zoomTrigger,
  onCameraMoved,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const visualRef = useRef<StepVisualState>(visual);
  const isDarkRef = useRef<boolean>(isDark);
  const isPlayingRef = useRef<boolean>(isPlaying);

  visualRef.current = visual;
  isDarkRef.current = isDark;
  isPlayingRef.current = isPlaying;

  const cameraTargetRef = useRef<{
    pos: THREE.Vector3;
    lookAt: THREE.Vector3;
    transitioning: boolean;
  }>({
    pos: new THREE.Vector3(0, 8.2, 12.2),
    lookAt: new THREE.Vector3(0, 0.7, 0),
    transitioning: false,
  });

  // Update camera target on preset change or reset zoom trigger
  useEffect(() => {
    const preset = visual.cameraPreset;
    const target = cameraTargetRef.current;
    target.transitioning = true;
    if (preset === 'alice') {
      target.pos.set(-4.5, 5.2, 7.2);
      target.lookAt.set(-5.0, 1.1, 0);
    } else if (preset === 'bob') {
      target.pos.set(4.5, 5.2, 7.2);
      target.lookAt.set(5.0, 1.1, 0);
    } else if (preset === 'eve') {
      target.pos.set(0, 5.4, 7.8);
      target.lookAt.set(0, 0.9, 1.6);
    } else if (preset === 'routers' || preset === 'firewall') {
      target.pos.set(0, 6.4, 8.8);
      target.lookAt.set(0, 1.1, -0.5);
    } else {
      target.pos.set(0, 8.4, 12.4);
      target.lookAt.set(0, 0.7, 0);
    }
  }, [visual.cameraPreset, visual.subpartIndex, visual.stepIndex, zoomTrigger]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    const bgHex = isDarkRef.current ? 0x1b1815 : 0xfaf3e9;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.025);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      36,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      100
    );
    camera.position.set(0, 8.4, 12.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 4;
    controls.maxDistance = 24;
    controls.target.set(0, 0.7, 0);

    controls.addEventListener('start', () => {
      cameraTargetRef.current.transitioning = false;
      onCameraMoved?.(true);
    });

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfff6e8, 0x433b32, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.9);
    keyLight.position.set(7, 13, 8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7ab8ff, 0.75);
    rimLight.position.set(-8, 6, -9);
    scene.add(rimLight);

    // Ground & Grid
    const floorMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x211e1a : 0xf3eadd,
      roughness: 0.92,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 26), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.02;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(
      28,
      28,
      isDarkRef.current ? 0x4d453b : 0xc5bcb0,
      isDarkRef.current ? 0x332e27 : 0xe2d8ca
    );
    gridHelper.position.y = 0.005;
    scene.add(gridHelper);

    // Shared PBR Materials
    const matWoodDesk = new THREE.MeshStandardMaterial({ color: 0xd5b07a, roughness: 0.65, metalness: 0.1 });
    const matDarkMetal = new THREE.MeshStandardMaterial({ color: 0x2b2824, roughness: 0.4, metalness: 0.75 });
    const matBrushedSteel = new THREE.MeshPhysicalMaterial({
      color: 0xc8c2b8,
      roughness: 0.25,
      metalness: 0.88,
      clearcoat: 0.4,
    });
    const matGlassEnclosure = new THREE.MeshPhysicalMaterial({
      color: 0xd6e5f6,
      roughness: 0.15,
      metalness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.85,
      transparent: true,
      opacity: isSoftwareGl ? 0.32 : 1,
      ior: 1.5,
      thickness: 0.5,
      depthWrite: false,
    });
    const matRedKey = new THREE.MeshPhysicalMaterial({
      color: 0xe5534b,
      roughness: 0.22,
      metalness: 0.78,
      clearcoat: 0.6,
    });
    const matBlueKey = new THREE.MeshPhysicalMaterial({
      color: 0x2f86ce,
      roughness: 0.22,
      metalness: 0.78,
      clearcoat: 0.6,
    });
    const matGoldKey = new THREE.MeshPhysicalMaterial({
      color: 0xf2b830,
      roughness: 0.16,
      metalness: 0.95,
      clearcoat: 0.8,
    });
    const matGreenGood = new THREE.MeshStandardMaterial({
      color: 0x3fa456,
      emissive: 0x1d5e2c,
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });
    const matPurpleCipher = new THREE.MeshPhysicalMaterial({
      color: 0x7c63d0,
      emissive: 0x362478,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.65,
      clearcoat: 0.7,
    });
    const matAlertRed = new THREE.MeshPhysicalMaterial({
      color: 0xe5534b,
      emissive: 0x8f221b,
      emissiveIntensity: 0.6,
      roughness: 0.28,
      metalness: 0.45,
      clearcoat: 0.5,
    });

    // Helper: Build Workstation (Alice or Bob) with 8+ composite parts
    function buildWorkstation(accentHex: number, isServer = false): THREE.Group {
      const group = new THREE.Group();

      // Contact shadow
      const shadowPlane = new THREE.Mesh(
        new THREE.CircleGeometry(1.6, 24),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false })
      );
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = 0.01;
      group.add(shadowPlane);

      // 1. Base pedestal platform
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.48, 0.16, 24), matDarkMetal);
      base.position.y = 0.08;
      base.receiveShadow = true;
      base.castShadow = true;
      group.add(base);

      // 2. Accent ring around pedestal
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.38, 0.035, 12, 36),
        new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 0.35, roughness: 0.3 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.16;
      group.add(ring);

      // 3. Desk legs (4 pillars)
      const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.75, 12);
      [
        [-0.75, -0.45],
        [0.75, -0.45],
        [-0.75, 0.45],
        [0.75, 0.45],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, matBrushedSteel);
        leg.position.set(lx, 0.52, lz);
        leg.castShadow = true;
        group.add(leg);
      });

      // 4. Desk tabletop
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 1.15), matWoodDesk);
      deskTop.position.y = 0.92;
      deskTop.castShadow = true;
      deskTop.receiveShadow = true;
      group.add(deskTop);

      // 5. Monitor stand & display frame
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.12), matBrushedSteel);
      stand.position.set(0, 1.12, -0.25);
      group.add(stand);

      const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.68, 0.08), matDarkMetal);
      monitor.position.set(0, 1.46, -0.25);
      monitor.castShadow = true;
      group.add(monitor);

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.04, 0.56),
        new THREE.MeshStandardMaterial({
          color: accentHex,
          emissive: accentHex,
          emissiveIntensity: 0.28,
          roughness: 0.2,
        })
      );
      screen.position.set(0, 1.46, -0.205);
      group.add(screen);

      // 6. Keyboard deck
      const kb = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.26), matBrushedSteel);
      kb.position.set(0, 0.985, 0.18);
      group.add(kb);

      // 7. Server tower rack if Bob
      if (isServer) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.85, 0.55), matDarkMetal);
        rack.position.set(0.58, 1.38, -0.15);
        rack.castShadow = true;
        group.add(rack);
      }

      // 8. Glass Crypto Chamber Dome around desk
      const glassVault = new THREE.Mesh(new THREE.BoxGeometry(1.98, 1.35, 1.28), matGlassEnclosure);
      glassVault.position.set(0, 0.84, 0);
      glassVault.renderOrder = 3;
      group.add(glassVault);

      return group;
    }

    // 1. ALICE WORKSTATION (-5.4, 0, 0)
    const aliceGroup = buildWorkstation(0x3fa456, false);
    aliceGroup.position.set(-5.4, 0, 0);
    scene.add(aliceGroup);

    // 2. BOB SERVER TERMINAL (+5.4, 0, 0)
    const bobGroup = buildWorkstation(0x2f86ce, true);
    bobGroup.position.set(5.4, 0, 0);
    scene.add(bobGroup);

    // 3. CA ROOT AUTHORITY TOWER (0, 0, -3.5)
    const caGroup = new THREE.Group();
    caGroup.position.set(0, 0, -3.5);
    const caBase = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 0.2, 8), matDarkMetal);
    caBase.position.y = 0.1;
    caGroup.add(caBase);
    const caPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 1.65, 8), matBrushedSteel);
    caPillar.position.y = 1.02;
    caPillar.castShadow = true;
    caGroup.add(caPillar);
    const caBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), matGoldKey);
    caBeacon.position.y = 2.25;
    caGroup.add(caBeacon);
    scene.add(caGroup);

    // 4. FOUR INTERMEDIATE ROUTER TOWERS
    const routerCoords = [
      new THREE.Vector3(-2.7, 0, -0.7),
      new THREE.Vector3(-0.9, 0, -0.35),
      new THREE.Vector3(0.9, 0, -0.35),
      new THREE.Vector3(2.7, 0, -0.7),
    ];
    const routersGroup = new THREE.Group();
    const routerScannerRings: THREE.Mesh[] = [];

    routerCoords.forEach((rc) => {
      const rNode = new THREE.Group();
      rNode.position.copy(rc);

      const rBase = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 0.14, 16), matDarkMetal);
      rBase.position.y = 0.07;
      rNode.add(rBase);

      const rTower = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.05, 0.52), matBrushedSteel);
      rTower.position.y = 0.66;
      rTower.castShadow = true;
      rNode.add(rTower);

      const scanRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.03, 10, 28),
        new THREE.MeshStandardMaterial({ color: 0x3fa456, emissive: 0x3fa456, emissiveIntensity: 0.7 })
      );
      scanRing.rotation.x = Math.PI / 2;
      scanRing.position.y = 0.9;
      routerScannerRings.push(scanRing);
      rNode.add(scanRing);

      routersGroup.add(rNode);
    });
    scene.add(routersGroup);

    // 5. EVE ATTACKER NODE (0, 0, 2.2)
    const eveGroup = new THREE.Group();
    eveGroup.position.set(0, 0, 2.2);
    const eveBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.28, 0.16, 6), matDarkMetal);
    eveBase.position.y = 0.08;
    eveGroup.add(eveBase);
    const eveRing = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.04, 10, 6), matAlertRed);
    eveRing.rotation.x = Math.PI / 2;
    eveRing.position.y = 0.16;
    eveGroup.add(eveRing);
    const eveConsole = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.75, 0.8), matDarkMetal);
    eveConsole.position.y = 0.52;
    eveConsole.castShadow = true;
    eveGroup.add(eveConsole);
    const eveDish = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.55, 12, 1, true), matAlertRed);
    eveDish.rotation.x = -Math.PI / 3;
    eveDish.position.set(0, 1.2, -0.2);
    eveGroup.add(eveDish);
    scene.add(eveGroup);

    // Eve Siphon Laser Beam (between Backbone Midpoint and Eve)
    const siphonGeo = new THREE.CylinderGeometry(0.055, 0.055, 2.55, 12);
    const siphonBeam = new THREE.Mesh(siphonGeo, matAlertRed);
    siphonBeam.position.set(0, 0.85, 0.92);
    siphonBeam.rotation.x = Math.PI / 2.25;
    scene.add(siphonBeam);

    // 6. FIREWALL & IPS SHIELD GATE (for Scenario 5 & Bob's GCM Verification Gate)
    const shieldGateGroup = new THREE.Group();
    shieldGateGroup.position.set(3.85, 0, -0.2);
    const gateFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 0.18), matDarkMetal);
    gateFrameLeft.position.set(0, 1.05, -0.85);
    shieldGateGroup.add(gateFrameLeft);
    const gateFrameRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 0.18), matDarkMetal);
    gateFrameRight.position.set(0, 1.05, 0.85);
    shieldGateGroup.add(gateFrameRight);
    const gateTopBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 1.88), matDarkMetal);
    gateTopBar.position.set(0, 2.05, 0);
    shieldGateGroup.add(gateTopBar);

    const gateEnergyField = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.85, 1.54),
      new THREE.MeshStandardMaterial({
        color: 0x3fa456,
        emissive: 0x3fa456,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.42,
      })
    );
    gateEnergyField.position.set(0, 1.0, 0);
    shieldGateGroup.add(gateEnergyField);
    scene.add(shieldGateGroup);

    // 7. FIBER OPTIC BACKBONE TUBE
    const backboneCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5.0, 0.75, 0),
      new THREE.Vector3(-2.7, 0.75, -0.7),
      new THREE.Vector3(-0.9, 0.75, -0.35),
      new THREE.Vector3(0.9, 0.75, -0.35),
      new THREE.Vector3(2.7, 0.75, -0.7),
      new THREE.Vector3(5.0, 0.75, 0),
    ]);
    const tubeGeo = new THREE.TubeGeometry(backboneCurve, 64, 0.045, 10, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x5fae57,
      emissive: 0x2f8a43,
      emissiveIntensity: 0.35,
      roughness: 0.3,
    });
    const backboneTube = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(backboneTube);

    // Certificate Verification Beam (CA -> Bob -> Alice)
    const certCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(5.2, 1.9, 0),
      new THREE.Vector3(0, 3.2, -2.5),
      new THREE.Vector3(-5.2, 1.9, 0)
    );
    const certBeam = new THREE.Mesh(
      new THREE.TubeGeometry(certCurve, 40, 0.04, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x2f86ce, emissive: 0x2f86ce, emissiveIntensity: 0.8 })
    );
    scene.add(certBeam);

    // 8. ELLIPTIC CURVE GEARS & GOLD KEYS
    const gearGeo = createGearGeometry(12, 0.16, 0.36, 0.1);
    const aliceRedGear = new THREE.Mesh(gearGeo, matRedKey);
    aliceRedGear.position.set(-5.7, 1.25, 0.35);
    scene.add(aliceRedGear);

    const aliceBlueGear = new THREE.Mesh(gearGeo, matBlueKey);
    aliceBlueGear.position.set(-4.95, 1.85, 0.35);
    scene.add(aliceBlueGear);

    const bobRedGear = new THREE.Mesh(gearGeo, matRedKey);
    bobRedGear.position.set(5.7, 1.25, 0.35);
    scene.add(bobRedGear);

    const bobBlueGear = new THREE.Mesh(gearGeo, matBlueKey);
    bobBlueGear.position.set(4.95, 1.85, 0.35);
    scene.add(bobBlueGear);

    // Gold Master Keys above Alice and Bob
    const goldKeyGeo = new THREE.OctahedronGeometry(0.32, 0);
    const aliceGoldKey = new THREE.Mesh(goldKeyGeo, matGoldKey);
    aliceGoldKey.position.set(-5.4, 2.35, 0);
    scene.add(aliceGoldKey);

    const bobGoldKey = new THREE.Mesh(goldKeyGeo, matGoldKey);
    bobGoldKey.position.set(5.4, 2.35, 0);
    scene.add(bobGoldKey);

    // 9. AES-256-GCM 3D ENCRYPTION CUBE & NONCE DICE
    const aesCubeGroup = new THREE.Group();
    aesCubeGroup.position.set(-3.75, 1.65, 0.4);
    const aesOuterCube = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), matGlassEnclosure);
    aesOuterCube.renderOrder = 4;
    aesCubeGroup.add(aesOuterCube);
    const aesInnerCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 1), matPurpleCipher);
    aesCubeGroup.add(aesInnerCore);
    scene.add(aesCubeGroup);

    const nonceDice = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.38, 0.38),
      matBrushedSteel
    );
    nonceDice.position.set(-4.65, 2.1, 0.65);
    scene.add(nonceDice);

    // 10. DATA PACKET CAPSULE + IP OUTER ENVELOPE + GHASH SEAL
    const packetGroup = new THREE.Group();
    const capsuleCore = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 0.42, 8, 16),
      matPurpleCipher
    );
    capsuleCore.rotation.z = Math.PI / 2;
    packetGroup.add(capsuleCore);

    const ghashSealRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.29, 0.045, 10, 24),
      matGoldKey
    );
    ghashSealRing.rotation.y = Math.PI / 2;
    ghashSealRing.position.x = -0.25;
    packetGroup.add(ghashSealRing);

    const ipOuterBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.62, 0.62),
      matGlassEnclosure
    );
    ipOuterBox.renderOrder = 5;
    packetGroup.add(ipOuterBox);
    scene.add(packetGroup);

    // 11. GLOBAL CITY NODE GRID (InstancedMesh > 20 nodes for Subpart 03 Global Grid)
    const cityCount = 48;
    const cityInstanced = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.24, 0.5, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x8f8478, roughness: 0.7, metalness: 0.2 }),
      cityCount
    );
    const dummyMat = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyScale = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    let idx = 0;
    for (let gx = -9; gx <= 9; gx += 3) {
      for (let gz = -7; gz <= 7; gz += 2.2) {
        if (Math.abs(gx) < 6.5 && Math.abs(gz) < 3.4) continue;
        if (idx >= cityCount) break;
        const h = 0.4 + ((idx * 17) % 10) * 0.14;
        dummyPos.set(gx, h * 0.25, gz);
        dummyScale.set(1, h, 1);
        dummyMat.compose(dummyPos, dummyQuat, dummyScale);
        cityInstanced.setMatrixAt(idx, dummyMat);
        idx++;
      }
    }
    cityInstanced.computeBoundingSphere();
    scene.add(cityInstanced);

    // 12. FLOATING BILLBOARD LABELS FOR ACTORS
    function makeBillboard(title: string, sub: string, color: string, pos: THREE.Vector3): THREE.Sprite {
      const tex = createFloatingBadgeTexture(title, sub, color, isDarkRef.current, maxAnisotropy);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.set(2.55, 0.74, 1);
      sprite.renderOrder = 10;
      return sprite;
    }

    const aliceLabel = makeBillboard('ALICE (SENDER)', '192.168.1.4 · Workstation', '#3fa456', new THREE.Vector3(-5.4, 2.95, 0));
    const bobLabel = makeBillboard('BOB (RECEIVER)', '172.217.14.206:443 · TLS', '#2f86ce', new THREE.Vector3(5.4, 2.95, 0));
    const eveLabel = makeBillboard('EVE (MITM SNIFFER)', '10.66.6.13 · Wire Tap', '#e5534b', new THREE.Vector3(0, 2.15, 2.2));
    const caLabel = makeBillboard('TRUSTED ROOT CA', 'X.509 PKI Authority', '#f2b830', new THREE.Vector3(0, 3.05, -3.5));

    scene.add(aliceLabel, bobLabel, eveLabel, caLabel);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pre-allocated math helpers for zero-GC render loop
    const _curvePt = new THREE.Vector3();
    const clock = new THREE.Clock();
    let elapsed = 0;
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
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

    function tick() {
      const dt = Math.min(clock.getDelta(), 0.1);
      if (isPlayingRef.current) {
        elapsed += dt;
      }

      const v = visualRef.current;

      // Update background if theme toggled
      const targetBg = isDarkRef.current ? 0x1b1815 : 0xfaf3e9;
      if ((scene.background as THREE.Color).getHex() !== targetBg) {
        (scene.background as THREE.Color).setHex(targetBg);
        (scene.fog as THREE.FogExp2).color.setHex(targetBg);
        floorMat.color.setHex(isDarkRef.current ? 0x211e1a : 0xf3eadd);
      }

      // Smooth camera transition damping
      const camTarget = cameraTargetRef.current;
      if (camTarget.transitioning) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, camTarget.pos.x, 4.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, camTarget.pos.y, 4.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, camTarget.pos.z, 4.5, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, camTarget.lookAt.x, 5.0, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, camTarget.lookAt.y, 5.0, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, camTarget.lookAt.z, 5.0, dt);
        if (camera.position.distanceTo(camTarget.pos) < 0.05) {
          camTarget.transitioning = false;
        }
      }
      controls.update();

      // Actor visibility & animations
      caGroup.visible = v.activeActors.includes('ca') || Boolean(v.showCertBeam);
      caLabel.visible = caGroup.visible;
      certBeam.visible = Boolean(v.showCertBeam);
      caBeacon.rotation.y = elapsed * 1.4;

      // Key Gears & Public Key Exchange
      const showGears = Boolean(v.showKeyGears);
      aliceRedGear.visible = showGears;
      aliceBlueGear.visible = showGears;
      bobRedGear.visible = showGears;
      bobBlueGear.visible = showGears;

      if (showGears) {
        aliceRedGear.rotation.z = elapsed * 1.8;
        bobRedGear.rotation.z = -elapsed * 1.8;
        aliceBlueGear.rotation.z = -elapsed * 1.8;
        bobBlueGear.rotation.z = elapsed * 1.8;

        if (v.publicKeyExchange) {
          const swing = (Math.sin(elapsed * 2.0) + 1) * 0.5;
          aliceBlueGear.position.x = THREE.MathUtils.lerp(-4.8, 4.8, swing);
          bobBlueGear.position.x = THREE.MathUtils.lerp(4.8, -4.8, swing);
          aliceBlueGear.position.y = 1.9 + Math.sin(swing * Math.PI) * 0.85;
          bobBlueGear.position.y = 1.9 + Math.sin(swing * Math.PI) * 0.45;
        } else {
          aliceBlueGear.position.set(-4.95, 1.85, 0.35);
          bobBlueGear.position.set(4.95, 1.85, 0.35);
        }
      }

      // Gold Master Key
      const hasGold = Boolean(v.deriveGoldKey);
      aliceGoldKey.visible = hasGold;
      bobGoldKey.visible = hasGold;
      if (hasGold) {
        aliceGoldKey.rotation.y = elapsed * 2.1;
        bobGoldKey.rotation.y = elapsed * 2.1;
        aliceGoldKey.position.y = 2.28 + Math.sin(elapsed * 2.8) * 0.08;
        bobGoldKey.position.y = 2.28 + Math.sin(elapsed * 2.8) * 0.08;
      }

      // Nonce Dice & AES-GCM Cube
      nonceDice.visible = Boolean(v.showNonceDice);
      if (nonceDice.visible) {
        nonceDice.rotation.x = elapsed * 2.6;
        nonceDice.rotation.y = elapsed * 3.1;
      }

      aesCubeGroup.visible = Boolean(v.showAesCube);
      if (aesCubeGroup.visible) {
        aesInnerCore.rotation.x = elapsed * 2.2;
        aesInnerCore.rotation.y = elapsed * 2.8;
        aesOuterCube.rotation.y = elapsed * 0.45;
      }

      // Global Grid & Router Scanner Hops
      cityInstanced.visible = Boolean(v.showGlobalGrid);
      routerScannerRings.forEach((ring, i) => {
        const isHopActive = v.activeRouterHop === i + 1 || Boolean(v.showGlobalGrid);
        ring.visible = isHopActive;
        if (isHopActive) {
          ring.position.y = 0.4 + ((elapsed * 0.9 + i * 0.25) % 0.85);
        }
      });

      // Eve Siphon & Bit-Flip Laser
      siphonBeam.visible = Boolean(v.eveSiphonActive);
      if (v.eveBitFlip) {
        eveDish.rotation.z = Math.sin(elapsed * 12) * 0.12;
      } else {
        eveDish.rotation.z = 0;
      }

      // Firewall / Bob Verification Gate
      const showGate = Boolean(v.bobVerifyGate) || Boolean(v.firewallInspect);
      shieldGateGroup.visible = showGate;
      if (showGate) {
        const gateMat = gateEnergyField.material as THREE.MeshStandardMaterial;
        if (v.bobVerifyGate === 'rejected' || v.firewallInspect === 'dos_flood') {
          gateMat.color.setHex(0xe5534b);
          gateMat.emissive.setHex(0xc0392b);
        } else if (v.bobVerifyGate === 'checking') {
          gateMat.color.setHex(0xe8a33a);
          gateMat.emissive.setHex(0xd97706);
        } else {
          gateMat.color.setHex(0x3fa456);
          gateMat.emissive.setHex(0x2f8a43);
        }
      }

      // Packet transit along fiber backbone
      const hasPacket = typeof v.packetProgress === 'number';
      packetGroup.visible = hasPacket;
      if (hasPacket && typeof v.packetProgress === 'number') {
        const osc = isPlayingRef.current ? (Math.sin(elapsed * 1.8) * 0.08) : 0;
        const t = THREE.MathUtils.clamp(v.packetProgress + osc, 0.02, 0.98);
        backboneCurve.getPointAt(t, _curvePt);
        packetGroup.position.copy(_curvePt);
        packetGroup.position.y += 0.18;
        packetGroup.rotation.x = elapsed * 1.5;

        ipOuterBox.visible = Boolean(v.showIpEnvelope);
        ghashSealRing.visible = Boolean(v.showGhashSeal) || Boolean(v.signatureSeal) || v.packetColor === 'purple_cipher';

        if (v.packetColor === 'tampered_red') {
          capsuleCore.material = matAlertRed;
        } else if (v.packetColor === 'blue_key') {
          capsuleCore.material = matBlueKey;
        } else if (v.packetColor === 'signed_gold' || v.packetColor === 'replay_amber') {
          capsuleCore.material = matGoldKey;
        } else {
          capsuleCore.material = matPurpleCipher;
        }
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Overlay contextual 3D floating card pill inside the stage for Plaintext / Nonce / Hex / Gate status
  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '10px',
      }}
    >
      {/* Contextual Floating Stage Telemetry Banner (Non-occluding bottom-center above legend) */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
          zIndex: 3,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {visual.showPlaintextCard && (
          <div
            style={{
              background: isDark ? '#2e2923' : '#fbf7f1',
              border: '1.5px solid var(--ink)',
              boxShadow: '2px 2px 0 var(--drop)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
            }}
          >
            📄 Plaintext: &ldquo;{visual.showPlaintextCard}&rdquo;
          </div>
        )}
        {visual.showNonceDice && (
          <div
            style={{
              background: 'var(--c-d6e5f6)',
              border: '1.5px solid var(--ink)',
              boxShadow: '2px 2px 0 var(--drop)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
            }}
          >
            🎲 96-bit Nonce: {visual.showNonceDice}
          </div>
        )}
        {visual.aesScrambledHex && (
          <div
            style={{
              background: 'var(--violet)',
              border: '1.5px solid var(--ink)',
              boxShadow: '2px 2px 0 var(--drop)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
            }}
          >
            🔒 CipherCapsule: {visual.aesScrambledHex}
          </div>
        )}
        {visual.showGhashSeal && (
          <div
            style={{
              background: 'var(--green)',
              border: '1.5px solid var(--ink)',
              boxShadow: '2px 2px 0 var(--drop)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 800,
            }}
          >
            🛡️ 128-bit GHASH Seal: {visual.showGhashSeal}
          </div>
        )}
        {visual.bobVerifyGate === 'rejected' && (
          <div
            style={{
              background: 'var(--c-f8d5cf)',
              color: 'var(--c-7d241d)',
              border: '1.5px solid var(--ink)',
              boxShadow: '2px 2px 0 var(--drop)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 800,
            }}
          >
            🚨 AEADBadTagException — Forged Packet Vaporized!
          </div>
        )}
      </div>
    </div>
  );
};
