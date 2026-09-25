import multer from 'multer';
import ApiError from '../utils/ApiError.js';

// Store files in memory (buffer) — we upload to Cloudinary, not disk
const storage = multer.memoryStorage();

// Allow only image MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type '${file.mimetype}'. Allowed: JPEG, PNG, WebP, GIF`
      ),
      false
    );
  }
};

// ─── VIDEO: Allowed MIME types ─────────────────────────────────
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];

const videoFileFilter = (_req, file, cb) => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type '${file.mimetype}'. Allowed: MP4, WebM, MOV, MKV`
      ),
      false
    );
  }
};

/**
 * Single image upload middleware.
 * Field name: "image"
 * Max size: 5 MB
 *
 * Usage: router.post('/upload', uploadSingle, controller);
 */
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('image');

/**
 * Multiple images upload middleware.
 * Field name: "images"
 * Max count: 5
 * Max size each: 5 MB
 */
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).array('images', 5);

/**
 * Single video upload middleware.
 * Field name: "video"
 * Max size: 50 MB
 *
 * Usage: router.post('/uploads/video', uploadVideoSingle, controller);
 */
export const uploadVideoSingle = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
}).single('video');

/**
 * Multer error handler — converts MulterError to ApiError.
 * Place this after the upload middleware in the route.
 */
export const handleMulterError = (err, _req, _res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest('File size exceeds the allowed limit'));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(ApiError.badRequest('Maximum 5 files allowed'));
    }
    return next(ApiError.badRequest(err.message));
  }
  next(err);
};