# Real-Time Multiplayer Tic-Tac-Toe

A production-ready, server-authoritative multiplayer Tic-Tac-Toe game powered by **Nakama** and **React**.

## Tech Stack
-   **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand, `@heroiclabs/nakama-js`
-   **Backend:** Nakama, PostgreSQL, TypeScript Server Runtime
-   **Infrastructure:** Docker, Docker Compose

## Features
-   Server-Authoritative Match Logic (Anti-Cheat)
-   Anonymous Authentication
-   Real-time Matchmaking & Gameplay via WebSockets
-   Dark-mode Neon UI (Glassmorphism & Micro-animations)
-   Timeout mechanism (30 seconds per turn)
-   Automatic disconnect handling

---

## Installation & Setup

### 1. Requirements
-   Docker & Docker Compose
-   Node.js (v18+)

### 2. Start Backend (Nakama & Postgres)
The Nakama server logic is already pre-compiled to `/server/build`.
To run the server environment:

```bash
docker compose up -d
```
*Nakama Console is available at http://localhost:7351 (admin/password)*


### 3. Run Frontend
In a new terminal:
```bash
cd client
npm ci
npm run dev
```

The game lobby will be available at http://localhost:5173. 
Open another incognito window to simulate two players!
