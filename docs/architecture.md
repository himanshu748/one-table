# How One Table works

```mermaid
flowchart TD
  User[Buyer] --> UI[React workspace]
  UI --> Auth[Convex Auth email codes]
  UI --> Data[Owner-scoped Convex queries and mutations]
  Data --> DB[(Events, venues, messages, quotes)]
  Data --> Scheduler[Convex scheduled actions]
  Scheduler --> Firecrawl[Firecrawl contact discovery]
  Firecrawl --> DB
  Scheduler --> Mail[AgentMail approved enquiries]
  Mail --> Venue[Venue inbox]
  Venue --> Hook[AgentMail signed webhook]
  Hook --> DB
  User --> Upload[Manual PDF or image upload]
  Upload --> Storage[Private Convex storage references]
  DB --> Extract[OpenAI quoted-field extraction]
  Storage --> Extract
  Extract --> Arithmetic[Deterministic quote arithmetic]
  Arithmetic --> DB
  DB --> Live[Reactive comparison and history]
  Live --> UI
```

Owner checks protect event access. Convex rate limits bound search, extraction, upload and mail requests. Discovery produces leads, not verified availability or price promises. Sending needs buyer approval; one optional clarification may follow. The model extracts terms; it never calculates totals.

API keys and webhook signing secrets stay on the backend. Original documents reach OpenAI for extraction. Fictional examples require no outbound mail.
