import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

type ExerciseType = "squat" | "pushup" | "lunge" | "plank" | "jumping_jack" | "situp";

interface JointPositions {
  head: [number, number, number];
  torso: [number, number, number];
  hip: [number, number, number];
  leftShoulder: [number, number, number];
  rightShoulder: [number, number, number];
  leftElbow: [number, number, number];
  rightElbow: [number, number, number];
  leftHand: [number, number, number];
  rightHand: [number, number, number];
  leftKnee: [number, number, number];
  rightKnee: [number, number, number];
  leftFoot: [number, number, number];
  rightFoot: [number, number, number];
}

const lerp3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const exerciseKeyframes: Record<ExerciseType, JointPositions[]> = {
  squat: [
    { head: [0, 2.1, 0], torso: [0, 1.5, 0], hip: [0, 1.0, 0], leftShoulder: [-0.35, 1.7, 0], rightShoulder: [0.35, 1.7, 0], leftElbow: [-0.5, 1.5, 0.2], rightElbow: [0.5, 1.5, 0.2], leftHand: [-0.5, 1.3, 0.4], rightHand: [0.5, 1.3, 0.4], leftKnee: [-0.2, 0.55, 0], rightKnee: [0.2, 0.55, 0], leftFoot: [-0.2, 0, 0], rightFoot: [0.2, 0, 0] },
    { head: [0, 1.5, 0.1], torso: [0, 1.1, 0.15], hip: [0, 0.6, -0.2], leftShoulder: [-0.35, 1.3, 0.15], rightShoulder: [0.35, 1.3, 0.15], leftElbow: [-0.5, 1.1, 0.35], rightElbow: [0.5, 1.1, 0.35], leftHand: [-0.5, 0.9, 0.5], rightHand: [0.5, 0.9, 0.5], leftKnee: [-0.3, 0.35, 0.35], rightKnee: [0.3, 0.35, 0.35], leftFoot: [-0.25, 0, 0.1], rightFoot: [0.25, 0, 0.1] },
  ],
  pushup: [
    { head: [0, 0.6, -0.8], torso: [0, 0.5, -0.2], hip: [0, 0.45, 0.5], leftShoulder: [-0.3, 0.5, -0.4], rightShoulder: [0.3, 0.5, -0.4], leftElbow: [-0.35, 0.5, -0.6], rightElbow: [0.35, 0.5, -0.6], leftHand: [-0.35, 0, -0.8], rightHand: [0.35, 0, -0.8], leftKnee: [-0.2, 0.15, 0.3], rightKnee: [0.2, 0.15, 0.3], leftFoot: [-0.2, 0.05, 0.9], rightFoot: [0.2, 0.05, 0.9] },
    { head: [0, 0.25, -0.8], torso: [0, 0.2, -0.2], hip: [0, 0.2, 0.5], leftShoulder: [-0.3, 0.2, -0.4], rightShoulder: [0.3, 0.2, -0.4], leftElbow: [-0.5, 0.15, -0.6], rightElbow: [0.5, 0.15, -0.6], leftHand: [-0.35, 0, -0.8], rightHand: [0.35, 0, -0.8], leftKnee: [-0.2, 0.08, 0.3], rightKnee: [0.2, 0.08, 0.3], leftFoot: [-0.2, 0.05, 0.9], rightFoot: [0.2, 0.05, 0.9] },
  ],
  lunge: [
    { head: [0, 2.1, 0], torso: [0, 1.5, 0], hip: [0, 1.0, 0], leftShoulder: [-0.35, 1.7, 0], rightShoulder: [0.35, 1.7, 0], leftElbow: [-0.35, 1.5, 0], rightElbow: [0.35, 1.5, 0], leftHand: [-0.2, 1.0, 0], rightHand: [0.2, 1.0, 0], leftKnee: [-0.2, 0.55, 0], rightKnee: [0.2, 0.55, 0], leftFoot: [-0.2, 0, 0], rightFoot: [0.2, 0, 0] },
    { head: [0, 1.7, 0], torso: [0, 1.2, 0], hip: [0, 0.8, 0], leftShoulder: [-0.35, 1.4, 0], rightShoulder: [0.35, 1.4, 0], leftElbow: [-0.35, 1.2, 0], rightElbow: [0.35, 1.2, 0], leftHand: [-0.2, 0.8, 0], rightHand: [0.2, 0.8, 0], leftKnee: [-0.3, 0.45, 0.4], rightKnee: [0.2, 0.15, -0.4], leftFoot: [-0.3, 0, 0.5], rightFoot: [0.2, 0, -0.5] },
  ],
  plank: [
    { head: [0, 0.5, -0.8], torso: [0, 0.45, -0.2], hip: [0, 0.4, 0.5], leftShoulder: [-0.3, 0.45, -0.4], rightShoulder: [0.3, 0.45, -0.4], leftElbow: [-0.3, 0, -0.6], rightElbow: [0.3, 0, -0.6], leftHand: [-0.3, 0, -0.8], rightHand: [0.3, 0, -0.8], leftKnee: [-0.2, 0.15, 0.3], rightKnee: [0.2, 0.15, 0.3], leftFoot: [-0.2, 0.05, 0.9], rightFoot: [0.2, 0.05, 0.9] },
    { head: [0, 0.48, -0.8], torso: [0, 0.43, -0.2], hip: [0, 0.38, 0.5], leftShoulder: [-0.3, 0.43, -0.4], rightShoulder: [0.3, 0.43, -0.4], leftElbow: [-0.3, 0, -0.6], rightElbow: [0.3, 0, -0.6], leftHand: [-0.3, 0, -0.8], rightHand: [0.3, 0, -0.8], leftKnee: [-0.2, 0.12, 0.3], rightKnee: [0.2, 0.12, 0.3], leftFoot: [-0.2, 0.05, 0.9], rightFoot: [0.2, 0.05, 0.9] },
  ],
  jumping_jack: [
    { head: [0, 2.1, 0], torso: [0, 1.5, 0], hip: [0, 1.0, 0], leftShoulder: [-0.35, 1.7, 0], rightShoulder: [0.35, 1.7, 0], leftElbow: [-0.35, 1.5, 0], rightElbow: [0.35, 1.5, 0], leftHand: [-0.3, 1.0, 0], rightHand: [0.3, 1.0, 0], leftKnee: [-0.2, 0.55, 0], rightKnee: [0.2, 0.55, 0], leftFoot: [-0.2, 0, 0], rightFoot: [0.2, 0, 0] },
    { head: [0, 2.1, 0], torso: [0, 1.5, 0], hip: [0, 1.0, 0], leftShoulder: [-0.4, 1.7, 0], rightShoulder: [0.4, 1.7, 0], leftElbow: [-0.7, 2.1, 0], rightElbow: [0.7, 2.1, 0], leftHand: [-0.6, 2.5, 0], rightHand: [0.6, 2.5, 0], leftKnee: [-0.4, 0.55, 0], rightKnee: [0.4, 0.55, 0], leftFoot: [-0.45, 0, 0], rightFoot: [0.45, 0, 0] },
  ],
  situp: [
    { head: [0, 0.15, -0.8], torso: [0, 0.1, -0.2], hip: [0, 0.05, 0.3], leftShoulder: [-0.3, 0.12, -0.4], rightShoulder: [0.3, 0.12, -0.4], leftElbow: [-0.2, 0.2, -0.6], rightElbow: [0.2, 0.2, -0.6], leftHand: [-0.1, 0.15, -0.7], rightHand: [0.1, 0.15, -0.7], leftKnee: [-0.2, 0.4, 0.2], rightKnee: [0.2, 0.4, 0.2], leftFoot: [-0.2, 0, 0.5], rightFoot: [0.2, 0, 0.5] },
    { head: [0, 0.7, -0.2], torso: [0, 0.45, 0.05], hip: [0, 0.05, 0.3], leftShoulder: [-0.3, 0.55, -0.1], rightShoulder: [0.3, 0.55, -0.1], leftElbow: [-0.2, 0.65, -0.15], rightElbow: [0.2, 0.65, -0.15], leftHand: [-0.1, 0.7, -0.1], rightHand: [0.1, 0.7, -0.1], leftKnee: [-0.2, 0.4, 0.2], rightKnee: [0.2, 0.4, 0.2], leftFoot: [-0.2, 0, 0.5], rightFoot: [0.2, 0, 0.5] },
  ],
};

const Limb = ({ start, end, color, thickness = 0.04 }: { start: THREE.Vector3; end: THREE.Vector3; color: string; thickness?: number }) => {
  const midpoint = useMemo(() => new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5), [start, end]);
  const direction = useMemo(() => new THREE.Vector3().subVectors(end, start), [start, end]);
  const length = useMemo(() => direction.length(), [direction]);
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    return q;
  }, [direction]);

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <capsuleGeometry args={[thickness, length - thickness * 2, 8, 16]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
    </mesh>
  );
};

const Joint = ({ position, size = 0.06, color }: { position: THREE.Vector3; size?: number; color: string }) => (
  <mesh position={position}>
    <sphereGeometry args={[size, 16, 16]} />
    <meshStandardMaterial color={color} roughness={0.2} metalness={0.7} />
  </mesh>
);

const StickFigure = ({ exercise, accentColor }: { exercise: ExerciseType; accentColor: string }) => {
  const timeRef = useRef(0);
  const posRef = useRef<JointPositions>(exerciseKeyframes[exercise][0]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const frames = exerciseKeyframes[exercise];
    const speed = exercise === "plank" ? 0.3 : exercise === "jumping_jack" ? 2.5 : 1.2;
    const t = (Math.sin(timeRef.current * speed) + 1) / 2;
    const keys = Object.keys(frames[0]) as (keyof JointPositions)[];
    const interpolated = {} as JointPositions;
    keys.forEach((k) => { interpolated[k] = lerp3(frames[0][k], frames[1][k], t); });
    posRef.current = interpolated;
  });

  const p = posRef.current;
  const toVec = (arr: [number, number, number]) => new THREE.Vector3(...arr);

  const joints: { pos: [number, number, number]; size?: number; color: string }[] = [
    { pos: p.head, size: 0.12, color: accentColor },
    { pos: p.leftShoulder, color: "#888" }, { pos: p.rightShoulder, color: "#888" },
    { pos: p.leftElbow, color: "#888" }, { pos: p.rightElbow, color: "#888" },
    { pos: p.leftHand, size: 0.05, color: accentColor }, { pos: p.rightHand, size: 0.05, color: accentColor },
    { pos: p.hip, size: 0.08, color: "#888" },
    { pos: p.leftKnee, color: "#888" }, { pos: p.rightKnee, color: "#888" },
    { pos: p.leftFoot, size: 0.05, color: accentColor }, { pos: p.rightFoot, size: 0.05, color: accentColor },
  ];

  const limbs: { start: [number, number, number]; end: [number, number, number]; color: string }[] = [
    { start: p.head, end: p.torso, color: "#aaa" },
    { start: p.torso, end: p.leftShoulder, color: "#aaa" }, { start: p.torso, end: p.rightShoulder, color: "#aaa" },
    { start: p.leftShoulder, end: p.leftElbow, color: accentColor }, { start: p.rightShoulder, end: p.rightElbow, color: accentColor },
    { start: p.leftElbow, end: p.leftHand, color: accentColor }, { start: p.rightElbow, end: p.rightHand, color: accentColor },
    { start: p.torso, end: p.hip, color: "#aaa" },
    { start: p.hip, end: p.leftKnee, color: "#66ccff" }, { start: p.hip, end: p.rightKnee, color: "#66ccff" },
    { start: p.leftKnee, end: p.leftFoot, color: "#66ccff" }, { start: p.rightKnee, end: p.rightFoot, color: "#66ccff" },
  ];

  return (
    <group>
      {joints.map((j, i) => <Joint key={i} position={toVec(j.pos)} size={j.size} color={j.color} />)}
      {limbs.map((l, i) => <Limb key={i} start={toVec(l.start)} end={toVec(l.end)} color={l.color} />)}
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#111" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

interface ExerciseModelProps {
  exercise: ExerciseType;
  accentColor?: string;
  height?: string;
}

const ExerciseModel = ({ exercise, accentColor = "#39ff14", height = "200px" }: ExerciseModelProps) => {
  return (
    <div style={{ height, width: "100%" }} className="rounded-xl overflow-hidden">
      <Canvas camera={{ position: [0, 1.2, 3.5], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 4, 3]} intensity={1} color="#39ff14" />
        <pointLight position={[-3, 2, -2]} intensity={0.5} color="#a855f7" />
        <StickFigure exercise={exercise} accentColor={accentColor} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.5} maxPolarAngle={Math.PI / 1.8} minPolarAngle={Math.PI / 4} />
        <Environment preset="night" />
      </Canvas>
    </div>
  );
};

export default ExerciseModel;
