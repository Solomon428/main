// ============================================================================
// MinIO Storage Provider
// ============================================================================

import { Readable } from "stream";
import {
  StorageProvider,
  UploadResult,
  DownloadResult,
  FileMetadata,
} from "./storage.types";

// MinIO SDK types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

let minioClient: Client | null = null;

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "creditorflow-uploads";

/**
 * Get MinIO client
 */
function getMinioClient(): Client {
  if (!minioClient) {
    // Dynamically import MinIO SDK
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require("minio");

    minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: parseInt(process.env.MINIO_PORT || "9000", 10),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY || "",
      secretKey: process.env.MINIO_SECRET_KEY || "",
    });
  }
  return minioClient;
}

/**
 * Ensure bucket exists
 */
async function ensureBucket(): Promise<void> {
  const client = getMinioClient();
  const exists = await client.bucketExists(BUCKET_NAME);

  if (!exists) {
    await client.makeBucket(BUCKET_NAME);
  }
}

/**
 * Upload a file to MinIO
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<UploadResult> {
  await ensureBucket();
  const client = getMinioClient();

  await client.putObject(BUCKET_NAME, key, buffer, buffer.length, {
    "Content-Type": contentType,
    ...metadata,
  });

  const stat = await client.statObject(BUCKET_NAME, key);

  return {
    key,
    url: `${process.env.MINIO_PUBLIC_URL || "http://localhost:9000"}/${BUCKET_NAME}/${key}`,
    etag: stat.etag,
    size: buffer.length,
    contentType,
    metadata,
  };
}

/**
 * Download a file from MinIO
 */
export async function downloadFile(key: string): Promise<DownloadResult> {
  await ensureBucket();
  const client = getMinioClient();

  const stream = await client.getObject(BUCKET_NAME, key);
  const stat = await client.statObject(BUCKET_NAME, key);

  return {
    stream: stream as Readable,
    contentType: stat.metaData?.["content-type"] || "application/octet-stream",
    contentLength: stat.size,
    lastModified: stat.lastModified,
    metadata: stat.metaData,
  };
}

/**
 * Delete a file from MinIO
 */
export async function deleteFile(key: string): Promise<void> {
  await ensureBucket();
  const client = getMinioClient();

  await client.removeObject(BUCKET_NAME, key);
}

/**
 * Check if a file exists in MinIO
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await ensureBucket();
    const client = getMinioClient();
    await client.statObject(BUCKET_NAME, key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata from MinIO
 */
export async function getFileMetadata(
  key: string,
): Promise<FileMetadata | null> {
  try {
    await ensureBucket();
    const client = getMinioClient();
    const stat = await client.statObject(BUCKET_NAME, key);

    return {
      contentType:
        stat.metaData?.["content-type"] || "application/octet-stream",
      size: stat.size,
      lastModified: stat.lastModified,
      etag: stat.etag,
      metadata: stat.metaData,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a presigned URL for downloading
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  await ensureBucket();
  const client = getMinioClient();

  return client.presignedGetObject(BUCKET_NAME, key, expiresIn);
}

/**
 * Generate a presigned URL for uploading
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600,
): Promise<string> {
  await ensureBucket();
  const client = getMinioClient();

  // MinIO presignedPutObject doesn't support content-type directly
  // You may need to use presignedPostPolicy for more advanced use cases
  return client.presignedPutObject(BUCKET_NAME, key, expiresIn);
}

/**
 * List files with a given prefix
 */
export async function listFiles(prefix: string): Promise<string[]> {
  await ensureBucket();
  const client = getMinioClient();

  const files: string[] = [];
  const stream = client.listObjectsV2(BUCKET_NAME, prefix, true);

  return new Promise((resolve, reject) => {
    stream.on("data", (obj: { name: string }) => {
      files.push(obj.name);
    });
    stream.on("end", () => resolve(files));
    stream.on("error", reject);
  });
}

/**
 * Copy a file within MinIO
 */
export async function copyFile(
  sourceKey: string,
  destinationKey: string,
): Promise<void> {
  await ensureBucket();
  const client = getMinioClient();

  const conds = new (require("minio").CopyConditions)();
  await client.copyObject(
    BUCKET_NAME,
    destinationKey,
    `/${BUCKET_NAME}/${sourceKey}`,
    conds,
  );
}

/**
 * Move a file within MinIO
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
