# YouTube Watch Party

A professional watch party application with real-time YouTube playback synchronization, role-based permissions, chat, reactions, and room management.

## Overview

This repository implements a collaborative watch party experience where users can create or join a room, watch YouTube videos together, and stay synchronized across all participants with live playback control and state updates.

The system uses Socket.IO for real-time event delivery, enforced by a backend room model that validates host and moderator permissions before applying any playback or participant actions.

## Features

- Create a room and become the Host
- Join a room via a unique code or shared link
- Embedded YouTube IFrame player with synced play/pause/seek
- Change video and synchronize new content for all participants
- Host can assign roles, transfer host rights, and remove participants
- Moderator playback support
- Watch-only mode for regular participants and viewers
- Live participant list with visible roles
- Chat messaging inside the room
- Live emoji reactions for shared moments
- Backend permission enforcement for all privileged actions
- Backend: Node.js, Express, Socket.IO
- Video player: YouTube IFrame Player API

## Local Setup

### Prerequisites

- Node.js 18+ installed
- npm installed
- Optional: MongoDB if persistent room storage is required

### Install dependencies

Install subproject dependencies separately (recommended):

```powershell
cd C:\Users\hp\Downloads\youtube-watch-party-mern
# Install backend deps
npm install --prefix server
# Install frontend deps
npm install --prefix client
```

### Run locally

```powershell
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

### Production build

```powershell
npm run build
```

### Start production server

```powershell
npm start
```

## Environment Variables

Create `server/.env` from `.env.example` and configure:

- `PORT` – server port (default 5000)
- `CLIENT_URL` – optional frontend origin for CORS

Notes:
- The app runs locally with in-memory room storage and does not require MongoDB.
- Authentication and JWT scaffolding were removed; this project uses in-memory participant identities for demo/sync only.

## Architecture

### Frontend

The React client handles room creation/join flow, participant role display, chat, reactions, and YouTube player synchronization. It listens for Socket.IO events and applies state updates to the UI and player.

### Backend

The Express server exposes REST APIs for room creation and management, and a Socket.IO layer for real-time room events. Room and participant state live in memory (no database required by default).

### Core modules

- `client/src/App.jsx` – main watch party UI, socket event wiring, YouTube player sync
- `server/src/services/Room.js` – room state, role logic, playback methods
- `server/src/services/MessageHandler.js` – Socket.IO event handling and validation
- `server/src/services/Participant.js` – participant role permissions

## Deployment

This app is ready for deployment on platforms that support Node.js and WebSockets, such as Render, Railway, or Heroku.

### Render

A `render.yaml` file is included for Render service configuration. After creating a service on Render:

1. Set the service to use the `main` branch.
2. Set the build command to `npm install && npm run install:all && npm run build`.
3. Set the start command to `npm start`.
4. Add environment variables in the Render dashboard:
   - `CLIENT_URL` to your Render app URL

> The placeholder `CLIENT_URL` in `render.yaml` must be replaced with your actual app URL after Render creates the service.

Use the production build and run the backend server from the project root.

## Repo

https://github.com/Surenderdubeyofficial/WatchParty

## Notes

- The app supports local demos without a database.
- Replace the live URL above with your public deployment address once available.

## Live Demo

Visit the deployed app here:

- https://watchparty-b1xp.onrender.com/room/OLC-BA3L
