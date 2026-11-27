import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Teclado ANSI procedural para o MacBook 3D. Coordenadas no espaço do modelo mac.glb:
 * a base de alumínio é plana em y = 0.018, o trackpad começa em z = 1.8 e a dobradiça fica em z = -11.6.
 * As teclas são uma única malha (geometrias mescladas) e as letras vêm de uma textura de canvas
 * posta logo acima das teclas.
 */

const DECK_Y = 0.018;
const KEY_H = 0.12;
const U = 1.84; // largura de 1u
const X_LEFT = -13.8;
const Z_START = -10.3;
const FN_D = 1.05;
const ROW_D = 1.7;
const ROW_PITCH = 1.88;
const GAP = 0.3;

interface KeyDef {
  x: number; // centro
  z: number; // centro
  w: number;
  d: number;
  label: string;
  small?: boolean;
}

type RowSpec = Array<[string, number]>;

const ROWS: RowSpec[] = [
  [['`', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['delete', 2]],
  [['tab', 1.5], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['[', 1], [']', 1], ['\\', 1.5]],
  [['caps', 1.75], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1], ['K', 1], ['L', 1], [';', 1], ["'", 1], ['return', 2.25]],
  [['shift', 2.25], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1], [',', 1], ['.', 1], ['/', 1], ['shift', 2.75]],
  [['ctrl', 1.25], ['opt', 1.25], ['cmd', 1.25], ['', 7.5], ['cmd', 1.25], ['opt', 1.25], ['ctrl', 1.25]],
];

const FN_ROW: RowSpec = [
  ['esc', 1.5],
  ...Array.from({ length: 12 }, (_, i): [string, number] => [`F${i + 1}`, 1]),
  ['', 1.5],
];

const buildLayout = (): KeyDef[] => {
  const keys: KeyDef[] = [];
  const place = (row: RowSpec, zCenter: number, d: number, small: boolean) => {
    let x = X_LEFT;
    for (const [label, units] of row) {
      const w = units * U;
      keys.push({ x: x + w / 2, z: zCenter, w, d, label, small });
      x += w;
    }
  };
  place(FN_ROW, Z_START + FN_D / 2, FN_D, true);
  let z = Z_START + FN_D + 0.28;
  for (const row of ROWS) {
    place(row, z + ROW_D / 2, ROW_D, false);
    z += ROW_PITCH;
  }
  return keys;
};

// Região coberta pela textura de letras (espaço do modelo).
const TEX_X0 = -14.2;
const TEX_X1 = 14.2;
const TEX_Z0 = -10.7;
const TEX_Z1 = 0.9;
const PX_PER_UNIT = 90;

const drawLabels = (keys: KeyDef[]): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((TEX_X1 - TEX_X0) * PX_PER_UNIT);
  canvas.height = Math.round((TEX_Z1 - TEX_Z0) * PX_PER_UNIT);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = "#a0a2aa";
  for (const k of keys) {
    if (!k.label) continue;
    const px = (k.x - TEX_X0) * PX_PER_UNIT;
    const pz = (k.z - TEX_Z0) * PX_PER_UNIT;
    const word = k.label.length > 1;
    const size = k.small ? 0.42 : word ? 0.4 : 0.7;
    ctx.font = `500 ${size * PX_PER_UNIT}px "Geist", system-ui, -apple-system, "Segoe UI", sans-serif`;
    if (word && !k.small) {
      // rótulos de função ficam no canto inferior esquerdo, como no teclado real
      ctx.textAlign = 'left';
      ctx.fillText(k.label, px - k.w * 0.5 * PX_PER_UNIT + 0.28 * PX_PER_UNIT, pz + k.d * 0.2 * PX_PER_UNIT);
      ctx.textAlign = 'center';
    } else {
      ctx.fillText(k.label, px, pz);
    }
  }
  return canvas;
};

export const LandingKeyboard3D: React.FC = () => {
  const gl = useThree((s) => s.gl);
  const keys = useMemo(buildLayout, []);

  const keyGeometry = useMemo(() => {
    const cache = new Map<string, THREE.BufferGeometry>();
    const parts: THREE.BufferGeometry[] = [];
    for (const k of keys) {
      const w = k.w - GAP;
      const d = k.d - GAP;
      const id = `${w.toFixed(3)}x${d.toFixed(3)}`;
      let base = cache.get(id);
      if (!base) {
        base = new RoundedBoxGeometry(w, KEY_H, d, 3, 0.055);
        cache.set(id, base);
      }
      const g = base.clone();
      g.translate(k.x, DECK_Y + KEY_H / 2 - 0.02, k.z);
      parts.push(g);
    }
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    cache.forEach((c) => c.dispose());
    return merged;
  }, [keys]);

  const labelTexture = useMemo(() => {
    const tex = new THREE.CanvasTexture(drawLabels(keys));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    return tex;
  }, [keys, gl]);

  useEffect(
    () => () => {
      keyGeometry.dispose();
      labelTexture.dispose();
    },
    [keyGeometry, labelTexture],
  );

  const wellW = TEX_X1 - TEX_X0 - 0.2;
  const wellD = TEX_Z1 - TEX_Z0 - 0.3;
  const topY = DECK_Y + KEY_H - 0.02;

  return (
    <group>
      {/* fundo escuro do teclado, sob as teclas */}
      <mesh position={[0, DECK_Y + 0.012, (TEX_Z0 + TEX_Z1) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[wellW, wellD]} />
        <meshStandardMaterial color="#141416" roughness={0.85} metalness={0} />
      </mesh>
      {/* teclas */}
      <mesh geometry={keyGeometry}>
        <meshStandardMaterial color="#222327" roughness={0.6} metalness={0.1} envMapIntensity={0.5} />
      </mesh>
      {/* letras */}
      <mesh position={[(TEX_X0 + TEX_X1) / 2, topY + 0.006, (TEX_Z0 + TEX_Z1) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TEX_X1 - TEX_X0, TEX_Z1 - TEX_Z0]} />
        <meshBasicMaterial
          map={labelTexture}
          transparent
          depthWrite={false}
          toneMapped={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </group>
  );
};

export default LandingKeyboard3D;
