import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const generateAsciiArt = async ({
  prompt,
  logger,
}: {
  prompt: string;
  logger?: IMastraLogger;
}) => {
  logger?.info("🎨 [AsciiArt] Creating ASCII art fallback", { 
    prompt: prompt.substring(0, 100) 
  });
  
  try {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error("Prompt cannot be empty");
    }
    
    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: `You are an ASCII art generator. Create simple, recognizable ASCII art based on this prompt: "${prompt}"

Guidelines:
1. Keep it simple and recognizable
2. Use basic ASCII characters (letters, numbers, symbols)
3. Maximum 15 lines tall and 40 characters wide
4. Make it clean and readable in monospace font
5. Focus on the main subject of the prompt

Create ASCII art that represents: ${prompt}

Return only the ASCII art, no explanations or extra text:`,
    });

    const asciiArt = text.trim();
    
    // Also create a descriptive text
    const { text: description } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: `Create a vivid, detailed description of what an image would look like for this prompt: "${prompt}"

Include:
- Main subjects and objects
- Colors and lighting
- Composition and style
- Mood and atmosphere
- Artistic details

Keep it engaging and imaginative, about 2-3 sentences:`,
    });

    logger?.info("🎨 [AsciiArt] Successfully created ASCII art and description", {
      asciiLength: asciiArt.length,
      descriptionLength: description.length,
    });

    return {
      success: true,
      asciiArt: asciiArt,
      description: description.trim(),
      originalPrompt: prompt,
      message: "✨ Created ASCII art representation using Gemini AI",
    };
  } catch (error) {
    logger?.error("🎨 [AsciiArt] Error creating ASCII art", { 
      error: error instanceof Error ? error.message : String(error),
      prompt: prompt.substring(0, 100) 
    });
    
    // Simple fallback ASCII art
    const fallbackArt = `
    ¯\\_(ツ)_/¯
  Image generation
   failed, but I
    tried my best!
    `;
    
    return {
      success: false,
      asciiArt: fallbackArt,
      description: `I wanted to create something for "${prompt}" but encountered an error. Here's a friendly ASCII instead!`,
      originalPrompt: prompt,
      message: `ASCII art generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const asciiArtFallbackTool = createTool({
  id: "ascii-art-fallback-tool",
  description: `Creates ASCII art and descriptive text using Gemini AI as a fallback when image generation fails. Provides engaging text-based representation.`,
  inputSchema: z.object({
    prompt: z.string().describe("The prompt to create ASCII art for"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    asciiArt: z.string(),
    description: z.string(),
    originalPrompt: z.string(),
    message: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ context: { prompt }, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🔧 [AsciiArtFallbackTool] Starting execution with params:", { 
      prompt: prompt.substring(0, 50) 
    });
    
    const result = await generateAsciiArt({ prompt, logger });
    
    logger?.info("✅ [AsciiArtFallbackTool] Completed successfully, returning:", {
      success: result.success,
      artLength: result.asciiArt.length,
    });
    return result;
  },
});