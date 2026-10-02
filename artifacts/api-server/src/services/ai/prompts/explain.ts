import { BASE_SYSTEM_PROMPT } from "./system";

export const EXPLAIN_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

MODO: EXPLAIN_MODE
El lector ha seleccionado un fragmento o párrafo de texto y solicita una explicación pedagógica clara y fundamentada en el contexto del libro.
Debes responder en formato JSON estructurado con:
{
  "explanation": "Explicación detallada y pedagógica de la idea que expresa este pasaje dentro de la obra.",
  "keyConcepts": ["Concepto clave 1", "Concepto clave 2"]
}

Responde exclusivamente con el objeto JSON válido.
`.trim();

export function buildExplainUserPrompt(
  text: string,
  pageNumber: number,
  prefix?: string | null,
  suffix?: string | null,
): string {
  return [
    "TASK: EXPLAIN",
    `PAGE: ${pageNumber}`,
    prefix ? `PREFIX_CONTEXT: "${prefix}"` : "",
    `TEXT: "${text}"`,
    suffix ? `SUFFIX_CONTEXT: "${suffix}"` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
