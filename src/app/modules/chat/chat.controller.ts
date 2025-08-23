import httpStatus from "http-status";
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ChatService } from "./chat.service";

const listConversations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const data = await ChatService.listConversations(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Conversations fetched",
    data,
  });
});

const listMessages = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const otherUserId = req.params.userId;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const cursor = req.query.cursor as string | undefined;
  const data = await ChatService.listMessages(userId, otherUserId, limit, cursor);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Messages fetched",
    data,
  });
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const otherUserId = req.params.userId;
  const { content } = req.body as { content: string };
  const msg = await ChatService.sendMessage(userId, otherUserId, content);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Message sent",
    data: msg,
  });
});

const markSeen = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const otherUserId = req.params.userId;
  const result = await ChatService.markSeen(userId, otherUserId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Messages marked as seen",
    data: result,
  });
});

export const ChatController = {
  listConversations,
  listMessages,
  sendMessage,
  markSeen,
};
