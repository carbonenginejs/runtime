/**
 * Whether format options contain only values accepted by structured clone.
 * Shared references and cycles are valid; functions and class instances are not.
 * @param {*} value Candidate option value.
 * @param {Set<object>} [seen=new Set()] Already visited objects.
 * @returns {boolean} Whether a worker can receive this value.
 */
export function canCloneFormatOptions(value, seen = new Set())
{
  if (value === null || value === undefined) return true;
  const type = typeof value;
  if (["string", "number", "boolean", "bigint"].includes(type)) return true;
  if (type !== "object") return false;
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value) || value instanceof Date) return true;
  if (seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value)) return value.every(entry => canCloneFormatOptions(entry, seen));
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null)
    && Object.values(value).every(entry => canCloneFormatOptions(entry, seen));
}
