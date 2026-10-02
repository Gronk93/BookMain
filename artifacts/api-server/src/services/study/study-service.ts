import { globalAiService } from "../ai/ai-service";
import { StudySummaryService } from "./study-summary.service";
import { StudyConceptService } from "./concept.service";
import { FlashcardService } from "./flashcard.service";
import { FlashcardReviewService, defaultReviewService } from "./flashcard-review.service";

export const globalStudySummaryService = new StudySummaryService(
  globalAiService.retriever,
  globalAiService.llm,
);

export const globalStudyConceptService = new StudyConceptService(
  globalAiService.retriever,
  globalAiService.llm,
);

export const globalFlashcardService = new FlashcardService(
  globalAiService.retriever,
  globalAiService.llm,
);

export const globalFlashcardReviewService = defaultReviewService;
