// Source: parser/include/ccpparser.h (CcpParser::Parse)

/**
 * Error raised while tokenizing or parsing an expression, carrying the source
 * text, the reason, and the character position at which parsing failed.
 */
export class CjsControllerExpressionCompileError extends Error
{
  /** Error.prototype.name is shadowed with the class's own name. */
  name = "CjsControllerExpressionCompileError";

  expression = "";
  reason = "";
  position = 0;

  /**
   * Formats the message as the position, reason and full expression so a failed
   * compile is diagnosable from the message alone.
   */
  constructor(data)
  {
    super(`Error compiling expression at ${data.position}: ${data.reason} (${data.expression})`);
    this.expression = data.expression;
    this.reason = data.reason;
    this.position = data.position;
  }
}
