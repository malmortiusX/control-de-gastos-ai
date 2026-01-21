
import { GoogleGenAI, Type } from "@google/genai";
import { Expense, SpendingInsight } from "../types";

export const getFinancialInsights = async (expenses: Expense[]): Promise<SpendingInsight[]> => {
  if (expenses.length === 0) return [];

  // Initialize with the API key from environment variables as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  // Fix: Property 'category' does not exist on type 'Expense'. Changed to 'categoryName'.
  const expensesSummary = expenses.map(e => `${e.date}: ${e.amount}€ en ${e.categoryName} (${e.description})`).join('\n');

  const prompt = `Analiza los siguientes gastos personales y proporciona 3 consejos o insights financieros útiles.
  Gastos:
  ${expensesSummary}
  
  Devuelve la respuesta en formato JSON con una lista de objetos que tengan 'title', 'description' y 'type' (saving, warning, info).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING, description: "Puede ser 'saving', 'warning' o 'info'" }
                },
                required: ["title", "description", "type"]
              }
            }
          },
          required: ["insights"]
        }
      }
    });

    // Access the text property directly (not as a method)
    const jsonStr = response.text?.trim() || "{\"insights\": []}";
    const data = JSON.parse(jsonStr);
    return data.insights || [];
  } catch (error) {
    console.error("Error fetching insights:", error);
    return [{
      title: "IA no disponible",
      description: "No pudimos conectar con el analista inteligente en este momento.",
      type: "info"
    }];
  }
};
