import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface ConfettiParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  life: number;
  maxLife: number;
}

interface FinishCelebrationProps {
  vehicleId: string;
  lap: number;
  lapTime?: number | null;
  position: { x: number; y: number; z: number };
  onComplete: () => void;
}

export function FinishCelebration({ 
  vehicleId, 
  lap, 
  lapTime, 
  position, 
  onComplete 
}: FinishCelebrationProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const [showText, setShowText] = useState(true);
  const textRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

  useEffect(() => {
    // Create confetti particles
    const newParticles: ConfettiParticle[] = [];
    const particleCount = 200;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 5 + Math.random() * 10;
      newParticles.push({
        position: new THREE.Vector3(position.x, position.y + 5, position.z),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * (0.5 + Math.random()),
          Math.random() * 8 + 2,
          Math.sin(angle) * speed * (0.5 + Math.random())
        ),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 3 + Math.random() * 2,
      });
    }
    
    setParticles(newParticles);
    
    // Hide text after 4 seconds
    const textTimer = setTimeout(() => {
      setShowText(false);
    }, 4000);
    
    // Complete celebration after 5 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 5000);
    
    return () => {
      clearTimeout(textTimer);
      clearTimeout(completeTimer);
    };
  }, [vehicleId, lap, position, onComplete]);

  useFrame((state, delta) => {
    // Update particles
    setParticles((prevParticles) => {
      return prevParticles
        .map((particle) => {
          particle.life += delta;
          particle.position.add(
            new THREE.Vector3(
              particle.velocity.x * delta,
              particle.velocity.y * delta - 9.8 * delta * delta, // Gravity
              particle.velocity.z * delta
            )
          );
          particle.velocity.y -= 9.8 * delta; // Apply gravity
          return particle;
        })
        .filter((particle) => particle.life < particle.maxLife);
    });

    // Animate text
    if (textRef.current && showText) {
      const elapsed = (Date.now() - startTime.current) / 1000;
      textRef.current.position.y = position.y + 8 + Math.sin(elapsed * 2) * 0.5;
      textRef.current.rotation.y = Math.sin(elapsed) * 0.1;
      const scale = 1 + Math.sin(elapsed * 3) * 0.1;
      textRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group>
      {/* Confetti Particles */}
      {particles.map((particle, idx) => (
        <mesh key={idx} position={[particle.position.x, particle.position.y, particle.position.z]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color={particle.color} />
        </mesh>
      ))}

      {/* Celebration Text */}
      {showText && (
        <group ref={textRef} position={[position.x, position.y + 8, position.z]}>
          <Text
            position={[0, 2, 0]}
            fontSize={3}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.2}
            outlineColor="#000000"
            font="/fonts/arial-bold.ttf"
          >
            🏁 CONGRATULATIONS! 🏁
          </Text>
          <Text
            position={[0, 0, 0]}
            fontSize={2}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.15}
            outlineColor="#000000"
          >
            Lap {lap} Complete!
          </Text>
          {lapTime !== null && lapTime !== undefined && (
            <Text
              position={[0, -2, 0]}
              fontSize={1.5}
              color="#4ECDC4"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.1}
              outlineColor="#000000"
            >
              Lap Time: {formatLapTime(lapTime)}
            </Text>
          )}
        </group>
      )}

      {/* Fireworks */}
      {Array.from({ length: 5 }).map((_, idx) => (
        <Firework
          key={idx}
          position={{
            x: position.x + (Math.random() - 0.5) * 20,
            y: position.y + 15 + Math.random() * 10,
            z: position.z + (Math.random() - 0.5) * 20,
          }}
          delay={idx * 0.3}
        />
      ))}
    </group>
  );
}

function Firework({ position, delay }: { position: { x: number; y: number; z: number }; delay: number }) {
  const [exploded, setExploded] = useState(false);
  const [sparks, setSparks] = useState<Array<{ pos: THREE.Vector3; vel: THREE.Vector3; color: string; life: number }>>([]);
  const startTime = useRef(Date.now());
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];

  useEffect(() => {
    const timer = setTimeout(() => {
      setExploded(true);
      // Create sparks
      const newSparks: Array<{ pos: THREE.Vector3; vel: THREE.Vector3; color: string; life: number }> = [];
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = 5 + Math.random() * 5;
        newSparks.push({
          pos: new THREE.Vector3(position.x, position.y, position.z),
          vel: new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.random() * 3,
            Math.sin(angle) * speed
          ),
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
        });
      }
      setSparks(newSparks);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [delay, position]);

  useFrame((state, delta) => {
    if (exploded) {
      setSparks((prevSparks) =>
        prevSparks
          .map((spark) => {
            spark.life += delta;
            spark.pos.add(new THREE.Vector3(spark.vel.x * delta, spark.vel.y * delta - 9.8 * delta * delta, spark.vel.z * delta));
            spark.vel.y -= 9.8 * delta;
            return spark;
          })
          .filter((spark) => spark.life < 2)
      );
    }
  });

  if (!exploded) {
    return (
      <mesh position={[position.x, position.y, position.z]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1} />
      </mesh>
    );
  }

  return (
    <group>
      {sparks.map((spark, idx) => (
        <mesh key={idx} position={[spark.pos.x, spark.pos.y, spark.pos.z]}>
          <sphereGeometry args={[0.15, 6, 6]} />
          <meshStandardMaterial color={spark.color} emissive={spark.color} emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  );
}

function formatLapTime(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = (time % 60).toFixed(2);
  return `${minutes}:${seconds.padStart(5, '0')}`;
}

