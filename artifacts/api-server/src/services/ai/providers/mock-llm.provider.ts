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
    // 3. Study Summary Mode
    else if (systemMsg.includes("STUDY_SUMMARY_MODE") || userMsg.includes("TASK: STUDY_SUMMARY")) {
      const sourceMatches = Array.from(
        (systemMsg + "\n" + userMsg).matchAll(/<source\s+id="([^"]+)"(?:\s+[^>]*\s+page="(\d+)")?/g),
      ).map((m) => ({ id: m[1], page: m[2] ? parseInt(m[2], 10) : 1 }));

      const usedIds = sourceMatches.slice(0, 3).map((s) => s.id);
      const summaryTypeMatch = userMsg.match(/SUMMARY_TYPE:\s*(brief|standard|deep)/i);
      const summaryType = summaryTypeMatch ? summaryTypeMatch[1].toLowerCase() : "standard";

      const isPersonal = userMsg.includes("INCLUDE_PERSONAL: true") || userMsg.includes("USER_NOTES:");

      let summaryBody = "";
      if (summaryType === "brief") {
        summaryBody = `### Idea central\nEl contenido analizado fundamenta los principios esenciales expuestos por el autor. [p. ${sourceMatches[0]?.page || 1}]\n\n### Puntos clave\n- Primer punto clave articulado en la obra.\n- Segundo punto respecto al contexto.\n- Tercer punto de síntesis conceptual.`;
      } else if (summaryType === "deep") {
        summaryBody = `### Visión general\nSíntesis comprensiva y profunda del material abordado. [p. ${sourceMatches[0]?.page || 1}]\n\n### Conceptos esenciales\nDefinición rigurosa de las categorías primarias desarrolladas en el texto.\n\n### Argumentos principales\n1. Premisa inicial sobre la naturaleza del objeto de estudio.\n2. Conexión dialéctica entre percepción y lenguaje.\n\n### Definiciones\n- Término central: significado estructurado según la fuente.\n\n### Relaciones\nCómo se vinculan los diferentes componentes teóricos.\n\n### Ejemplos\nCasos y analogías empleadas en la exposición.\n\n### Puntos que conviene recordar\nElementos críticos para fijación y memoria activa.`;
      } else {
        // standard
        summaryBody = `### Resumen general\nVisión equilibrada de las ideas expuestas en el texto recuperado. [p. ${sourceMatches[0]?.page || 1}]\n\n### Ideas principales\n- La percepción visual antecede a las palabras y define nuestro entorno.\n- La interpretación depende del contexto histórico y cultural.\n\n### Conceptos relevantes\n- Mirada activa\n- Significación visual\n\n### Relaciones entre ideas\nExiste una correspondencia directa entre ver y ser visto.`;
      }

      if (isPersonal) {
        summaryBody += `\n\n### Tus notas personales\n- Tu nota: Relacionar este concepto con el marco de estudio y la bibliografía complementaria.`;
      }

      content = JSON.stringify({
        title: `Resumen ${summaryType.charAt(0).toUpperCase() + summaryType.slice(1)}`,
        content: summaryBody,
        usedSourceIds: usedIds,
      });
    }
    // 4. Study Concepts Extraction Mode
    else if (systemMsg.includes("STUDY_CONCEPTS_MODE") || userMsg.includes("TASK: STUDY_CONCEPTS")) {
      const sourceMatches = Array.from(
        (systemMsg + "\n" + userMsg).matchAll(/<source\s+id="([^"]+)"(?:\s+[^>]*\s+page="(\d+)")?/g),
      ).map((m) => ({ id: m[1], page: m[2] ? parseInt(m[2], 10) : 1 }));

      const primaryId = sourceMatches[0]?.id;

      content = JSON.stringify({
        concepts: [
          {
            term: "Percepción visual",
            definition: "Proceso cognitivo y sensorial mediante el cual se aprehende el mundo antes de la mediación lingüística.",
            simpleExplanation: "Ver y comprender lo que nos rodea antes de ponerle palabras.",
            importance: "essential",
            usedSourceIds: primaryId ? [primaryId] : [],
          },
          {
            term: "Contexto cultural",
            definition: "Entorno de convenciones y supuestos históricos que condicionan la forma en que se decodifica una imagen.",
            simpleExplanation: "Las ideas y costumbres de una época que influyen en cómo vemos algo.",
            importance: "high",
            usedSourceIds: sourceMatches[1]?.id ? [sourceMatches[1].id] : (primaryId ? [primaryId] : []),
          },
          {
            term: "Reciprocidad de la mirada",
            definition: "Conciencia de que el acto de observar implica la posibilidad simultánea de ser observado por el otro.",
            simpleExplanation: "Saber que al mirar a alguien, también nos pueden estar mirando.",
            importance: "medium",
            usedSourceIds: sourceMatches[0]?.id ? [sourceMatches[0].id] : [],
          },
        ],
      });
    }
    // 5. Study Flashcard Generation Mode
    else if (systemMsg.includes("STUDY_FLASHCARDS_MODE") || userMsg.includes("TASK: STUDY_FLASHCARDS")) {
      const countMatch = userMsg.match(/COUNT:\s*(\d+)/i);
      const targetCount = countMatch ? parseInt(countMatch[1], 10) : 10;

      const sourceMatches = Array.from(
        (systemMsg + "\n" + userMsg).matchAll(/<source\s+id="([^"]+)"(?:\s+[^>]*\s+page="(\d+)")?/g),
      ).map((m) => ({ id: m[1], page: m[2] ? parseInt(m[2], 10) : 1 }));

      const cards = [];
      const primaryId = sourceMatches[0]?.id;
      const primaryPage = sourceMatches[0]?.page || 1;

      // Base card templates with grounded evidence
      const baseTemplates = [
        {
          cardType: "concept",
          front: "¿Qué plantea la obra acerca de la relación entre visión y lenguaje?",
          back: "La visión precede a las palabras; ver antecede al acto de nombrar y establece nuestra presencia en el mundo.",
          explanation: "El niño mira y reconoce antes de que pueda articular lenguaje verbal.",
          sourcePage: primaryPage,
          usedSourceIds: primaryId ? [primaryId] : [],
        },
        {
          cardType: "question",
          front: "¿Por qué el contexto modifica el significado de lo que vemos?",
          back: "Porque las convenciones culturales e históricas enmarcan y condicionan la interpretación de cualquier imagen.",
          explanation: "Ninguna imagen se percibe de forma completamente neutra o aislada.",
          sourcePage: primaryPage,
          usedSourceIds: primaryId ? [primaryId] : [],
        },
        {
          cardType: "cloze",
          front: "La visión precede a las ________.",
          back: "palabras",
          explanation: "Establece que el acto de ver ocurre antes del lenguaje verbal.",
          sourcePage: primaryPage,
          usedSourceIds: primaryId ? [primaryId] : [],
        },
        {
          cardType: "concept",
          front: "¿En qué consiste la reciprocidad de la mirada?",
          back: "En la comprensión de que al mirar también podemos ser vistos, integrándonos en el mundo visible.",
          explanation: "El ojo del otro se combina con el propio.",
          sourcePage: primaryPage,
          usedSourceIds: primaryId ? [primaryId] : [],
        },
        {
          cardType: "question",
          front: "¿Qué rol juega la memoria en la percepción de una imagen?",
          back: "La memoria reactiva asociaciones previas que enriquecen o alteran la comprensión del observador.",
          explanation: "Lo que sabemos influye en lo que vemos.",
          sourcePage: primaryPage,
          usedSourceIds: primaryId ? [primaryId] : [],
        },
      ];

      for (let i = 0; i < targetCount; i++) {
        const template = baseTemplates[i % baseTemplates.length];
        const cardSrc = sourceMatches[i % Math.max(1, sourceMatches.length)];
        cards.push({
          cardType: template.cardType,
          front: i < baseTemplates.length ? template.front : `${template.front} (Variación ${i + 1})`,
          back: template.back,
          explanation: template.explanation,
          sourcePage: cardSrc?.page || primaryPage,
          usedSourceIds: cardSrc?.id ? [cardSrc.id] : (primaryId ? [primaryId] : []),
        });
      }

      content = JSON.stringify({ flashcards: cards });
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
