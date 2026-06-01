// ✅ FIXED PATHS: Project folder ke hisab se relative paths theek kar diye hain
import cloudinary from "../config/cloudinary.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

/**
 * Upload an image buffer to Cloudinary.
 *
 * @param {Buffer} buffer       - Image buffer from Multer
 * @param {object} options      - Cloudinary upload options
 * @returns {{ url: string, publicId: string }}
 */
export const uploadImage = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "linkedin-blog",
        // ✅ Default transformation agar options me na bheji jaye
        transformation: options.transformation || [
          { width: 1200, height: 630, crop: "limit", quality: "auto" },
          { fetch_format: "auto" },
        ],
        ...options,
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload error:", error);
          return reject(
            ApiError.internal(`Cloudinary upload failed: ${error.message}`),
          );
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );
    stream.end(buffer);
  });
};

/**
 * Upload user avatar (square crop with face detection).
 */
export const uploadAvatar = async (buffer) => {
  return uploadImage(buffer, {
    folder: "linkedin-blog/avatars",
    transformation: [
      {
        width: 400,
        height: 400,
        crop: "fill",
        gravity: "face",
        quality: "auto",
      },
      { fetch_format: "auto" },
    ],
  });
};

/**
 * Upload cover image (wide banner).
 */
export const uploadCover = async (buffer) => {
  return uploadImage(buffer, {
    folder: "linkedin-blog/covers",
    transformation: [
      { width: 1500, height: 500, crop: "fill", quality: "auto" },
      { fetch_format: "auto" },
    ],
  });
};

/**
 * Upload post cover image.
 */
export const uploadPostCover = async (buffer) => {
  return uploadImage(buffer, {
    folder: "linkedin-blog/posts",
    transformation: [
      { width: 1200, height: 630, crop: "limit", quality: "auto" },
      { fetch_format: "auto" },
    ],
  });
};

/**
 * Delete an image from Cloudinary by public ID.
 */
export const deleteImage = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // Log but don't throw — cleanup failures shouldn't break the app
    console.error(
      `Failed to delete Cloudinary image ${publicId}:`,
      error.message,
    );
  }
};