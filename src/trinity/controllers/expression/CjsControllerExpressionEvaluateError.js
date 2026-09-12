// Source: parser/include/ccpparser.h (CcpParser::Program)

/**
 * Error raised while evaluating a compiled expression, carrying the source text
 * and the reason.
 */
export class CjsControllerExpressionEvaluateError extends Error
{
  expression;
  reason;

  /**
   * Formats the message as the reason and the full expression; unlike compile
   * errors there is no meaningful source position at evaluation time.
   */
  constructor(data)
  {
    super(`Error evaluating expression: ${data.reason} (${data.expression})`);
    this.name = "CjsControllerExpressionEvaluateError";
    this.expression = data.expression;
    this.reason = data.reason;
  }
}
