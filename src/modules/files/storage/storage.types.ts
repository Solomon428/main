// ============================================================================
// Storage Types
// ============================================================================
// Common types and interfaces for storage providers

import { Readable } from 'stream';

/**
 * Upload result from storage provider
 */
export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
  size: number;
  contentType: string;
  metadata?: Record<string, string>;
}

/**
 * Download result from storage provider
 */
export interface DownloadResult {
  stream: Readable;
  contentType: string;
  contentLength: number;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

/**
 * File metadata
 */
export interface FileMetadata {
  contentType: string;
  size: number;
  lastModified?: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

/**
 * Storage provider interface
 */
export interface StorageProvider {
  /**
   * Upload a file to storage
   */
  uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult>;

  /**
   * Download a file from storage
   */
  downloadFile(key: string): Promise<DownloadResult>;

  /**
   * Delete a file from storage
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Check if a file exists
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getFileMetadata(key: string): Promise<FileMetadata | null>;

  /**
   * Generate a presigned URL for downloading
   */
  getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Generate a presigned URL for uploading
   */
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn?: number
  ): Promise<string>;

  /**
   * List files with a given prefix
   */
  listFiles(prefix: string): Promise<string[]>;

  /**
   * Copy a file within storage
   */
  copyFile(sourceKey: string, destinationKey: string): Promise<void>;

  /**
   * Move a file within storage
   */
  moveFile(sourceKey: string, destinationKey: string): Promise<void>;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  provider: 's3' | 'azure' | 'gcs' | 'minio' | 'local';
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  basePath?: string;
  publicUrlBase?: string;
}

/**
 * Upload options
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  encryption?: 'AES256' | 'aws:kms';
  public?: boolean;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  buckets?: number;
  lastUpdated: Date;
}
