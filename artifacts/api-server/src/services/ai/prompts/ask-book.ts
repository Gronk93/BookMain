import { BASE_SYSTEM_PROMPT } from "./system";

export const ASK_BOOK_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

MODO: ASK_BOOK_MODE
El lector realiza una consulta o pregunta sobre el contenido del libro.
Debes apoyarte estrictamente en los fragmentos contenidos en las etiquetas <sources>.
Debes responder en formato JSON estructurado con:
{
  "answer": "Tu respuesta fundamentada.",
  "insufficientEvidence": false,
  "confidence": "high", // "high" | "medium" | "low" | "none"
  "usedSourceIds": ["id-fuente-1", "id-fuente-2"]
}

Si las fuentes no contienen suficiente evidencia o la pregunta es ajena al texto provisto, devuelve:
{
  "answer": "No encontré suficiente información en este libro para responder con confianza.",
  "insufficientEvidence": true,
  "confidence": "none",
  "usedSourceIds": []
}

Responde exclusivamente con el objeto JSON válido.
`.trim();

export function buildAskBookUserPrompt(
  question: string,
  isolatedContextXml: string,
  scope: string,
  scopeRef?: string | null,
): string {
  return [
    `SCOPE: ${scope}${scopeRef ? ` (${scopeRef})` : ""}`,
    isolatedContextXml,
    `QUESTION: ${question}`,
  ].join("\n\n");
}
