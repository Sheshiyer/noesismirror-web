import { useMemo, useEffect } from "react";
import { uniform, vec2, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";

const ROSE_CONFIG = {
  green: "#325825",
  green2: "#699555",
  scaleMin: 8,
  scaleMax: 20,
  normalScale: 5,
  hueShift: 0.5,
  hueRandomness: 0.1,
  noiseScale: { x: 1, y: 100 },
  emissiveColor: "#ffffff",
  emissiveIntensity: 0.4,
  fresnelPower: 4.2,
  fresnelIntensity: 0.2,
  metalness: 0,
  roughness: 0.7,
  delayMin: 0,
  delayMax: 0,
  growMin: 2,
  growMax: 5,
  keepMin: 2,
  keepMax: 5,
  dieMin: 2,
  dieMax: 5,
};

export function useRoseUniforms() {
  const config = ROSE_CONFIG;

  const uniforms = useMemo(
    () => ({
      mat: {
        uGreen: uniform(vec3(0)),
        uGreen2: uniform(vec3(0)),
        uScaleMin: uniform(0),
        uScaleMax: uniform(0),
        uNormalScale: uniform(0),
        uHueShift: uniform(0),
        uHueRandomness: uniform(0),
        uNoiseScale: uniform(vec2(0)),
        uEmissiveColor: uniform(vec3(0)),
        uEmissiveIntensity: uniform(0),
        uFresnelPower: uniform(0),
        uFresnelIntensity: uniform(0),
        uCharacterWorldPos: uniform(new THREE.Vector3()),
      },
      compute: {
        uDelayMin: uniform(0),
        uDelayMax: uniform(0),
        uGrowMin: uniform(0),
        uGrowMax: uniform(0),
        uKeepMin: uniform(0),
        uKeepMax: uniform(0),
        uDieMin: uniform(0),
        uDieMax: uniform(0),
        uViewProjectionMatrix: uniform(new THREE.Matrix4()),
        uCameraPosition: uniform(new THREE.Vector3()),
        uCharacterWorldPos: uniform(new THREE.Vector3()),
      },
    }),
    []
  );

  useEffect(() => {
    const c1 = new THREE.Color(config.green);
    const c2 = new THREE.Color(config.green2);
    const ce = new THREE.Color(config.emissiveColor);

    uniforms.mat.uGreen.value.set(c1.r, c1.g, c1.b);
    uniforms.mat.uGreen2.value.set(c2.r, c2.g, c2.b);
    uniforms.mat.uScaleMin.value = config.scaleMin;
    uniforms.mat.uScaleMax.value = config.scaleMax;
    uniforms.mat.uNormalScale.value = config.normalScale;
    uniforms.mat.uHueShift.value = config.hueShift;
    uniforms.mat.uHueRandomness.value = config.hueRandomness;
    uniforms.mat.uNoiseScale.value.set(config.noiseScale.x, config.noiseScale.y);
    uniforms.mat.uEmissiveColor.value.set(ce.r, ce.g, ce.b);
    uniforms.mat.uEmissiveIntensity.value = config.emissiveIntensity;
    uniforms.mat.uFresnelPower.value = config.fresnelPower;
    uniforms.mat.uFresnelIntensity.value = config.fresnelIntensity;

    uniforms.compute.uDelayMin.value = config.delayMin;
    uniforms.compute.uDelayMax.value = config.delayMax;
    uniforms.compute.uGrowMin.value = config.growMin;
    uniforms.compute.uGrowMax.value = config.growMax;
    uniforms.compute.uKeepMin.value = config.keepMin;
    uniforms.compute.uKeepMax.value = config.keepMax;
    uniforms.compute.uDieMin.value = config.dieMin;
    uniforms.compute.uDieMax.value = config.dieMax;
  }, [config, uniforms]);

  return { uniforms, config };
}
