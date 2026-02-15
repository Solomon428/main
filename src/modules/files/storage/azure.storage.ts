// ============================================================================
// Azure Blob Storage Provider
// ============================================================================

import { Readable } from 'stream';
import {
  StorageProvider,
  UploadResult,
  DownloadResult,
  FileMetadata,
} from './storage.types';

// Azure SDK types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlobServiceClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlobClient = any;

let blobServiceClient: BlobServiceClient | null = null;

const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'creditorflow-uploads';

/**
 * Get Azure Blob Service client
 */
function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    // Dynamically import Azure SDK
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BlobServiceClient } = require('@azure/storage-blob');

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

    if (connectionString) {
      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else if (accountName && accountKey) {
      const credential = new (require('@azure/storage-blob').StorageSharedKeyCredential)(
        accountName,
        accountKey
      );
      blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential
      );
    } else {
      throw new Error('Azure storage credentials not configured');
    }
  }
  return blobServiceClient;
}

/**
 * Upload a file to Azure Blob Storage
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blockBlobClient = containerClient.getBlockBlobClient(key);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
    metadata,
  });

  return {
    key,
    url: blockBlobClient.url,
    etag: blockBlobClient.getProperties().etag,
    size: buffer.length,
    contentType,
    metadata,
  };
}

/**
 * Download a file from Azure Blob Storage
 */
export async function downloadFile(key: string): Promise<DownloadResult> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blockBlobClient = containerClient.getBlockBlobClient(key);

  const downloadResponse = await blockBlobClient.download();
  const properties = await blockBlobClient.getProperties();

  if (!downloadResponse.readableStreamBody) {
    throw new Error('File not found');
  }

  return {
    stream: downloadResponse.readableStreamBody as Readable,
    contentType: properties.contentType || 'application/octet-stream',
    contentLength: properties.contentLength || 0,
    lastModified: properties.lastModified,
    metadata: properties.metadata,
  };
}

/**
 * Delete a file from Azure Blob Storage
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blockBlobClient = containerClient.getBlockBlobClient(key);

  await blockBlobClient.delete();
}

/**
 * Check if a file exists in Azure Blob Storage
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    return await blockBlobClient.exists();
  } catch {
    return false;
  }
}

/**
 * Get file metadata from Azure Blob Storage
 */
export async function getFileMetadata(key: string): Promise<FileMetadata | null> {
  try {
    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    const properties = await blockBlobClient.getProperties();

    return {
      contentType: properties.contentType || 'application/octet-stream',
      size: properties.contentLength || 0,
      lastModified: properties.lastModified,
      etag: properties.etag,
      metadata: properties.metadata,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a SAS URL for downloading
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');

  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blockBlobClient = containerClient.getBlockBlobClient(key);

  const expiryTime = new Date();
  expiryTime.setSeconds(expiryTime.getSeconds() + expiresIn);

  const sasOptions = {
    containerName: CONTAINER_NAME,
    blobName: key,
    permissions: BlobSASPermissions.parse('r'),
    expiresOn: expiryTime,
  };

  const sasToken = generateBlobSASQueryParameters(
    sasOptions,
    client.credential
  ).toString();

  return `${blockBlobClient.url}?${sasToken}`;
}

/**
 * Generate a SAS URL for uploading
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');

  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blockBlobClient = containerClient.getBlockBlobClient(key);

  const expiryTime = new Date();
  expiryTime.setSeconds(expiryTime.getSeconds() + expiresIn);

  const sasOptions = {
    containerName: CONTAINER_NAME,
    blobName: key,
    permissions: BlobSASPermissions.parse('w'),
    expiresOn: expiryTime,
    contentType,
  };

  const sasToken = generateBlobSASQueryParameters(
    sasOptions,
    client.credential
  ).toString();

  return `${blockBlobClient.url}?${sasToken}`;
}

/**
 * List files with a given prefix
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);

  const files: string[] = [];
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    files.push(blob.name);
  }

  return files;
}

/**
 * Copy a file within Azure Blob Storage
 */
export async function copyFile(sourceKey: string, destinationKey: string): Promise<void> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  
  const sourceBlob = containerClient.getBlobClient(sourceKey);
  const destinationBlob = containerClient.getBlobClient(destinationKey);

  const copyPoller = await destinationBlob.beginCopyFromURL(sourceBlob.url);
  await copyPoller.pollUntilDone();
}

/**
 * Move a file within Azure Blob Storage
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
