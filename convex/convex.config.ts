import { defineApp } from "convex/server";
import selfHosting from "@convex-dev/static-hosting/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
const app = defineApp();
app.use(rateLimiter);
app.use(selfHosting);
export default app;
