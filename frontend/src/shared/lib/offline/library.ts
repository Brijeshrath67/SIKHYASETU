import libraryRaw from '../../content/library.json';
import type { ContentConcept, ContentLibrary, ContentMisconception } from '../../types/content';

export const contentLibrary = libraryRaw as unknown as ContentLibrary;

const conceptIndex = new Map(contentLibrary.concepts.map((concept) => [concept.id, concept]));
const misconceptionIndex = new Map(
  contentLibrary.misconceptions.map((misconception) => [misconception.id, misconception]),
);

export function getConcept(id: string): ContentConcept | undefined {
  return conceptIndex.get(id);
}

export function getMisconception(id: string): ContentMisconception | undefined {
  return misconceptionIndex.get(id);
}

export function misconceptionForConcept(conceptId: string): ContentMisconception | undefined {
  return contentLibrary.misconceptions.find((item) => item.concept_id === conceptId);
}

export function chapterTitle(chapterId: string): string {
  const chapter = contentLibrary.chapters.find((item) => item.id === chapterId);
  return chapter?.title_en ?? chapterId;
}

export function conceptsInChapter(chapterId: string): ContentConcept[] {
  return contentLibrary.concepts.filter((concept) => concept.chapter_id === chapterId);
}

export const ODIA_RANGE = /[\u0B00-\u0B7F]/;

export function looksOdia(text: string): boolean {
  return ODIA_RANGE.test(text);
}
