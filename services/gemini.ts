import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

export const suggestLabelFromImage = async (base64Image: string, mimeType: string): Promise<string> => {
  if (!apiKey) {
    console.warn("No API Key available for Gemini");
    return "";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "";
  }
};
