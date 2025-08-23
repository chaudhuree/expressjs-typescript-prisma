import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ChatController } from "./chat.controller";
import z from "zod";

const router = express.Router();

const sendMessageValidation = z.object({
  body: z.object({
    content: z.string().min(1, "Message content is required"),
  }),
});

router.get("/conversations", auth("USER", "ADMIN"), ChatController.listConversations);

router.get("/messages/:userId", auth("USER", "ADMIN"), ChatController.listMessages);

router.post(
  "/messages/:userId",
  auth("USER", "ADMIN"),
  validateRequest(sendMessageValidation),
  ChatController.sendMessage
);

router.post(
  "/seen/:userId",
  auth("USER", "ADMIN"),
  ChatController.markSeen
);

export const ChatRoutes = router;
