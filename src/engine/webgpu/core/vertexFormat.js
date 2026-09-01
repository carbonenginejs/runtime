// Geometry declaration elements to WebGPU vertex formats.
//
// WebGPU's format list is NOT a cross product. It carries no 1- or 3-component
// variant of any 8- or 16-bit format: `unorm8x2` and `unorm8x4` exist,
// `unorm8x3` does not, and neither does `float16x3`. Only the 32-bit formats
// come in all four widths. That is a hard restriction of the specification,
// not a gap in this table.
//
// A declaration CAN author the missing combinations - a CMF decl may hold a
// three-component Float16 normal - so this throws rather than widening. A
// silent widen to `float16x4` would step four components through a buffer
// packed at three and read every vertex after the first from the wrong offset,
// which draws a shape rather than an error.
//
// The caller's remedy is to repack the channel at a width WebGPU can address,
// which is a producer decision and not one to take here.
// The narrow subpath, not the geometry barrel: the barrel carries decorated
// model classes, and the engine graph is loaded untranspiled by the harness
// that drives a real device. Reaching a payload FACT must not drag a schema in.
import { VertexElementType } from "#resource/geometry/vertex";


/** The 32-bit formats, which alone exist at every width. */
const WIDE = Object.freeze({ float: "float32", uint: "uint32", sint: "sint32" });

/** The narrow formats, at the two widths that exist. */
const NARROW = Object.freeze({
  "float:16": "float16",
  "uint:16:false": "uint16",
  "uint:16:true": "unorm16",
  "sint:16:false": "sint16",
  "sint:16:true": "snorm16",
  "uint:8:false": "uint8",
  "uint:8:true": "unorm8",
  "sint:8:false": "sint8",
  "sint:8:true": "snorm8"
});

/** The component counts a narrow format exists at. */
const NARROW_COUNTS = Object.freeze([ 2, 4 ]);


/**
 * The `GPUVertexFormat` for one declaration element.
 *
 * `float32` is deliberately unsuffixed at one component, matching WebGPU's own
 * naming: the suffix counts components only when there is more than one.
 *
 * @param {object} element Declaration element carrying `type` and `elementCount`.
 * @returns {string} A `GPUVertexFormat`.
 * @throws {RangeError} When WebGPU has no format for the element.
 */
export function WebgpuVertexFormat(element)
{
  const { base, bits, count, normalized } = VertexElementType(element);

  if (bits === 32)
  {
    // A normalized 32-bit integer has no WebGPU format either, but nothing
    // produces one: the geometry vocabulary has no such type.
    return count === 1 ? WIDE[base] : `${WIDE[base]}x${count}`;
  }

  const stem = NARROW[`${base}:${bits}:${normalized}`] ?? NARROW[`${base}:${bits}`];

  if (!stem)
  {
    throw new RangeError(`WebGPU has no vertex format for a ${bits}-bit ${base}`);
  }

  if (!NARROW_COUNTS.includes(count))
  {
    throw new RangeError(
      `WebGPU has no ${count}-component "${stem}" vertex format: 8- and 16-bit formats `
      + `exist only at ${NARROW_COUNTS.join(" and ")} components. Repack "${element.type}" `
      + `at a width WebGPU can address.`
    );
  }

  return `${stem}x${count}`;
}


/**
 * The vertex buffer layout for one interleaved declaration.
 *
 * `arrayStride` is taken from the caller rather than derived, because the
 * declaration's own extent is a TIGHT max-offset sum with no alignment
 * rounding, while WebGPU requires a stride that is a multiple of four. The
 * packer that produced the buffer knows the stride it actually wrote; deriving
 * a second one here would disagree with it silently.
 *
 * `shaderLocation` comes from the binding plan, because the location is the
 * SHADER's register and no property of the geometry. An element the shader
 * does not read is omitted rather than given an invented location.
 *
 * @param {number} arrayStride Byte stride the buffer was packed at.
 * @param {Array<object>} bindingPlan Entries from `Tr2VertexDefinition.resolveBindingPlan`.
 * @returns {{arrayStride: number, stepMode: string, attributes: Array<object>}}
 */
export function WebgpuVertexBufferLayout(arrayStride, bindingPlan)
{
  const attributes = [];

  for (const entry of bindingPlan ?? [])
  {
    if (!entry?.element) continue;

    attributes.push({
      shaderLocation: entry.registerIndex,
      offset: entry.element.offset ?? 0,
      format: WebgpuVertexFormat(entry.element)
    });
  }

  attributes.sort((a, b) => a.shaderLocation - b.shaderLocation);

  return { arrayStride, stepMode: "vertex", attributes };
}
