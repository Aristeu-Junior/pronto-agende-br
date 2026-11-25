import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, useGLTF } from '@react-three/drei';
import { MAC_PX_H, MAC_PX_W, PHONE_PX_H, PHONE_PX_W } from './landingScreenSizes';
import * as THREE from 'three';


const DRACO = `${import.meta.env.BASE_URL}draco/`;
const MAC_URL = `${import.meta.env.BASE_URL}models/mac.glb`;
const PHONE_URL = `${import.meta.env.BASE_URL}models/iphone/scene.gltf`;

type OverlayRef = React.RefObject<HTMLDivElement | null>;

interface SceneProps {
  laptopOverlay: OverlayRef;
  phoneOverlay: OverlayRef;
  narrow: boolean;
  device: 'laptop' | 'phone';
}


/**
 * Pins a flat DOM screen onto a 3D quad. The quad's corners are projected with the real
 * camera every frame and applied as ONE matrix3d, so what is drawn and what is clickable
 * are the same pixels (drei's nested <Html transform> drifts on hit-testing and on zoom).
 */
const useScreenOverlay = (
  anchor: React.RefObject<THREE.Object3D | null>,
  overlay: OverlayRef,
  cssW: number,
  cssH: number,
  worldW: number,
  worldH: number,
) => {
  const v = useMemo(() => new THREE.Vector3(), []);
  const corners = useMemo(
    () => [
      [-worldW / 2, worldH / 2],
      [worldW / 2, worldH / 2],
      [worldW / 2, -worldH / 2],
      [-worldW / 2, -worldH / 2],
    ],
    [worldW, worldH],
  );

  useEffect(
    () => () => {
      const el = overlay.current;
      if (el) el.style.display = 'none';
    },
    [overlay],
  );

  useFrame(({ camera, size }) => {
    const el = overlay.current;
    const a = anchor.current;
    if (!el || !a) return;
    a.updateWorldMatrix(true, false);
    const pts: number[][] = [];
    for (const [cx, cy] of corners) {
      v.set(cx, cy, 0).applyMatrix4(a.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      if (v.z > -0.1) {
        el.style.visibility = 'hidden';
        return;
      }
      v.applyMatrix4(camera.projectionMatrix);
      pts.push([(v.x * 0.5 + 0.5) * size.width, (-v.y * 0.5 + 0.5) * size.height]);
    }
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = pts;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(den) < 1e-6) {
      el.style.visibility = 'hidden';
      return;
    }
    const g = (dx3 * dy2 - dy3 * dx2) / den;
    const h = (dx1 * dy3 - dy1 * dx3) / den;
    const A = x1 - x0 + g * x1, B = x3 - x0 + h * x3;
    const D = y1 - y0 + g * y1, E = y3 - y0 + h * y3;
    const m = [A / cssW, D / cssW, 0, g / cssW, B / cssH, E / cssH, 0, h / cssH, 0, 0, 1, 0, x0, y0, 0, 1];
    el.style.transform = `matrix3d(${m.join(',')})`;
    el.style.display = 'block';
    el.style.visibility = 'visible';
  });
};

/** MacBook: lid hinged on the model's own `screen` node, UI projected on its panel. */
const MacBook: React.FC<{ overlay: OverlayRef }> = ({ overlay }) => {
  const anchor = useRef<THREE.Object3D>(null);
  const { scene } = useGLTF(MAC_URL, DRACO);
  const root = useMemo(() => scene.clone(true), [scene]);
  const lid = useMemo(() => root.getObjectByName('screen') as THREE.Object3D, [root]);
  const matte = useMemo(() => root.getObjectByName('matte') as THREE.Mesh, [root]);

  useEffect(() => {
    if (!lid) return;
    // Aluminium look
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && 'metalness' in m && (m.name === 'aluminium' || m.name === 'blackmatte')) {
        if (m.name === 'aluminium') {
          m.color.set('#d4d7dc');
          m.metalness = 1;
          m.roughness = 0.3;
        }
      }
    });
    lid.rotation.x = MAC_LID_ANGLE;
  }, [root, lid]);

  const portalTarget = lid;
  const worldW = 30.4;
  useScreenOverlay(anchor, overlay, MAC_PX_W, MAC_PX_H, worldW, (worldW * MAC_PX_H) / MAC_PX_W);

  return (
    <group scale={0.13} rotation={[0, MAC_YAW, 0]}>
      <primitive object={root} />
      {portalTarget &&
        matte &&
        createPortal(
          <object3D ref={anchor} position={[0, -0.47, -11.52]} rotation={[-Math.PI / 2, 0, 0]} />,
          portalTarget,
        )}
    </group>
  );
};

const MAC_LID_ANGLE = Math.PI / 2 + 0.2;
const MAC_YAW = 0;

/** iPhone: UI projected onto the model's own Wallpaper (screen) mesh. */
const IPhone: React.FC<{ overlay: OverlayRef }> = ({ overlay }) => {
  const anchor = useRef<THREE.Object3D>(null);
  const { scene } = useGLTF(PHONE_URL, DRACO);
  const root = useMemo(() => scene.clone(true), [scene]);
  const wallpaper = useMemo(
    () => root.getObjectByName('Body_Wallpaper_0') as THREE.Mesh | undefined,
    [root],
  );

  useEffect(() => {
    if (wallpaper) {
      const mat = wallpaper.material as THREE.MeshBasicMaterial;
      mat.color?.set('#0a0a0a');
      if ('map' in mat) mat.map = null;
      mat.needsUpdate = true;
    }
  }, [wallpaper]);

  const worldW = 0.444;
  useScreenOverlay(anchor, overlay, PHONE_PX_W, PHONE_PX_H, worldW, (worldW * PHONE_PX_H) / PHONE_PX_W);

  return (
    <group>
      <primitive object={root} />
      {wallpaper &&
        createPortal(
          <object3D ref={anchor} position={[0, 0, -0.026]} rotation={[0, Math.PI, 0]} />,
          wallpaper,
        )}
    </group>
  );
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const SWAP_SECONDS = 0.7;

/** One device at a time. Swapping spins the current one away and the next one in. */
const Rig: React.FC<SceneProps> = ({ laptopOverlay, phoneOverlay, narrow, device }) => {
  const tilt = useRef<THREE.Group>(null);
  const swap = useRef<THREE.Group>(null);
  const [shown, setShown] = useState(device);
  const wanted = useRef(device);
  const anim = useRef<{ phase: 'idle' | 'out' | 'in'; t: number }>({ phase: 'idle', t: 1 });

  useEffect(() => {
    wanted.current = device;
    if (device !== shown && anim.current.phase !== 'out') anim.current = { phase: 'out', t: 0 };
  }, [device, shown]);

  useFrame(({ clock, pointer }, delta) => {
    const a = anim.current;
    if (a.phase !== 'idle') {
      a.t = Math.min(1, a.t + delta / (SWAP_SECONDS / 2));
      if (a.t >= 1) {
        if (a.phase === 'out') {
          setShown(wanted.current);
          anim.current = { phase: 'in', t: 0 };
        } else {
          anim.current = { phase: 'idle', t: 1 };
        }
      }
    }
    const cur = anim.current;
    const away = cur.phase === 'out' ? easeInOut(cur.t) : cur.phase === 'in' ? 1 - easeInOut(cur.t) : 0;
    const dir = cur.phase === 'in' ? -1 : 1;
    const s = swap.current;
    if (s) {
      s.rotation.y = dir * away * Math.PI * 2.2;
      s.rotation.z = dir * away * 0.6;
      s.position.y = away * 0.9;
      s.position.z = -away * 3.5;
      s.scale.setScalar(Math.max(0.001, 1 - 0.95 * away));
    }
    const g = tilt.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const targetY = Math.sin(t * 0.45) * 0.03 + pointer.x * 0.05;
    const targetX = pointer.y * -0.025;
    g.rotation.y += (targetY - g.rotation.y) * 0.05;
    g.rotation.x += (targetX - g.rotation.x) * 0.05;
  });

  const showLaptop = shown === 'laptop' && !narrow;
  return (
    <group ref={tilt}>
      <group ref={swap}>
        {showLaptop ? (
          <group position={[0, -1.0, 0.2]} scale={LAPTOP_ZOOM}>
            <MacBook overlay={laptopOverlay} />
          </group>
        ) : (
          <group
            position={narrow ? [0, -0.1, 0] : [0, 0.2, 0.2]}
            rotation={[0, Math.PI, 0]}
            scale={narrow ? 3.1 : 3.4}
          >
            <IPhone overlay={phoneOverlay} />
          </group>
        )}
      </group>
    </group>
  );
};

const LAPTOP_ZOOM = 1.15;

const LandingDevicesScene: React.FC<SceneProps> = (props) => (
  <Canvas
    dpr={[1, 2]}
    camera={{ position: [0, 0.2, 8.2], fov: 30 }}
    gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
    style={{ background: 'transparent', pointerEvents: 'none' }}
  >
    <ambientLight intensity={0.5} />
    <directionalLight position={[4, 6, 5]} intensity={2.2} />
    <Suspense fallback={null}>
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={4} position={[0, 5, 3]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={2.5} position={[-6, 1, 2]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={2.5} position={[6, 1, 2]} scale={[3, 6, 1]} />
        <Lightformer form="ring" intensity={2} position={[0, -2, 6]} scale={4} />
      </Environment>
      <Rig {...props} />
      <ContactShadows position={[0, -1.35, 0]} opacity={0.4} scale={14} blur={2.6} far={4} />
    </Suspense>
  </Canvas>
);

useGLTF.preload(MAC_URL, DRACO);
useGLTF.preload(PHONE_URL, DRACO);

export default LandingDevicesScene;
