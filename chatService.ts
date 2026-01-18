import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

export const sendMessageToAssistant = async (
  history: ChatMessage[],
  userMessage: string,
  context: string
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{
            text: `Current User Context: ${context}
            
            Chat History:
            ${history.map(m => `${m.role}: ${m.text}`).join('\n')}
            
            User: ${userMessage}`
          }]
        }
      ],
      config: {
        systemInstruction: `You are IDENTITY AGENT, a helpful AI support assistant for an Identity Verification (KYC) app.
        
        Guidelines:
        - Keep answers short, friendly, and professional.
        - If the user has camera issues, suggest checking browser permissions or lighting.
        - If the user asks about security, assure them data is encrypted locally.
        - Do not make up fake IDs.`,
      }
    });
    
    return response.text || "I'm having trouble connecting. Please try again.";
  } catch (err) {
    console.error(err);
    return "I am currently offline. Please try again later.";
  }
};