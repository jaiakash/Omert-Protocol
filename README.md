# Omertà Protocol - Social Deduction Game

A self-hosted, web-based social deduction game inspired by Mafia and Among Us.

## 🚀 Quick Start with Docker

The easiest way to run Omertà Protocol is using Docker Compose.

1. **Clone the repository** (if you haven't already).
2. **Launch with Compose**:
   ```bash
   docker-compose up --build
   ```
3. **Access the Game**:
   - Game & API: [http://localhost:3001](http://localhost:3001)

## 🛠 Manual Setup

### Backend (Node.js)
```bash
cd server
npm install
npm start
```

### Frontend (React + Vite)
```bash
cd client
npm install
npm run dev
```

## 🎭 How to Play
1. Open the game in at least 4 browser tabs.
2. Enter an alias in each tab.
3. One player clicks **NEW SESSION** to create a lobby.
4. Other players enter the lobby code and click **JOIN**.
5. Once everyone is in, the host clicks **INITIATE PROTOCOL**.

## ⚙️ Configuration
By default, the client looks for the backend at `http://localhost:3001`. If you are deploying to a server, update the `VITE_SOCKET_URL` argument in `docker-compose.yml` or your `.env` file before building.
