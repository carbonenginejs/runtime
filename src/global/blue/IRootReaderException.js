// Source: blue/src/IRootReader.h
import { CjsSchema } from "#schema";

/** `IRootReaderException` - a reader could not read a value (IRootReader.h:21-38). */
export class IRootReaderException extends TypeError
{
  /**
   * @param {string} message What went wrong.
   */
  constructor(message)
  {
    super(message);
    this.name = "IRootReaderException";
  }
}

CjsSchema.define(IRootReaderException, { className: "IRootReaderException", carbon: "IRootReaderException" });
