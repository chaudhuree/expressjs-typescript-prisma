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
    // Preload unseen counters for this user across these conversations to avoid N+1
    const convoIds = conversations.map((c) => c.id)
    let unseenMap = new Map<string, number>()
    const pAny = prisma as any
    if (pAny?.unseenCounter?.findMany) {
      const unseenCounters = await pAny.unseenCounter.findMany({
        where: { userId, conversationId: { in: convoIds } },
        select: { conversationId: true, count: true },
      })
      unseenMap = new Map<string, number>(
        (unseenCounters as Array<{ conversationId: string; count: number }>).map((u) => [u.conversationId, u.count])
      )
    }

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
        const unseenCount = unseenMap.get(c.id) || 0;
        return { conversation: c, otherUser, lastMessage, unseenCount };
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

    // Increment unseen counter for the receiver (if model exists)
    const pAny = prisma as any
    if (pAny?.unseenCounter?.upsert) {
      await pAny.unseenCounter.upsert({
        where: { conversationId_userId: { conversationId: convo.id, userId: otherUserId } },
        update: { count: { increment: 1 } },
        create: { conversationId: convo.id, userId: otherUserId, count: 1 },
      })
    }

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

    // Reset unseen counter to 0 for current user in this conversation (if model exists)
    const pAny2 = prisma as any
    if (pAny2?.unseenCounter?.upsert) {
      await pAny2.unseenCounter.upsert({
        where: { conversationId_userId: { conversationId: convo.id, userId: currentUserId } },
        update: { count: 0 },
        create: { conversationId: convo.id, userId: currentUserId, count: 0 },
      })
    }
    // Notify sender that their messages were seen
    const io = getIO();
    io?.to(otherUserId).emit("message:seen", {
      conversationId: convo.id,
      seenBy: currentUserId,
    });
    return { updated: result.count };
  },
};
