/**
 * Various utility helpers.
 */
class Util {
  /**
   * Deep-equality check for simple objects.
   *
   * @param {Any} a The first value.
   * @param {Any} b The second value.
   * @return {Boolean}
   */
  static isEqual(a, b) {
    return JSON.stringify(a) == JSON.stringify(b);
  }

  /**
   * Adds the elements of the given set `b` to the set `a`.
   *
   * @param {Set} a The first set.
   * @param {Set} b The second set.
   */
  static formUnion(a, b) {
    for (const element of b) {
      a.add(element);
    }
  }

  /**
   * Removes the elements of the set `a` that aren’t also in the given set `b`.
   *
   * @param {Set} a The first set.
   * @param {Set} b The second set.
   */
  static formIntersection(a, b) {
    for (const element of a) {
      if (!b.has(element)) {
        a.delete(element);
      }
    }
  }

  /**
   * Builds a standard sysex message.
   * Does not actually send any message, only builds an array of numbers.
   *
   * @param {Array<Number>} header A preamble that defines the message type.
   * @param {Array<Number>} message The message data.
   * @return {Array<Number>}
   */
  static sysEx(header, message) {
    const kSysEx = 0xf0;
    const kEndOfSysEx = 0xf7;
    return [kSysEx, ...header, ...message, kEndOfSysEx];
  }
}
