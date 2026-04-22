const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("baileys");
const P = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const http = require("http");

const SESSION_DIR = process.env.SESSION_DIR || "./auth_info";

async function startBot() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log("=== SCAN QR INI DENGAN WHATSAPP ===");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("WhatsApp bot connected");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log("Connection closed. Reconnect:", shouldReconnect);

      if (shouldReconnect) {
        startBot();
      } else {
        console.log("Logged out. Hapus folder auth_info lalu login ulang.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    console.log("Pesan masuk:", jid, text);

    if (text.toLowerCase() === "ping") {
      await sock.sendMessage(jid, { text: "pong" });
    } else if (text.toLowerCase() === "halo") {
      await sock.sendMessage(jid, { text: "Halo juga 👋" });
    } else {
      await sock.sendMessage(jid, {
        text: `Kamu kirim: ${text || "(pesan non-text)"}`
      });
    }
  });
}

const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("WhatsApp bot Railway aktif");
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`HTTP server aktif di ${PORT}`);
  });

startBot().catch(console.error);
