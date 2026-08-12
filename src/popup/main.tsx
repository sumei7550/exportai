import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { PopupApp } from "./popup-app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
);
