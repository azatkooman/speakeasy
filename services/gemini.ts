import { GoogleGenAI } from "@google/genai";

/**
 * Suggests a label for an image using the Gemini API.
 * Uses gemini-3-flash-preview as recommended for basic multimodal tasks.
 */
export const suggestLabelFromImage = async (base64Image: string, mimeType: string): Promise<string> => {
  // Always use the API key directly from process.env.API_KEY as per instructions.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API Key available for Gemini");
    return "";
  }

  try {
    // Initialize the Gemini API client using the named parameter apiKey.
    const ai = new GoogleGenAI({ apiKey });
    
    // Generate content using the recommended gemini-3-flash-preview model.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "What is this single object? Respond with ONLY one or two simple words suitable for a child's communication card (e.g., 'Apple', 'Happy Dog', 'Running'). Do not add periods or other text.",
          },
        ],
      },
    });

    // Access the .text property directly from the GenerateContentResponse object.
    const text = response.text;
    return text?.trim() || "";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "";
  }
};