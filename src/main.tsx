import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import App from "./App";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

// The demo board runs on seeded extraction output, so it renders before a
// deployment exists. Once VITE_CONVEX_URL is set the same tree gets the live
// provider and the board switches to real subscriptions.
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
