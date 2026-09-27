// Source: blue/src/IRootReader.h
import { CjsSchema } from "#schema";
import { IRootReaderException } from "./IRootReaderException.js";

/** `InvalidAttributeException` - a key names no member the reader may write (IRootReader.h:46-53). */
export class InvalidAttributeException extends IRootReaderException
{
  /**
   * @param {string} message What went wrong.
   */
  constructor(message)
  {
    super(message);
    this.name = "InvalidAttributeException";
  }
}

CjsSchema.define(InvalidAttributeException, { className: "InvalidAttributeException", carbon: "InvalidAttributeException" });
