// ============================================================================
// Local File Storage Provider
// ============================================================================

import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import {
  StorageProvider,
  UploadResult,
  DownloadResult,
  FileMetadata,
} from './storage.types';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

const BASE_PATH = process.env.LOCAL_STORAGE_PATH || './uploads';
const PUBLIC_URL_BASE = process.env.LOCAL_STORAGE_URL_BASE || 'http://localhost:3000/uploads';

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await access(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Get full file path
 */
function getFilePath(key: string): string {
  return path.join(BASE_PATH, key);
}

/**
 * Upload a file to local storage
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  const filePath = getFilePath(key);
  const dir = path.dirname(filePath);

  await ensureDir(dir);
  await writeFile(filePath, buffer);

  // Store metadata in a sidecar file
  if (metadata) {
    const metaPath = `${filePath}.meta.json`;
    await writeFile(metaPath, JSON.stringify({ contentType, metadata }, null, 2));
  }

  return {
    key,
    url: `${PUBLIC_URL_BASE}/${key}`,
    size: buffer.length,
    contentType,
    metadata,
  };
}

/**
 * Download a file from local storage
 */
export async function downloadFile(key: string): Promise<DownloadResult> {
  const filePath = getFilePath(key);

  try {
    await access(filePath);
  } catch {
    throw new Error('File not found');
  }

  const stats = await stat(filePath);
  const stream = fs.createReadStream(filePath);
  
  // Try to load metadata
  let metadata: Record<string, string> | undefined;
  let contentType = 'application/octet-stream';
  
  try {
    const metaPath = `${filePath}.meta.json`;
    const metaContent = await readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaContent);
    contentType = meta.contentType;
    metadata = meta.metadata;
  } catch {
    // No metadata file exists
  }

  return {
    stream: stream as Readable,
    contentType,
    contentLength: stats.size,
    lastModified: stats.mtime,
    metadata,
  };
}

/**
 * Delete a file from local storage
 */
export async function deleteFile(key: string): Promise<void> {
  const filePath = getFilePath(key);
  const metaPath = `${filePath}.meta.json`;

  try {
    await unlink(filePath);
  } catch {
    // File doesn't exist
  }

  try {
    await unlink(metaPath);
  } catch {
    // Metadata file doesn't exist
  }
}

/**
 * Check if a file exists in local storage
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const filePath = getFilePath(key);
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata from local storage
 */
export async function getFileMetadata(key: string): Promise<FileMetadata | null> {
  try {
    const filePath = getFilePath(key);
    const stats = await stat(filePath);
    
    let contentType = 'application/octet-stream';
    let metadata: Record<string, string> | undefined;
    
    try {
      const metaPath = `${filePath}.meta.json`;
      const metaContent = await readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);
      contentType = meta.contentType;
      metadata = meta.metadata;
    } catch {
      // No metadata file
    }

    return {
      contentType,
      size: stats.size,
      lastModified: stats.mtime,
      metadata,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a URL for downloading (local storage uses direct file access)
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  // For local storage, we just return the public URL
  // In a production setup, you might implement temporary token-based access
  return `${PUBLIC_URL_BASE}/${key}`;
}

/**
 * Generate a URL for uploading (local storage uses direct file access)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  // For local storage, uploads are handled directly through the API
  return `${PUBLIC_URL_BASE}/${key}`;
}

/**
 * List files with a given prefix
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const dirPath = path.join(BASE_PATH, prefix);
  
  try {
    await access(dirPath);
  } catch {
    return [];
  }

  const files: string[] = [];

  async function traverse(currentPath: string, relativePath: string) {
    const entries = await readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        await traverse(fullPath, relPath);
      } else if (!entry.name.endsWith('.meta.json')) {
        files.push(relPath);
      }
    }
  }

  await traverse(dirPath, prefix);
  return files;
}

/**
 * Copy a file within local storage
 */
export async function copyFile(sourceKey: string, destinationKey: string): Promise<void> {
  const sourcePath = getFilePath(sourceKey);
  const destPath = getFilePath(destinationKey);
  const sourceMetaPath = `${sourcePath}.meta.json`;
  const destMetaPath = `${destPath}.meta.json`;

  await ensureDir(path.dirname(destPath));
  
  const content = await readFile(sourcePath);
  await writeFile(destPath, content);

  // Copy metadata if exists
  try {
    const metaContent = await readFile(sourceMetaPath);
    await writeFile(destMetaPath, metaContent);
  } catch {
    // No metadata to copy
  }
}

/**
 * Move a file within local storage
 */
export async function moveFile(sourceKey: string, destinationKey: string): Promise<void> {
  await copyFile(sourceKey, destinationKey);
  await deleteFile(sourceKey);
}

export default {
  uploadFile,
  downloadFile,
  deleteFile,
  fileExists,
  getFileMetadata,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  listFiles,
  copyFile,
  moveFile,
};
