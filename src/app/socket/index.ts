import { Server as IOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import prisma from "../utils/prisma";
import { verifyToken } from "../utils/verifyToken";
import config from "../../config";

let io: IOServer | null = null;

export const initSocket = (server: HttpServer) => {
  io = new IOServer(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
      ],
      credentials: true,
    },
  });

  io.on("connection", async (socket: Socket) => {
    try {
      // get token from auth or headers
      const token = (socket.handshake.auth?.token as string)
        || (socket.handshake.headers["authorization"] as string)
        || "";
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

      // Mark online
      await prisma.user.update({ where: { id: user.id }, data: { isOnline: true } });

      // Broadcast presence (optional)
      socket.broadcast.emit("user:online", { userId: user.id });

      socket.on("disconnect", async () => {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { isOnline: false, lastSeen: new Date() },
          });
          socket.broadcast.emit("user:offline", { userId: user.id });
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      socket.disconnect(true);
    }
  });

  return io;
};

export const getIO = () => io;
