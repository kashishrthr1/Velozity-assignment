# Velozity — Client Project Dashboard

A production-grade, end-to-end web application built for **Velozity Global Solutions** to manage client projects, track task progression, and monitor team activity in real time.

Built with a **React 18 + TypeScript + Vite + Tailwind CSS** frontend, an **Express + TypeScript + Socket.io** backend, and a relational **PostgreSQL** database managed via **Prisma ORM**.

---

## Table of Contents
1. [Seeded Demo Login Credentials](#seeded-demo-login-credentials)
2. [Architectural Decisions](#architectural-decisions)
3. [Database Schema & Indexing Strategy](#database-schema--indexing-strategy)
4. [Role-Based Access Control Matrix](#role-based-access-control-matrix)
5. [Local Development & Docker Setup](#local-development--docker-setup)
6. [Automated Test Suite](#automated-test-suite)
7. [Production Deployment Architecture](#production-deployment-architecture)
8. [Known Limitations](#known-limitations)
9. [Explanation Section](#explanation)

---

## Seeded Demo Login Credentials

The database comes pre-seeded with 7 user accounts across all 3 permission levels, 3 client companies, 3 projects with 17+ tasks in diverse lifecycle states, overdue tasks, and historical task logs:

| Role | Name | Email | Password | Scope & Permissions |
|---|---|---|---|---|
| **Admin** | Alex Admin | `admin@velozity.com` | `Admin@123` | Global visibility across all clients, projects, users, and real-time activity. Live presence monitoring. |
| **Project Manager 1** | Priya Mehta | `pm1@velozity.com` | `PMpass@123` | Manages TechCorp Redesign & Design Studio App projects. Cannot view/edit PM 2 projects. |
| **Project Manager 2** | Sam Torres | `pm2@velozity.com` | `PMpass@123` | Manages RetailPlus Platform. Cannot view/edit PM 1 projects. |
| **Developer 1** | Ravi Kumar | `dev1@velozity.com` | `Devpass@123` | Views and updates status only on tasks explicitly assigned to him. |
| **Developer 2** | Lena Schulz | `dev2@velozity.com` | `Devpass@123` | Views and updates status only on tasks explicitly assigned to her. |
| **Developer 3** | Marcus Lee | `dev3@velozity.com` | `Devpass@123` | Views and updates status only on tasks explicitly assigned to him. |
| **Developer 4** | Aisha Patel | `dev4@velozity.com` | `Devpass@123` | Views and updates status only on tasks explicitly assigned to her. |

---

## Architectural Decisions

### 1. WebSocket Layer: Socket.io vs. Native `ws`
* **Decision:** **Socket.io** (`^4.7.4`)
* **Rationale:** Real-time role filtering requires dynamically multiplexing users into fine-grained subscriptions (e.g., `role:ADMIN`, `project:<id>`, and `user:<id>`). Socket.io provides native room abstraction, automatic reconnection handling with backoff, built-in packet buffering, heartbeat/ping-pong health monitoring, and connection-level handshake authentication middleware. Handcrafting room-management, heartbeat pinging, and connection recovery on top of native `ws` introduces unnecessary maintenance overhead without measurable performance benefit at small-to-medium enterprise scale.

### 2. Background Jobs: `node-cron` vs. Bull / Redis
* **Decision:** **`node-cron`** (`^3.0.3`)
* **Rationale:** The business requirement for overdue task flagging is a scheduled, server-side cron sweep across active tasks where `dueDate < now() && status != 'DONE'`. Because this is a periodic batch scan rather than a high-throughput producer-consumer queue of unique individual jobs, introducing Bull would require provisioning and maintaining a Redis cluster solely for an interval timer. Using `node-cron` keeps our operational footprint lean, self-contained, and deterministic.

### 3. Backend Framework: Express vs. Fastify
* **Decision:** **Express** (`^4.18.3`)
* **Rationale:** Express provides battle-tested compatibility with Socket.io's HTTP server lifecycle (`http.createServer(app)`), native middleware composition (cookie parsing, helmet, rate limiting, and RBAC guards), and seamless integration with Prisma Client. While Fastify offers high raw synthetic throughput, Express provides predictable middleware chaining and zero impedance when sharing the underlying HTTP listener with WebSocket servers.

### 4. Token Storage & Session Hydration (Silent Refresh)
* **Decision:** **Short-lived in-memory Access Token (15m) + HttpOnly Refresh Cookie (7d)**
* **Rationale:** Storing tokens in `localStorage` or `sessionStorage` exposes sensitive user credentials to Cross-Site Scripting (XSS) extraction. In our architecture:
  - The JWT Access Token is kept strictly in React JavaScript runtime memory (via module scope & AuthContext).
  - The Refresh Token is issued inside an `HttpOnly`, `SameSite=None`, `Secure` cookie (with `SameSite=Lax` fallback in local development).
  - Backend CORS is configured with `credentials: true` and an explicit origin whitelist (`env.CORS_ORIGIN`).
  - **Silent Refresh on Mount:** To prevent page reload from causing an abrupt logout, `AuthContext` triggers an initial `/api/auth/refresh` round-trip upon component mount. If a valid refresh cookie exists, the session and user identity are instantly rehydrated before protected routes render.
  - An Axios response interceptor intercepts any subsequent `401 Unauthorized` responses and queues pending requests while executing a silent refresh exchange.

### 5. Client Creation Permission Model
* **Decision:** **Admin-Only Client Creation**
* **Rationale:** While both Admins and Project Managers can create projects and attach them to existing clients, client organization records (`Client`) represent commercial billing entities with corporate identity details. Restricting client creation and deletion to `ADMIN` prevents duplicate or inconsistent customer master records while allowing PMs full freedom to initiate projects for approved clients.

### 6. Relational Schema & ORM: Prisma
* **Decision:** **Prisma ORM** (`^5.10.0`)
* **Rationale:** Consistent TypeScript type generation from a single declarative schema eliminates data-layer drift between migrations and application code. No raw SQL strings are scattered throughout route controllers, ensuring that foreign key constraints, cascade behaviors, and connection pooling are unified.

---

## Database Schema & Indexing Strategy

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │       │     Client      │       │     Project     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ email (UQ)      │       │ name            │       │ name            │
│ passwordHash    │       │ email (UQ)      │◄──┐   │ description     │
│ name            │       │ phone           │   │   │ status          │
│ role            │       │ company         │   └───┤ clientId (FK)   │
│ isOnline        │       │ createdAt       │       │ createdById (FK)├─┐
│ lastSeen        │       └─────────────────┘       │ createdAt       │ │
│ createdAt       │                                 └─────────────────┘ │
└────────┬────────┘                                          ▲          │
         │                                                   │          │
         │           ┌───────────────────────────────────────┘          │
         │           │                                                  │
         │    ┌──────┴──────────┐       ┌───────────────────────────────┘
         │    │      Task       │       │
         │    ├─────────────────┤       │
         │    │ id (PK)         │       │
         │    │ title           │       │
         │    │ description     │       │
         └───►│ assignedToId(FK)│       │
              │ projectId (FK)  │       │
              │ status          │       │
              │ priority        │       │
              │ dueDate         │       │
              │ isOverdue       │       │
              │ createdById(FK) ├───────┘
              └────────┬────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│     TaskLog      │          │   ActivityFeed   │
├──────────────────┤          ├──────────────────┤
│ id (PK)          │          │ id (PK)          │
│ taskId (FK)      │          │ projectId (FK)   │
│ changedById (FK) │          │ userId (FK)      │
│ oldStatus        │          │ taskId (FK)      │
│ newStatus        │          │ actionType       │
│ note             │          │ message          │
│ createdAt        │          │ createdAt        │
└──────────────────┘          └──────────────────┘
```

### Purpose-Built Indexing Rationale:
- `Task(projectId)`: Accelerates project board and task list queries by project ID.
- `Task(assignedToId)`: Optimizes developer-specific task dashboard queries and role-isolated lookups.
- `Task(dueDate)`: Allows efficient date range filtering in project task filters and upcoming due date lookups.
- `Task(isOverdue)`: Minimizes index scan overhead during the 15-minute background cron sweep.
- `ActivityFeed(projectId)`, `ActivityFeed(userId)`, `ActivityFeed(createdAt DESC)`: Guarantees $O(\log N)$ retrieval for live feed timelines, role filters, and missed-event catch-up queries.
- `Notification(userId, isRead)`: Composite index enabling instant computation of unread notification badges.
- `RefreshToken(tokenHash)`: Constant-time hash verification on token rotation and logout.

---

## Role-Based Access Control Matrix

| Feature / Action | Admin | Project Manager | Developer |
|---|:---:|:---:|:---:|
| View All Projects Across Org | ✅ | ❌ (Own only) | ❌ (Assigned only) |
| Create Projects | ✅ | ✅ | ❌ |
| Edit / Delete Projects | ✅ | ✅ (Own only) | ❌ |
| Create Tasks & Assign Developers | ✅ | ✅ (Own projects) | ❌ |
| Update Task Status | ✅ | ✅ | ✅ (Assigned only) |
| Update Task Metadata (Title/Date) | ✅ | ✅ (Own projects) | ❌ |
| Manage Clients (Create / Edit) | ✅ | ❌ (View only) | ❌ |
| Manage Team Users (Create / Edit / Delete) | ✅ | ❌ | ❌ |
| Live Online Presence Counter | ✅ (Global) | ❌ | ❌ |
| Global Activity Feed | ✅ (Full org) | ❌ (Own projects) | ❌ (Assigned tasks) |
| Receive "In Review" Notification | ❌ | ✅ (Project owner) | ❌ |
| Receive "Assigned Task" Notification | ❌ | ❌ | ✅ |

*Enforced at the Express middleware layer with strict status code responses (`401 Unauthorized` for missing/invalid token, `403 Forbidden` for role or ownership violation).*

---

## Local Development & Docker Setup

### Prerequisites
- Node.js >= 20.0.0
- Docker and Docker Compose (optional, for containerized run)
- PostgreSQL (if running bare metal)

### Option A: Docker Compose (Recommended)
From the repository root:
```bash
# Build images and start Postgres, Backend, and Frontend containers
docker-compose up --build
```
- Frontend will be live at: `http://localhost:5174`
- Backend API will be live at: `http://localhost:3001`
- PostgreSQL database at: `localhost:5432`

### Option B: Bare-Metal Local Setup

1. **Clone & Setup Backend**:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   # Ensure PostgreSQL is running on port 5432 with velozity_db
   npx prisma migrate dev --name init
   # Seed demo accounts and data
   npm run db:seed
   # Start dev server
   npm run dev
   ```

2. **Setup Frontend**:
   ```bash
   cd ../frontend
   cp .env.example .env
   npm install
   npm run dev
   ```
   Open `http://localhost:5174` in your browser.

---

## Automated Test Suite

The test suite covers API authentication, role-checking middleware, PM ownership isolation, and missed-event catch-up scoping:

```bash
cd backend
npm test
```

### Verified Scenarios:
1. `Developer` token attempting to hit `/api/users` is rejected with `403 FORBIDDEN`.
2. `Project Manager` token attempting to hit `/api/users` is rejected with `403 FORBIDDEN`.
3. Forged JWT token signed with an invalid secret is rejected with `401 UNAUTHORIZED`.
4. `Developer` attempting to create a client is rejected with `403 FORBIDDEN`.
5. PM cannot read or edit a project created by a different PM (`PM Ownership Isolation`).
6. Catch-up endpoint requires `since` timestamp query parameter (`400 BAD REQUEST`).
7. Catch-up endpoint returns strictly the last 20 events scoped per role (Admin = Global, PM = Own Projects, Dev = Assigned Tasks).

---

## Production Deployment Architecture

### 1. Frontend (Vercel)
- Configured as a Vite SPA with `try_files /index.html` fallback.
- Environment variables:
  - `VITE_API_URL`: `https://api.your-velozity-backend.com`
  - `VITE_WS_URL`: `https://api.your-velozity-backend.com`

### 2. Backend & PostgreSQL (Railway / Render)
- Deployed as a stateful container or web service to support persistent WebSocket connections.
- Environment variables:
  - `DATABASE_URL`: `postgresql://user:pass@host:5432/velozity`
  - `JWT_ACCESS_SECRET`: `<64-byte-secure-hex>`
  - `JWT_REFRESH_SECRET`: `<64-byte-secure-hex>`
  - `COOKIE_SECRET`: `<secure-random-string>`
  - `CORS_ORIGIN`: `https://your-velozity-frontend.vercel.app`
  - `NODE_ENV`: `production`
- **Cross-Domain Cookie Configuration:** In production, cookies are issued with:
  ```ts
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  ```
  This ensures cross-origin cookie delivery between Vercel and Railway while preventing client-side script access.

---

## Known Limitations

1. **Single-Node Socket.io Adapter:** The WebSocket layer currently uses the default in-memory Socket.io adapter. For horizontal scaling across multiple container instances, a Redis adapter (`@socket.io/redis-adapter`) would be introduced so room broadcasts propagate across servers.
2. **Single Cron Runner:** The `node-cron` overdue checker runs in the backend server process. When running multiple backend replicas in production, a distributed lock (or pg_advisory_lock) should be added to prevent duplicate execution.
3. **Real-time Task Content Edits:** Currently, task status changes and assignment notifications stream in real time; rich concurrent text editing on task descriptions is not yet operational.

---

## Explanation

### The Hardest Problem Solved
The core technical challenge was architecting a strictly role-filtered real-time event pipeline that preserves audit integrity without leaking data across authorization boundaries. In many apps, WebSocket servers naively broadcast all mutations to a single channel while leaving filtering to client code—an unacceptable security compromise. Here, we implemented authenticated Socket.io connection handshakes that decode the JWT, verify user claims, and register sockets into role rooms (`role:ADMIN`), project rooms (`project:<id>`), and user channels (`user:<id>`). When a task status changes, the backend simultaneously records a permanent `TaskLog` row, writes to `ActivityFeed`, and selectively dispatches WebSocket payloads strictly to authorized rooms.

### Real-Time Role-Filtered Feed & Catch-Up
Admins join a global stream; PMs only join rooms for projects they created; Developers only receive updates for tasks assigned to them. When a client reconnects after temporary disconnection, the client emits a `catchup` message with the timestamp of the last seen event. The server executes a database query capped at `take: 20` using the index on `(createdAt DESC)`, applies role-based scoping at the query level, and sends the missed events back to the client.

### What I Would Do Differently With More Time
With more time, I would replace the single-node Socket.io in-memory store with `@socket.io/redis-adapter` and Redis Pub/Sub to allow horizontal backend scaling across multi-region Kubernetes pods, paired with PostgreSQL advisory locks (`pg_try_advisory_xact_lock`) for high-availability background cron execution.
