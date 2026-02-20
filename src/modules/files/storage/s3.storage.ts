// ============================================================================
// S3 Storage Provider
// ============================================================================

import { Readable } from "stream";

// AWS SDK types - using any for compatibility when not installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S3Client = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PutObjectCommand = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GetObjectCommand = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeleteObjectCommand = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HeadObjectCommand = any;

let s3Client: S3Client | null = null;

// S3 Client Configuration
function getS3Client(): S3Client {
  if (!s3Client) {
    // Dynamically import AWS SDK to avoid errors when not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Client } = require("@aws-sdk/client-s3");

    s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return s3Client;
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "creditorflow-uploads";

export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
  size: number;
  contentType: string;
}

export interface DownloadResult {
  stream: Readable;
  contentType: string;
  contentLength: number;
  lastModified?: Date;
}

/**
 * Upload a file to S3
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<UploadResult> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PutObjectCommand } = require("@aws-sdk/client-s3");

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
  });

  const result = await client.send(command);

  return {
    key,
    url: `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`,
    etag: result.ETag,
    size: buffer.length,
    contentType,
  };
}

/**
 * Download a file from S3
 */
export async function downloadFile(key: string): Promise<DownloadResult> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GetObjectCommand } = require("@aws-sdk/client-s3");

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const result = await client.send(command);

  if (!result.Body) {
    throw new Error("File not found");
  }

  return {
    stream: result.Body as Readable,
    contentType: result.ContentType || "application/octet-stream",
    contentLength: result.ContentLength || 0,
    lastModified: result.LastModified,
  };
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
}

/**
 * Check if a file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HeadObjectCommand } = require("@aws-sdk/client-s3");

    const client = getS3Client();
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a presigned URL for file download
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GetObjectCommand } = require("@aws-sdk/client-s3");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a presigned URL for file upload
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a unique key for file storage
 */
export function generateStorageKey(
  organizationId: string,
  invoiceId: string,
  filename: string,
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `uploads/${organizationId}/${invoiceId}/${timestamp}-${sanitizedFilename}`;
}

export default {
  uploadFile,
  downloadFile,
  deleteFile,
  fileExists,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  generateStorageKey,
};
