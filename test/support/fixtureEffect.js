// A stand-in for a material in batch-collection tests.
//
// WHY THIS EXISTS. `Tr2RenderBatch.SetMaterial` takes a material - Carbon types
// the argument (`TriRenderBatch.h:65`, `void SetMaterial( Tr2Material* )`) - and
// asks it for its shader-state interface. Around forty fixtures across eleven
// test files passed a bare `{ id: "fx" }` instead, which is not a material and
// answers nothing.
//
// Nothing failed, because the call was written `material?.GetShaderStateInterface?.()`
// and the hedge swallowed the difference. Removing the hedge on 2026-09-05 made
// every one of those fixtures throw at once, which is the useful version of the
// same fact.
//
// `GetShaderStateInterface` returning null is CORRECT here, not a shortcut: it
// is what a real `Tr2Effect` returns before a shader is resolved, and the batch
// then keys on the material itself. The fixtures were already relying on that
// path; they just were not entitled to it.

/**
 * Makes an object answer the material contract a batch asks for.
 *
 * IT STAMPS IN PLACE AND RETURNS THE SAME OBJECT. Many of these tests assert
 * `batch.material === effect`, so handing back a copy would trade one failure
 * for another. Called twice on the same object it is a no-op, which is what
 * lets a fixture factory stamp defensively without caring whether the call
 * site already did.
 *
 * @param {object} [values] The fixture, typically an identifying literal.
 * @returns {object} That same object, now answering as a material.
 */
export function FixtureEffect(values = {})
{
  // A null material is a real case these tests exercise - "null material batch
  // is invalid" - so it passes straight through rather than becoming an object.
  if (!values) return values;

  // Stamped PER METHOD, because a fixture that already answers one of them is
  // saying something deliberate - a quad-renderer effect returns a real sort
  // value - and overwriting that would quietly change what the test proves.
  if (typeof values.GetShaderStateInterface !== "function")
  {
    values.GetShaderStateInterface = () => null;
  }

  if (typeof values.CompatibleWithGdr !== "function")
  {
    values.CompatibleWithGdr = () => false;
  }

  return values;
}
