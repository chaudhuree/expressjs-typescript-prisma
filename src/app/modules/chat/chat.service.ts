import prisma from "../../utils/prisma";
import { getIO } from "../../socket";

export const ChatService = {
  async listConversations(userId: string) {
    // Find conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: { participants: { has: userId } },
      orderBy: { updatedAt: "desc" },
    });

    // For each conversation, fetch the other participant and last message
    const enrichedRaw = await Promise.all(
      conversations.map(async (c) => {
        // Determine the other participant (skip malformed conversations)
        const otherUserId = (c.participants || []).find((p) => p && p !== userId);
        if (!otherUserId) {
          return null;
        }
        const [otherUser, lastMessage] = await Promise.all([
          prisma.user.findUnique({
            where: { id: otherUserId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isOnline: true,
              lastSeen: true,
            },
          }),
          prisma.message.findFirst({
            where: { conversationId: c.id },
            orderBy: { createdAt: "desc" },
          }),
        ]);
        if (!otherUser) return null;
        return { conversation: c, otherUser, lastMessage };
      })
    );

    return enrichedRaw.filter((x): x is NonNullable<typeof x> => Boolean(x));
  },

  async getOrCreateConversation(userA: string, userB: string) {
    const existing = await prisma.conversation.findFirst({
      where: { participants: { hasEvery: [userA, userB] } },
    });
    if (existing) return existing;

    const created = await prisma.conversation.create({
      data: {
        participants: [userA, userB],
      },
    });
    return created;
  },

  async listMessages(currentUserId: string, otherUserId: string, limit = 50, cursor?: string) {
    const convo = await this.getOrCreateConversation(currentUserId, otherUserId);

    const messages = await prisma.message.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    return { conversationId: convo.id, messages };
  },

  async sendMessage(currentUserId: string, otherUserId: string, content: string) {
    const convo = await this.getOrCreateConversation(currentUserId, otherUserId);

    const msg = await prisma.message.create({
      data: {
        conversationId: convo.id,
        senderId: currentUserId,
        receiverId: otherUserId,
        content,
      },
    });

    await prisma.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: msg.createdAt },
    });

    // Emit to both participants' rooms so inboxes update in realtime
    const io = getIO();
    io?.to(otherUserId).emit("message:new", { message: msg });
    io?.to(currentUserId).emit("message:new", { message: msg });

    return msg;
  },

  async markSeen(currentUserId: string, otherUserId: string) {
    const convo = await this.getOrCreateConversation(currentUserId, otherUserId);
    const result = await prisma.message.updateMany({
      where: {
        conversationId: convo.id,
        receiverId: currentUserId,
        seen: false,
      },
      data: { seen: true, seenAt: new Date() },
    });
    // Notify sender that their messages were seen
    const io = getIO();
    io?.to(otherUserId).emit("message:seen", {
      conversationId: convo.id,
      seenBy: currentUserId,
    });
    return { updated: result.count };
  },
};
