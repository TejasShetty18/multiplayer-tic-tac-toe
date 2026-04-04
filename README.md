# Real-Time Multiplayer Tic-Tac-Toe

A production-ready, server-authoritative multiplayer Tic-Tac-Toe game powered by **Nakama** and **React**.

---

## 1. Setup and Installation Instructions

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/en/) (v18+)

### A. Run the Backend locally (Nakama + PostgreSQL)
The Nakama server logic is pre-compiled to `/server/build`. To start the game server and database:
```bash
# In the root directory of the project
docker compose up -d
```
*Wait a few moments for the database to initialize. The Nakama developer console will be available at `http://localhost:7351` (Credentials: `admin`/`password`).*

### B. Run the Frontend locally
Open a new terminal and navigate to the client folder:
```bash
cd client
npm ci
npm run dev
```
*The local game client will run at `http://localhost:5173`. It connects automatically to your local Nakama environment via settings defined in `client/.env.development`.*

---