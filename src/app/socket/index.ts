import { Server as IOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import prisma from "../utils/prisma";
import { verifyToken } from "../utils/verifyToken";
import config from "../../config";

let io: IOServer | null = null;

// Track how many active socket connections each user has
const userConnections: Map<string, number> = new Map();

// Retry helper for Prisma deadlocks/write conflicts (P2034)
async function retryPrisma<T>(fn: () => Promise<T>, retries = 5, baseDelayMs = 50): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      // Prisma P2034: Transaction failed due to a write conflict or a deadlock
      if (err?.code === 'P2034') {
        lastErr = err;
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 20);
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export const initSocket = (server: HttpServer) => {
  io = new IOServer(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5000",
        "http://localhost:5173",
      ],
      credentials: true,
    },
  });

  io.on("connection", async (socket: Socket) => {
    console.log("[socket] connection attempt from", socket.handshake.address);
    try {
      // get token from auth, headers, or cookies
      let token = (socket.handshake.auth?.token as string)
        || (socket.handshake.headers["authorization"] as string)
        || "";

      if (!token) {
        const cookieHeader = socket.handshake.headers.cookie || "";
        const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
          const [k, ...v] = c.trim().split('=');
          return [decodeURIComponent(k), decodeURIComponent(v.join('='))];
        }));
        token = (cookies["accessToken"] as string) || "";
      }

      if (token && token.startsWith('Bearer ')) {
        token = token.slice('Bearer '.length).trim();
      }
      if (!token) {
        socket.disconnect(true);
        return;
      }
      const user = verifyToken(token, config.jwt.access_secret as string);
      if (!user?.id) {
        socket.disconnect(true);
        return;
      }

      // Join personal room
      socket.join(user.id);
      console.log(`[socket] ${user.id} joined personal room`);

      // Increment connection count and mark online on first connection only
      const prev = userConnections.get(user.id) || 0;
      const next = prev + 1;
      userConnections.set(user.id, next);
      if (next === 1) {
        await retryPrisma(() => prisma.user.update({ where: { id: user.id }, data: { isOnline: true } }));
      }

      // Broadcast online globally so user lists can refresh
      io?.emit("user:online", { userId: user.id });

      socket.on("disconnect", async () => {
        try {
          // Decrement connection count and mark offline on last disconnect only
          const prev = userConnections.get(user.id) || 1;
          const next = prev - 1;
          if (next > 0) {
            userConnections.set(user.id, next);
            return;
          }
          userConnections.delete(user.id);
          await retryPrisma(() => prisma.user.update({
            where: { id: user.id },
            data: { isOnline: false, lastSeen: new Date() },
          }));
          // Optionally notify only relevant contacts; currently broadcasting for simplicity
          io?.emit("user:offline", { userId: user.id });
        } catch (e) {
          // ignore
        }
      });

      // Handle sending messages via socket
      socket.on("message:send", async (
        payload: { to: string; content: string },
        ack?: (resp: { ok: boolean; message?: any; error?: string }) => void,
      ) => {
        try {
          const receiverId = payload?.to;
          const content = (payload?.content || "").trim();
          if (!receiverId || !content) {
            ack?.({ ok: false, error: "Invalid payload" });
            return;
          }

          // Ensure receiver exists
          const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
          if (!receiver) {
            ack?.({ ok: false, error: "Receiver not found" });
            return;
          }

          // Get or create conversation between user.id and receiverId
          let conversation = await prisma.conversation.findFirst({
            where: { participants: { hasEvery: [user.id, receiverId] } },
          });
          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: { participants: [user.id, receiverId] },
            });
          }

          // Create message
          const msg = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: user.id,
              receiverId,
              content,
            },
          });

          // Update conversation lastMessageAt
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: msg.createdAt },
          });

          // Emit to both participants' rooms
          io?.to(receiverId).emit("message:new", { message: msg });
          io?.to(user.id).emit("message:new", { message: msg });

          ack?.({ ok: true, message: msg });
        } catch (err: any) {
          console.error("[socket] message:send error", err);
          ack?.({ ok: false, error: err?.message || "Failed to send" });
        }
      });
    } catch (e) {
      console.error("[socket] auth/connection error", e);
      socket.disconnect(true);
    }
  });

  return io;
};

export const getIO = () => io;
