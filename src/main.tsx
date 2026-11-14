import { createRoot } from "react-dom/client";
import "@fontsource-variable/readex-pro";
import "@fontsource-variable/reem-kufi";
import "./styles.css";
import { App } from "./ui/App";
import { useStore } from "./store";

// a handle for automated checks (scripts/check-journey.mjs)
if (import.meta.env.DEV) (window as unknown as { __piercer: typeof useStore }).__piercer = useStore;

createRoot(document.getElementById("root")!).render(<App />);
