import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Polyfill for Node.js globals needed by WebRTC libraries
(globalThis as any).global = globalThis;

createRoot(document.getElementById("root")!).render(<App />);
