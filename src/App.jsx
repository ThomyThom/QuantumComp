import React from "react";
import QubitVisualizer from "./QubitVisualizer";

export default function App() {
  return (
    <div style={{ background: "#000", height: "100vh", padding: "0px", color: "#fff" }}>
      <QubitVisualizer theta={Math.PI / 4} phi={Math.PI / 3} />
    </div>
  );
}
