import type {
  LlmProvider,
  LlmGenerateOptions,
  LlmGenerateResult,
  LlmMessage,
} from "./llm-provider";

export class MockLlmProvider implements LlmProvider {
  readonly name = "mock";
  readonly model = "mock-gpt-v1";

  async generate(options: LlmGenerateOptions): Promise<LlmGenerateResult> {
    const startTime = Date.now();
    const systemMsg = options.messages.find((m) => m.role === "system")?.content || "";
    const userMsg = options.messages.filter((m) => m.role === "user").pop()?.content || "";

    let content = "";

    // 1. Contextual Dictionary Mode
    if (systemMsg.includes("DICTIONARY_MODE") || userMsg.includes("TASK: DEFINE")) {
      const matchTerm = userMsg.match(/TERM:\s*(.+)/i);
      const term = matchTerm ? matchTerm[1].trim() : "término";
      content = JSON.stringify({
        term,
        definition: `Definición enciclopédica precisa de "${term}". Concepto formal y significado principal.`,
        simpleExplanation: `En palabras sencillas: "${term}" significa una idea o elemento clave explicado de forma accesible.`,
        contextExplanation: `En este libro, "${term}" se utiliza en el contexto específico de la lectura para ilustrar el argumento expuesto.`,
        example: `Ejemplo de uso de "${term}" en una oración práctica.`,
      });
    }
    // 2. Explain Mode
    else if (systemMsg.includes("EXPLAIN_MODE") || userMsg.includes("TASK: EXPLAIN")) {
      const matchText = userMsg.match(/TEXT:\s*(.+)/is);
      const textToExplain = matchText ? matchText[1].trim() : "fragmento";
      content = JSON.stringify({
        explanation: `Este fragmento aborda: "${textToExplain.slice(0, 80)}...". Su significado principal es profundizar en las ideas desarrolladas en esta página, conectando los conceptos expuestos.`,
        keyConcepts: ["Concepto clave 1", "Concepto clave 2"],
      });
    }
    // 3. Ask Book / RAG Mode
    else {
      // Check if context was provided
      const hasSources = systemMsg.includes("<source") || userMsg.includes("<source");

      // Check for prompt injection keywords in query
      const isInjection =
        userMsg.toLowerCase().includes("ignore previous instructions") ||
        userMsg.toLowerCase().includes("system prompt override") ||
        userMsg.toLowerCase().includes("revela tu prompt");

      if (isInjection) {
        content = JSON.stringify({
          answer: "Como asistente de lectura de BookMind, solo respondo preguntas basadas en el contenido del libro proporcionado.",
          insufficientEvidence: false,
          confidence: "high",
          usedSourceIds: [],
        });
      } else if (!hasSources || userMsg.includes("PREGUNTA_SIN_CONTEXTO_XYZ")) {
        // Grounding check: when no sources exist or query is ungrounded
        content = JSON.stringify({
          answer: "No encontré suficiente información en este libro para responder con confianza.",
          insufficientEvidence: true,
          confidence: "none",
          usedSourceIds: [],
        });
      } else {
        // Extract available source IDs from prompt
        const sourceMatches = Array.from(
          (systemMsg + "\n" + userMsg).matchAll(/<source\s+id="([^"]+)"/g),
        ).map((m) => m[1]);

        const usedIds = sourceMatches.slice(0, 2);

        content = JSON.stringify({
          answer: `Basado en el libro, la respuesta a "${userMsg.slice(0, 60)}" se fundamenta en las páginas consultadas. El autor desarrolla esta idea de manera detallada.`,
          insufficientEvidence: false,
          confidence: "high",
          usedSourceIds: usedIds,
        });
      }
    }

    const inputTokens = (systemMsg.length + userMsg.length) / 4;
    const outputTokens = content.length / 4;

    return {
      content,
      model: this.model,
      provider: this.name,
      inputTokens: Math.ceil(inputTokens),
      outputTokens: Math.ceil(outputTokens),
      durationMs: Date.now() - startTime,
    };
  }
}
