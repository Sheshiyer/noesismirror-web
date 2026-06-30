import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

interface HDREnvironmentProps {
  files: string;
  intensity?: number;
}

// Replaces drei's <Environment files={...}> for the WebGPU pipeline.
// drei's component runs an HDR→cube bake inside useLayoutEffect via a CubeCamera,
// which calls renderer.render(...) synchronously before the async WebGPU init
// promise has resolved. That throws `Wb.render is not a function` in production.
// This component waits for the renderer to be ready, then bakes via PMREMGenerator.
export function HDREnvironment({ files, intensity = 1 }: HDREnvironmentProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const renderer = gl as unknown as THREE.WebGPURenderer;
    if (!renderer) return;

    let cancelled = false;
    let envTexture: THREE.Texture | null = null;
    let cubeTarget: THREE.RenderTarget | null = null;

    (async () => {
      if (typeof renderer.init === 'function') {
        await renderer.init();
      }
      if (cancelled) return;

      const equirect = await new RGBELoader().loadAsync(files);
      if (cancelled) {
        equirect.dispose();
        return;
      }
      equirect.mapping = THREE.EquirectangularReflectionMapping;

      const pmrem = new THREE.PMREMGenerator(renderer);
      const target = pmrem.fromEquirectangular(equirect);
      cubeTarget = target;
      envTexture = target.texture;

      equirect.dispose();
      pmrem.dispose();

      if (cancelled) {
        target.dispose();
        envTexture = null;
        cubeTarget = null;
        return;
      }

      scene.environment = envTexture;
      scene.environmentIntensity = intensity;
    })().catch((err) => {
      console.error('[HDREnvironment] failed to load HDR:', err);
    });

    return () => {
      cancelled = true;
      if (scene.environment === envTexture) {
        scene.environment = null;
      }
      cubeTarget?.dispose();
      envTexture = null;
      cubeTarget = null;
    };
  }, [gl, scene, files, intensity]);

  return null;
}
