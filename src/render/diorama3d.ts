// Three.js HD-2D 3D Diorama Renderer ("Octopath Traveler" / miniature box-garden style).
// Combines a sculpted 3D diorama pedestal, 3D terrain elevation (cliffs, sunken river,
// waterfall edge, stone bridge, plaza fountain), 3D architectural building volumes
// (pitched roofs, chimneys, castle towers, spinning windmills, Dark Tower spire),
// real-time 3D Sun/Moon shadow mapping, 16 dynamic 3D PointLights, and 3D weather/firefly
// particles WITH 40 upright 3D pop-up billboard slices so every single procedural
// villager, hero, mount, cape, skit, and building facade stands in true 3D space.
import * as THREE from 'three';
import type { Building, Dungeon, GameState } from '../sim/types';
import { TILE } from './constants';
import { hash, type Env } from './palette';
import { isLit, type LightSource } from './buildings';

const N_SLICES = 40; // 2 depth slices per tile row (every 0.5 tiles = 12px Z)
const STRIP_H = 116; // vertical height of each slice strip in logical pixels
const PAD_BOTTOM = 10; // pixels below item.y * TILE preserved for feet/shadows
const ATLAS_COLS = 2;
const ATLAS_ROWS = Math.ceil(N_SLICES / ATLAS_COLS);
const MAX_POINT_LIGHTS = 14;
const PARTICLE_COUNT = 260;

export interface SliceDrawable {
  y: number;
  draw: (ctx: CanvasRenderingContext2D, env: Env) => void;
}

export class Diorama3D {
  enabled = true;
  private webglAvailable = true;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1.5, 10, 3500);

  // Offscreen canvases for feeding 2D procedural art into 3D textures.
  private groundCanvas = document.createElement('canvas');
  private groundCtx: CanvasRenderingContext2D;
  private groundTex: THREE.CanvasTexture;
  private groundMesh: THREE.Mesh | null = null;

  private canopyCanvas = document.createElement('canvas');
  private canopyCtx: CanvasRenderingContext2D;
  private canopyTex: THREE.CanvasTexture;
  private canopyMesh: THREE.Mesh | null = null;

  private atlasCanvas = document.createElement('canvas');
  private atlasCtx: CanvasRenderingContext2D;
  private atlasTex: THREE.CanvasTexture;
  private sliceMeshes: THREE.Mesh[] = [];

  // 3D scene groups
  private pedestalGroup = new THREE.Group();
  private terrainGroup = new THREE.Group();
  private buildingGroup = new THREE.Group();
  private waterGroup = new THREE.Group();
  private waterfallMeshes: THREE.Mesh[] = [];
  private windmillBlades: THREE.Object3D[] = [];
  private arcaneRings: THREE.Object3D[] = [];

  // Lighting
  private hemiLight = new THREE.HemisphereLight(0xffffff, 0x443322, 0.9);
  private sunLight = new THREE.DirectionalLight(0xfff4e0, 1.35);
  private pointLights: THREE.PointLight[] = [];

  // 3D Atmospheric particles
  private particlePoints: THREE.Points | null = null;
  private particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  private particlePhases = new Float32Array(PARTICLE_COUNT);

  // State stamps for lazy 3D geometry rebuilds
  private builtW = 0;
  private builtH = 0;
  private terrainStamp = '';
  private buildingStamp = '';

  // Interactive 3D camera orbit & zoom offsets
  private orbitYaw = 0; // radians (-0.65 .. 0.65)
  private orbitPitch = 0.74; // radians above ground (~42.5 degrees)
  private userZoom = 1.0;
  private camTarget = new THREE.Vector3(360, 0, 240);
  private dragging = false;
  private lastMouse = { x: 0, y: 0 };

  // Reusable math objects for raycasting & projection
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private tmpVec3 = new THREE.Vector3();

  constructor(hostCanvas: HTMLCanvasElement) {
    this.groundCtx = this.groundCanvas.getContext('2d')!;
    this.canopyCtx = this.canopyCanvas.getContext('2d')!;
    this.atlasCtx = this.atlasCanvas.getContext('2d')!;

    this.groundTex = new THREE.CanvasTexture(this.groundCanvas);
    this.groundTex.colorSpace = THREE.SRGBColorSpace;
    this.groundTex.minFilter = THREE.LinearFilter;
    this.groundTex.magFilter = THREE.LinearFilter;

    this.canopyTex = new THREE.CanvasTexture(this.canopyCanvas);
    this.canopyTex.colorSpace = THREE.SRGBColorSpace;
    this.canopyTex.minFilter = THREE.LinearFilter;
    this.canopyTex.magFilter = THREE.LinearFilter;

    this.atlasTex = new THREE.CanvasTexture(this.atlasCanvas);
    this.atlasTex.colorSpace = THREE.SRGBColorSpace;
    this.atlasTex.minFilter = THREE.LinearFilter;
    this.atlasTex.magFilter = THREE.NearestFilter;
    this.atlasTex.flipY = false;

    try {
      const glCanvas = document.createElement('canvas');
      this.renderer = new THREE.WebGLRenderer({
        canvas: glCanvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;
      this.initScene();
      this.bindOrbitEvents(hostCanvas);
    } catch {
      this.webglAvailable = false;
      this.enabled = false;
    }
  }

  isActive(): boolean {
    return this.enabled && this.webglAvailable && this.renderer !== null;
  }

  toggle(): boolean {
    if (!this.webglAvailable) return false;
    this.enabled = !this.enabled;
    return this.enabled;
  }

  private bindOrbitEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('contextmenu', (e) => {
      if (this.isActive()) e.preventDefault();
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.isActive()) return;
      if (e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey)) {
        this.dragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging || !this.isActive()) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.orbitYaw = Math.max(-0.68, Math.min(0.68, this.orbitYaw - dx * 0.0055));
      this.orbitPitch = Math.max(0.44, Math.min(1.18, this.orbitPitch + dy * 0.0045));
    });
    window.addEventListener('mouseup', () => {
      this.dragging = false;
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.isActive()) return;
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        this.userZoom = Math.max(0.78, Math.min(2.25, this.userZoom * factor));
      },
      { passive: false },
    );
  }

  private initScene(): void {
    this.scene.fog = new THREE.FogExp2(0x1a2234, 0.00055);
    this.scene.add(this.pedestalGroup);
    this.scene.add(this.terrainGroup);
    this.scene.add(this.waterGroup);
    this.scene.add(this.buildingGroup);

    // Hemisphere + Directional Sun/Moon light with shadow map
    this.scene.add(this.hemiLight);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.bias = -0.0008;
    this.sunLight.shadow.normalBias = 0.4;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Dynamic PointLight pool for campfires, lamps, buildings, and heroes
    for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
      const pl = new THREE.PointLight(0xffaa55, 0, 120, 1.6);
      pl.visible = false;
      this.pointLights.push(pl);
      this.scene.add(pl);
    }

    // 3D Atmospheric particles (fireflies, embers, snow, rain, sun motes)
    const pGeo = new THREE.BufferGeometry();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particlePositions[i * 3] = Math.random() * 720;
      this.particlePositions[i * 3 + 1] = 4 + Math.random() * 85;
      this.particlePositions[i * 3 + 2] = Math.random() * 480;
      this.particlePhases[i] = Math.random() * Math.PI * 2;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffe8a0,
      size: 3.4,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particlePoints = new THREE.Points(pGeo, pMat);
    this.scene.add(this.particlePoints);
  }

  /** Ensure offscreen buffers, pedestal, and slice planes match the map dimensions. */
  private ensureMapDimensions(W: number, H: number): void {
    if (this.builtW === W && this.builtH === H) return;
    this.builtW = W;
    this.builtH = H;
    this.camTarget.set(W * 0.5, 0, H * 0.5);

    const gScale = 2; // 2x supersampled ground texture
    this.groundCanvas.width = W * gScale;
    this.groundCanvas.height = H * gScale;
    this.groundCtx.setTransform(gScale, 0, 0, gScale, 0, 0);

    this.canopyCanvas.width = W;
    this.canopyCanvas.height = H;

    const aScale = 1.5; // 1.5x crisp pixel-art atlas for upright slices
    this.atlasCanvas.width = Math.round(W * ATLAS_COLS * aScale);
    this.atlasCanvas.height = Math.round(STRIP_H * ATLAS_ROWS * aScale);

    // Rebuild 3D pedestal and ground plane
    this.pedestalGroup.clear();
    this.buildPedestal(W, H);

    // Rebuild 40 upright 3D billboard slice meshes
    for (const m of this.sliceMeshes) this.scene.remove(m);
    this.sliceMeshes = [];

    const sliceTilt = -0.34; // ~19.5 deg tilt back toward the camera for HD-2D readability
    const cosT = Math.cos(-sliceTilt);
    const planeHeight = STRIP_H / cosT;

    for (let i = 0; i < N_SLICES; i++) {
      const col = i % ATLAS_COLS;
      const row = Math.floor(i / ATLAS_COLS);
      const u0 = col / ATLAS_COLS;
      const u1 = (col + 1) / ATLAS_COLS;
      const v0 = row / ATLAS_ROWS;
      const v1 = (row + 1) / ATLAS_ROWS;

      const geo = new THREE.PlaneGeometry(W, planeHeight);
      // Shift geometry vertically so the baseline (STRIP_H - PAD_BOTTOM from top) sits at Y = 0
      const yOffset = (STRIP_H * 0.5 - PAD_BOTTOM) / cosT;
      geo.translate(0, yOffset, 0);

      // Map UVs to this strip in the shared atlas (with flipY = false)
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      uv.setXY(0, u0, v0);
      uv.setXY(1, u1, v0);
      uv.setXY(2, u0, v1);
      uv.setXY(3, u1, v1);
      uv.needsUpdate = true;

      const mat = new THREE.MeshLambertMaterial({
        map: this.atlasTex,
        transparent: true,
        alphaTest: 0.04,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const zPos = ((i + 0.75) / N_SLICES) * H;
      mesh.position.set(W * 0.5, 0, zPos);
      mesh.rotation.x = sliceTilt;
      mesh.renderOrder = 10 + i;
      mesh.receiveShadow = true;
      this.sliceMeshes.push(mesh);
      this.scene.add(mesh);
    }

    // Configure Sun shadow frustum to cover the entire map board
    const cam = this.sunLight.shadow.camera;
    const d = Math.max(W, H) * 0.68;
    cam.left = -d;
    cam.right = d;
    cam.top = d;
    cam.bottom = -d;
    cam.near = 50;
    cam.far = 1400;
    cam.updateProjectionMatrix();
  }

  /** Build the carved wooden & stone miniature diorama pedestal beneath the map. */
  private buildPedestal(W: number, H: number): void {
    // 1. Main ground plane receiving 3D shadows
    const gGeo = new THREE.PlaneGeometry(W, H);
    gGeo.rotateX(-Math.PI / 2);
    const gMat = new THREE.MeshStandardMaterial({
      map: this.groundTex,
      roughness: 0.88,
      metalness: 0.04,
    });
    this.groundMesh = new THREE.Mesh(gGeo, gMat);
    this.groundMesh.position.set(W * 0.5, 0, H * 0.5);
    this.groundMesh.receiveShadow = true;
    this.pedestalGroup.add(this.groundMesh);

    // 2. Floating Canopy Plane for high particles, floating numbers, and world overlays
    const cGeo = new THREE.PlaneGeometry(W, H);
    cGeo.rotateX(-Math.PI / 2);
    const cMat = new THREE.MeshBasicMaterial({
      map: this.canopyTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.95,
    });
    this.canopyMesh = new THREE.Mesh(cGeo, cMat);
    this.canopyMesh.position.set(W * 0.5, 22, H * 0.5 + 6);
    this.canopyMesh.renderOrder = 100;
    this.pedestalGroup.add(this.canopyMesh);

    // 3. Soil & Turf Rim just under the ground plane
    const turfGeo = new THREE.BoxGeometry(W + 6, 6, H + 6);
    const turfMat = new THREE.MeshStandardMaterial({ color: 0x4b3c2c, roughness: 0.92 });
    const turf = new THREE.Mesh(turfGeo, turfMat);
    turf.position.set(W * 0.5, -3.1, H * 0.5);
    turf.receiveShadow = true;
    this.pedestalGroup.add(turf);

    // 4. Carved Stone & Earth Stratum Block
    const rockGeo = new THREE.BoxGeometry(W + 2, 18, H + 2);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x332922, roughness: 0.95 });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(W * 0.5, -15, H * 0.5);
    rock.castShadow = true;
    rock.receiveShadow = true;
    this.pedestalGroup.add(rock);

    // 5. Polished Dark Walnut Moulding Plinth
    const plinthGeo = new THREE.BoxGeometry(W + 22, 10, H + 22);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e140e,
      roughness: 0.42,
      metalness: 0.15,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(W * 0.5, -29, H * 0.5);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    this.pedestalGroup.add(plinth);

    // 6. Four Brass Corner Brackets on the Diorama Frame
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4a84e,
      roughness: 0.28,
      metalness: 0.78,
    });
    const cornerCoords = [
      [-6, -6],
      [W + 6, -6],
      [-6, H + 6],
      [W + 6, H + 6],
    ];
    for (const [cx, cz] of cornerCoords) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(10, 32, 10), brassMat);
      post.position.set(cx, -17, cz);
      this.pedestalGroup.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(5.5, 12, 12), brassMat);
      cap.position.set(cx, -0.5, cz);
      this.pedestalGroup.add(cap);
    }

    // 7. Engraved Gold Nameplate on the front of the diorama base
    const plate = new THREE.Mesh(new THREE.BoxGeometry(96, 6, 3), brassMat);
    plate.position.set(W * 0.5, -29, H + 11.5);
    this.pedestalGroup.add(plate);

    // 8. Studio Backdrop Table surface beneath the pedestal
    const tableGeo = new THREE.PlaneGeometry(W * 4, H * 4);
    tableGeo.rotateX(-Math.PI / 2);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0d111a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(W * 0.5, -34.5, H * 0.5);
    table.receiveShadow = true;
    this.pedestalGroup.add(table);
  }

  /** Rebuild 3D rock cliffs, ore veins, specular water tiles, and edge waterfalls when terrain changes. */
  private syncTerrain3D(s: GameState, env: Env): void {
    let h = 0;
    for (let i = 0; i < s.tiles.length; i++) {
      const t = s.tiles[i];
      if (t.terrain === 'rock' || t.terrain === 'ore' || t.terrain === 'water' || t.terrain === 'forest') {
        h = ((h * 31) + (t.terrain === 'water' ? 7 : t.terrain === 'ore' ? 5 : t.terrain === 'forest' ? 2 : 3) * 16 + Math.floor(t.amount / 15)) | 0;
      }
    }
    const stamp = `${env.season}|${s.tier}|${h}`;
    if (stamp === this.terrainStamp) return;
    this.terrainStamp = stamp;

    this.terrainGroup.clear();
    this.waterGroup.clear();
    this.waterfallMeshes = [];

    const snow = env.season === 'winter';
    const autumn = env.season === 'autumn';
    const rockMat = new THREE.MeshStandardMaterial({
      color: snow ? 0xb8c2cc : 0x7c7c78,
      roughness: 0.88,
    });
    const darkRockMat = new THREE.MeshStandardMaterial({
      color: 0x565652,
      roughness: 0.92,
    });
    const oreMat = new THREE.MeshStandardMaterial({
      color: 0x484c62,
      roughness: 0.65,
      metalness: 0.35,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x78c8ff,
      emissive: 0x1c4870,
      roughness: 0.2,
      metalness: 0.8,
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: snow ? 0x6898c0 : 0x2a78b8,
      roughness: 0.14,
      metalness: 0.38,
      transparent: true,
      opacity: 0.52,
    });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3e26, roughness: 0.92 });
    const leafGreenMat = new THREE.MeshStandardMaterial({
      color: snow ? 0xdce6f0 : autumn ? 0xc86428 : 0x3b6e38,
      roughness: 0.85,
    });
    const leafAltMat = new THREE.MeshStandardMaterial({
      color: snow ? 0xc8d6e4 : autumn ? 0xdc9232 : 0x2e582c,
      roughness: 0.85,
    });

    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        const t = s.tiles[y * s.width + x];
        const px = x * TILE + TILE * 0.5;
        const pz = y * TILE + TILE * 0.5;

        if (t.terrain === 'forest' && t.amount >= 1) {
          const tz = y * TILE + 2.5; // right behind the tree sprite slice at y + 0.6
          const th = 12 + hash(x, y, 3) * 6;
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, th * 0.55, 6), trunkMat);
          trunk.position.set(px, th * 0.27, tz);
          trunk.castShadow = true;
          this.terrainGroup.add(trunk);

          const isPine = hash(x, y, 4) > 0.55;
          const crownMat = hash(x, y, 5) > 0.5 ? leafGreenMat : leafAltMat;
          const crown = new THREE.Mesh(
            isPine ? new THREE.ConeGeometry(6.8, th * 0.95, 7) : new THREE.DodecahedronGeometry(6.5, 1),
            crownMat,
          );
          crown.position.set(px, th * 0.72, tz - 1.5);
          crown.castShadow = true;
          crown.receiveShadow = true;
          this.terrainGroup.add(crown);
          continue;
        }

        if (t.terrain === 'water') {
          const wTile = new THREE.Mesh(new THREE.PlaneGeometry(TILE + 0.5, TILE + 0.5), waterMat);
          wTile.rotation.x = -Math.PI / 2;
          wTile.position.set(px, 0.25, pz);
          this.waterGroup.add(wTile);

          // If water touches the front edge (y === s.height - 1), create a 3D cascading diorama waterfall!
          if (y === s.height - 1) {
            const wfMat = new THREE.MeshStandardMaterial({
              color: 0x58b0e8,
              emissive: 0x103048,
              roughness: 0.18,
              transparent: true,
              opacity: 0.82,
            });
            const wf = new THREE.Mesh(new THREE.BoxGeometry(TILE - 2, 26, 3.5), wfMat);
            wf.position.set(px, -12.5, (y + 1) * TILE + 1.5);
            this.waterGroup.add(wf);
            this.waterfallMeshes.push(wf);
          }
        } else if ((t.terrain === 'rock' || t.terrain === 'ore') && t.amount >= 1) {
          const k = Math.max(0.35, Math.min(1, t.amount / 80));
          const h1 = (9 + hash(x, y, 11) * 9) * k;
          const b1 = new THREE.Mesh(
            new THREE.DodecahedronGeometry(7.5 * k, 0),
            t.terrain === 'ore' ? oreMat : rockMat,
          );
          b1.scale.set(1.15, h1 / 7.5, 0.95);
          b1.position.set(px - 2, h1 * 0.42, pz - 2);
          b1.rotation.y = hash(x, y, 12) * Math.PI;
          b1.castShadow = true;
          b1.receiveShadow = true;
          this.terrainGroup.add(b1);

          const h2 = h1 * 0.65;
          const b2 = new THREE.Mesh(
            new THREE.DodecahedronGeometry(5.5 * k, 0),
            darkRockMat,
          );
          b2.position.set(px + 4, h2 * 0.4, pz + 2);
          b2.castShadow = true;
          this.terrainGroup.add(b2);

          if (t.terrain === 'ore' && t.amount >= 10) {
            const shard = new THREE.Mesh(new THREE.OctahedronGeometry(3.2 * k, 0), crystalMat);
            shard.scale.set(0.7, 1.8, 0.7);
            shard.position.set(px + 1, h1 * 0.78, pz);
            shard.rotation.z = 0.25;
            this.terrainGroup.add(shard);
          }
        }
      }
    }

    // Add 3D Stone Bridge arches where roads cross or adjoin the river
    const bridgeStoneMat = new THREE.MeshStandardMaterial({ color: 0x8a867e, roughness: 0.85 });
    for (let y = 1; y < s.height - 1; y++) {
      for (let x = 1; x < s.width - 1; x++) {
        const t = s.tiles[y * s.width + x];
        if (t.terrain !== 'road') continue;
        const wLeft = s.tiles[y * s.width + (x - 1)].terrain === 'water';
        const wRight = s.tiles[y * s.width + (x + 1)].terrain === 'water';
        if (wLeft || wRight) {
          const px = x * TILE + TILE * 0.5;
          const pz = y * TILE + TILE * 0.5;
          const parapetL = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.5, TILE), bridgeStoneMat);
          parapetL.position.set(px - TILE * 0.44, 2.25, pz);
          parapetL.castShadow = true;
          this.terrainGroup.add(parapetL);
          const parapetR = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.5, TILE), bridgeStoneMat);
          parapetR.position.set(px + TILE * 0.44, 2.25, pz);
          parapetR.castShadow = true;
          this.terrainGroup.add(parapetR);
        }
      }
    }
  }

  /** Build 3D architectural volumes (roofs, walls, towers, windmills, Dark Tower spire) behind the 2D facades. */
  private syncBuildings3D(s: GameState, env: Env): void {
    let bh = 0;
    for (const b of s.buildings) {
      bh = ((bh * 31) + b.id * 7 + (b.built ? 1 : 0) + (isLit(b, env) ? 2 : 0)) | 0;
    }
    for (const d of s.dungeons) {
      bh = ((bh * 17) + (d.unlocked ? 3 : 1) + (d.bossDefeated ? 5 : 0)) | 0;
    }
    const stamp = `${env.season}|${s.victory ? 1 : 0}|${bh}`;
    if (stamp === this.buildingStamp) return;
    this.buildingStamp = stamp;

    this.buildingGroup.clear();
    this.windmillBlades = [];
    this.arcaneRings = [];

    const snow = env.season === 'winter';
    for (const b of s.buildings) {
      if (!b.built) continue;
      this.addBuildingVolume(b, env, snow);
    }
    for (const d of s.dungeons) {
      if (!d.unlocked) continue;
      this.addDungeonVolume(d, s, snow);
    }
  }

  private addBuildingVolume(b: Building, env: Env, snow: boolean): void {
    const cx = b.x * TILE + TILE * 0.5;
    const cz = b.y * TILE + 2.5; // sits cleanly behind the tilted front slice at y + 0.95
    const lit = isLit(b, env);

    const wallColors: Partial<Record<Building['type'], number>> = {
      hut: 0x8c6844,
      house: 0xd8ccb8,
      tavern: 0xc8b496,
      guildHall: 0xb8b0a4,
      granary: 0xc29e68,
      blacksmith: 0x6e6864,
      chapel: 0xdcd8ce,
      keep: 0x9a9894,
      walls: 0x888682,
      lumberCamp: 0x8a623c,
    };
    const roofColors: Partial<Record<Building['type'], number>> = {
      hut: 0xa88244,
      house: 0xa64232,
      tavern: 0x8e3428,
      guildHall: 0x385478,
      granary: 0xb07838,
      blacksmith: 0x484442,
      chapel: 0x425a82,
      keep: 0x384c72,
      lumberCamp: 0x785230,
    };

    if (b.type === 'farm') {
      // 3D Wooden Windmill on the north corner of the farm with rotating 3D sails!
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x8c643c, roughness: 0.85 });
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.2, 16, 8), towerMat);
      tower.position.set(cx + 6, 8, cz - 4);
      tower.castShadow = true;
      this.buildingGroup.add(tower);

      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(3.4, 4, 8),
        new THREE.MeshStandardMaterial({ color: snow ? 0xe8eef4 : 0xa04030, roughness: 0.8 }),
      );
      cap.position.set(cx + 6, 17.5, cz - 4);
      this.buildingGroup.add(cap);

      const hub = new THREE.Group();
      hub.position.set(cx + 6, 13.5, cz - 1.2);
      const sailMat = new THREE.MeshStandardMaterial({ color: 0xf0e4c8, roughness: 0.7, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.5, 0.4), sailMat);
        arm.position.y = 4.2;
        const pivot = new THREE.Group();
        pivot.rotation.z = (i * Math.PI) / 2;
        pivot.add(arm);
        hub.add(pivot);
      }
      this.buildingGroup.add(hub);
      this.windmillBlades.push(hub);
      return;
    }

    if (b.type === 'campfire' || b.type === 'quarry' || b.type === 'grave' || b.type === 'well' || b.type === 'market' || b.type === 'mine') {
      return;
    }

    const wallCol = wallColors[b.type] ?? 0xb8a890;
    const roofCol = snow ? 0xe6edf5 : (roofColors[b.type] ?? 0x984234);
    const wallMat = new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.88 });
    const roofMat = new THREE.MeshStandardMaterial({ color: roofCol, roughness: 0.78 });

    if (b.type === 'keep') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(22, 26, 18), wallMat);
      body.position.set(cx, 13, cz);
      body.castShadow = true;
      body.receiveShadow = true;
      this.buildingGroup.add(body);

      for (const dx of [-9, 9]) {
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 32, 10), wallMat);
        turret.position.set(cx + dx, 16, cz - 3);
        turret.castShadow = true;
        this.buildingGroup.add(turret);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(5.2, 11, 10), roofMat);
        spire.position.set(cx + dx, 37, cz - 3);
        spire.castShadow = true;
        this.buildingGroup.add(spire);
      }
      return;
    }

    if (b.type === 'walls') {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 12), wallMat);
      wall.position.set(cx, 9, cz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.buildingGroup.add(wall);
      return;
    }

    const bw = b.type === 'hut' ? 14 : b.type === 'chapel' || b.type === 'tavern' || b.type === 'guildHall' ? 20 : 17;
    const bh = b.type === 'hut' ? 10 : b.type === 'chapel' ? 20 : b.type === 'tavern' || b.type === 'guildHall' ? 17 : 14;
    const bd = b.type === 'hut' ? 12 : 14;

    const box = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wallMat);
    box.position.set(cx, bh * 0.5, cz);
    box.castShadow = true;
    box.receiveShadow = true;
    this.buildingGroup.add(box);

    // Pitched 3D Roof
    const roofH = b.type === 'chapel' ? 14 : b.type === 'hut' ? 8 : 10;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(bw * 0.68, roofH, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(cx, bh + roofH * 0.48, cz);
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.buildingGroup.add(roof);

    // Chapel bell-tower spire
    if (b.type === 'chapel') {
      const steeple = new THREE.Mesh(new THREE.ConeGeometry(3.5, 16, 6), roofMat);
      steeple.position.set(cx, bh + roofH + 5, cz - 2);
      steeple.castShadow = true;
      this.buildingGroup.add(steeple);
    }

    // Glowing 3D side windows when lit
    if (lit) {
      const winMat = new THREE.MeshBasicMaterial({ color: 0xffd278 });
      const winL = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.6), winMat);
      winL.rotation.y = -Math.PI / 2;
      winL.position.set(cx - bw * 0.5 - 0.1, bh * 0.55, cz);
      this.buildingGroup.add(winL);
      const winR = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.6), winMat);
      winR.rotation.y = Math.PI / 2;
      winR.position.set(cx + bw * 0.5 + 0.1, bh * 0.55, cz);
      this.buildingGroup.add(winR);
    }
  }

  private addDungeonVolume(d: Dungeon, s: GameState, snow: boolean): void {
    const cx = d.x * TILE + TILE * 0.5;
    const cz = d.y * TILE + 2.5;

    if (d.id === 'darkTower') {
      const towerMat = new THREE.MeshStandardMaterial({
        color: 0x241c34,
        roughness: 0.45,
        metalness: 0.5,
      });
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 9.5, 42, 8), towerMat);
      spire.position.set(cx, 21, cz);
      spire.castShadow = true;
      this.buildingGroup.add(spire);

      // Orbiting 3D arcane torus ring around the Dark Tower apex
      const ringMat = new THREE.MeshBasicMaterial({
        color: s.victory ? 0xffdf70 : 0xb448ff,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(9.5, 0.85, 8, 28), ringMat);
      ring.position.set(cx, 36, cz);
      ring.rotation.x = Math.PI / 2.4;
      this.buildingGroup.add(ring);
      this.arcaneRings.push(ring);
    } else {
      const cragMat = new THREE.MeshStandardMaterial({
        color: d.id === 'emberPeak' ? 0x5c2e24 : d.id === 'emeraldCavern' ? 0x2a5446 : snow ? 0x9aa6b2 : 0x625e58,
        roughness: 0.85,
      });
      const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(9, 0), cragMat);
      mound.position.set(cx, 7, cz);
      mound.castShadow = true;
      this.buildingGroup.add(mound);
    }
  }

  /** Update 3D Sun/Moon trajectory, sky/fog palette, and 14 dynamic PointLights. */
  private updateLighting(s: GameState, env: Env, W: number, H: number, lights: LightSource[]): void {
    const dark = env.dark;
    const dayFrac = env.dayFrac;

    // Sky & Fog colors across Dawn -> Day -> Dusk -> Night
    const dawn = Math.max(0, 1 - Math.abs(dayFrac - 0.12) / 0.1);
    const dusk = Math.max(0, 1 - Math.abs(dayFrac - 0.72) / 0.1);

    const skyDay = new THREE.Color(env.season === 'winter' ? 0x243248 : 0x1e2c42);
    const skyNight = new THREE.Color(0x070a14);
    const skyDusk = new THREE.Color(0x2e1c2b);
    const skyCol = skyDay.clone().lerp(skyDusk, Math.max(dawn, dusk) * 0.7).lerp(skyNight, dark);

    this.scene.background = skyCol;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(skyCol);
      this.scene.fog.density = env.rainy ? 0.00072 : 0.00046;
    }

    // Hemisphere ambient light
    const hemiSky = new THREE.Color(0xffffff)
      .lerp(new THREE.Color(0xffb880), Math.max(dawn, dusk) * 0.65)
      .lerp(new THREE.Color(0x5268a8), dark);
    const hemiGround = new THREE.Color(0x5a4d3c).lerp(new THREE.Color(0x181c2c), dark);
    this.hemiLight.color.copy(hemiSky);
    this.hemiLight.groundColor.copy(hemiGround);
    this.hemiLight.intensity = 1.05 - dark * 0.52;

    // Sun / Moon arc across the sky
    const sunAngle = (dayFrac - 0.38) * Math.PI * 1.65;
    const sunX = W * 0.5 + Math.sin(sunAngle) * 380;
    const sunY = Math.max(140, Math.cos(sunAngle * 0.75) * 440);
    const sunZ = H * 0.5 + 260;
    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.set(W * 0.5, 0, H * 0.5);

    const sunCol = new THREE.Color(0xfff6e6)
      .lerp(new THREE.Color(0xff9448), Math.max(dawn, dusk) * 0.85)
      .lerp(new THREE.Color(0x6888cc), dark);
    this.sunLight.color.copy(sunCol);
    this.sunLight.intensity = (1.35 - dark * 0.88) * (env.rainy ? 0.72 : 1);

    // Dynamic 3D PointLights from campfires, street lamps, buildings, and heroes
    for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
      const pl = this.pointLights[i];
      if (i < lights.length) {
        const src = lights[i];
        const flick = src.flicker ? 1 + Math.sin(env.clock * 11 + i * 2.3) * src.flicker : 1;
        pl.visible = true;
        pl.color.set(src.color);
        pl.position.set(src.x, 14, src.y + 4);
        pl.distance = src.r * 3.2;
        pl.intensity = (0.45 + dark * 1.65) * flick;
      } else {
        pl.visible = false;
      }
    }
    void s;
  }

  /** Animate 3D windmills, waterfalls, arcane rings, and 3D weather/firefly particles. */
  private updateAnimations(env: Env, dt: number, W: number, H: number): void {
    for (const w of this.windmillBlades) {
      w.rotation.z = env.clock * 1.35;
    }
    for (const r of this.arcaneRings) {
      r.rotation.z = env.clock * 1.8;
      r.position.y = 36 + Math.sin(env.clock * 3) * 1.5;
    }
    for (let i = 0; i < this.waterfallMeshes.length; i++) {
      const wf = this.waterfallMeshes[i];
      wf.scale.x = 0.92 + Math.sin(env.clock * 9 + i) * 0.08;
    }

    // Update 3D atmospheric particles
    if (this.particlePoints) {
      const mat = this.particlePoints.material as THREE.PointsMaterial;
      const isSnow = env.season === 'winter';
      const isRain = env.rainy && !isSnow;
      const isNight = env.dark > 0.45;

      if (isSnow) {
        mat.color.setHex(0xffffff);
        mat.size = 3.8;
        mat.opacity = 0.85;
      } else if (isRain) {
        mat.color.setHex(0x90b8e8);
        mat.size = 2.8;
        mat.opacity = 0.65;
      } else if (isNight) {
        mat.color.setHex(0xffe070);
        mat.size = 3.6;
        mat.opacity = 0.82;
      } else {
        mat.color.setHex(env.season === 'autumn' ? 0xf09038 : 0xfff0b8);
        mat.size = 2.8;
        mat.opacity = 0.52;
      }

      const pos = this.particlePositions;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        const ph = this.particlePhases[i];
        if (isRain) {
          pos[idx + 1] -= dt * 145;
          pos[idx] -= dt * 18;
          if (pos[idx + 1] < 0) {
            pos[idx + 1] = 85;
            pos[idx] = Math.random() * W;
          }
        } else if (isSnow) {
          pos[idx + 1] -= dt * 28;
          pos[idx] += Math.sin(env.clock * 2 + ph) * dt * 12;
          if (pos[idx + 1] < 0) {
            pos[idx + 1] = 85;
            pos[idx] = Math.random() * W;
          }
        } else {
          // Floating fireflies / sunlit motes
          pos[idx] += Math.sin(env.clock * 1.2 + ph) * dt * 8;
          pos[idx + 1] += Math.cos(env.clock * 1.5 + ph) * dt * 5;
          pos[idx + 2] += Math.sin(env.clock * 0.9 + ph * 2) * dt * 8;
          if (pos[idx + 1] < 3) pos[idx + 1] = 75;
          if (pos[idx + 1] > 82) pos[idx + 1] = 6;
        }
      }
      this.particlePoints.geometry.attributes.position.needsUpdate = true;
    }
  }

  /** Render the complete 3D diorama scene and composite it onto the target 2D canvas. */
  render(
    targetCtx: CanvasRenderingContext2D,
    s: GameState,
    env: Env,
    dt: number,
    W: number,
    H: number,
    bw: number,
    bh: number,
    camFocus: { cx: number; cy: number; zoom: number },
    drawGroundFn: (ctx: CanvasRenderingContext2D) => void,
    items: SliceDrawable[],
    drawCanopyFn: (ctx: CanvasRenderingContext2D) => void,
    lights: LightSource[],
  ): void {
    if (!this.renderer) return;
    this.ensureMapDimensions(W, H);
    this.syncTerrain3D(s, env);
    this.syncBuildings3D(s, env);

    // 1. Update Ground Texture (terrain + water + ground shadows + low effects)
    this.groundCtx.clearRect(0, 0, W, H);
    drawGroundFn(this.groundCtx);
    this.groundTex.needsUpdate = true;

    // 2. Update 40 Upright 3D Pop-up Slice Planes inside the single shared Atlas
    const aScale = this.atlasCanvas.width / (W * ATLAS_COLS);
    const actx = this.atlasCtx;
    actx.setTransform(1, 0, 0, 1, 0, 0);
    actx.clearRect(0, 0, this.atlasCanvas.width, this.atlasCanvas.height);

    // Bucket already-sorted items into their depth slice (0 .. N_SLICES - 1)
    const buckets: SliceDrawable[][] = Array.from({ length: N_SLICES }, () => []);
    for (const it of items) {
      const idx = Math.max(0, Math.min(N_SLICES - 1, Math.floor((it.y / s.height) * N_SLICES)));
      buckets[idx].push(it);
    }

    for (let i = 0; i < N_SLICES; i++) {
      const list = buckets[i];
      const mesh = this.sliceMeshes[i];
      if (!list.length) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const col = i % ATLAS_COLS;
      const row = Math.floor(i / ATLAS_COLS);
      const ox = col * W;
      const oy = row * STRIP_H;
      const baselineY = oy + STRIP_H - PAD_BOTTOM;

      actx.save();
      actx.scale(aScale, aScale);
      actx.beginPath();
      actx.rect(ox, oy, W, STRIP_H);
      actx.clip();

      for (const it of list) {
        const baseY = it.y * TILE;
        actx.save();
        actx.translate(ox, baselineY - baseY);
        it.draw(actx, env);
        actx.restore();
      }
      actx.restore();
    }
    this.atlasTex.needsUpdate = true;

    // 3. Update Canopy Texture (floating numbers, high smoke/fireworks, world overlays)
    this.canopyCtx.clearRect(0, 0, W, H);
    drawCanopyFn(this.canopyCtx);
    this.canopyTex.needsUpdate = true;

    // 4. Update 3D Camera Position & Orientation
    const k = 1 - Math.exp(-dt * 4);
    this.camTarget.x += (camFocus.cx - this.camTarget.x) * k;
    this.camTarget.z += (camFocus.cy - this.camTarget.z) * k;

    const totalZoom = camFocus.zoom * this.userZoom;
    const dist = 820 / totalZoom;
    const horizDist = Math.cos(this.orbitPitch) * dist;
    const camY = Math.sin(this.orbitPitch) * dist;
    const camX = this.camTarget.x + Math.sin(this.orbitYaw) * horizDist;
    const camZ = this.camTarget.z + Math.cos(this.orbitYaw) * horizDist;

    if (this.renderer.domElement.width !== bw || this.renderer.domElement.height !== bh) {
      this.renderer.setSize(bw, bh, false);
    }
    this.camera.aspect = W / H;
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.camTarget.x, 8, this.camTarget.z - 12);
    this.camera.updateProjectionMatrix();

    // 5. Update 3D Lights & Animations and Render WebGL Scene
    this.updateLighting(s, env, W, H, lights);
    this.updateAnimations(env, dt, W, H);
    this.renderer.render(this.scene, this.camera);

    // 6. Composite WebGL output onto the main 2D canvas + HD-2D Tilt-Shift Depth of Field pass
    targetCtx.drawImage(this.renderer.domElement, 0, 0, W, H);
    this.drawTiltShiftOverlay(targetCtx, env, W, H);
  }

  /** HD-2D miniature diorama Tilt-Shift atmospheric depth-of-field & lens warmth pass. */
  private drawTiltShiftOverlay(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number): void {
    ctx.save();
    // Top horizon soft atmospheric haze
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.22);
    const hazeCol = env.dark > 0.4 ? 'rgba(10, 16, 32, 0.42)' : 'rgba(255, 240, 210, 0.22)';
    topGrad.addColorStop(0, hazeCol);
    topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, H * 0.22);

    // Bottom foreground miniature lens falloff
    const botGrad = ctx.createLinearGradient(0, H * 0.84, 0, H);
    botGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    botGrad.addColorStop(1, 'rgba(8, 6, 12, 0.38)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H * 0.84, W, H * 0.16);
    ctx.restore();
  }

  /** Project a 2D map ground coordinate (px, py) + height above ground into 2D canvas screen coordinates. */
  projectToCanvas(px: number, py: number, heightAboveGround: number, W: number, H: number): { x: number; y: number } {
    this.tmpVec3.set(px, heightAboveGround, py);
    this.tmpVec3.project(this.camera);
    return {
      x: (this.tmpVec3.x * 0.5 + 0.5) * W,
      y: (-this.tmpVec3.y * 0.5 + 0.5) * H,
    };
  }

  /** Raycast a client mouse click onto the Y=0 3D ground plane to get exact tile coordinates (tx, ty). */
  screenToTile(rect: DOMRect, clientX: number, clientY: number): { tx: number; ty: number } | null {
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.tmpVec3);
    if (!hit) return null;
    return { tx: hit.x / TILE, ty: hit.z / TILE };
  }
}
