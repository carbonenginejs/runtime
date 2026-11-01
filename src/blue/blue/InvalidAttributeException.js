// Source: blue/src/IRootReader.h
import { CjsSchema } from "#schema";
import { IRootReaderException } from "./IRootReaderException.js";

/** `InvalidAttributeException` - a key names no member the reader may write (IRootReader.h:46-53). */
export class InvalidAttributeException extends IRootReaderException
{
  /** Error name reported by the stack header and `String(error)`. */
  name = "InvalidAttributeException";

  /**
   * @param {string} message What went wrong.
   */
  constructor(message)
  {
    super(message);
  }
}

CjsSchema.meta.carbon("InvalidAttributeException")(InvalidAttributeException);
