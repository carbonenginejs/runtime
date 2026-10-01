/**
 * Matches the legacy carbon namespace or its canonical meta.carbon alias in an AST.
 * Computed properties and unrelated owners are not decorator declarations.
 * @param {object} expression The decorator expression or callee.
 * @param {string} name The Carbon decorator member name.
 * @returns {boolean} Whether the expression names that Carbon decorator.
 */
export function isCarbonDecorator(expression, name)
{
  if (expression?.type === "CallExpression") expression = expression.callee;
  if (expression?.type !== "MemberExpression"
    || expression.computed
    || expression.property?.type !== "Identifier"
    || expression.property.name !== name) return false;

  const owner = expression.object;
  if (owner?.type === "Identifier") return owner.name === "carbon";
  return owner?.type === "MemberExpression"
    && owner.computed === false
    && owner.object?.type === "Identifier"
    && owner.object.name === "meta"
    && owner.property?.type === "Identifier"
    && owner.property.name === "carbon";
}
