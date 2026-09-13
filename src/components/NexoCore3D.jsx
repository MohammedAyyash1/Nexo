import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitCapabilities } from './OrbitCapabilities.jsx';
import { MeshDistortMaterial, Sphere, Sparkles } from '@react-three/drei';

export function NexoCoreMesh({ particleCount = 60, hoverStateRef }) {
  const meshRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const glowRef = useRef();
  const materialRef = useRef();
  const currentBoost = useRef(0);

  useFrame((state) => {
    const active = hoverStateRef?.current?.active;
    const targetBoost = active ? 1 : 0;
    currentBoost.current += (targetBoost - currentBoost.current) * 0.08;

    if (meshRef.current) {
      // لما المستخدم يقرّب من أي أداة، النواة تسرّع دورانها وتكبر شوي — إحساس "استجابة حيّة"
      const spinBoost = 0.0012 + currentBoost.current * 0.003;
      meshRef.current.rotation.y += spinBoost;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.05;
      const scaleBoost = 1 + currentBoost.current * 0.08;
      meshRef.current.scale.setScalar(scaleBoost);
    }
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0.4 + currentBoost.current * 0.5;
    }
    if (ring1Ref.current) ring1Ref.current.rotation.z += 0.0009 + currentBoost.current * 0.002;
    if (ring2Ref.current) ring2Ref.current.rotation.z -= 0.0006 + currentBoost.current * 0.0015;
    if (glowRef.current) {
      const pulse = (1 + Math.sin(state.clock.elapsedTime * 0.55) * 0.035) + currentBoost.current * 0.12;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      <mesh ref={glowRef} scale={2}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.09} depthWrite={false} />
      </mesh>

      <mesh ref={ring1Ref} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[1.15, 0.006, 16, 100]} />
        <meshBasicMaterial color="#c9a4f7" transparent opacity={0.35} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 1.7, 0.4, 0]}>
        <torusGeometry args={[1.35, 0.005, 16, 100]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.22} />
      </mesh>

      <Sphere ref={meshRef} args={[0.8, 96, 96]}>
        <MeshDistortMaterial
          ref={materialRef}
          color="#6d28d9"
          emissive="#a855f7"
          emissiveIntensity={0.4}
          distort={0.24}
          speed={1.1}
          roughness={0.15}
          metalness={0.4}
          clearcoat={0.6}
        />
      </Sphere>

      <Sparkles count={particleCount} scale={3.2} size={1.6} speed={0.18} color="#c9a4f7" opacity={0.55} />
    </group>
  );
}

function ParallaxRig({ children, reducedMotion }) {
  const group = useRef();
  useFrame((state) => {
    if (!group.current || reducedMotion) return;
    const targetX = state.mouse.y * 0.07;
    const targetY = state.mouse.x * 0.11;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.035;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.035;
  });
  return <group ref={group}>{children}</group>;
}

export function NexoCoreScene({ capabilities, particleCount, reducedMotion, dpr, onNodeClick }) {
  const hoverStateRef = useRef({ active: false });

  return (
    <Canvas
      camera={{ position: [0, 0, 4.4], fov: 40 }}
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 2, 3]} intensity={1} color="#a855f7" />
      <pointLight position={[-3, -2, -2]} intensity={0.4} color="#ec4899" />
      <ParallaxRig reducedMotion={reducedMotion}>
        <NexoCoreMesh particleCount={particleCount} hoverStateRef={hoverStateRef} />
        <OrbitCapabilities
          capabilities={capabilities}
          reducedMotion={reducedMotion}
          onNodeClick={onNodeClick}
          hoverStateRef={hoverStateRef}
        />
      </ParallaxRig>
    </Canvas>
  );
}