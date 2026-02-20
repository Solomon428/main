// ============================================================================
// Google Cloud Storage Provider
// ============================================================================

import { Readable } from "stream";
import {
  StorageProvider,
  UploadResult,
  DownloadResult,
  FileMetadata,
} from "./storage.types";

// GCS SDK types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Storage = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bucket = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type File = any;

let storageClient: Storage | null = null;

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "creditorflow-uploads";

/**
 * Get GCS client
 */
function getStorageClient(): Storage {
  if (!storageClient) {
    // Dynamically import GCS SDK
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Storage } = require("@google-cloud/storage");

    const projectId = process.env.GCS_PROJECT_ID;
    const keyFilename = process.env.GCS_KEY_FILENAME;
    const credentials = process.env.GCS_CREDENTIALS_JSON
      ? JSON.parse(process.env.GCS_CREDENTIALS_JSON)
      : undefined;

    storageClient = new Storage({
      projectId,
      keyFilename,
      credentials,
    });
  }
  return storageClient;
}

/**
 * Get bucket instance
 */
function getBucket(): Bucket {
  const storage = getStorageClient();
  return storage.bucket(BUCKET_NAME);
}

/**
 * Upload a file to Google Cloud Storage
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<UploadResult> {
  const bucket = getBucket();
  const file = bucket.file(key);

  await file.save(buffer, {
    contentType,
    metadata: {
      metadata,
    },
  });

  const [fileMetadata] = await file.getMetadata();

  return {
    key,
    url: `https://storage.googleapis.com/${BUCKET_NAME}/${key}`,
    etag: fileMetadata.etag,
    size: buffer.length,
    contentType,
    metadata,
  };
}

/**
 * Download a file from Google Cloud Storage
 */
export async function downloadFile(key: string): Promise<DownloadResult> {
  const bucket = getBucket();
  const file = bucket.file(key);

  const [exists] = await file.exists();
  if (!exists) {
    throw new Error("File not found");
  }

  const [metadata] = await file.getMetadata();
  const stream = file.createReadStream();

  return {
    stream: stream as Readable,
    contentType: metadata.contentType || "application/octet-stream",
    contentLength: parseInt(metadata.size, 10) || 0,
    lastModified: metadata.updated ? new Date(metadata.updated) : undefined,
    metadata: metadata.metadata,
  };
}

/**
 * Delete a file from Google Cloud Storage
 */
export async function deleteFile(key: string): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file(key);

  await file.delete();
}

/**
 * Check if a file exists in Google Cloud Storage
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const bucket = getBucket();
    const file = bucket.file(key);
    const [exists] = await file.exists();
    return exists;
  } catch {
    return false;
  }
}

/**
 * Get file metadata from Google Cloud Storage
 */
export async function getFileMetadata(
  key: string,
): Promise<FileMetadata | null> {
  try {
    const bucket = getBucket();
    const file = bucket.file(key);
    const [metadata] = await file.getMetadata();

    return {
      contentType: metadata.contentType || "application/octet-stream",
      size: parseInt(metadata.size, 10) || 0,
      lastModified: metadata.updated ? new Date(metadata.updated) : undefined,
      etag: metadata.etag,
      metadata: metadata.metadata,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a signed URL for downloading
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(key);

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresIn * 1000,
  });

  return url;
}

/**
 * Generate a signed URL for uploading
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600,
): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(key);

  const [url] = await file.getSignedUrl({
    action: "write",
    expires: Date.now() + expiresIn * 1000,
    contentType,
  });

  return url;
}

/**
 * List files with a given prefix
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const bucket = getBucket();
  const [files] = await bucket.getFiles({ prefix });

  return files.map((file: { name: string }) => file.name);
}

/**
 * Copy a file within Google Cloud Storage
 */
export async function copyFile(
  sourceKey: string,
  destinationKey: string,
): Promise<void> {
  const bucket = getBucket();
  const sourceFile = bucket.file(sourceKey);
  const destinationFile = bucket.file(destinationKey);

  await sourceFile.copy(destinationFile);
}

/**
 * Move a file within Google Cloud Storage
 */
export async function moveFile(
  sourceKey: string,
  destinationKey: string,
): Promise<void> {
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
