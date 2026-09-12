# Velozity Technical Architecture Explanation

### 1. The Hardest Problem Solved
The most intricate challenge in this build was reconciling strict role-based data isolation with a low-latency, real-time WebSocket architecture. In standard REST endpoints, enforcing multi-tenant or ownership-level isolation is straightforward with route guards. In real-time WebSockets, however, naive implementations often broadcast mutations org-wide and expect the frontend to discard unauthorized frames—a severe data leak vulnerability. We solved this by enforcing zero-trust authorization at both the socket handshake and event-dispatch layers. Sockets are authenticated via JWT claims on connection and sorted into fine-grained server-side rooms (`role:ADMIN`, `project:<id>`, and `user:<id>`). Furthermore, every mutation executes an atomic database transaction that persists a `TaskLog` history row, registers an `ActivityFeed` record, and dispatches the WebSocket payload strictly to target rooms matching authorization boundaries.

### 2. Handling the Real-Time Role-Filtered Feed
The feed is partitioned dynamically:
- **Admin**: Automatically subscribed to the global room (`role:ADMIN`), receiving every status transition, assignment, and presence heartbeat across all company projects.
- **Project Manager**: Express checks verify project creator ownership before admitting sockets to `project:<id>` rooms. PMs only receive events for their own projects.
- **Developer**: Developers are restricted to task assignments; project rooms are filtered, and personal notifications are routed via private `user:<id>` channels.
- **Missed-Event Catch-Up**: On reconnection, clients emit a `catchup` payload with their last known event ISO timestamp. The server executes a database query with `take: 20` ordering by `createdAt DESC`, filtered by role ownership criteria at the PostgreSQL query level, guaranteeing seamless persistence across server restarts.

### 3. What I Would Do Differently With More Time
With additional time, I would decouple the WebSocket layer using `@socket.io/redis-adapter` over an AWS ElastiCache / Redis cluster to support stateless horizontal scaling across clustered container tasks. Additionally, I would introduce PostgreSQL row-level security (RLS) policies alongside Prisma middleware as defense-in-depth, and implement optimistic UI updates with automatic rollback for the Kanban task board.
