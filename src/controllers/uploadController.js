import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import * as uploadService from "../services/uploadService.js";
import * as userService from "../services/userService.js";
import { Post } from "../models/index.js";
import logger from "../../../Blog-backend/src/config/logger.js";

/**
 * POST /uploads
 *
 * Accepts multipart/form-data with field "image".
 * Body params:
 *   type: 'avatar' | 'cover' | 'post'
 *   entityId: (optional) ID of the entity to update
 */
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest("No image file provided");
  }

  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }

  const { type = "post", entityId } = req.body;

  logger.info(
    `Upload request: type=${type}, user=${req.user._id}, fileSize=${req.file.size}`,
  );

  // Upload to Cloudinary with type-specific transformations
  let imageData;
  try {
    switch (type) {
      case "avatar":
        imageData = await uploadService.uploadAvatar(req.file.buffer);
        // Update user's avatar
        const targetUserId = entityId || req.user._id;
        await userService.updateImage(targetUserId, "avatar", imageData);
        logger.info(`Avatar updated for user ${targetUserId}`);
        break;

      case "cover":
        imageData = await uploadService.uploadCover(req.file.buffer);
        // Update user's cover image
        const targetUserIdCover = entityId || req.user._id;
        await userService.updateImage(
          targetUserIdCover,
          "coverImage",
          imageData,
        );
        logger.info(`Cover image updated for user ${targetUserIdCover}`);
        break;

      case "post":
        imageData = await uploadService.uploadPostCover(req.file.buffer);
        if (entityId) {
          const post = await Post.findById(entityId);
          if (post) {
            // Delete old cover if exists
            if (post.coverImage?.publicId) {
              await uploadService.deleteImage(post.coverImage.publicId);
            }
            post.coverImage = imageData;
            await post.save();
            logger.info(`Post cover updated for post ${entityId}`);
          }
        }
        break;

      default:
        imageData = await uploadService.uploadImage(req.file.buffer);
    }

    res
      .status(201)
      .json(ApiResponse.created(imageData, "Image uploaded successfully"));
  } catch (error) {
    logger.error("Upload failed:", error);
    throw ApiError.internal(`Upload failed: ${error.message}`);
  }
});
