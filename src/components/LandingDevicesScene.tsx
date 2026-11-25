import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, createPortal, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Lightformer, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export const MAC_PX_W = 1000;
export const MAC_PX_H = 645;
export const PHONE_PX_W = 340;
export const PHONE_PX_H = 736;

const DRACO = `${import.meta.env.BASE_URL}draco/`;
const MAC_URL = `${import.meta.env.BASE_URL}models/mac.glb`;
const PHONE_URL = `${import.meta.env.BASE_URL}models/iphone/scene.gltf`;

interface SceneProps {
  laptopScreen: React.ReactNode;
  phoneScreen: React.ReactNode;
  narrow: boolean;
}

/** MacBook: lid hinged on the model's own `screen` node, UI projected on its panel. */
const MacBook: React.FC<{ screen: React.ReactNode }> = ({ screen }) => {
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

  return (
    <group scale={0.13} rotation={[0, MAC_YAW, 0]}>
      <primitive object={root} />
      {portalTarget &&
        matte &&
        createPortal(
          <Html
            transform
            scale={(30.4 * 40) / MAC_PX_W}
            position={[0, -0.47, -11.52]}
            rotation={[-Math.PI / 2, 0, 0]}
            style={{ width: MAC_PX_W, height: MAC_PX_H }}
            zIndexRange={[10, 0]}
          >
            <div className="lc3d-screen" style={{ width: MAC_PX_W, height: MAC_PX_H }}>
              {screen}
            </div>
          </Html>,
          portalTarget,
        )}
    </group>
  );
};

const MAC_LID_ANGLE = Math.PI / 2 + 0.2;
const MAC_YAW = 0;

/** iPhone: UI projected onto the model's own Wallpaper (screen) mesh. */
const IPhone: React.FC<{ screen: React.ReactNode }> = ({ screen }) => {
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

  return (
    <group>
      <primitive object={root} />
      {wallpaper &&
        createPortal(
          <Html
            transform
            scale={(0.444 * 40) / PHONE_PX_W}
            position={[0, 0, -0.026]}
            rotation={[0, Math.PI, 0]}
            style={{ width: PHONE_PX_W, height: PHONE_PX_H }}
            zIndexRange={[10, 0]}
          >
            <div className="lc3d-screen" style={{ width: PHONE_PX_W, height: PHONE_PX_H }}>
              {screen}
            </div>
          </Html>,
          wallpaper,
        )}
    </group>
  );
};

const Rig: React.FC<SceneProps> = ({ laptopScreen, phoneScreen, narrow }) => {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock, pointer }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const targetY = Math.sin(t * 0.45) * 0.07 + pointer.x * 0.08;
    const targetX = pointer.y * -0.04;
    g.rotation.y += (targetY - g.rotation.y) * 0.05;
    g.rotation.x += (targetX - g.rotation.x) * 0.05;
  });

  return (
    <group ref={group}>
      {!narrow && (
        <group position={[-1.35, -1.45, 0]} rotation={[0, 0.3, 0]}>
          <MacBook screen={laptopScreen} />
        </group>
      )}
      <group
        position={narrow ? [0, -0.1, 0] : [2.7, -0.3, 1.3]}
        rotation={[0, Math.PI + (narrow ? 0 : 0.35), 0]}
        scale={narrow ? 3.1 : 2.7}
      >
        <IPhone screen={phoneScreen} />
      </group>
    </group>
  );
};

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
