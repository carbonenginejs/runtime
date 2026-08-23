/**
 * Deep-freezes plain objects and arrays used by descriptor records.
 *
 * @param {any} value Value to freeze.
 * @returns {any} The same value, recursively frozen where applicable.
 */
export function deepFreeze(value)
{
  if (!value || typeof value !== "object" || Object.isFrozen(value))
  {
    return value;
  }

  if (Array.isArray(value))
  {
    for (const entry of value)
    {
      deepFreeze(entry);
    }
    return Object.freeze(value);
  }

  for (const key of Object.keys(value))
  {
    deepFreeze(value[key]);
  }

  return Object.freeze(value);
}

/**
 * Deep-clones JSON-like values so descriptors do not retain caller-owned
 * mutable references.
 *
 * @param {any} value Value to clone.
 * @returns {any} Deep clone.
 */
export function cloneJson(value)
{
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(cloneJson);
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (typeof value === "object")
  {
    const out = {};
    for (const key of Object.keys(value))
    {
      out[key] = cloneJson(value[key]);
    }
    return out;
  }
  return null;
}
