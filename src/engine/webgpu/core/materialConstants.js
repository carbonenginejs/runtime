// Named material constants: the layout, and packing values into it.
//
// THE LAYERING DEFECT THIS EXISTS TO REMOVE. Carbon's binding path reads
// constants from the PASS - `Tr2Pass.stageInputs[stage].constants` carries
// `{name, offset, size, type, dimension, elements, isSRGB, isAutoregister}`,
// the buffer is sized while iterating them, and the result binds to
// CONSTANT_BUFFER_FOR_EFFECT_PARAMETERS, which is literally cb0 per stage. This
// engine instead dug the same facts out of the package's ANLS analysis chunk:
// `analysis.stages[].bindings[].carbon.constants`. That is a format record
// standing in for canonical reflection, and the ownership page is explicit that
// reflection belongs to `Tr2Shader` while the backend package owns only
// physical topology - group, binding, visibility, register identity.
//
// The engine cannot import `Tr2Shader`: this package declares no runtime
// dependencies, and that is deliberate. So the shape is duck-typed and the
// caller supplies it, exactly as every other seam here works. `MaterialLayout`
// is the boundary; where it came from is the caller's business.
//
// A SECOND ENGINE MUST NOT COPY THE OLD SHORTCUT. That is written down in the
// backend plan and in the reflection-ownership page, and it is the reason this
// module names the correct source rather than quietly wrapping the wrong one.

function fail(message)
{
  const error = new Error(`CjsWebgpuMaterialConstants: ${message}`);
  error.code = "CJS_WEBGPU_MATERIAL_CONSTANTS_INVALID";
  throw error;
}


// Carbon Tr2RenderContextEnum::ShaderType. Material constants bind per stage,
// and cb0 for a surface material is the PIXEL stage's.
const PIXEL_STAGE = 1;


/**
 * Builds a material constant layout by walking a pass's stage inputs, which is
 * where Carbon reads them from.
 *
 * `shader` is duck-typed on purpose — this package declares no runtime
 * dependencies, so it cannot import `Tr2Shader` and does not need to. It needs
 * `GetTechniqueIndex` and either `GetEffect` or `GetEffectDescription`.
 *
 * TWO THINGS THIS DOES THAT THE OLD ANALYSIS PATH COULD NOT.
 *
 * It sizes the buffer from `max(offset + size)` across the constants, as Carbon
 * does while iterating them. The stage input's `constantValueSize` is NOT that
 * number — it is the length of the authored default blob, and using it as the
 * buffer size would be right only by coincidence.
 *
 * It carries the authored DEFAULTS. Carbon keeps a default-constant block per
 * stage input, and it is why an effect can be drawn without the caller naming
 * every parameter. The analysis path had no access to them, so it demanded
 * every constant from the caller.
 */
export function MaterialLayoutFromShader(shader, options = {})
{
  const technique = options.technique ?? "Main";
  const passIndex = options.pass ?? 0;
  const stageType = options.stage ?? PIXEL_STAGE;

  if (typeof shader?.GetTechniqueIndex !== "function") fail("a Tr2Shader-shaped reflection object is required");

  const effect = shader.GetEffect?.() ?? shader.GetEffectDescription?.();
  if (!effect) fail("the shader exposes no effect description");

  const techniqueIndex = shader.GetTechniqueIndex(technique);
  if (!Number.isInteger(techniqueIndex) || techniqueIndex < 0) fail(`technique ${JSON.stringify(technique)} is absent`);

  const pass = effect.techniques?.[techniqueIndex]?.passes?.[passIndex];
  if (!pass) fail(`technique ${JSON.stringify(technique)} has no pass ${passIndex}`);

  // stageInputs is a fixed six-slot array indexed by stage type, with absent
  // stages present but empty, so `exists` is the only honest test.
  const stageInput = pass.stageInputs?.[stageType];
  if (!stageInput?.exists) fail(`pass ${passIndex} has no stage ${stageType}`);

  const constants = stageInput.constants ?? [];
  if (!constants.length) fail(`pass ${passIndex} stage ${stageType} declares no constants`);

  // The extent belongs to the reflection, not to a backend: it is arithmetic
  // over the stage input's own constants and every backend gets the same
  // answer. `Tr2EffectStageInput.GetConstantBufferSize()` owns it, so this asks
  // rather than recomputing, and falls back only for a reflection object that
  // predates it. What IS this backend's business is alignment on top of the
  // extent, which is applied below.
  let size = typeof stageInput.GetConstantBufferSize === "function"
    ? stageInput.GetConstantBufferSize()
    : constants.reduce((extent, constant) => Math.max(extent, (constant?.offset ?? 0) + (constant?.size ?? 0)), 0);

  size = Math.ceil(size / 4) * 4;

  return NormalizeMaterialLayout({
    size,
    constants,
    defaults: stageInput.constantValues ?? null
  });
}


/**
 * Validates a material constant layout and returns it in canonical form.
 *
 * The checks are the ones a wrong layout fails silently without: an offset that
 * is not register-aligned, a constant that runs past the buffer, and two
 * constants that overlap. Each would produce a buffer that uploads cleanly and
 * renders wrongly.
 */
export function NormalizeMaterialLayout(layout)
{
  const size = layout?.size;
  const constants = layout?.constants;

  if (!Number.isInteger(size) || size < 1 || size % 4 !== 0)
  {
    fail("layout size must be a positive multiple of four bytes");
  }
  if (!Array.isArray(constants) || !constants.length)
  {
    fail("layout requires at least one constant");
  }

  const names = new Set();
  const ranges = [];
  const normalized = [];

  for (const constant of constants)
  {
    const name = constant?.name;
    const offset = constant?.offset;
    const byteSize = constant?.size;
    const dimension = constant?.dimension;

    if (typeof name !== "string" || !name) fail("every constant requires a name");
    if (names.has(name)) fail(`constant ${name} is declared twice`);
    // Absent means the defaults Carbon's vocabulary gives them - type 0 is
    // FLOAT and elements 0 is "not an array" - so normalizing an already
    // normalized layout is idempotent rather than rejecting its own output.
    if ((constant.type ?? 0) !== 0 || (constant.elements ?? 0) !== 0)
    {
      // Arrays and non-float constants are a real part of Carbon's vocabulary
      // and simply are not implemented here yet. Saying so beats packing them
      // as if they were four floats.
      fail(`constant ${name} is an array or non-float type, which is not implemented`);
    }
    if (!Number.isInteger(dimension) || dimension < 1 || dimension > 4)
    {
      fail(`constant ${name} has an unsupported dimension`);
    }
    if (!Number.isInteger(offset) || offset < 0 || offset % 4 !== 0)
    {
      fail(`constant ${name} must start on a four-byte boundary`);
    }
    if (!Number.isInteger(byteSize) || byteSize < dimension * 4 || offset + byteSize > size)
    {
      fail(`constant ${name} does not fit the ${size}-byte buffer`);
    }
    if (ranges.some(([ start, end ]) => offset < end && offset + byteSize > start))
    {
      fail(`constant ${name} overlaps another constant`);
    }

    names.add(name);
    ranges.push([ offset, offset + byteSize ]);
    normalized.push(Object.freeze({ name, offset, size: byteSize, dimension }));
  }

  // The authored default block may be shorter than the buffer - it covers the
  // constants the author gave values for - so it is copied as a prefix rather
  // than required to match.
  const defaults = layout.defaults ?? null;
  if (defaults !== null && !ArrayBuffer.isView(defaults))
  {
    fail("layout defaults must be a typed array when present");
  }

  return Object.freeze({ size, constants: Object.freeze(normalized), defaults });
}


/**
 * Packs named values into a material constant buffer.
 *
 * Values are matched by NAME, which is the whole point of named reflection: the
 * caller supplies `{ AlbedoColor: [...] }` and never an offset. A missing value
 * is an error rather than a zero, because a silently black material is far
 * harder to notice than a thrown name.
 */
export function PackMaterialConstants(layout, values)
{
  const plan = layout?.constants && layout?.size ? NormalizeMaterialLayout(layout) : fail("a material layout is required");

  if (!values || (typeof values !== "object" && !(values instanceof Map)))
  {
    fail("material values are required");
  }

  const buffer = new ArrayBuffer(plan.size);
  const view = new DataView(buffer);

  // Authored defaults first, so a caller names only what it overrides. Without
  // them every constant must be supplied, which is what the old path demanded.
  if (plan.defaults)
  {
    const bytes = new Uint8Array(plan.defaults.buffer, plan.defaults.byteOffset, plan.defaults.byteLength);
    new Uint8Array(buffer).set(bytes.subarray(0, Math.min(bytes.length, plan.size)));
  }

  for (const constant of plan.constants)
  {
    const value = namedValue(values, constant.name);
    // A constant with an authored default may go unnamed; one without cannot,
    // because the alternative is a silently black material.
    if (value === null || value === undefined)
    {
      if (plan.defaults) continue;
      fail(`material.${constant.name} is required`);
    }

    const entries = flattenNumbers(value);
    if (entries.length !== constant.dimension)
    {
      fail(`material.${constant.name} must contain exactly ${constant.dimension} values`);
    }

    for (let index = 0; index < constant.dimension; index += 1)
    {
      const item = entries[index];
      // Finite as a DOUBLE is not enough: Number.MAX_VALUE survives that check
      // and becomes Infinity the moment it is stored as a float32, so the
      // buffer uploads cleanly carrying a value the caller never asked for.
      if (!isFiniteFloat32(item)) fail(`material.${constant.name}[${index}] must be a finite float32`);
      view.setFloat32(constant.offset + index * 4, item, true);
    }
  }

  return new Uint8Array(buffer);
}


function isFiniteFloat32(value)
{
  return typeof value === "number" && Number.isFinite(value) && Number.isFinite(Math.fround(value));
}


function namedValue(values, name)
{
  if (values instanceof Map) return values.get(name);
  if (values && typeof values === "object" && Object.prototype.hasOwnProperty.call(values, name))
  {
    return values[name];
  }
  return undefined;
}


function flattenNumbers(value)
{
  if (typeof value === "number") return [ value ];
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (Array.isArray(value)) return value.flatMap(flattenNumbers);
  fail("a material value must be a number, array, or typed array");
  return [];
}
