// Destination forms the parameter classes accept today. Carbon has one form, a float* (a typed-array view here);
// the function, `{ value }` holder and array-for-a-scalar forms below are not Carbon's and go when the
// callers that pass them are changed (Goal 15 step 3).

/**
 * Whether a value can receive a scalar write - a setter function, a `{ value:
 * number }` holder, or a writable number array.
 */
export function isScalarDestination(value)
{
  return typeof value === "function" || isNumberHolder(value) || isWritableNumberArray(value, 1);
}

/**
 * Reads a scalar back out of whichever destination form was supplied.
 * @param fallback returned for function destinations, which are write-only
 */
export function readScalarDestination(destination, fallback)
{
  if (typeof destination === "function")
  {
    return fallback;
  }
  if (isNumberHolder(destination))
  {
    return Number(destination.value);
  }
  return Number(destination[0]);
}

/**
 * Writes a scalar through whichever destination form was supplied - calling a
 * function, assigning `.value`, or writing element 0.
 */
export function writeScalarDestination(destination, value)
{
  if (typeof destination === "function")
  {
    destination(value);
    return;
  }
  if (isNumberHolder(destination))
  {
    destination.value = value;
    return;
  }
  destination[0] = value;
}

/**
 * Whether a value is an object with a numeric `value` property - the
 * boxed-scalar destination form.
 */
export function isNumberHolder(value)
{
  return typeof value === "object" && value !== null && "value" in value && typeof value.value === "number";
}

/**
 * Whether a value is an object with a `length` of at least `length`; element
 * types are deliberately not checked, so uninitialized out-parameters pass.
 */
export function isWritableNumberArray(value, length)
{
  return !!value && typeof value === "object" && "length" in value && Number(value.length) >= length;
}

/**
 * Whether a value is an array or typed array of exactly `length` numbers - the
 * strict test used to infer a parameter class from a raw map-form value.
 */
export function isNumberArrayValue(value, length)
{
  if (!value || typeof value !== "object" || Number(value.length) !== length) return false;
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) return false;
  for (let index = 0; index < length; index++)
  {
    if (typeof value[index] !== "number") return false;
  }
  return true;
}

/** Whether a value can receive `length` components written into it. */
export function isVectorDestination(value, length)
{
  return isWritableNumberArray(value, length);
}

/**
 * Copies `length` components out of a destination into `out` in place; returns
 * `out`.
 */
export function readVectorDestination(destination, out, length)
{
  for (let i = 0; i < length; i++)
  {
    out[i] = destination[i];
  }
  return out;
}

/**
 * Copies `length` components into a destination in place; the destination is
 * assumed to be large enough.
 */
export function writeVectorDestination(destination, value, length)
{
  for (let i = 0; i < length; i++)
  {
    destination[i] = value[i];
  }
}

/**
 * Copies `length` components from `value` into `out` in place; returns `out`
 * so callers can hand it straight back.
 */
export function copyNumberArray(out, value, length)
{
  for (let i = 0; i < length; i++)
  {
    out[i] = value[i];
  }
  return out;
}
