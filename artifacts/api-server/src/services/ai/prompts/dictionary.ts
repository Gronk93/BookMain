import { BASE_SYSTEM_PROMPT } from "./system";

export const DICTIONARY_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

MODO: DICTIONARY_MODE
El lector ha seleccionado un término o palabra para consultar en el Diccionario Contextual.
Debes generar una respuesta estructurada en formato JSON con exactamente estos 4 bloques:
{
  "term": "palabra o término",
  "definition": "Definición enciclopédica precisa y formal.",
  "simpleExplanation": "Explicación en lenguaje sencillo, directo y accesible sin jerga técnica.",
  "contextExplanation": "Cómo se usa específicamente este término en el contexto de este libro y fragmento.",
  "example": "Un ejemplo claro y representativo de uso en una oración."
}

Responde exclusivamente con el objeto JSON válido, sin preámbulos ni código markdown adicional.
`.trim();

export function buildDictionaryUserPrompt(
  term: string,
  pageNumber: number,
  contextSentence?: string | null,
): string {
  return [
    "TASK: DEFINE",
    `TERM: ${term}`,
    `PAGE: ${pageNumber}`,
    contextSentence ? `CONTEXT_SENTENCE: "${contextSentence}"` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
