import ApiError from '../utils/ApiError.js';

/**
 * Request validation middleware using Joi schemas.
 *
 * Validates req.body, req.params, and/or req.query against
 * the provided Joi schemas.
 *
 * Usage:
 *   router.post(
 *     '/',
 *     validate({ body: createPostSchema }),
 *     controller
 *   );
 *
 *   router.get(
 *     '/',
 *     validate({ query: listPostsSchema }),
 *     controller
 *   );
 *
 * @param {object} schemas - { body?, params?, query? } Joi schemas
 */
const validate = (schemas) => (req, _res, next) => {
  const errors = [];

  for (const [source, schema] of Object.entries(schemas)) {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,    // collect all errors, not just the first
      stripUnknown: true,   // remove fields not in schema
      convert: true,        // coerce types (e.g. "1" → 1 for query params)
    });

    if (error) {
      const sourceErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        source,
      }));
      errors.push(...sourceErrors);
    } else {
      // Replace with validated/sanitized values
      req[source] = value;
    }
  }

  if (errors.length > 0) {
    throw ApiError.validation('Validation failed', errors);
  }

  next();
};

export default validate;
