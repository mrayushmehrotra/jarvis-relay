# Jarvis Mobile — Full Stack Build Plan

## Goal

Build a 3-component system that lets you trigger your entire Jarvis/FRIDAY workflow from your Android phone, anywhere in the world, using a self-owned WebSocket relay.

---

## Architecture Overview

```
📱 Expo App (Android)
     ↕ WebSocket (wss://)
☁️  PartyKit Relay Server  ←── free, always-on, deployed on partykit.dev
     ↕ WebSocket (wss://)
🖥️  ws_agent.py on Jarvis PC  ←── outbound-only, no ports needed
     ↓ Python function calls
🤖  jarvis.py / enhanced.py / autonomous.py
```

---

## Components to Build

### 1. PartyKit Relay Server (`jarvis-relay/`)

- New project at `/home/ayush/personal/jarvis-relay/`
- TypeScript PartyKit server
- Routes messages between "agent" (PC) and "phone" (Expo app)
- Secret-key authentication to lock out randoms
- Handles PC disconnect/reconnect gracefully

### 2. Python WS Agent (`friday/ws_agent.py`)

- Runs on Jarvis PC permanently (or on-demand)
- Connects to PartyKit relay as `role=agent`
- Auto-reconnects on disconnects
- Routes incoming commands to jarvis.py / enhanced.py / autonomous.py
- Returns structured JSON responses (text + metadata)

### 3. Expo Android App (`jarvis-mobile/`)

- New Expo + TypeScript project
- Dark, premium UI with cyan/blue accent (matching FRIDAY aesthetic)
- WebSocket hook connecting to PartyKit relay as `role=phone`
- Features:
  - Voice input (expo-speech + device mic)
  - TTS playback of Jarvis responses
  - Quick action tiles for common commands
  - Live status indicator (PC online/offline)
  - Chat-style conversation history
  - Haptic feedback

---

## File Structure

```
/home/ayush/personal/
├── friday/
│   └── ws_agent.py          [NEW] Python WS relay client
│
└── jarvis-relay/            [NEW] PartyKit project
    ├── package.json
    ├── partykit.json
    └── src/
        └── server.ts

/home/ayush/personal/jarvis-mobile/   [NEW] Expo app
├── package.json
├── app.json
├── App.tsx
├── src/
│   ├── hooks/
│   │   └── useJarvisSocket.ts
│   ├── screens/
│   │   └── HomeScreen.tsx
│   └── components/
│       ├── CommandCard.tsx
│       ├── ChatBubble.tsx
│       └── StatusBar.tsx
```

---

## Security

- Shared secret key in env vars on both PC agent and Expo app
- PartyKit server validates secret before accepting connections

---

## Verification Plan

1. Deploy PartyKit relay → get wss:// URL
2. Run ws_agent.py on PC → verify "Agent connected" in relay logs
3. Start Expo app → verify "Phone connected"
4. Send command from phone → verify execution on PC → response appears on phone
