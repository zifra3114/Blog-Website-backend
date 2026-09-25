import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Post from "../models/Post.js";
import * as uploadService from "../services/uploadService.js";
import logger from "../config/logger.js";

/**
 * POST /uploads
 * Accepts multipart/form-data with field "image".
 */
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest("No image file provided");
  }

  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }

  const { entityId } = req.body;

  logger.info(`Image upload request: user=${req.user._id}, fileSize=${req.file.size}`);

  try {
    const imageData = await uploadService.uploadPostImage(req.file.buffer);

    if (entityId) {
      const post = await Post.findById(entityId);
      if (post) {
        if (post.coverImage?.publicId) {
          await uploadService.deleteImage(post.coverImage.publicId);
        }
        post.coverImage = imageData;
        await post.save();
        logger.info(`Post image updated for post ${entityId}`);
      }
    }

    res.status(201).json(ApiResponse.created(imageData, "Image uploaded successfully"));
  } catch (error) {
    logger.error("Image upload failed:", error);
    throw ApiError.internal(`Image upload failed: ${error.message}`);
  }
});

/**
 * POST /uploads/video
 * Accepts multipart/form-data with field "video".
 */
export const uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest("No video file provided");
  }

  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }

  const { entityId } = req.body;

  logger.info(`Video upload request: user=${req.user._id}, fileSize=${req.file.size}`);

  try {
    const videoData = await uploadService.uploadPostVideo(req.file.buffer);

    if (entityId) {
      const post = await Post.findById(entityId);
      if (post) {
        if (post.coverVideo?.publicId) {
          await uploadService.deleteVideo(post.coverVideo.publicId);
        }
        post.coverVideo = videoData;
        await post.save();
        logger.info(`Post video updated for post ${entityId}`);
      }
    }

    res.status(201).json(ApiResponse.created(videoData, "Video uploaded successfully"));
  } catch (error) {
    logger.error("Video upload failed:", error);
    throw ApiError.internal(`Video upload failed: ${error.message}`);
  }
});