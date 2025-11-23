import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ScriptureResponse, QuizQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Text Generation ---

export const fetchScriptureData = async (query: string): Promise<ScriptureResponse> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Provide the bible verse text for: "${query}". 
    Also provide a simple explanation for a modern reader (kid-friendly).
    
    Crucially, break this passage down into 2-4 distinct visual scenes that tell the story.
    For each scene, provide:
    1. 'caption': A simple sentence describing exactly what is happening and who is there (e.g. "David picks up five smooth stones from the stream"). DO NOT use the word "stickman" or "illustration" in the caption. Focus on the characters and action.
    2. 'visualPrompt': A specific prompt to generate a "Stickman" style image for this scene.
    
    If the passage is abstract (like a Psalm), create metaphorical scenes (e.g. "A shepherd guiding a sheep").`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reference: { type: Type.STRING, description: "The book, chapter, and verse reference (e.g. John 3:16)" },
          verseText: { type: Type.STRING, description: "The full text of the verse(s)" },
          explanation: { type: Type.STRING, description: "A 2-3 sentence explanation of the meaning." },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                caption: { type: Type.STRING, description: "Story description of the event and characters." },
                visualPrompt: { type: Type.STRING, description: "Image generation prompt." }
              }
            }
          }
        },
        required: ["reference", "verseText", "explanation", "scenes"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No content returned from Gemini");
  }

  return JSON.parse(response.text) as ScriptureResponse;
};

// --- Quiz Generation ---

export const generateQuiz = async (reference: string, verseText: string): Promise<QuizQuestion[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Generate 3 multiple-choice quiz questions based on this Bible passage: "${reference}: ${verseText}".
    The questions should test understanding of the key events, characters, or teachings in this text.
    Return the result as a JSON array of objects.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "An array of 4 possible answers" 
            },
            correctAnswerIndex: { 
              type: Type.INTEGER, 
              description: "The index (0-3) of the correct answer in the options array" 
            }
          },
          required: ["question", "options", "correctAnswerIndex"]
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("No quiz content returned");
  }

  return JSON.parse(response.text) as QuizQuestion[];
};

// --- Image Generation ---

export const generateStickmanImage = async (prompt: string): Promise<string> => {
  const enhancedPrompt = `A simple, charming hand-drawn black ink on white paper stickman illustration. 
  Comic strip style. Minimalist. High contrast. 
  Scene description: ${prompt}. 
  Do not include any text inside the image.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: { parts: [{ text: enhancedPrompt }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        // No imageSize for flash-image, default is fine
      }
    }
  });

  // Iterate to find image part
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  throw new Error("No image generated");
};

// --- Live API Connection Helper ---

export const connectToLiveSession = async (
  onOpen: () => void,
  onMessage: (message: any) => void,
  onError: (e: any) => void,
  onClose: (e: any) => void
) => {
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: onOpen,
      onmessage: onMessage,
      onerror: onError,
      onclose: onClose,
    },
    config: {
      responseModalities: [Modality.AUDIO], 
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: `You are a wise, gentle, and humorous Bible study companion. 
      You help users understand scripture deeply but simply. 
      You love stickman drawings and often reference visual metaphors.
      Keep your responses concise and conversational.`,
    },
  });
};