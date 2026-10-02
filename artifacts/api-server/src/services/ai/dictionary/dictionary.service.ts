import type { LlmProvider } from "../providers/llm-provider";
import {
  DICTIONARY_SYSTEM_PROMPT,
  buildDictionaryUserPrompt,
} from "../prompts/dictionary";

export interface DefineTermOptions {
  term: string;
  pageNumber: number;
  blockId?: string | null;
  offset?: number | null;
  contextSentence?: string | null;
}

export interface DefineTermResult {
  term: string;
  definition: string;
  simpleExplanation: string;
  contextExplanation: string;
  example: string;
  pageNumber: number;
  citation: {
    id: string;
    pageNumber: number;
    quote: string;
    startBlockId?: string | null;
    startOffset?: number | null;
    endBlockId?: string | null;
    endOffset?: number | null;
    rank: number;
  } | null;
}

export class DictionaryService {
  constructor(private llm: LlmProvider) {}

  async define(options: DefineTermOptions): Promise<DefineTermResult> {
    const { term, pageNumber, blockId, offset, contextSentence } = options;

    const userPrompt = buildDictionaryUserPrompt(term, pageNumber, contextSentence);

    const result = await this.llm.generate({
      messages: [
        { role: "system", content: DICTIONARY_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    });

    let parsed: any;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      // Fallback if model returned formatted text
      parsed = {
        term,
        definition: `Definición formal de "${term}".`,
        simpleExplanation: `En términos sencillos, "${term}" se refiere a un concepto relevante de la lectura.`,
        contextExplanation: `En este libro, se utiliza para articular la idea central de la página ${pageNumber}.`,
        example: `Ejemplo ilustrativo de "${term}".`,
      };
    }

    const quote = contextSentence || `Fragmento de la página ${pageNumber} que contiene "${term}".`;

    return {
      term: parsed.term || term,
      definition: parsed.definition || `Definición formal de "${term}".`,
      simpleExplanation:
        parsed.simpleExplanation || `Explicación sencilla de "${term}".`,
      contextExplanation:
        parsed.contextExplanation ||
        `En este libro se utiliza para enfatizar el contexto temático.`,
      example: parsed.example || `Ejemplo práctico de "${term}".`,
      pageNumber,
      citation: {
        id: `dict-cite-${Date.now()}`,
        pageNumber,
        quote,
        startBlockId: blockId ?? null,
        startOffset: offset ?? null,
        endBlockId: blockId ?? null,
        endOffset: offset !== null && offset !== undefined ? offset + term.length : null,
        rank: 1,
      },
    };
  }
}
