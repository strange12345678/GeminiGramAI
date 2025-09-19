import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const enhancePrompt = async ({
  originalPrompt,
  style = "realistic",
  logger,
}: {
  originalPrompt: string;
  style?: string;
  logger?: IMastraLogger;
}) => {
  logger?.info("🎨 [PromptEnhancer] Starting prompt enhancement", { 
    originalPrompt: originalPrompt.substring(0, 100),
    style 
  });
  
  try {
    if (!originalPrompt || originalPrompt.trim().length === 0) {
      throw new Error("Original prompt cannot be empty");
    }
    
    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: `You are an expert at creating detailed, high-quality prompts for AI image generation. 

Your task is to enhance this user prompt: "${originalPrompt}"

Style preference: ${style}

Please enhance this prompt by:
1. Adding specific visual details (lighting, composition, colors)
2. Including artistic style information 
3. Specifying image quality descriptors
4. Making it more descriptive while keeping the core intent
5. Ensuring it's suitable for image generation APIs

Keep the enhanced prompt under 400 characters and make it natural and flowing.

Return ONLY the enhanced prompt text, nothing else:`,
    });

    const enhancedPrompt = text.trim();
    
    logger?.info("🎨 [PromptEnhancer] Successfully enhanced prompt", {
      originalLength: originalPrompt.length,
      enhancedLength: enhancedPrompt.length,
    });

    return {
      success: true,
      enhancedPrompt: enhancedPrompt,
      originalPrompt: originalPrompt,
      style: style,
      message: "Successfully enhanced prompt using Gemini AI",
    };
  } catch (error) {
    logger?.error("🎨 [PromptEnhancer] Error enhancing prompt", { 
      error: error instanceof Error ? error.message : String(error),
      originalPrompt: originalPrompt.substring(0, 100) 
    });
    
    // Fallback: return original prompt with basic enhancements
    const fallbackPrompt = `${originalPrompt}, high quality, detailed, ${style} style, professional photography`;
    
    return {
      success: false,
      enhancedPrompt: fallbackPrompt,
      originalPrompt: originalPrompt,
      style: style,
      message: `Prompt enhancement failed, using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const promptEnhancerTool = createTool({
  id: "enhance-prompt-tool",
  description: `Uses Gemini AI to enhance user prompts for better image generation results. Adds artistic details, style information, and quality descriptors.`,
  inputSchema: z.object({
    originalPrompt: z.string().describe("The original user prompt to enhance"),
    style: z.string().default("realistic").describe("Desired artistic style (realistic, artistic, cartoon, etc.)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    enhancedPrompt: z.string(),
    originalPrompt: z.string(),
    style: z.string(),
    message: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ context: { originalPrompt, style }, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🔧 [PromptEnhancerTool] Starting execution with params:", { 
      originalPrompt: originalPrompt.substring(0, 50),
      style 
    });
    
    const result = await enhancePrompt({ originalPrompt, style, logger });
    
    logger?.info("✅ [PromptEnhancerTool] Completed successfully, returning:", {
      success: result.success,
      promptLengthChange: `${result.originalPrompt.length} -> ${result.enhancedPrompt.length}`,
    });
    return result;
  },
});