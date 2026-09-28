import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";
import "./styles/components-1.css";
import "./styles/components-2.css";
import "./styles/components-3.css";
import "./styles/components-4.css";
import "./styles/components-5.css";
import "./styles/responsive.css";
import "./styles/premium.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
