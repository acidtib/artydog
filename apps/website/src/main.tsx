import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root") as HTMLElement;
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The production build ships prerendered markup; the dev server does not.
if (root.hasChildNodes()) {
  ReactDOM.hydrateRoot(root, app);
} else {
  ReactDOM.createRoot(root).render(app);
}
