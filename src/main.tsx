import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Capture referral code from URL before React mounts
const urlParams = new URLSearchParams(window.location.search);
const ref = urlParams.get('ref');
if (ref) {
  localStorage.setItem('futra_ref', ref);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
