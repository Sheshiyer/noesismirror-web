import { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Bone, Group, Vector3, Quaternion, Euler, MathUtils, Object3D } from 'three';

interface UseFPVCameraOptions {
  characterRef: React.MutableRefObject<Group | null> | null;
  boneName: string;
  enabled: boolean;
}

const CONFIG = {
  rotateX: -90,
  rotateY: -90,
  rotateZ: 0,
  offsetX: 0,
  offsetY: 0.5,
  offsetZ: -0.2,
  headBodySmoothing: 0.97,
  mouseRotationSmoothing: 0.1,
};

export function useFPVCamera({
  characterRef,
  boneName,
  enabled,
}: UseFPVCameraOptions) {
  const { camera } = useThree();
  const targetBone = useRef<Bone | undefined>(undefined);
  const pcTargetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });

  const { vec3, quat, quatOffset, quatBone, quatLookForward, modelCorrectionQuat, dummyEuler, mouseQuat, offsetVec } = useMemo(() => ({
    vec3: new Vector3(),
    quat: new Quaternion(),
    quatOffset: new Quaternion(),
    quatBone: new Quaternion(),
    quatLookForward: new Quaternion(),
    modelCorrectionQuat: new Quaternion().setFromEuler(new Euler(0, Math.PI, 0, 'YXZ')),
    dummyEuler: new Euler(),
    mouseQuat: new Quaternion(),
    offsetVec: new Vector3(),
  }), []);

  useEffect(() => {
    if (!enabled) return;

    const onMouseMove = (e: MouseEvent) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = (e.clientY / window.innerHeight) * 2 - 1;

      pcTargetRotation.current.x = MathUtils.degToRad(MathUtils.mapLinear(ndcX, -1, 1, 150, -150));
      pcTargetRotation.current.y = MathUtils.degToRad(MathUtils.mapLinear(ndcY, -1, 1, 90, -30));
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [enabled]);

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
        MathUtils.degToRad(CONFIG.rotateX),
        MathUtils.degToRad(CONFIG.rotateY),
        MathUtils.degToRad(CONFIG.rotateZ),
        'YXZ'
      );
      quatOffset.setFromEuler(dummyEuler);
      quatBone.multiply(quatOffset);

      quat.copy(quatBone).slerp(quatLookForward, CONFIG.headBodySmoothing);

      currentRotation.current.x = MathUtils.lerp(
        pcTargetRotation.current.x,
        currentRotation.current.x,
        CONFIG.mouseRotationSmoothing
      );
      currentRotation.current.y = MathUtils.lerp(
        pcTargetRotation.current.y,
        currentRotation.current.y,
        CONFIG.mouseRotationSmoothing
      );

      dummyEuler.set(currentRotation.current.y, currentRotation.current.x, 0, 'YXZ');
      mouseQuat.setFromEuler(dummyEuler);
      quat.multiply(mouseQuat);

      offsetVec.set(CONFIG.offsetX, CONFIG.offsetY, CONFIG.offsetZ);
      offsetVec.applyQuaternion(quat);
      vec3.add(offsetVec);

      camera.position.copy(vec3);
      camera.quaternion.copy(quat);

      camera.updateMatrixWorld(true);
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
