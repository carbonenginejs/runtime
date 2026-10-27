# Carbon math port preparation

These JavaScript ports of Carbon's math library remain outside production imports
while their internals are prepared for a coordinated convention migration.
Carbon supplies the API names, argument order, row-vector conventions and behavior.
The runtime continues using its existing math exports until that migration.

`src/matrix.js` keeps double scalar intermediates and float32 Matrix storage.
Its multiply caches operands; inverse and scale/rotation/translation composition
use scalar locals without temporary arrays. Composition retains both matrix-store
boundaries and zero terms, including their non-finite and signed-zero behavior.
Inverse copies singular inputs and follows the native arithmetic path for a NaN
determinant. Caller-owned output may overlap the inputs for these operations.

`src/matrixFloat32.js` prepares the float32 implementations of multiply,
determinant, inverse, scale/rotation/translation composition, vector transforms,
scalar scaling/division, arithmetic projections, basis/look-at construction, centered
composition, decomposition and batched transforms.
`src/quaternionFloat32.js` prepares multiply, dot, length, normalization, inverse
and scalar scaling/division.
The vector2/3/4 float32 tables prepare length, normalization, dot, clamp, triple-cross,
Hermite interpolation, sphere probes and bounding-sphere kernels.
`src/planeFloat32.js` prepares scalar arithmetic, dot products, line intersection and normalization.
The sphere, axis-aligned box and ellipsoid float32 tables prepare compound construction,
containment, growth, transform and ray operations while preserving native edge cases.
These partial float32 tables are internal and absent from the archive barrel and runtime exports.
The archive barrel now exports `initializeMath`; only its default double mode is available:

```js
import { initializeMath, Matrix } from "./src/index.js";

const math = initializeMath({ precision: "double" }); // Also the default when omitted.
const result = math.Matrix.create();
Matrix.identityMatrix(result); // the same class, imported directly
```

Selection is immutable per initializer module instance. Repeating the same selection returns
the same API; a conflicting selection throws. Calls go directly to the class statics without
wrappers or per-operation precision branches. Each Carbon type is a class (`Vector3`, `Matrix`,
`Float_16`, ...) whose camelCase statics take the output first and return it; the classes are not
frozen (freezes are for enums only). The internal float32 tables are still frozen objects.
Carbon headers that only hold free functions become camelCase namespaces: `triUtil` holds
`TriUtil.h`'s gamma conversions, and `triMath` is
`trinity/trinity/Include/TriMath.h` (`triMath.triClamp` for `TriClamp`), including its
`TriPerlinNoise` class and the double-precision `Matrix4d*` functions. `boundingBox`,
`boundingSphere` and `matrixUtils` are `trinity/trinity/Utilities/BoundingBox.h`,
`BoundingSphere.h` and `MatrixUtils.h`; `MatrixUtils.h`'s `Float4x3` struct is a class.
Each namespace splits Carbon's overloads by rule 11 (`boundingBoxUpdate__Pos`).
Persistent values retain Float32Array storage (Uint16Array for half vectors); double intermediates do not imply a Float64Array value contract. Workers and separately loaded
module instances have independent initialization state.

Requesting `precision: "float32"` before initialization throws `CARBON_FLOAT32_UNAVAILABLE`
without committing state or silently falling back. Complete native CRT/DirectXMath agreement
has not been established, including native transcendental functions. The double initializer
does not import the internal float32 tables or retain their scratch. Options must be an object;
unknown enumerable own string keys and unsupported precision values are rejected. This is an
archive-only entry point, not an exported runtime package setting.

Float32 kernels have been checked against an unmodified native Carbon build for
the specified operations: MSVC x64, `/Od /fp:strict`, including singular and
exceptional-value fixtures. This is a bounded compiler/profile comparison;
NaN payload bits, other native profiles and transcendental functions are not
certified. Float storage alone does not reproduce native float intermediates.

Algorithm bodies use scalar locals or reusable typed scratch instead of explicit temporary construction.
Constructors allocate owned results; repeated temporary typed-array allocation
causes garbage-collection pressure and is not the pattern for operations.
The source allocation inventory leaves only initialization, owned-result factories
and explicitly returned views. This is not a zero-VM-allocation claim: bounded Chrome
measurements still observe collections during centered transforms. Exact-mode completion
requires a verified native-math backend and complete-table validation.

CarbonEngine supplies the donor source, owned by Fenris Creations (CCP Games).
This JavaScript port is not affiliated with or endorsed by Fenris Creations or CCP Games.

```sh
npm run build:npm
node --test archive/math-carbon/test/matrix.test.mjs archive/math-carbon/test/quaternion.test.mjs archive/math-carbon/test/gl-equivalence.test.mjs
```
