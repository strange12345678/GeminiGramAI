import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";

const generateImage = async ({
  prompt,
  width = 1024,
  height = 1024,
  logger,
}: {
  prompt: string;
  width?: number;
  height?: number;
  logger?: IMastraLogger;
}) => {
  logger?.info("🎨 [ImageGeneration] Starting image generation with Pollinations.ai", { 
    prompt: prompt.substring(0, 100), 
    width, 
    height 
  });
  
  try {
    // Input validation
    if (!prompt || prompt.trim().length === 0) {
      throw new Error("Prompt cannot be empty");
    }
    
    if (prompt.length > 500) {
      logger?.warn("🎨 [ImageGeneration] Prompt too long, truncating", { originalLength: prompt.length });
      prompt = prompt.substring(0, 500);
    }
    
    // Ensure reasonable size limits
    width = Math.min(Math.max(width, 256), 1024);
    height = Math.min(Math.max(height, 256), 1024);
    
    // Encode prompt for URL
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=random`;
    
    logger?.info("🎨 [ImageGeneration] Fetching from Pollinations.ai", { url: imageUrl });
    
    // Fetch image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TelegramBot/1.0',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Pollinations API failed: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid content type received: ${contentType}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    logger?.info("🎨 [ImageGeneration] Successfully generated image", {
      promptLength: prompt.length,
      imageSize: imageBuffer.byteLength,
      mimeType: contentType,
    });
    
    return {
      success: true,
      imageBase64: imageBase64,
      mimeType: contentType,
      message: `✅ Successfully generated image using free AI service for: "${prompt}"`,
      originalPrompt: prompt,
      imageUrl: imageUrl, // Include URL for potential direct use
    };
    
  } catch (error) {
    logger?.error("🎨 [ImageGeneration] Error generating image", { 
      error: error instanceof Error ? error.message : String(error), 
      prompt: prompt.substring(0, 100) 
    });
    
    return {
      success: false,
      imageBase64: null,
      mimeType: null,
      message: `❌ Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Will try ASCII art fallback.`,
      originalPrompt: prompt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const imageGenerationTool = createTool({
  id: "generate-image-tool",
  description: `Generates actual images using free Pollinations.ai service based on text prompts. Returns base64-encoded image data for successful generations.`,
  inputSchema: z.object({
    prompt: z.string().describe("The text prompt describing what image to generate"),
    width: z.number().default(1024).describe("Image width in pixels (256-1024)"),
    height: z.number().default(1024).describe("Image height in pixels (256-1024)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    imageBase64: z.string().nullable(),
    mimeType: z.string().nullable(),
    message: z.string(),
    originalPrompt: z.string(),
    imageUrl: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context: { prompt, width, height }, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🔧 [ImageGenerationTool] Starting execution with params:", { 
      prompt: prompt.substring(0, 50), 
      width, 
      height 
    });
    
    const result = await generateImage({ prompt, width, height, logger });
    
    logger?.info("✅ [ImageGenerationTool] Completed successfully, returning:", {
      success: result.success,
      hasImage: !!result.imageBase64,
      messageLength: result.message.length,
    });
    return result;
  },
});