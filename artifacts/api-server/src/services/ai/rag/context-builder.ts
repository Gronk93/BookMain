export interface ContextSourceItem {
  id: string;
  pageNumber: number;
  chunkIndex?: number;
  text: string;
  startBlockId?: string;
  startOffset?: number;
  endBlockId?: string;
  endOffset?: number;
  qualityScore?: number;
}

export function sanitizeBookContent(raw: string): string {
  // Prevent escaping XML or injection wrappers
  return raw
    .replace(/<\/source>/gi, "&lt;/source&gt;")
    .replace(/<source/gi, "&lt;source");
}

export function buildIsolatedContext(sources: ContextSourceItem[]): string {
  if (!sources || sources.length === 0) {
    return "<sources>\n<!-- No matching passages found in the book for this query -->\n</sources>";
  }

  const entries = sources.map((s, index) => {
    const safeText = sanitizeBookContent(s.text.trim());
    return `<source id="${s.id}" index="${index + 1}" page="${s.pageNumber}">\n${safeText}\n</source>`;
  });

  return [
    "<sources>",
    "<!-- Contexto documental extraído del libro. Toda respuesta debe fundamentarse estrictamente en estos fragmentos. -->",
    ...entries,
    "</sources>",
  ].join("\n");
}
