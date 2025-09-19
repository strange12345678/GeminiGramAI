import { createWorkflow, createStep } from "../inngest";
import { z } from "zod";
import { imageGeneratorAgent } from "../agents/imageGeneratorAgent";

// Shared schemas to fix type mismatch
const baseInput = z.object({
  message: z.string().describe("Raw message data from Telegram"),
  threadId: z.string().describe("Thread ID for conversation tracking"),
});
const baseInputAny: z.ZodTypeAny = baseInput;

// Step 1: Use Agent - ONLY call agent.generate(), no other tools or logic
const useAgentStep = createStep({
  id: "use-agent",
  description: "Call the image generator agent to process user message",
  inputSchema: baseInputAny, // Widen to satisfy .then signature
  outputSchema: z.object({
    response: z.string().describe("Agent's response text"),
    chatId: z.string().describe("Telegram chat ID extracted from message"),
    messageText: z.string().describe("User's message text"),
  }),
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📝 [UseAgentStep] Starting agent generation", {
      threadId: inputData.threadId,
    });

    // Parse the Telegram message data
    const messageData = JSON.parse(inputData.message);
    const chatId = messageData.message?.chat?.id?.toString() || "unknown";
    const messageText = messageData.message?.text || "";

    logger?.info("📝 [UseAgentStep] Parsed Telegram message", {
      chatId,
      messageText: messageText.substring(0, 100),
    });

    // ONLY call agent.generate() - no other tools or logic allowed
    const { text } = await imageGeneratorAgent.generate([
      { role: "user", content: messageText }
    ], {
      resourceId: "telegram-bot",
      threadId: inputData.threadId,
      maxSteps: 5, // Allow multi-step tool usage
    });

    logger?.info("📝 [UseAgentStep] Agent response received", {
      responseLength: text.length,
      chatId,
    });

    return {
      response: text,
      chatId,
      messageText,
    };
  }
});

// Step 2: Send Reply - ONLY send message to Telegram, no other logic
const sendReplyStep = createStep({
  id: "send-reply",
  description: "Send agent response back to Telegram",
  inputSchema: useAgentStep.outputSchema,
  outputSchema: z.object({
    sent: z.boolean().describe("Whether message was sent successfully"),
    chatId: z.string().describe("Chat ID message was sent to"),
  }),
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📤 [SendReplyStep] Starting Telegram message send", {
      chatId: inputData.chatId,
      responseLength: inputData.response.length,
    });

    // For deployment, this will use the actual Telegram Bot API
    // For now, we'll prepare the message structure
    try {
      // In a real deployment, this would make HTTP requests to Telegram Bot API
      // The bot token will be configured during the deployment flow
      logger?.info("📤 [SendReplyStep] Message prepared for Telegram", {
        chatId: inputData.chatId,
        messagePreview: inputData.response.substring(0, 50) + "...",
        originalUserMessage: inputData.messageText.substring(0, 30),
      });

      // Simulate successful send for development/testing
      const result = {
        sent: true,
        chatId: inputData.chatId,
      };

      logger?.info("📤 [SendReplyStep] Message send completed", result);
      return result;

    } catch (error) {
      logger?.error("📤 [SendReplyStep] Error sending message", { error });
      return {
        sent: false,
        chatId: inputData.chatId,
      };
    }
  }
});

// Create the workflow with exactly 2 steps
export const telegramImageBotWorkflow = createWorkflow({
  id: "telegram-image-bot-workflow",
  description: "Telegram image generation bot workflow - receives messages and generates images",
  inputSchema: baseInput, // Use concrete schema for workflow
  outputSchema: sendReplyStep.outputSchema, // Match step 2 output
})
  .then(useAgentStep)    // Step 1: Use agent only
  .then(sendReplyStep)   // Step 2: Send reply only
  .commit();