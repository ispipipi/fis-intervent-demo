import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./styles/index.css";
import "./styles/components-1.css";
import "./styles/components-2.css";
import "./styles/components-3.css";
import "./styles/components-4.css";
import "./styles/components-5.css";
import "./styles/components-6.css";
import "./styles/components-7.css";
import "./styles/responsive.css";
import "./styles/premium.css";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

function StartupMessage({ error }: { error?: unknown }) {
  const detail = error instanceof Error ? error.message : String(error || "");
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32, fontFamily: "system-ui, sans-serif", background: "#eaf3ff", color: "#1d3150" }}>
      <section style={{ maxWidth: 680, padding: 28, borderRadius: 16, background: "#fff", boxShadow: "0 18px 50px rgba(29, 49, 80, .12)" }}>
        <strong style={{ color: "#187d80", letterSpacing: ".08em", textTransform: "uppercase", fontSize: 12 }}>Intervent Preclaim</strong>
        <h1 style={{ margin: "10px 0 8px", fontSize: 26 }}>Cargando la plataforma</h1>
        <p style={{ margin: 0, color: "#41526c" }}>{error ? "No se pudo iniciar un módulo de la aplicación." : "Preparando la mesa handler..."}</p>
        {detail && <pre style={{ marginTop: 18, padding: 14, overflow: "auto", borderRadius: 10, background: "#fff1f0", color: "#a73535", whiteSpace: "pre-wrap" }}>{detail}</pre>}
      </section>
    </main>
  );
}

root.render(
  <React.StrictMode>
    <HashRouter>
      <StartupMessage />
    </HashRouter>
  </React.StrictMode>
);

import("./App")
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </React.StrictMode>
    );
  })
  .catch((error: unknown) => {
    console.error("No se pudo iniciar Intervent Preclaim", error);
    root.render(<StartupMessage error={error} />);
  });
