# Integration handoff

Current product and evidence: [README](README.md), [hackathon build record](hackathon.md), [architecture](docs/architecture.md). Updated September 9, 2026.

The public pilot is the dedicated `wooden-dogfish-387` cloud development deployment. Use `npx convex dev --once` for backend changes and `npm run deploy:pilot` for static assets. The production deployment is separate and is not configured.

Convex Auth email codes and legacy guest migration are enabled. Sign-in links use the backend `SITE_URL`. The dedicated AgentMail inbox uses an inbox-scoped API key and signed webhook; public sending is rate-limited and needs verified-user approval. RentPilot credentials and deployment were not changed.

Operator setup scripts take an explicit webhook origin. No provider secrets belong in the repo or frontend bundle. Original controlled transport checks are archived with their evidence boundaries.

Vibe Apps submission, public source and sponsor-tagged launch are published. Open items: full final-prompt extraction benchmark, independent human feedback, Luma registration, automatic email attachment ingestion and alternate-sender routing. Manual quote upload is implemented.
