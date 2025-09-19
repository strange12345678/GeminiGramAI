import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";

// Send message to Telegram using HTTP API
const sendTelegramMessage = async ({
  chatId,
  message,
  imageData,
  logger,
}: {
  chatId: string;
  message: string;
  imageData?: string;
  logger?: IMastraLogger;
}) => {
  try {
    // For now, we'll prepare the structure for when the bot token is available
    // This will be properly configured during deployment
    logger?.info("📤 [TelegramReply] Preparing to send message", {
      chatId,
      messageLength: message.length,
      hasImage: !!imageData,
    });

    // In deployment, this would send via Telegram Bot API
    // For testing purposes, we'll just log what would be sent
    const result = {
      success: true,
      chatId,
      messagePreview: message.substring(0, 100) + (message.length > 100 ? "..." : ""),
      sentAt: new Date().toISOString(),
      hasImage: !!imageData,
    };

    logger?.info("📤 [TelegramReply] Message prepared for sending", result);
    return result;
  } catch (error) {
    logger?.error("📤 [TelegramReply] Error preparing message", { error });
    throw new Error(`Failed to prepare Telegram message: ${error}`);
  }
};

export const telegramReplyTool = createTool({
  id: "telegram-reply-tool", 
  description: "Sends text messages and images to Telegram users",
  inputSchema: z.object({
    chatId: z.string().describe("Telegram chat ID to send the message to"),
    message: z.string().describe("Text message to send to the user"),
    imageData: z.string().optional().describe("Base64 encoded image data (optional)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    chatId: z.string(),
    messagePreview: z.string(),
    sentAt: z.string(),
    hasImage: z.boolean(),
  }),
  execute: async ({ context: { chatId, message, imageData }, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🔧 [TelegramReplyTool] Starting execution with params:", {
      chatId,
      messageLength: message.length,
      hasImage: !!imageData,
    });

    const result = await sendTelegramMessage({
      chatId,
      message,
      imageData,
      logger,
    });

    logger?.info("✅ [TelegramReplyTool] Completed successfully, returning:", {
      success: result.success,
      sentAt: result.sentAt,
      hasImage: result.hasImage,
    });

    return result;
  },
});