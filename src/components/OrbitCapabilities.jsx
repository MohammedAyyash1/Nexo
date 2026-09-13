import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';

function computeOrbitPosition(angle, radius, depthOffset) {
  return [
    Math.cos(angle) * radius,
    Math.sin(angle * 0.6) * 0.35 + depthOffset,
    Math.sin(angle) * radius,
  ];
}

function CapabilityNode({ cap, radius, depthOffset, speed, reducedMotion, onNodeClick, hoverStateRef }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const currentScale = useRef(1);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = reducedMotion ? cap.angle : cap.angle + state.clock.elapsedTime * speed;
    const [x, y, z] = computeOrbitPosition(t, radius, depthOffset);
    groupRef.current.position.set(x, y, z);

    const targetScale = hovered ? 1.28 : 1;
    currentScale.current += (targetScale - currentScale.current) * 0.08;
    groupRef.current.scale.setScalar(currentScale.current);
  });

  const distanceFactor = 9 - depthOffset * 1.5;

  const handleOver = () => {
    setHovered(true);
    if (hoverStateRef) hoverStateRef.current.active = true;
  };
  const handleOut = () => {
    setHovered(false);
    if (hoverStateRef) hoverStateRef.current.active = false;
  };

  return (
    <group ref={groupRef}>
      <Html
        transform
        distanceFactor={distanceFactor}
        occlude={false}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          className={`hero-glass-card ${hovered ? 'hovered' : ''} ${!cap.ready ? 'soon' : ''}`}
          onClick={() => onNodeClick && onNodeClick()}
          style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
        >
          <cap.icon size={16} />
          <span>{cap.label}</span>
          {!cap.ready && <em>قريبًا</em>}
        </div>
      </Html>
    </group>
  );
}

export function OrbitCapabilities({ capabilities, reducedMotion, onNodeClick, hoverStateRef, coreConnections = 3 }) {
  const connectedIndices = useMemo(
    () => capabilities.slice(0, coreConnections).map((_, i) => i),
    [capabilities, coreConnections]
  );

  const lineRefs = useRef([]);

  useFrame((state) => {
    lineRefs.current.forEach((line, i) => {
      if (!line) return;
      const cap = capabilities[connectedIndices[i]];
      if (!cap) return;
      const t = reducedMotion ? cap.angle : cap.angle + state.clock.elapsedTime * cap.speed;
      const [x, y, z] = computeOrbitPosition(t, cap.radius, cap.depthOffset);
      const positions = line.geometry.attributes.position;
      positions.setXYZ(1, x, y, z);
      positions.needsUpdate = true;
    });
  });

  return (
    <group>
      {capabilities.map((cap) => (
        <CapabilityNode
          key={cap.label}
          cap={cap}
          radius={cap.radius}
          depthOffset={cap.depthOffset}
          speed={cap.speed}
          reducedMotion={reducedMotion}
          onNodeClick={onNodeClick}
          hoverStateRef={hoverStateRef}
        />
      ))}

      {connectedIndices.map((idx, i) => (
        <Line
          key={idx}
          ref={(el) => (lineRefs.current[i] = el)}
          points={[[0, 0, 0], computeOrbitPosition(capabilities[idx].angle, capabilities[idx].radius, capabilities[idx].depthOffset)]}
          color="#a855f7"
          transparent
          opacity={0.18}
          lineWidth={1}
        />
      ))}
    </group>
  );
}