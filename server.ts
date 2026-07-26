import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Cloud storage in memory for cross-session cloud sync simulation
let cloudProjectsStore: any[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support high payload for base64 image strings
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Gemini AI SDK server-side
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // --- API ROUTES ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // AI Image Edit Endpoint using Gemini Image Model
  app.post("/api/ai/edit-image", async (req, res) => {
    try {
      const { imageBase64, prompt, toolType, targetRegionPrompt, aspectRatio } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (!process.env.GEMINI_API_KEY || !ai) {
        console.warn("GEMINI_API_KEY is missing. Returning simulated AI edit response.");
        // Simulated fallback response when key is missing
        return res.json({
          success: true,
          imageUrl: imageBase64, // Keep existing image with clear status note
          isSimulated: true,
          message: "Note: Gemini API key is missing in environment. Real AI editing requires GEMINI_API_KEY.",
          promptUsed: prompt
        });
      }

      // Construct detailed AI instruction based on tool type
      let detailedPrompt = prompt;
      if (toolType === "object_replace") {
        detailedPrompt = `In this image, locate the object specified as "${targetRegionPrompt || 'selected object'}" and replace it with: ${prompt}. Ensure lighting, shadows, and surroundings blend naturally and photorealistically.`;
      } else if (toolType === "remove_object") {
        detailedPrompt = `In this image, erase and remove the "${targetRegionPrompt || prompt}" completely. Seamlessly fill in the background, matching textures and lighting as if the object was never there.`;
      } else if (toolType === "add_element") {
        detailedPrompt = `In this image, add ${prompt} ${targetRegionPrompt ? `at/on ${targetRegionPrompt}` : 'naturally into the scene'}. Match camera depth of field, perspective, and lighting.`;
      } else if (toolType === "change_background") {
        detailedPrompt = `Change the background of this photo to: ${prompt}. Keep the main foreground subjects completely sharp, intact, and naturally integrated with the new background environment.`;
      } else if (toolType === "style_transfer") {
        detailedPrompt = `Transform the artistic style of this photo into ${prompt} style, maintaining the overall composition and recognizable subjects.`;
      } else if (toolType === "recolor") {
        detailedPrompt = `Change the color of ${targetRegionPrompt || 'the main object'} to ${prompt} while preserving shadows and realistic material reflections.`;
      } else if (toolType === "fashion_change") {
        detailedPrompt = `In this photo, modify or replace the person's attire, clothing, shoes, or accessories (${targetRegionPrompt || 'clothing/accessories'}) with: ${prompt}. Ensure realistic clothing drape, realistic fabric textures, proper body alignment, lighting, and seamless photorealistic integration.`;
      }

      // Extract raw base64 string and mime type if available
      let cleanBase64 = imageBase64;
      let mimeType = "image/png";

      if (imageBase64 && imageBase64.includes(";base64,")) {
        const parts = imageBase64.split(";base64,");
        mimeType = parts[0].replace("data:", "") || "image/png";
        cleanBase64 = parts[1];
      }

      const contentsParts: any[] = [];
      if (cleanBase64) {
        contentsParts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType
          }
        });
      }
      contentsParts.push({ text: detailedPrompt });

      console.log(`Calling Gemini image model (gemini-3.1-flash-lite-image) with prompt: "${detailedPrompt.slice(0, 80)}..."`);

      // Call Gemini 3.1 Flash Lite Image model
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: { parts: contentsParts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || "1:1",
          }
        }
      });

      let generatedImageUrl: string | null = null;
      let modelTextOutput: string | null = null;

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            const resMime = part.inlineData.mimeType || "image/png";
            generatedImageUrl = `data:${resMime};base64,${base64Data}`;
          } else if (part.text) {
            modelTextOutput = part.text;
          }
        }
      }

      if (generatedImageUrl) {
        return res.json({
          success: true,
          imageUrl: generatedImageUrl,
          promptUsed: detailedPrompt,
          modelNotes: modelTextOutput
        });
      } else {
        return res.status(500).json({
          error: "Model did not return an image part.",
          details: modelTextOutput || "No image generated"
        });
      }

    } catch (error: any) {
      console.error("AI image edit endpoint error:", error);
      return res.status(500).json({
        error: "AI image edit request failed",
        message: error.message || "An unexpected error occurred"
      });
    }
  });

  // AI Prompt Suggestions Endpoint
  app.post("/api/ai/suggest-prompts", async (req, res) => {
    try {
      const { imageDescription } = req.body;
      if (!process.env.GEMINI_API_KEY || !ai) {
        return res.json({
          suggestions: [
            "Change red car to futuristic blue sports car",
            "Add a cute sleeping cat on the chair",
            "Replace background with sunset beach",
            "Transform into impressionist oil painting"
          ]
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Given an image of "${imageDescription || 'a subject'}", suggest 4 creative and specific object-level editing ideas (like replacing objects, adding elements, changing backgrounds, or recoloring). Return ONLY a JSON array of 4 short string ideas.`
      });

      const text = response.text || "";
      let suggestions: string[] = [];
      try {
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      } catch {
        suggestions = [
          "Replace main object with futuristic neon version",
          "Change background to golden hour sunset",
          "Add soft ambient warm lighting and glow",
          "Transform into watercolor artwork"
        ];
      }

      res.json({ suggestions });
    } catch {
      res.json({
        suggestions: [
          "Replace main object with futuristic neon version",
          "Change background to golden hour sunset",
          "Add soft ambient warm lighting and glow",
          "Transform into watercolor artwork"
        ]
      });
    }
  });

  // Cloud Sync Endpoints
  app.post("/api/cloud/sync", (req, res) => {
    const { projects } = req.body;
    if (Array.isArray(projects)) {
      cloudProjectsStore = projects;
    }
    res.json({ success: true, count: cloudProjectsStore.length, timestamp: Date.now() });
  });

  app.get("/api/cloud/data", (req, res) => {
    res.json({ projects: cloudProjectsStore, timestamp: Date.now() });
  });

  // Vite Middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
