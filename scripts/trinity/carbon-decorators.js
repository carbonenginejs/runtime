/**
 * Matches Carbon exposure in meta.blue and legacy decorator spellings in an AST.
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
    && ["blue", "carbon"].includes(owner.property.name);
}

/**
 * Resolves an exact method or the prescribed lower-camel JavaScript static name.
 * Instance methods never gain a casing alias, and the fallback must be static.
 * @param {Map<string,object>} methods JavaScript method declarations.
 * @param {string} name Native method name.
 * @param {boolean} isStatic Whether the donor declares a static method.
 * @returns {object|undefined} The matching declaration, if present.
 */
export function findCarbonMethod(methods, name, isStatic = false)
{
  const exact = methods.get(name);
  if (exact || !isStatic || !name) return exact;
  const candidate = methods.get(name[0].toLowerCase() + name.slice(1));
  return candidate?.isStatic === true ? candidate : undefined;
}
