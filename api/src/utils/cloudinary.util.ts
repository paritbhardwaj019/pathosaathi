import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from "cloudinary";
import { env } from "@/config/env.config";
import { logger } from "./logger.util";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  resourceType: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  invalidate?: boolean;
  transformation?: Record<string, unknown>;
  tags?: string[];
  context?: Record<string, string>;
}

/**
 * Upload image to Cloudinary with optimal quality settings
 *
 * @param file - File buffer, file path, or data URI string
 * @param options - Optional upload configuration
 * @returns Promise with upload result containing optimized URL and metadata
 *
 * @example
 * ```typescript
 * // Upload from buffer
 * const result = await uploadImage(buffer, { folder: 'users' });
 *
 * // Upload from file path
 * const result = await uploadImage('/tmp/image.jpg', { folder: 'banners' });
 * ```
 */
export async function uploadImage(
  file: Buffer | string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    const transformations: Array<Record<string, unknown>> = [
      {
        quality: "auto:best",
        fetch_format: "auto",
        flags: ["progressive"],
      },
    ];

    if (options.transformation) {
      transformations.push(options.transformation);
    }

    const uploadParams: Record<string, unknown> = {
      transformation: transformations,
      ...(options.folder && { folder: options.folder }),
      ...(options.publicId && { public_id: options.publicId }),
      ...(options.overwrite !== undefined && { overwrite: options.overwrite }),
      ...(options.invalidate !== undefined && {
        invalidate: options.invalidate,
      }),
      ...(options.tags && options.tags.length > 0 && { tags: options.tags }),
      ...(options.context && { context: options.context }),
    };

    let uploadResult: UploadApiResponse;

    if (Buffer.isBuffer(file)) {
      uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadParams,
          (
            error: UploadApiErrorResponse | undefined,
            result: UploadApiResponse | undefined
          ) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error("Upload failed: No result returned"));
            }
          }
        );
        uploadStream.end(file);
      });
    } else {
      uploadResult = await cloudinary.uploader.upload(file, uploadParams);
    }

    const optimizedUrl = cloudinary.url(uploadResult.public_id, {
      secure: true,
      transformation: [
        {
          quality: "auto:best",
          fetch_format: "auto",
          flags: ["progressive"],
        },
        ...(options.transformation ? [options.transformation] : []),
      ],
    });

    const result: CloudinaryUploadResult = {
      ...uploadResult,
      url: optimizedUrl,
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      format: uploadResult.format || "",
      width: uploadResult.width || 0,
      height: uploadResult.height || 0,
      bytes: uploadResult.bytes || 0,
      resourceType: uploadResult.resource_type,
      createdAt: uploadResult.created_at,
    };

    logger.info(
      `Image uploaded successfully: ${result.publicId} (${result.format})`
    );

    return result;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Cloudinary upload error:", error);
    throw new Error(`Failed to upload image to Cloudinary: ${errorMessage}`);
  }
}

/**
 * Delete an asset from Cloudinary
 *
 * @param publicId - Public ID of the asset to delete
 * @param resourceType - Resource type ('image' or 'video'), defaults to 'image'
 * @returns Promise with deletion result
 */
export async function deleteImage(
  publicId: string,
  resourceType: "image" | "video" = "image"
): Promise<{ result: string }> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    if (result.result === "ok") {
      logger.info(`Asset deleted successfully: ${publicId}`);
    } else {
      logger.warn(`Asset deletion result: ${result.result} for ${publicId}`);
    }

    return result;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Cloudinary delete error:", error);
    throw new Error(`Failed to delete asset from Cloudinary: ${errorMessage}`);
  }
}

/**
 * Generate optimized URL for an existing Cloudinary asset
 *
 * @param publicId - Public ID of the asset
 * @param transformation - Optional transformation parameters
 * @returns Optimized Cloudinary URL
 */
export function getOptimizedUrl(
  publicId: string,
  transformation?: Record<string, unknown>
): string {
  return cloudinary.url(publicId, {
    secure: true,
    quality: "auto:best",
    fetch_format: "auto",
    flags: ["progressive"],
    ...(transformation && { transformation }),
  });
}

/**
 * Extract public ID from Cloudinary URL
 *
 * @param url - Cloudinary URL
 * @returns Public ID or null if URL is invalid
 */
export function extractPublicId(url: string): string | null {
  try {
    const match = url.match(
      /\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp|avif|mp4|mov|avi)/i
    );
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    logger.error("Error extracting public ID from URL:", error);
    return null;
  }
}

export { cloudinary };
