// Source: blue/src/IRootReader.h
import { CjsSchema } from "#schema";

/** `IRootReaderException` - a reader could not read a value (IRootReader.h:21-38). */
export class IRootReaderException extends TypeError
{
  /** Error name reported by the stack header and `String(error)`. */
  name = "IRootReaderException";

  /**
   * @param {string} message What went wrong.
   */
  constructor(message)
  {
    super(message);
  }
}

CjsSchema.meta.carbon("IRootReaderException")(IRootReaderException);
