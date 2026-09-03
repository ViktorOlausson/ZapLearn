import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { AppProviders } from "./app/providers/AppProviders";
import { ErrorBoundary } from "./app/providers/ErrorBoundary";
import "./styles/global.css";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppProviders>
          <App />
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
