/* eslint-disable */
// @ts-nocheck
import * as THREE from "three/webgpu";
import {
  Fn,
  vec3,
  vec2,
  instancedArray,
  instanceIndex,
  cameraProjectionMatrix,
  cameraViewMatrix,
  cameraPosition,
  modelWorldMatrix,
  vec4,
  uv,
  float,
  normalize,
  select,
  floor,
  cross,
  pow,
  mix,
  dot,
  length,
  oneMinus,
  smoothstep,
  step,
  sqrt,
  max,
  varying,
  abs,
  clamp,
  transformNormalToView,
  faceDirection,
  pmremTexture,
  uniform,
  remapClamp,
  materialRoughness,
  mx_rgbtohsv,
  mx_hsvtorgb,
  fract,
} from "three/tsl";

import {
  getBezierControlPoints,
  getWindDirection,
  applyWindPush,
  applyVertexSway,
  applySlopeAlignment,
  applyViewDependentTilt,
} from "./shaderHelpers";
import { uTime, uWindDir, uGlobalHueShift } from "../../../core/shaders/uniforms";

const bezier3 = (p0: any, p1: any, p2: any, p3: any, t: any) => {
  const oneMinusT = oneMinus(t);
  const a = oneMinusT.pow(3);
  const b = float(3).mul(oneMinusT.pow(2)).mul(t);
  const c = float(3).mul(oneMinusT).mul(t.pow(2));
  const d = t.pow(3);
  return p0.mul(a).add(p1.mul(b)).add(p2.mul(c)).add(p3.mul(d));
};

const bezier3Tangent = (p0: any, p1: any, p2: any, p3: any, t: any) => {
  const oneMinusT = oneMinus(t);
  const a = oneMinusT.pow(2).mul(3);
  const b = oneMinusT.mul(t).mul(6);
  const c = t.pow(2).mul(3);
  return p1.sub(p0).mul(a).add(p2.sub(p1).mul(b)).add(p3.sub(p2).mul(c));
};

const shiftHSV = (color: any, shift: any) => {
  const hsv = mx_rgbtohsv(color);
  const shifted = vec3(
    fract(hsv.x.add(shift.x)),
    clamp(hsv.y.add(shift.y), float(0.0), float(1.0)),
    clamp(hsv.z.add(shift.z), float(0.0), float(1.0))
  );
  return mx_hsvtorgb(shifted);
};

export function createGrassMaterial(
  grassData: ReturnType<typeof instancedArray>,
  visibleIndicesBuffer: ReturnType<typeof instancedArray>,
  uniforms: Record<string, any>,
  lodDebugColor?: THREE.Color,
) {
  const vGeoNormal = varying(vec3(0.0));
  const vHeight = varying(float(0.0));
  const vDistFade = varying(float(0.0));
  const vWorldPos = varying(vec3(0.0));
  const vSide = varying(vec3(0.0));
  const vClumpSeed = varying(float(0.0));
  const vBladeSeed = varying(float(0.0));

  const near = 15;
  const far = 30;

  const material = new THREE.MeshStandardNodeMaterial();
  material.side = THREE.DoubleSide;

  const uLodDebugColor = uniform(
    lodDebugColor
      ? vec3(lodDebugColor.r, lodDebugColor.g, lodDebugColor.b)
      : vec3(1.0, 1.0, 1.0)
  );

  const uGroupOffset = uniforms.uGroupOffset ?? uniform(new THREE.Vector3(0, 0, 0));

  const trueIndex = visibleIndicesBuffer.element(instanceIndex);
  const data = grassData.element(trueIndex);

  const grassVertex = Fn(() => {
    const d0 = data.get("data0").toConst();
    const d1 = data.get("data1").toConst();
    const d2 = data.get("data2").toConst();
    const d3 = data.get("data3").toConst();

    const instancePos = d0.xyz;
    const bladeType = floor(d0.w.mul(3.0));
    const width = d1.x;
    const height = d1.y;
    const bend = d1.z;
    const windStrength01 = d1.w;
    const rotSin = d2.x;
    const rotCos = d2.y;
    const clumpSeed01 = d2.z;
    const perBladeHash01 = d2.w;
    const tnX = d3.x;
    const tnZ = d3.y;
    const pushVector = d3.zw;
    const tnY = sqrt(max(float(0.0), float(1.0).sub(tnX.mul(tnX)).sub(tnZ.mul(tnZ))));
    const tn = vec3(tnX, tnY, tnZ);

    const rotateFast = (v: any) =>
      vec2(v.x.mul(rotCos).sub(v.y.mul(rotSin)), v.x.mul(rotSin).add(v.y.mul(rotCos)));

    const worldBasePos = instancePos;
    const worldXZ = vec2(worldBasePos.x, worldBasePos.z);

    const dist = length(cameraPosition.sub(worldBasePos));

    const windDistanceFalloff = select(
      uniforms.uWindDistanceEnd.greaterThan(float(0.0)),
      oneMinus(
        smoothstep(uniforms.uWindDistanceStart, uniforms.uWindDistanceEnd, dist)
      ),
      float(1.0)
    );
    const windStrength = windStrength01.mul(windDistanceFalloff);

    const uvCoords = uv();
    const t = uvCoords.y;
    const s = uvCoords.x.sub(0.5).mul(2.0);

    const p0 = vec3(0.0, 0.0, 0.0);
    let p3 = vec3(0.0, height, 0.0);
    let { p1, p2 } = getBezierControlPoints(bladeType, height, bend);

    const getWindDir = getWindDirection(uWindDir);
    const windPushed = applyWindPush(getWindDir)(p1, p2, p3, windStrength, height);
    p1 = windPushed.p1;
    p2 = windPushed.p2;
    p3 = windPushed.p3;

    const spine = bezier3(p0, p1, p2, p3, t);
    const tangent = normalize(bezier3Tangent(p0, p1, p2, p3, t));

    const ref = vec3(0.0, 0.0, 1.0);
    const side = normalize(cross(ref, tangent));

    const vertexSway = applyVertexSway(
      getWindDir,
      uTime,
      uniforms.uWindSwayFreqMin,
      uniforms.uWindSwayFreqMax,
      uniforms.uWindSwayStrength
    );
    const swayOffset = vertexSway(side, t, height, windStrength, perBladeHash01, worldXZ);
    const spineWithSway = spine.add(swayOffset);
    const normal = normalize(cross(side, tangent));

    const widthFactor = t.add(uniforms.uBaseWidth).mul(pow(float(1.0).sub(t), uniforms.uTipThin));

    const lposBase = spineWithSway.add(side.mul(width).mul(widthFactor).mul(s));
    const lposXZ = rotateFast(vec2(lposBase.x, lposBase.z));
    let lpos = vec3(lposXZ.x, lposBase.y, lposXZ.y);

    const pushLen = length(pushVector);
    lpos = vec3(
      lpos.x.add(pushVector.x.mul(pow(t, float(2.0)))),
      lpos.y.mul(oneMinus(pushLen.mul(uniforms.uCharacterFlattenAmount).mul(t))),
      lpos.z.add(pushVector.y.mul(pow(t, float(2.0))))
    );

    const normalXZ = rotateFast(vec2(normal.x, normal.z));
    let normalRotated = vec3(normalXZ.x, normal.y, normalXZ.y);

    const sideXZ = rotateFast(vec2(side.x, side.z));
    let sideRotated = normalize(vec3(sideXZ.x, side.y, sideXZ.y));

    const tangentXZ = rotateFast(vec2(tangent.x, tangent.z));
    let tangentRotated = normalize(vec3(tangentXZ.x, tangent.y, tangentXZ.y));

    applySlopeAlignment(tn, lpos, tangentRotated, sideRotated, normalRotated);

    const worldPos = vec3(
      instancePos.x.add(lpos.x),
      instancePos.y.add(lpos.y),
      instancePos.z.add(lpos.z)
    );

    const positionFinal = applyViewDependentTilt(
      lpos,
      worldPos,
      sideRotated,
      normalRotated,
      uvCoords,
      t,
      uniforms.uThicknessStrength,
      modelWorldMatrix,
      cameraPosition
    );

    const tiltDelta = positionFinal.sub(lpos);
    const tiltDeltaWorld = modelWorldMatrix.mul(vec4(tiltDelta.x, tiltDelta.y, tiltDelta.z, float(0.0))).xyz;
    const worldPosFinal = worldPos.add(tiltDeltaWorld);
    const worldPosFinal4 = vec4(worldPosFinal.x, worldPosFinal.y, worldPosFinal.z, float(1.0));

    vGeoNormal.assign(normalRotated);
    vHeight.assign(t);
    vDistFade.assign(smoothstep(float(near), float(far), dist));
    vWorldPos.assign(worldPosFinal);
    vSide.assign(sideRotated);
    vClumpSeed.assign(clumpSeed01);
    vBladeSeed.assign(perBladeHash01);
    return worldPosFinal4;
  });

  material.positionNode = Fn(() => {
    const worldPos = grassVertex();
    return worldPos.sub(uGroupOffset);
  })();

  material.normalNode = Fn(() => {
    const uvCoords = uv();
    const u = uvCoords.x.sub(0.5);
    const au = abs(u);

    const mid01 = smoothstep(uniforms.uMidSoft.negate(), uniforms.uMidSoft, u);
    const rimMask = smoothstep(
      uniforms.uRimPos,
      uniforms.uRimPos.add(uniforms.uRimSoft),
      au
    );
    const v01 = mix(mid01, oneMinus(mid01), rimMask);
    const ny = v01.mul(2.0).sub(1.0);

    const widthNormalStrength = float(0.35);
    const sideNorm = normalize(vSide);
    const baseNormal = normalize(vGeoNormal);
    const geoNormal = normalize(
      baseNormal.add(sideNorm.mul(ny).mul(widthNormalStrength))
    );

    return transformNormalToView(geoNormal).mul(faceDirection);
  })();

  const calculateAO = () => {
    return mix(
      float(0.35),
      float(1.0),
      clamp(pow(vHeight, uniforms.uAOPower), float(0.0), float(1.0))
    );
  };

  material.colorNode = Fn(() => {
    const color = mix(uniforms.uBaseColor, uniforms.uTipColor, vHeight);

    const clumpSeedFactor = mix(uniforms.uClumpSeedRange.x, uniforms.uClumpSeedRange.y, vClumpSeed);
    const bladeSeedFactor = mix(uniforms.uBladeSeedRange.x, uniforms.uBladeSeedRange.y, vBladeSeed);
    let finalColor = color.mul(clumpSeedFactor).mul(bladeSeedFactor);

    finalColor = finalColor.mul(calculateAO());

    const grayValue = dot(finalColor, vec3(float(0.333)));
    const distFadeFactor = vDistFade.mul(float(0.35));
    finalColor = finalColor
      .mul(oneMinus(distFadeFactor))
      .add(vec3(grayValue).mul(distFadeFactor));

    const hueShifted = shiftHSV(finalColor, vec3(uGlobalHueShift, float(0.0), float(0.0)));
    return vec4(hueShifted, float(1.0));
  })();

  material.roughnessNode = Fn(() => {
    const ao = calculateAO();
    const baseRoughness = materialRoughness;
    const roughnessMin = baseRoughness.mul(float(0.5));
    const roughnessMax = baseRoughness.mul(float(1));
    const roughness = mix(roughnessMax, roughnessMin, remapClamp(ao, float(0.35), float(1.0), float(0.0), float(1.0)));
    return clamp(roughness, float(0.0), float(1.0));
  })();

  material.envNode = Fn(() => {
    const envMap = material.envMap;
    if (envMap) {
      const ao = calculateAO();
      const envSample = pmremTexture(envMap).mul(ao);
      return envSample;
    }
    return vec3(0.0, 0.0, 0.0);
  })();

  return {
    material,
  };
}
