import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import App from "./App";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import "./controls.css";

// The fictional example remains separate from private events.
// A configured backend enables authenticated workspace subscriptions.
const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
const tree = <App />;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {url ? (
      <ConvexAuthProvider client={new ConvexReactClient(url)}>
        {tree}
      </ConvexAuthProvider>
    ) : (
      tree
    )}
  </React.StrictMode>,
);
