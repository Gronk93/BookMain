import crypto from "node:crypto";
import type { ContextSourceItem } from "../ai/rag/context-builder";
import { buildIsolatedContext } from "../ai/rag/context-builder";

export interface StudyScopeInput {
  type: "page" | "page_range" | "separator" | "book" | "highlights";
  pageNumber?: number | null;
  startPage?: number | null;
  endPage?: number | null;
  separatorId?: string | null;
  highlightIds?: string[] | null;
}

export function computeSourceHash(sources: ContextSourceItem[]): string {
  const hash = crypto.createHash("sha256");
  for (const s of sources) {
    hash.update(`${s.id}:${s.pageNumber}:${s.text}|`);
  }
  return hash.digest("hex").slice(0, 32);
}

export function computeCardContentHash(front: string, back: string): string {
  const normalizedFront = front.trim().toLowerCase().replace(/\s+/g, " ");
  const normalizedBack = back.trim().toLowerCase().replace(/\s+/g, " ");
  return crypto
    .createHash("sha256")
    .update(`${normalizedFront}:::${normalizedBack}`)
    .digest("hex")
    .slice(0, 32);
}

export interface BuiltStudyContext {
  sources: ContextSourceItem[];
  sourceHash: string;
  contextPrompt: string;
  userNotesText?: string;
  isPersonal: boolean;
}

export function buildStudyPromptContext(
  sources: ContextSourceItem[],
  userNotes: Array<{ content: string; pageNumber?: number }> = [],
  includeNotes: boolean = false,
): BuiltStudyContext {
  const sourceHash = computeSourceHash(sources);
  const sourcesXml = buildIsolatedContext(sources);

  let userNotesText: string | undefined = undefined;
  if (includeNotes && userNotes.length > 0) {
    const formattedNotes = userNotes
      .map((n, idx) => `[Nota ${idx + 1}${n.pageNumber ? ` - p. ${n.pageNumber}` : ""}]: ${n.content}`)
      .join("\n");
    userNotesText = `\n<user_notes>\n<!-- NOTAS PERSONALES DEL LECTOR. No atribuir al autor del libro ni mezclar con citas del texto. -->\n${formattedNotes}\n</user_notes>`;
  }

  const contextPrompt = `${sourcesXml}${userNotesText ? `\n${userNotesText}` : ""}`;

  return {
    sources,
    sourceHash,
    contextPrompt,
    userNotesText,
    isPersonal: includeNotes && userNotes.length > 0,
  };
}
