import { useEffect, useRef, type CSSProperties } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type PartKind =
  | "nose"
  | "body"
  | "fin"
  | "motor"
  | "recovery"
  | "other";

export interface RocketComponent {
  id: string;
  type: string;
  name: string;
}

export interface RocketViewportProps {
  components: RocketComponent[];
  wireframe?: boolean;
  className?: string;
  style?: CSSProperties;
}

const BG = 0x0b0f14;
const GRID_COLOR = 0x22d3ee;
const COPPER = 0xc97b4a;
const CYAN = 0x22d3ee;
const BODY_METAL = 0x8a9bb0;
const FIN_COLOR = 0xc97b4a;
const MOTOR_COLOR = 0x64748b;
const RECOVERY_COLOR = 0x34d399;
const OTHER_COLOR = 0x93a4b8;

const BODY_RADIUS = 0.18;

function normalizeKind(type: string): PartKind {
  const t = type.toLowerCase();
  if (
    t === "nose" ||
    t === "body" ||
    t === "fin" ||
    t === "motor" ||
    t === "recovery" ||
    t === "other"
  ) {
    return t;
  }
  if (t.includes("nose")) return "nose";
  if (t.includes("fin")) return "fin";
  if (t.includes("motor")) return "motor";
  if (t.includes("recover") || t.includes("parachute")) return "recovery";
  if (t.includes("body") || t.includes("tube")) return "body";
  return "other";
}

/** Structural stack order (bottom → top). Fins are placed separately. */
function stackPriority(kind: PartKind): number {
  switch (kind) {
    case "motor":
      return 0;
    case "body":
      return 1;
    case "other":
      return 2;
    case "recovery":
      return 3;
    case "nose":
      return 4;
    case "fin":
      return 99;
  }
}

type Disposable = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
};

function makeMaterial(
  color: number,
  wireframe: boolean,
  opts?: { metalness?: number; roughness?: number; emissive?: number }
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    wireframe,
    metalness: opts?.metalness ?? 0.45,
    roughness: opts?.roughness ?? 0.4,
    emissive: opts?.emissive ?? 0x000000,
    emissiveIntensity: opts?.emissive ? 0.18 : 0,
  });
}

function track(
  disposables: Disposable[],
  geometry: THREE.BufferGeometry,
  material: THREE.Material
): void {
  disposables.push({ geometry, material });
}

function buildRocket(
  components: RocketComponent[],
  wireframe: boolean
): { group: THREE.Group; disposables: Disposable[] } {
  const group = new THREE.Group();
  const disposables: Disposable[] = [];

  const parts = components.map((c) => ({
    ...c,
    kind: normalizeKind(c.type),
  }));

  const structural = parts
    .filter((p) => p.kind !== "fin")
    .sort((a, b) => stackPriority(a.kind) - stackPriority(b.kind));
  const finParts = parts.filter((p) => p.kind === "fin");

  let y = 0;
  let bodyBaseY = 0;
  let bodyHeight = 0;
  let hasBody = false;
  let stackTop = 0;

  for (const comp of structural) {
    switch (comp.kind) {
      case "motor": {
        const h = 0.28;
        const geo = new THREE.CylinderGeometry(0.1, 0.12, h, 20);
        const mat = makeMaterial(MOTOR_COLOR, wireframe, {
          metalness: 0.7,
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = comp.id;
        mesh.position.y = y + h / 2;
        y += h;
        group.add(mesh);
        track(disposables, geo, mat);
        break;
      }
      case "body": {
        const h = 0.9;
        const geo = new THREE.CylinderGeometry(
          BODY_RADIUS,
          BODY_RADIUS,
          h,
          28
        );
        const mat = makeMaterial(BODY_METAL, wireframe, {
          metalness: 0.55,
          roughness: 0.35,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = comp.id;
        mesh.position.y = y + h / 2;
        bodyBaseY = y;
        bodyHeight = h;
        hasBody = true;
        y += h;
        group.add(mesh);
        track(disposables, geo, mat);
        break;
      }
      case "recovery": {
        const geo = new THREE.SphereGeometry(0.14, 16, 12);
        geo.scale(1, 0.55, 1);
        const mat = makeMaterial(RECOVERY_COLOR, wireframe, {
          metalness: 0.2,
          roughness: 0.55,
          emissive: 0x0a3d2a,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = comp.id;
        // Mid/top of current stack — nest near upper body without advancing stack much
        const placeY =
          hasBody && bodyHeight > 0
            ? bodyBaseY + bodyHeight * 0.72
            : y + 0.12;
        mesh.position.y = placeY;
        group.add(mesh);
        track(disposables, geo, mat);
        break;
      }
      case "nose": {
        const h = 0.42;
        const geo = new THREE.ConeGeometry(BODY_RADIUS, h, 28);
        const mat = makeMaterial(CYAN, wireframe, {
          metalness: 0.5,
          roughness: 0.3,
          emissive: CYAN,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = comp.id;
        mesh.position.y = y + h / 2;
        y += h;
        group.add(mesh);
        track(disposables, geo, mat);
        break;
      }
      default: {
        const h = 0.22;
        const geo = new THREE.CylinderGeometry(
          BODY_RADIUS * 0.75,
          BODY_RADIUS,
          h,
          20
        );
        const mat = makeMaterial(OTHER_COLOR, wireframe, {
          metalness: 0.4,
          roughness: 0.5,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = comp.id;
        mesh.position.y = y + h / 2;
        y += h;
        group.add(mesh);
        track(disposables, geo, mat);
        break;
      }
    }
    stackTop = Math.max(stackTop, y);
  }

  // Fins around body base (or near bottom if no body)
  for (const comp of finParts) {
    const finGroup = new THREE.Group();
    finGroup.name = comp.id;
    const finCount = 4;
    const finW = 0.07;
    const finH = 0.32;
    const finD = 0.22;
    const mat = makeMaterial(FIN_COLOR, wireframe, {
      metalness: 0.35,
      roughness: 0.45,
      emissive: COPPER,
    });
    const attachY = hasBody ? bodyBaseY + 0.02 : 0.05;
    for (let i = 0; i < finCount; i++) {
      const geo = new THREE.BoxGeometry(finW, finH, finD);
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (i / finCount) * Math.PI * 2;
      const r = BODY_RADIUS + finD / 2 - 0.02;
      mesh.position.set(
        Math.cos(angle) * r,
        attachY + finH / 2,
        Math.sin(angle) * r
      );
      mesh.rotation.y = -angle;
      finGroup.add(mesh);
      track(disposables, geo, mat);
    }
    group.add(finGroup);
  }

  if (stackTop > 0) {
    group.position.y = -stackTop / 2;
  }

  return { group, disposables };
}

function disposeTracked(disposables: Disposable[]): void {
  const seenMats = new Set<THREE.Material>();
  for (const d of disposables) {
    d.geometry.dispose();
    if (!seenMats.has(d.material)) {
      d.material.dispose();
      seenMats.add(d.material);
    }
  }
}

export function RocketViewport({
  components,
  wireframe = false,
  className,
  style,
}: RocketViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const componentsKey = components.map((c) => `${c.id}:${c.type}`).join("|");

  useEffect(() => {
    const container = containerRef.current;
    const host = canvasHostRef.current;
    if (!container || !host) return;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 100);
    camera.position.set(1.6, 0.9, 2.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xb0c4d8, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
    keyLight.position.set(3, 5, 2);
    scene.add(keyLight);

    const fill = new THREE.DirectionalLight(CYAN, 0.28);
    fill.position.set(-2, 1, -2);
    scene.add(fill);

    const grid = new THREE.GridHelper(6, 24, GRID_COLOR, GRID_COLOR);
    grid.position.y = -0.01;
    const gridMats = Array.isArray(grid.material)
      ? grid.material
      : [grid.material];
    for (const m of gridMats) {
      m.transparent = true;
      m.opacity = 0.12;
    }
    scene.add(grid);

    const ringGeo = new THREE.RingGeometry(0.55, 0.58, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    scene.add(ring);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.15, 0);
    controls.minDistance = 0.8;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.92;
    controls.update();

    let rocketDisposables: Disposable[] = [];
    let rocketGroup: THREE.Group | null = null;

    if (components.length > 0) {
      const built = buildRocket(components, wireframe);
      rocketGroup = built.group;
      rocketDisposables = built.disposables;
      scene.add(rocketGroup);
    }

    let frameId = 0;
    let disposed = false;

    const animate = () => {
      if (disposed) return;
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: w, height: h } = entry.contentRect;
      if (w < 1 || h < 1) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();

      if (rocketGroup) {
        scene.remove(rocketGroup);
      }
      disposeTracked(rocketDisposables);

      ringGeo.dispose();
      ringMat.dispose();
      for (const m of gridMats) {
        m.dispose();
      }

      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [wireframe, componentsKey, components]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        minHeight: 360,
        height: "100%",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        background: "#0b0f14",
        border: "1px solid var(--border)",
        ...style,
      }}
      data-testid="rocket-viewport"
    >
      <div ref={canvasHostRef} style={{ position: "absolute", inset: 0 }} />
      {components.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-faint)",
            fontSize: "0.85rem",
            pointerEvents: "none",
          }}
        >
          Add components to preview the rocket
        </div>
      )}
    </div>
  );
}
