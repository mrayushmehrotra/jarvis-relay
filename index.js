/**
 * JARVIS WebSocket Relay Server
 * Deploys on Render (Free Tier) — acts as a persistent message broker
 * between your Android phone (Expo) and your Jarvis PC agent.
 *
 * Connection URL format:
 *   wss://jarvis-relay.onrender.com?role=agent&secret=YOUR_SECRET
 *   wss://jarvis-relay.onrender.com?role=phone&secret=YOUR_SECRET
 */

const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");
const http = require("http");
const { URL } = require("url");

// ── Config ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
const SECRET = process.env.JARVIS_SECRET || "change-me-to-a-strong-secret";

// ── State ─────────────────────────────────────────────────────────────────────
/** @type {WebSocket | null} The single Jarvis PC agent connection */
let agentSocket = null;
let agentConnectedAt = null;

/** @type {string | null} The current phone pairing token, registered by the agent */
let phoneToken = null;

/** @type {Set<WebSocket>} All connected phone clients */
const phoneClients = new Set();

// ── Express + HTTP server ─────────────────────────────────────────────────────
const app = express();

app.get("/", (_req, res) => {
  res.json({
    service: "FRIDAY Relay",
    status: "online",
    agent_connected: agentSocket !== null,
    phone_clients: phoneClients.size,
    pairing_token_registered: phoneToken !== null,
    agent_connected_at: agentConnectedAt,
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// Health check endpoint for Render
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);

// ── WebSocket Server ──────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

/**
 * Broadcast a JSON message to all connected phone clients.
 * @param {object} payload
 */
function broadcastToPhones(payload) {
  const raw = JSON.stringify(payload);
  for (const client of phoneClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(raw);
    }
  }
}

/**
 * Send agent status update to all phones.
 * @param {"online"|"offline"} status
 */
function sendAgentStatus(status) {
  broadcastToPhones({
    type: "agent_status",
    status,
    timestamp: new Date().toISOString(),
  });
}

wss.on("connection", (ws, req) => {
  // Parse query params from the upgrade request URL
  const url = new URL(req.url, `ws://localhost`);
  const role = url.searchParams.get("role");
  const secret = url.searchParams.get("secret");

  // ── Auth check ──────────────────────────────────────────────────────────────
  if (secret !== SECRET) {
    console.warn(`[AUTH] Rejected connection — invalid secret (role=${role})`);
    ws.close(4001, "Unauthorized: invalid secret");
    return;
  }

  // ── Agent (Jarvis PC) connection ─────────────────────────────────────────────
  if (role === "agent") {
    if (agentSocket && agentSocket.readyState === WebSocket.OPEN) {
      // Kick the old agent and replace
      console.log("[RELAY] New agent connected — replacing previous agent.");
      agentSocket.close(4000, "Replaced by new agent connection");
    }

    agentSocket = ws;
    agentConnectedAt = new Date().toISOString();
    console.log(`[AGENT] ✅ Jarvis PC connected at ${agentConnectedAt}`);
    sendAgentStatus("online");

    ws.on("message", (raw) => {
      // Agent → phones: forward the response
      try {
        const msg = JSON.parse(raw.toString());

        // Control messages the agent sends us, not the phones
        if (msg.type === "register_phone_token") {
          phoneToken = String(msg.token || "");
          console.log(`[RELAY] Phone pairing token updated (${phoneToken.slice(0, 4)}…).`);
          // Rotating the token revokes every phone still holding the old one
          for (const client of phoneClients) {
            if (client.readyState === WebSocket.OPEN && client.pairToken !== phoneToken) {
              console.log("[RELAY] ⛔ Closing stale phone (old pairing token).");
              client.close(4003, "Pairing token rotated. Re-scan the QR.");
            }
          }
          return;
        }

        console.log(`[AGENT→PHONE] type=${msg.type}`);
        broadcastToPhones(msg);
      } catch (e) {
        console.error("[RELAY] Failed to parse agent message:", e.message);
      }
    });

    ws.on("close", () => {
      console.log("[AGENT] ⚠️  Jarvis PC disconnected");
      agentSocket = null;
      agentConnectedAt = null;
      sendAgentStatus("offline");
    });

    ws.on("error", (err) => {
      console.error("[AGENT] Socket error:", err.message);
    });

    return;
  }

  // ── Phone client connection ──────────────────────────────────────────────────
  if (role === "phone") {
    // Edge auth: if the PC has registered a pairing token, the phone MUST hold
    // it. Otherwise fall back to the shared secret (pre-pairing relay).
    const token = url.searchParams.get("token");
    if (phoneToken) {
      if (token !== phoneToken) {
        console.warn("[AUTH] Rejected phone — invalid pairing token");
        ws.close(4003, "Unauthorized: invalid pairing token. Scan the QR on your PC.");
        return;
      }
    } else if (secret !== SECRET) {
      console.warn("[AUTH] Rejected phone — invalid secret");
      ws.close(4001, "Unauthorized: invalid secret");
      return;
    }
    ws.pairToken = token;
    phoneClients.add(ws);
    console.log(`[PHONE] 📱 Client connected. Total phones: ${phoneClients.size}`);

    // Immediately tell the phone whether the PC is online
    ws.send(
      JSON.stringify({
        type: "agent_status",
        status: agentSocket && agentSocket.readyState === WebSocket.OPEN ? "online" : "offline",
        timestamp: new Date().toISOString(),
      })
    );

    ws.on("message", (raw) => {
      // Phone → Agent: forward the command
      try {
        const msg = JSON.parse(raw.toString());
        console.log(`[PHONE→AGENT] type=${msg.type} cmd="${msg.command ?? ""}"`);

        if (!agentSocket || agentSocket.readyState !== WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Jarvis PC is offline. Make sure ws_agent.py is running.",
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        agentSocket.send(raw.toString());
      } catch (e) {
        console.error("[RELAY] Failed to parse phone message:", e.message);
      }
    });

    ws.on("close", () => {
      phoneClients.delete(ws);
      console.log(`[PHONE] 📱 Client disconnected. Remaining: ${phoneClients.size}`);
    });

    ws.on("error", (err) => {
      console.error("[PHONE] Socket error:", err.message);
      phoneClients.delete(ws);
    });

    return;
  }

  // Unknown role
  console.warn(`[RELAY] Unknown role="${role}" — closing connection`);
  ws.close(4002, "Unknown role. Use ?role=agent or ?role=phone");
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         FRIDAY WebSocket Relay  —  Online            ║
╠══════════════════════════════════════════════════════╣
║  Port   : ${String(PORT).padEnd(43)}║
║  Secret : ${SECRET.slice(0, 6)}... (set JARVIS_SECRET env var)   ║
╚══════════════════════════════════════════════════════╝
  `);
});
