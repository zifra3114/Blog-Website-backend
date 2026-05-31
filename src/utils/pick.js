/**
 * Pick specified keys from an object.
 * Useful for filtering request query/body to only allowed fields.
 *
 * @param {object} obj   - Source object
 * @param {string[]} keys - Keys to pick
 * @returns {object}
 *
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']) → { a: 1, c: 3 }
 */
const pick = (obj, keys) => {
  return keys.reduce((result, key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
    return result;
  }, {});
};

export default pick;
