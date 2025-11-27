import { mkdir, writeFile, unlink, readFile, stat, access } from "fs/promises";
import { join, dirname } from "path";
import { randomUUID } from "crypto";

/**
 * File storage abstraction for knowledge base files.
 * Uses local filesystem with a path structure that supports future S3 migration.
 */

export interface StoredFile {
  path: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface StorageProvider {
  store(userId: string, characterId: string, file: Blob, fileName: string): Promise<StoredFile>;
  read(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

/**
 * Local filesystem storage provider.
 * Stores files at: data/knowledge-base/{userId}/{characterId}/{fileId}-{sanitizedName}
 */
class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    // Store in project root/data/knowledge-base
    this.baseDir = process.env.KB_STORAGE_PATH || join(process.cwd(), "data", "knowledge-base");
  }

  private sanitizeFileName(name: string): string {
    // Remove potentially dangerous characters, keep extension
    return name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 100);
  }

  private getFilePath(userId: string, characterId: string, fileId: string, fileName: string): string {
    const sanitized = this.sanitizeFileName(fileName);
    return join(this.baseDir, userId, characterId, `${fileId}-${sanitized}`);
  }

  async store(userId: string, characterId: string, file: Blob, fileName: string): Promise<StoredFile> {
    const fileId = randomUUID();
    const filePath = this.getFilePath(userId, characterId, fileId, fileName);

    // Ensure directory exists
    await mkdir(dirname(filePath), { recursive: true });

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return {
      path: filePath,
      originalName: fileName,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.byteLength,
    };
  }

  async read(path: string): Promise<Buffer> {
    return readFile(path);
  }

  async delete(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  async getFileSize(path: string): Promise<number> {
    const stats = await stat(path);
    return stats.size;
  }
}

// Export singleton instance
export const FileStorage: StorageProvider = new LocalStorageProvider();

/**
 * Get MIME type from file extension
 */
export function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const mimeTypes: Record<string, string> = {
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    html: "text/html",
    htm: "text/html",
    csv: "text/csv",
    xml: "application/xml",
    js: "text/javascript",
    ts: "text/typescript",
    py: "text/x-python",
    java: "text/x-java",
    c: "text/x-c",
    cpp: "text/x-c++",
    h: "text/x-c",
    css: "text/css",
    sql: "text/x-sql",
    sh: "text/x-shellscript",
    yaml: "text/yaml",
    yml: "text/yaml",
  };
  return mimeTypes[ext] || "application/octet-stream";
}
