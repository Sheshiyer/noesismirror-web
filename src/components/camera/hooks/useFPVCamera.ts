import { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Bone, Group, Vector3, Quaternion, Euler, MathUtils, Object3D } from 'three';
import { useGameStore } from '../../../core/store/gameStore';

interface UseFPVCameraOptions {
  characterRef: React.MutableRefObject<Group | null> | null;
  boneName: string;
  enabled: boolean;
}

const FPV_CAMERA_CONFIG = {
  rotateX: -90,
  rotateY: -90,
  rotateZ: 0,
  offsetX: 0,
  offsetY: 0.5,
  offsetZ: -0.2,
  headBodySmoothing: 0.97,
  mouseRotationSmoothing: 0.1,
  touchSensitivity: 0.005,
};

export function useFPVCamera({
  characterRef,
  boneName,
  enabled,
}: UseFPVCameraOptions) {
  const { camera } = useThree();
  const isMobile = useGameStore((state) => state.isMobile);

  const targetBone = useRef<Bone | undefined>(undefined);
  
  const pcTargetRotation = useRef({ x: 0, y: 0 });
  
  const mobileRotation = useRef({ x: 0, y: 0 });
  
  const currentRotation = useRef({ x: 0, y: 0 });
  
  const lastTouchRef = useRef<{ x: number, y: number } | null>(null);

  const { vec3, quat, quatOffset, quatBone, quatLookForward, modelCorrectionQuat, dummyEuler, mouseQuat, offsetVec } = useMemo(() => ({
    vec3: new Vector3(),
    quat: new Quaternion(),
    quatOffset: new Quaternion(),
    quatBone: new Quaternion(),
    quatLookForward: new Quaternion(),
    modelCorrectionQuat: new Quaternion().setFromEuler(new Euler(0, Math.PI, 0, 'YXZ')),
    dummyEuler: new Euler(),
    mouseQuat: new Quaternion(),
    offsetVec: new Vector3(), // Reuse for camera offset
  }), []);

  const config = FPV_CAMERA_CONFIG;

  useEffect(() => {
    if (!enabled || isMobile) return;

    const onMouseMove = (e: MouseEvent) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = (e.clientY / window.innerHeight) * 2 - 1;

      pcTargetRotation.current.x = MathUtils.degToRad(MathUtils.mapLinear(ndcX, -1, 1, 150, -150));
      pcTargetRotation.current.y = MathUtils.degToRad(MathUtils.mapLinear(ndcY, -1, 1, 90, -30));
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [enabled, isMobile]);

  useEffect(() => {
    if (!enabled || !isMobile) return;

    const isHudInteractiveTarget = (t: Touch) => {
      const target = document.elementFromPoint(t.clientX, t.clientY);
      return Boolean(target?.closest('[data-noesis-hud-control="true"]'));
    };

    const isValidTouchArea = (t: Touch) => {
      const isJoystickArea = (t.clientX < window.innerWidth * 0.4) && (t.clientY > window.innerHeight * 0.4);
      const isHudControlArea = isHudInteractiveTarget(t);
      return !isJoystickArea && !isHudControlArea;
    };

    const onTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (isValidTouchArea(t)) {
          lastTouchRef.current = { x: t.clientX, y: t.clientY };
          break;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();

      let activeTouch: Touch | null = null;
      
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (isValidTouchArea(t)) {
          activeTouch = t;
          break;
        }
      }

      if (activeTouch && lastTouchRef.current) {
        const deltaX = activeTouch.clientX - lastTouchRef.current.x;
        const deltaY = activeTouch.clientY - lastTouchRef.current.y;

        mobileRotation.current.x -= deltaX * config.touchSensitivity;
        mobileRotation.current.y -= deltaY * config.touchSensitivity;

        mobileRotation.current.y = MathUtils.clamp(mobileRotation.current.y, -Math.PI / 3, Math.PI / 3);

        lastTouchRef.current = { x: activeTouch.clientX, y: activeTouch.clientY };
      }
    };

    const onTouchEnd = () => {
      lastTouchRef.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, isMobile, config.touchSensitivity]);

  useFrame(() => {
    if (!enabled || !characterRef?.current) return;

    if (!targetBone.current || !isBoneAttached(targetBone.current, characterRef.current)) {
      targetBone.current = findBone(characterRef.current, boneName);
    }

    if (targetBone.current) {
      characterRef.current.updateMatrixWorld(true);

      targetBone.current.getWorldPosition(vec3);
      targetBone.current.getWorldQuaternion(quatBone);

      characterRef.current.getWorldQuaternion(quatLookForward);
      quatLookForward.multiply(modelCorrectionQuat);

      dummyEuler.set(
        MathUtils.degToRad(config.rotateX),
        MathUtils.degToRad(config.rotateY),
        MathUtils.degToRad(config.rotateZ),
        'YXZ'
      );
      quatOffset.setFromEuler(dummyEuler);
      quatBone.multiply(quatOffset);
      
      quat.copy(quatBone).slerp(quatLookForward, config.headBodySmoothing);

      if (isMobile) {
        currentRotation.current.x = mobileRotation.current.x;
        currentRotation.current.y = mobileRotation.current.y;
      } else {
        currentRotation.current.x = MathUtils.lerp(
          pcTargetRotation.current.x,
          currentRotation.current.x,
          config.mouseRotationSmoothing
        );
        currentRotation.current.y = MathUtils.lerp(
          pcTargetRotation.current.y,
          currentRotation.current.y,
          config.mouseRotationSmoothing
        );
      }

      dummyEuler.set(currentRotation.current.y, currentRotation.current.x, 0, 'YXZ');
      mouseQuat.setFromEuler(dummyEuler);
      quat.multiply(mouseQuat);

      // Reuse offsetVec instead of creating new Vector3
      offsetVec.set(config.offsetX, config.offsetY, config.offsetZ);
      offsetVec.applyQuaternion(quat);
      vec3.add(offsetVec);

      camera.position.copy(vec3);
      camera.quaternion.copy(quat);

      camera.updateMatrixWorld(true)
    }
  });
}

function isBoneAttached(bone: Object3D, characterRoot: Object3D): boolean {
  let ancestor: Object3D | null = bone.parent;
  while (ancestor) {
    if (ancestor === characterRoot) return true;
    ancestor = ancestor.parent;
  }
  return false;
}

function findBone(character: Group, name: string): Bone | undefined {
  const found = character.getObjectByName(name);
  if (found && found instanceof Bone) {
    return found;
  }
  return undefined;
}
