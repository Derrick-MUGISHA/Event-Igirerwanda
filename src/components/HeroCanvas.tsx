"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const COLS = 130;
const ROWS = 56;

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 3.2, 9);
    camera.lookAt(0, -0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const count = COLS * ROWS;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const orange = new THREE.Color("#e08a00");
    const ember = new THREE.Color("#6fa84c");

    let i = 0;
    for (let x = 0; x < COLS; x++) {
      for (let z = 0; z < ROWS; z++) {
        positions[i * 3] = (x / COLS - 0.5) * 22;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (z / ROWS - 0.5) * 10;
        const mixed = orange.clone().lerp(ember, z / ROWS);
        colors[i * 3] = mixed.r;
        colors[i * 3 + 1] = mixed.g;
        colors[i * 3 + 2] = mixed.b;
        i++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    points.position.y = -1.4;
    scene.add(points);

    let pointerX = 0;
    const onPointerMove = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    let frame = 0;
    const clock = new THREE.Clock();

    const render = () => {
      const t = reduceMotion ? 0 : clock.getElapsedTime();
      let j = 0;
      for (let x = 0; x < COLS; x++) {
        for (let z = 0; z < ROWS; z++) {
          const px = pos.getX(j);
          const pz = pos.getZ(j);
          pos.setY(
            j,
            Math.sin(px * 0.7 + t * 1.1) * 0.35 +
              Math.cos(pz * 0.9 + t * 0.7) * 0.3 +
              Math.sin((px + pz) * 0.4 + t * 0.5) * 0.2
          );
          j++;
        }
      }
      pos.needsUpdate = true;
      points.rotation.y = pointerX * 0.06;
      renderer.render(scene, camera);
      if (!reduceMotion) frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  );
}
