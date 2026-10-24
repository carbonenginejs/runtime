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
scalar scaling/division and arithmetic projections.
`src/quaternionFloat32.js` prepares multiply, dot, length, normalization, inverse
and scalar scaling/division.
The vector2/3/4 float32 tables prepare length, normalization, dot, clamp and triple-cross kernels.
These partial tables are internal and absent from the archive barrel and runtime exports. This is
preparation for our initialization-time precision option, not an active setting:
fast double intermediates will be the default; float32 will be selected once,
immutably, without a precision branch in each math call. Other operations and
initialization wiring remain unfinished.

Float32 kernels have been checked against an unmodified native Carbon build for
the specified operations: MSVC x64, `/Od /fp:strict`, including singular and
exceptional-value fixtures. This is a bounded compiler/profile comparison;
NaN payload bits, other native profiles and transcendental functions are not
certified. Float storage alone does not reproduce native float intermediates.

All hot-path temporaries use scalar locals, reusable typed scratch or pools.
Constructors allocate owned results; repeated temporary typed-array allocation
causes garbage-collection pressure and is not the pattern for operations.
The source allocation inventory leaves only initialization, owned-result factories
and explicitly returned views; remaining operations still require native precision review.

CarbonEngine supplies the donor source, owned by Fenris Creations (CCP Games).
This JavaScript port is not affiliated with or endorsed by Fenris Creations or CCP Games.

```sh
npm run build:npm
node --test archive/math-carbon/test/matrix.test.mjs archive/math-carbon/test/quaternion.test.mjs archive/math-carbon/test/gl-equivalence.test.mjs
```
