// src/QubitVisualizer.jsx
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function QubitVisualizer() {
  const mountRef = useRef(null);
  const [probabilities, setProbabilities] = useState({ p0: 1, p1: 0 });

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(2, 2, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 1.0;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x1565c0,
        wireframe: true,
        transparent: true,
        opacity: 0.3
      })
    );
    scene.add(sphere);

    scene.add(new THREE.AxesHelper(1.5));

    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      1,
      0xff0000,
      0.1,
      0.05
    );
    scene.add(arrow);

    let theta = 0;
    let phi = 0;

    function animate() {
      requestAnimationFrame(animate);

      theta += 0.02;
      phi += 0.015;

      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.cos(theta);
      const z = Math.sin(theta) * Math.sin(phi);

      arrow.setDirection(new THREE.Vector3(x, y, z).normalize());

      const p0 = Math.pow(Math.cos(theta / 2), 2);
      const p1 = 1 - p0;
      setProbabilities({ p0, p1 });

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // Gradiente: verde (p0=1) → amarelo (p0=0.5) → vermelho (p0=0)
  function getColor(p0) {
    const r = Math.round(255 * (1 - p0));
    const g = Math.round(255 * p0);
    return `rgb(${r},${g},0)`;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "white",
          padding: "12px",
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "14px",
          maxWidth: "280px",
          lineHeight: "1.4"
        }}
      >
        <strong style={{ fontSize: "16px" }}>Estado do Qubit</strong>
        <div style={{ marginTop: "5px" }}>
          <span style={{ color: getColor(probabilities.p0) }}>
            |0|: {(probabilities.p0 * 100).toFixed(2)}%
          </span>
          <br />
          <span style={{ color: getColor(probabilities.p1) }}>
            |1|: {(probabilities.p1 * 100).toFixed(2)}%
          </span>
        </div>
        <p style={{ marginTop: "8px", fontSize: "12px", color: "#ccc" }}>
          O vetor vermelho mostra o estado quântico na esfera de Bloch.
          As porcentagens indicam a probabilidade de medir o qubit nos
          estados básicos |0| (verde) ou |1| (vermelho).
        </p>
      </div>

      {/* Canvas */}
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
