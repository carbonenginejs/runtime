/**
 * The global foundation: browser-safe primitives shared by every runtime
 * domain (utilities, errors, contracts, Blue, constants, math, schema and
 * model families).
 *
 * Dependency rules for everything under `global/`:
 * - no import of another `@carbonenginejs/*` package or of a higher runtime
 *   layer (resource, trinity, trinityal, core, input, tools); focused
 *   browser-safe third-party primitives such as `gl-matrix` are allowed;
 * - no Node built-ins or Node-only globals;
 * - every public subpath stays importable on its own, and module evaluation
 *   does no environment-specific work.
 *
 * Code belongs here only when all of these hold: more than one runtime layer
 * needs it; it is useful without application, rendering, resource or domain
 * policy; it meets the rules above; its semantics are stable enough for broad
 * reuse; and owning it here removes duplicated behaviour rather than merely
 * shortening an import.
 *
 * The `is*` predicates return literal booleans; domain-specific checks stay
 * with their domain.
 */
export * as is from "./utils/is.js";
export * from "./utils/is.js";

export * as arrays from "./utils/arrays.js";
export * from "./utils/arrays.js";
export * as bytes from "./utils/bytes.js";
export * from "./utils/bytes.js";
export * as compression from "./utils/compression.js";
export * from "./utils/compression.js";
export * as json from "./utils/json.js";
export * from "./utils/json.js";
export * as lookup from "./utils/lookup.js";
export * from "./utils/lookup.js";
export * as object from "./utils/object.js";
export * from "./utils/object.js";
export * as path from "./utils/path.js";
export * from "./utils/path.js";
export * as text from "./utils/text.js";
export * from "./utils/text.js";
export * as validation from "./utils/validation.js";
export {
    assertPlainObject,
    assertNonEmptyString,
    assertSupportedVersion
} from "./utils/validation.js";
export * as errors from "./utils/errors/index.js";
export * from "./utils/errors/index.js";

export * from "./contracts/index.js";
export * from "./blue/index.js";

export * as constants from "./consts/index.js";
export * from "./consts/index.js";

export * as num from "./math/num.js";
export * as math from "./math/index.js";
export * from "./math/scalar.js";
export * as vec2 from "./math/vec2.js";
export * as vec3 from "./math/vec3.js";
export * as vec4 from "./math/vec4.js";
export * as quat from "./math/quat.js";
export * as color from "./math/color.js";
export * as mat3 from "./math/mat3.js";
export * as mat4 from "./math/mat4.js";

export * as box3 from "./math/box3.js";
export * as tri3 from "./math/tri3.js";
export * as lne3 from "./math/lne3.js";
export * as pln from "./math/pln.js";
export * as ray3 from "./math/ray3.js";
export * as sph3 from "./math/sph3.js";

export * as pool from "./math/pool.js";
export * as noise from "./math/noise.js";
export * as curve from "./math/curve.js";

export * as geometry from "./math/geometry/index.js";
export * as vertex from "./math/vertex.js";
export * as mesh from "./math/mesh.js";
export * as tangent from "./math/tangent.js";


/**
 * TypedArray
 * @typedef {Float64Array|Float32Array|Uint32Array|Uint16Array|Uint8Array|Uint8ClampedArray|Int32Array|Int16Array|Int8Array} TypedArray
 */
export * from "./utils/resFile.js";
