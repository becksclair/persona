/**
 * RAG (Retrieval-Augmented Generation) module
 *
 * Provides knowledge base file management, embedding generation,
 * and retrieval for chat context augmentation.
 */

export { RAGConfigSvc, type RAGConfig } from "./config";
export { FileStorage, getMimeType, type StoredFile, type StorageProvider } from "./storage";
export {
  generateEmbedding,
  generateEmbeddings,
  checkEmbeddingAvailability,
  type EmbeddingResult,
} from "./embedding";
export { chunkText, extractTextFromFile, processFileForIndexing, type TextChunk } from "./chunking";
export {
  retrieveRelevantMemories,
  formatMemoriesForPrompt,
  getMemoryItemIds,
  type RetrievedMemory,
  type RetrievalResult,
} from "./retrieval";
export {
  indexFile,
  deleteFileMemoryItems,
  getFileMemoryItemCount,
  getCharacterKBStats,
  type IndexingResult,
} from "./indexing";
export {
  computeEffectiveRagConfig,
  type EffectiveRagConfig,
  type RagConfigSources,
} from "./effective-config";
