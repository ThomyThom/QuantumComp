// src/QubitVisualizer.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/**
 * QubitVisualizer Aprimorado:
 * - Pós-processamento com Efeito de Bloom para um brilho energético.
 * - Sistema de partículas para simular "espuma quântica".
 * - Materiais e luzes refinados para um visual mais realista e imersivo.
 */

export default function QubitVisualizer() {
  const mountRef = useRef(null);
  const rafRef = useRef(null);
  const [probabilities, setProbabilities] = useState({ p0: 1, p1: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000010, 0.06);

    // Camera + renderer
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(4, 2.8, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;
    controls.minDistance = 2;
    controls.maxDistance = 12;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(5, 6, 3);
    scene.add(key);
    const fill = new THREE.PointLight(0x66ccff, 0.25, 20);
    fill.position.set(-4, 2, -6);
    scene.add(fill);

    // --- Pós-processamento com Bloom ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 0.6; // Intensidade do brilho
    bloomPass.radius = 0.2;   // Raio do brilho

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- Plano grade distorcido (shader) ---
    const planeSize = 40;
    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize, 256, 256);
    const planeMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x07122a) },
        gridColor: { value: new THREE.Color(0x1fb8ff) },
        amp: { value: 0.25 },
      },
      vertexShader: `
        uniform float time;
        uniform float amp;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float r = length(position.xz) / 10.0;
          pos.z += sin((position.x + time*0.8)*0.6 + r*5.0) * amp * (1.0 - r);
          pos.y += cos((position.y + time*0.6)*0.5 + r*4.0) * amp * (1.0 - r);
          vWave = (1.0 - r);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 gridColor;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vec2 gv = fract(vUv * 20.0) - 0.5;
          float line1 = 1.0 - smoothstep(0.0, 0.02, length(gv));
          vec2 gv2 = fract(vUv * 6.0) - 0.5;
          float line2 = 1.0 - smoothstep(0.0, 0.01, length(gv2));
          float grid = max(line1 * 0.9, line2 * 0.4);
          float fade = smoothstep(0.9, 0.0, length(vUv - 0.5));
          vec3 base = mix(vec3(0.01,0.02,0.04), color, 0.9);
          vec3 gcol = gridColor * (0.6 + 0.6 * vWave);
          vec3 outCol = mix(base, gcol, grid * fade);
          gl_FragColor = vec4(outCol, 1.0);
        }
      `,
      transparent: false,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1.2;
    scene.add(plane);

    // --- Partículas de "Espuma Quântica" ---
    const particleCount = 10000;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = 3 + Math.random() * 5;
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        particlePositions[i3 + 2] = radius * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
        color: 0x88ddff,
        size: 0.02,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
    });
    const quantumFoam = new THREE.Points(particleGeo, particleMat);
    scene.add(quantumFoam);

    // --- Núcleo emissivo (centro brilhante) ---
    const coreGeo = new THREE.SphereGeometry(0.12, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffcf66 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);
    const coreLight = new THREE.PointLight(0xffcf66, 1.6, 6, 2);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // --- Esfera 'casca' translúcida com leve iridescência ---
    const shellGeo = new THREE.SphereGeometry(1, 96, 96);
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b6bff, metalness: 0.1, roughness: 0.25, transmission: 0.8,
      thickness: 0.6, envMapIntensity: 0.6, clearcoat: 0.6, clearcoatRoughness: 0.2,
      opacity: 0.95, transparent: true, side: THREE.DoubleSide,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    scene.add(shell);

    // --- Linhas de campo brilhantes (curvas ao redor da esfera) ---
    const linesGroup = new THREE.Group();
    const lineCount = 28;
    const lineMats = [];
    for (let i = 0; i < lineCount; i++) {
      const theta = (i / lineCount) * Math.PI; // polar
      const phiOff = (i % 7) * 0.7;
      const pts = [];
      const segments = 180;
      for (let s = 0; s <= segments; s++) {
        const t = (s / segments) * Math.PI * 2;
        const r = 1.02 + 0.02 * Math.sin(t * 3 + i);
        const x = r * Math.sin(theta) * Math.cos(t + phiOff);
        const y = r * Math.cos(theta) * Math.cos(t * 0.5 + i * 0.1);
        const z = r * Math.sin(theta) * Math.sin(t + phiOff);
        pts.push(new THREE.Vector3(x, y, z));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.08 + 0.6 * (i / lineCount), 0.9, 0.6),
        transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, toneMapped: false,
      });
      lineMats.push({ geom, mat });
      const line = new THREE.Line(geom, mat);
      linesGroup.add(line);
    }
    scene.add(linesGroup);

    // --- marcador na superfície (ponta do vetor) ---
    const markerGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xffee99, emissive: 0xffaa66, emissiveIntensity: 2.5 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    scene.add(marker);

    // Arrow: build shaft+cone for nicer appearance
    const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 12);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xffcc66, metalness: 0.2, roughness: 0.4 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(0, 0.4, 0);
    const coneGeo = new THREE.ConeGeometry(0.05, 0.16, 12);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff8855, emissive: 0xff8855, emissiveIntensity: 0.6 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(0, 0.88, 0);
    const arrowGroup = new THREE.Group();
    arrowGroup.add(shaft);
    arrowGroup.add(cone);
    scene.add(arrowGroup);

    const qTemp = new THREE.Quaternion();
    const clock = new THREE.Clock();

    const safeVec = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z);
      if (!isFinite(x + y + z) || v.lengthSq() < 1e-9) return new THREE.Vector3(0, 1, 0);
      return v.normalize();
    };

    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // ** qubit angles generated smoothly **
      const theta = THREE.MathUtils.clamp(
        Math.PI / 2 + 0.45 * Math.sin(time * 0.7) + 0.18 * Math.sin(time * 1.9 + 1.2),
        0.01,
        Math.PI - 0.01
      );
      const phi = time * 0.6;

      // Cartesian
      const tx = Math.sin(theta) * Math.cos(phi);
      const ty = Math.cos(theta);
      const tz = Math.sin(theta) * Math.sin(phi);

      // update HUD probabilities
      const p0 = Math.pow(Math.cos(theta / 2), 2);
      const p1 = 1 - p0;
      setProbabilities({ p0, p1 });

      // point on sphere surface for marker
      marker.position.copy(new THREE.Vector3(tx, ty, tz).multiplyScalar(1.01));

      // orient arrowGroup: our arrow points +Y; rotate +Y to targetVec
      const targetVec = safeVec(tx, ty, tz);
      qTemp.setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetVec);
      arrowGroup.quaternion.slerp(qTemp, 0.14);
      arrowGroup.position.set(0, 0, 0);

      // rotate field lines with increased speed
      linesGroup.rotation.y = Math.sin(time * 0.4) * 0.15;
      linesGroup.rotation.x = Math.cos(time * 0.26) * 0.08;

      // Animação da "Espuma Quântica"
      quantumFoam.rotation.y = time * 0.05;
      quantumFoam.rotation.x = time * 0.02;

      // animate plane shader uniform
      planeMat.uniforms.time.value = time * 0.6;
      const pulse = 1.0 + 0.12 * Math.sin(time * 3.2);
      coreMesh.scale.set(pulse, pulse, pulse);
      coreLight.intensity = 1.4 + 0.6 * Math.abs(Math.sin(time * 3.2));

      controls.update();
      composer.render();
    }

    animate();

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      
      shellGeo.dispose?.(); shellMat.dispose?.();
      planeGeo.dispose(); planeMat.dispose();
      coreGeo.dispose?.(); coreMat.dispose?.();
      shaftGeo.dispose?.(); shaftMat.dispose?.();
      coneGeo.dispose?.(); coneMat.dispose?.();
      markerGeo.dispose?.(); markerMat.dispose?.();
      particleGeo.dispose(); particleMat.dispose();
      lineMats.forEach(({ geom, mat }) => { geom.dispose(); mat.dispose(); });

      controls.dispose();
      composer.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  function getColor(p0) {
    const r = Math.round(255 * (1 - p0));
    const g = Math.round(255 * p0);
    return `rgb(${r},${g},0)`;
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* HUD */}
      <div
        style={{
          position: "absolute",
          left: 18,
          top: 18,
          zIndex: 20,
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          padding: "12px",
          borderRadius: 10,
          fontFamily: "monospace",
          fontSize: 13,
          minWidth: 220,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Qubit Visualizer</div>
        <div>
          <span style={{ color: getColor(probabilities.p0), fontWeight: 600 }}>
            |0⟩ (Certeza): {(probabilities.p0 * 100).toFixed(2)}%
          </span>
        </div>
        <div>
          <span style={{ color: getColor(probabilities.p1), fontWeight: 600 }}>
            |1⟩ (Incerteza): {(probabilities.p1 * 100).toFixed(2)}%
          </span>
        </div>
        <div style={{ marginTop: 8, color: "#cfcfcf", fontSize: 12 }}>
          Esta esfera representa as possibilidades de um qubit. A seta aponta para seu estado atual, que está sempre em uma "superposição" entre 0 e 1 até ser medido.
        </div>
      </div>

      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}