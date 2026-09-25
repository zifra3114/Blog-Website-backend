import cloudinary from "../config/cloudinary.js";
import logger from "../config/logger.js";
import ApiError from "../utils/ApiError.js";

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
        folder: "linkedin-blog/images",
        resource_type: "image",
        ...options,
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary image upload error:", error);
          return reject(
            ApiError.internal(`Cloudinary image upload failed: ${error.message}`),
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
 * Upload post cover image.
 */
export const uploadPostImage = async (buffer) => {
  return uploadImage(buffer, {
    folder: "linkedin-blog/posts/images",
  });
};

/**
 * Delete an image from Cloudinary by public ID.
 */
export const deleteImage = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error(
      `Failed to delete Cloudinary image ${publicId}:`,
      error.message,
    );
  }
};

/**
 * Upload a video buffer to Cloudinary.
 *
 * @param {Buffer} buffer       - Video buffer from Multer
 * @param {object} options      - Cloudinary upload options
 * @returns {{ url: string, publicId: string }}
 */
export const uploadVideo = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "linkedin-blog/videos",
        resource_type: "video",
        ...options,
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary video upload error:", error);
          return reject(
            ApiError.internal(`Cloudinary video upload failed: ${error.message}`),
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
 * Upload post cover video.
 */
export const uploadPostVideo = async (buffer) => {
  return uploadVideo(buffer, {
    folder: "linkedin-blog/posts/videos",
  });
};

/**
 * Delete a video from Cloudinary by public ID.
 */
export const deleteVideo = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (error) {
    console.error(
      `Failed to delete Cloudinary video ${publicId}:`,
      error.message,
    );
  }
};