import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// --- Componentes React para a UI ---
const ControlSlider = ({ label, value, onChange, min, max, step, disabled }) => (
  <div style={{ margin: '10px 0', minWidth: '280px', opacity: disabled ? 0.5 : 1, transition: 'opacity 0.2s' }}>
    <label style={{ marginRight: '10px', width: '80px', display: 'inline-block' }}>{label}:</label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      disabled={disabled}
      style={{ verticalAlign: 'middle', width: '120px', cursor: disabled ? 'not-allowed' : 'pointer' }}
    />
    <span style={{ marginLeft: '10px', fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>{value.toFixed(2)}</span>
  </div>
);

const GateButton = ({ gate, onClick, title }) => (
  <button onClick={() => onClick(gate)} title={title} style={{ margin: '4px', padding: '8px 12px', cursor: 'pointer', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', minWidth: '40px' }}>
    {gate}
  </button>
);

// --- Componente Principal da Visualização ---
export default function QubitVisualizer() {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  
  // Refs para os ângulos de renderização e estado
  const theta = useRef(Math.PI / 4);
  const phi = useRef(Math.PI / 4);
  const targetTheta = useRef(Math.PI / 4);
  const targetPhi = useRef(Math.PI / 4);
  const isAutoMode = useRef(false);

  // Estado do React para controlar a UI
  const [uiTheta, setUiTheta] = useState(targetTheta.current);
  const [uiPhi, setUiPhi] = useState(targetPhi.current);
  const [uiIsAutoMode, setUiIsAutoMode] = useState(isAutoMode.current);
  const [hudState, setHudState] = useState({
      alpha: 1, beta: { real: 0, imag: 0 }, p0: 1, p1: 0
  });

  // Função para criar rótulos
  const createLabelSprite = (text, position, color = 'white', size = 0.3) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const fontSize = 100;
      context.font = `bold ${fontSize}px Arial`;
      const metrics = context.measureText(text);
      canvas.width = metrics.width;
      canvas.height = fontSize * 1.2;
      context.font = `bold ${fontSize}px Arial`;
      context.fillStyle = color;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(material);
      const aspect = canvas.width / canvas.height;
      sprite.scale.set(size * aspect, size, 1);
      sprite.position.copy(position);
      return sprite;
  };

  // Efeito para configuração inicial (executa apenas uma vez)
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(2.8, 1.8, 2.8);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Salva os objetos do Three.js em refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    // --- Iluminação e Objetos Estáticos ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    const sphere = new THREE.Mesh( new THREE.SphereGeometry(1, 64, 64), new THREE.MeshStandardMaterial({ color: 0x5c8dff, transparent: true, opacity: 0.15, metalness: 0.2, roughness: 0.1, }) );
    scene.add(sphere);
    scene.add(new THREE.GridHelper(2, 10, 0x888888, 0x444444));
    scene.add(new THREE.AxesHelper(1.5));
    scene.add(createLabelSprite('|0⟩', new THREE.Vector3(0, 1.2, 0)));
    scene.add(createLabelSprite('|1⟩', new THREE.Vector3(0, -1.2, 0)));
    scene.add(createLabelSprite('x', new THREE.Vector3(1.7, 0, 0)));
    scene.add(createLabelSprite('y', new THREE.Vector3(0, 0, 1.7)));
    scene.add(createLabelSprite('z', new THREE.Vector3(0, 1.7, 0)));
    
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(0, 0, 0), 1, 0xff5555, 0.08, 0.05);
    arrow.cone.material = new THREE.MeshStandardMaterial({ color: 0xff8888, emissive: 0xff5555, emissiveIntensity: 0.7 });
    arrow.line.material = new THREE.MeshStandardMaterial({ color: 0xff8888, emissive: 0xff5555, emissiveIntensity: 0.7 });
    scene.add(arrow);

    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (isAutoMode.current) {
        targetTheta.current = Math.PI / 2 + Math.sin(elapsedTime * 0.4) * 0.8;
        targetPhi.current = elapsedTime * 0.5;
      }
      
      theta.current = THREE.MathUtils.lerp(theta.current, targetTheta.current, 0.08);
      phi.current = THREE.MathUtils.lerp(phi.current, targetPhi.current, 0.08);

      setHudState({
          p0: Math.pow(Math.cos(theta.current / 2), 2),
          p1: Math.pow(Math.sin(theta.current / 2), 2),
          alpha: Math.cos(theta.current / 2),
          beta: {
            real: Math.sin(theta.current / 2) * Math.cos(phi.current),
            imag: Math.sin(theta.current / 2) * Math.sin(phi.current),
          }
      });
      
      const x = Math.sin(theta.current) * Math.cos(phi.current);
      const z_bloch = Math.cos(theta.current);
      const y_bloch = Math.sin(theta.current) * Math.sin(phi.current);
      
      arrow.setDirection(new THREE.Vector3(x, z_bloch, y_bloch).normalize());
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []); // Array de dependências vazio para executar apenas uma vez

  const applyGate = (gate) => {
    if (isAutoMode.current) return;
    let x = Math.sin(targetTheta.current) * Math.cos(targetPhi.current);
    let y = Math.sin(targetTheta.current) * Math.sin(targetPhi.current);
    let z = Math.cos(targetTheta.current);
    
    switch (gate) {
      case 'X': x=x; y=-y; z=-z; break;
      case 'Y': x=-x; y=y; z=-z; break;
      case 'Z': x=-x; y=-y; z=z; break;
      case 'H': const tempX=x; x=z; z=tempX; y=-y; break;
      default: break;
    }
    
    let newPhi = Math.atan2(y, x);
    let newTheta = Math.acos(z);
    
    targetTheta.current = newTheta;
    targetPhi.current = newPhi < 0 ? newPhi + 2 * Math.PI : newPhi;
    
    setUiTheta(targetTheta.current);
    setUiPhi(targetPhi.current);
  };
  
  const handleThetaChange = (value) => {
    setUiTheta(value);
    targetTheta.current = value;
  };

  const handlePhiChange = (value) => {
    setUiPhi(value);
    targetPhi.current = value;
  };

  const toggleAutoMode = () => {
    isAutoMode.current = !isAutoMode.current;
    setUiIsAutoMode(isAutoMode.current);
  };
  
  const getColor = (p) => `rgb(${Math.round(255 * (1 - p))}, ${Math.round(255 * p)}, 50)`;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: '#101010', overflow: 'hidden' }}>
      <div style={{ position: "absolute", top: 20, left: 20, backgroundColor: "rgba(20,20,20,0.8)", color: "white", padding: "15px", borderRadius: "10px", fontFamily: "monospace", fontSize: "14px", lineHeight: "1.6", border: "1px solid #444" }}>
        <strong style={{ fontSize: "18px", color: '#87CEFA' }}>Estado do Qubit</strong>
        <div style={{ marginTop: '10px' }}>
          |ψ⟩ = {hudState.alpha.toFixed(2)}|0⟩ + ({hudState.beta.real.toFixed(2)} {hudState.beta.imag >= 0 ? '+' : '-'} {Math.abs(hudState.beta.imag).toFixed(2)}i)|1⟩
        </div>
        <div style={{ marginTop: "10px" }}>
          <strong style={{ color: '#87CEFA' }}>Probabilidades:</strong><br />
          <span style={{ color: getColor(hudState.p0) }}>P(|0⟩): {(hudState.p0 * 100).toFixed(1)}%</span><br />
          <span style={{ color: getColor(hudState.p1) }}>P(|1⟩): {(hudState.p1 * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 20, left: '50%', transform: 'translateX(-50%)', backgroundColor: "rgba(20,20,20,0.8)", color: "white", padding: "15px", borderRadius: "10px", fontFamily: "sans-serif", border: "1px solid #444", textAlign: 'center' }}>
        <strong style={{ fontSize: "16px", color: '#87CEFA' }}>Controles</strong>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
            <ControlSlider label="Ângulo θ" value={uiTheta} onChange={handleThetaChange} min={0} max={Math.PI} step={0.01} disabled={uiIsAutoMode} />
            <ControlSlider label="Ângulo φ" value={uiPhi} onChange={handlePhiChange} min={0} max={2 * Math.PI} step={0.01} disabled={uiIsAutoMode} />
        </div>
        <div>
          <strong style={{ marginRight: '10px' }}>Aplicar Porta:</strong>
          <GateButton gate="X" onClick={applyGate} title="Negação (Bit-Flip)" />
          <GateButton gate="Y" onClick={applyGate} title="Rotação em Y" />
          <GateButton gate="Z" onClick={applyGate} title="Inversão de Fase" />
          <GateButton gate="H" onClick={applyGate} title="Hadamard (Superposição)" />
        </div>
         <button onClick={toggleAutoMode} style={{ marginTop: '10px', padding: '8px 15px', cursor: 'pointer', width: '100%', backgroundColor: uiIsAutoMode ? '#005080' : '#333', border: '1px solid #555', borderRadius: '4px', color: 'white' }}>
            Modo: {uiIsAutoMode ? "Automático" : "Manual"}
        </button>
      </div>

      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}