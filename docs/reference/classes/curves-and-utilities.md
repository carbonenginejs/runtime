# Curve and utility classes

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity/curves`, `@carbonenginejs/runtime-trinity/utilities`
Audience: Animation authors and engine integrators
Summary: Catalogs the curve, sequencer and modifier vocabulary that drives animated values, and the small shared utility records.

<!-- class:CjsGrannyCurves -->
## `CjsGrannyCurves`

Decodes Granny's 19 compressed animation-curve formats into explicit knots and controls, and samples them at a time, without depending on a GR2 container reader.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/track/CjsGrannyCurves.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2BoneMatrixCurve -->
## `Tr2BoneMatrixCurve`

Matrix function that tracks a named bone on a skinned object, returning the authored transform composed with that bone's current matrix and the object's world transform rather than sampling its own keys.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2BoneMatrixCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CameraFollowCurveKey -->
## `Tr2CameraFollowCurveKey`

Key of a camera follow curve, holding the camera offset and its tangents plus the field-of-view multiplier and framing angles used to place the camera box at that point in time.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/key/Tr2CameraFollowCurveKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveColor -->
## `Tr2CurveColor`

Color curve composed of four independent scalar curves for r, g, b and a, sampled at time minus timeOffset; an empty alpha curve yields 1, and the result is converted to gamma space when srgbOutput is set.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveColor.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveColorMixer -->
## `Tr2CurveColorMixer`

Color function that blends two authored colors by a fixed lerp factor and applies saturation and brightness, exposing both the mixed color and its linear-space conversion.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveColorMixer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveCombiner -->
## `Tr2CurveCombiner`

Vector function returning the component-wise sum of every child vector function sampled at the same time; its length is the longest child's length.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveCombiner.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveConstant -->
## `Tr2CurveConstant`

Curve returning the same authored vec4 at every time, usable as a scalar, vector, quaternion or color function; its derivatives are always zero (identity for quaternions).

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveConstant.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveEulerRotation -->
## `Tr2CurveEulerRotation`

Quaternion curve built from three scalar curves supplying yaw, pitch and roll in radians.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveEulerRotation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveEulerRotationExpression -->
## `Tr2CurveEulerRotationExpression`

Quaternion curve built from three independently compiled expressions producing yaw, pitch and roll in radians at time divided by timeScale.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveEulerRotationExpression.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveQuaternion -->
## `Tr2CurveQuaternion`

Keyed quaternion curve evaluated in seconds, with per-key interpolation and independent extrapolation modes before the first and after the last key.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveQuaternion.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveQuaternionKey -->
## `Tr2CurveQuaternionKey`

One key of a Tr2CurveQuaternion: a time in seconds, the quaternion value at that time, and the interpolation used to reach the next key.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/key/Tr2CurveQuaternionKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsMt19937 -->
## `CjsMt19937`

Deterministic MT19937 Mersenne Twister used to reproduce the C++ standard library's default random sequence from a persisted seed.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveRandomAxisRotation.js
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:Tr2CurveRandomAxisRotation -->
## `Tr2CurveRandomAxisRotation`

Quaternion curve that spins at a fixed rate of one revolution per `period` seconds about an axis fixed by two seed-derived random rotations applied before and after the spin.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveRandomAxisRotation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveScalar -->
## `Tr2CurveScalar`

Keyed scalar curve evaluated in seconds, with per-key constant, linear or Hermite interpolation and independent clamp, linear, cycle or mirror extrapolation before the first and after the last key.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveScalar.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveScalarExpression -->
## `Tr2CurveScalarExpression`

Scalar curve whose value is produced by a compiled expression evaluated at time divided by timeScale, with input1..input4 and a stable per-instance random constant available as terms.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveScalarExpression.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveScalarKey -->
## `Tr2CurveScalarKey`

One key of a Tr2CurveScalar: a time in seconds, a value, its left and right tangents in value units per unit time, the interpolation used to reach the next key, and the tangent-type rule that maintains the tangents.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/key/Tr2CurveScalarKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveSetRange -->
## `Tr2CurveSetRange`

Named sub-interval of a curve set's scaled timeline, giving a start and end time and whether playback loops inside it.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/Tr2CurveSetRange.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveVector2 -->
## `Tr2CurveVector2`

Two-component vector curve composed of independent scalar curves for x and y; its length is the longer of the two.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveVector2.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveVector3 -->
## `Tr2CurveVector3`

Three-component vector curve composed of independent scalar curves for x, y and z; its length is the longest of the three.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveVector3.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveVector3Expression -->
## `Tr2CurveVector3Expression`

Vector curve whose x, y and z components are each produced by an independently compiled expression evaluated at time divided by timeScale.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveVector3Expression.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveVector3Lerp -->
## `Tr2CurveVector3Lerp`

Vector curve that eases from a fixed initial value into a child vector curve, blending over the interval ending at curveStartTime with the configured start interpolation.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2CurveVector3Lerp.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DistanceTracker -->
## `Tr2DistanceTracker`

Scalar function reporting the distance between two tracked positions, either the full separation or its projection onto a fixed direction, and optionally signed by which side of that direction the target lies.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2DistanceTracker.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2FollowCurve -->
## `Tr2FollowCurve`

Vector curve interpolated through an ordered list of follow-curve keys, each supplying its own position, tangents and interpolation for the segment that follows it.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2FollowCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GrannyEventTrack -->
## `Tr2GrannyEventTrack`

Granny track that replays a text track's timed entries as engine events, firing each entry once as the playhead crosses it.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/track/Tr2GrannyEventTrack.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GrannyTrack -->
## `Tr2GrannyTrack`

Base for curves sampled out of a Granny animation resource, owning the resource path, group and track name plus the cycle flag and resolved duration; subclasses supply the track binding and sampling.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/track/Tr2GrannyTrack.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GrannyTransformTrack -->
## `Tr2GrannyTransformTrack`

Granny track that samples a bone's position, orientation and scale-shear curves together, exposing them as a translation vector, rotation quaternion and scale vector.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/track/Tr2GrannyTransformTrack.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GrannyVectorTrack -->
## `Tr2GrannyVectorTrack`

Granny track that samples a named one-dimensional vector track and exposes it as a scalar value.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/track/Tr2GrannyVectorTrack.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2MatrixKey -->
## `Tr2MatrixKey`

One key of a matrix curve: a time in seconds and the 4x4 matrix value at that time.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/key/Tr2MatrixKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ObjectFollowCurveKey -->
## `Tr2ObjectFollowCurveKey`

Follow-curve key positioned by another object rather than a fixed point, taking its place from that object's locator or offset and optionally rotating its tangents with the object.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/key/Tr2ObjectFollowCurveKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2QuaternionLerpCurve -->
## `Tr2QuaternionLerpCurve`

Quaternion curve that spherically interpolates between two child quaternion curves, ramping the blend from 0 to 1 over `length` seconds starting at `start` and clamping outside that window.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2QuaternionLerpCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RotationAdapter -->
## `Tr2RotationAdapter`

Quaternion function wrapping a child quaternion curve behind its own time remapping, falling back to a fixed authored quaternion when no child curve is attached.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2RotationAdapter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ScalarExprKey -->
## `Tr2ScalarExprKey`

One key of a Tr2ScalarExprKeyCurve whose time, value and tangents can each be produced by an expression over the key's inputs, its random constant and the previous key.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/key/Tr2ScalarExprKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ScalarExprKeyCurve -->
## `Tr2ScalarExprKeyCurve`

Keyed scalar curve whose key times, values and tangents are themselves expressions re-evaluated on every sample, with optional cycling and reversed playback over the key range.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2ScalarExprKeyCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ScalarFader -->
## `Tr2ScalarFader`

Scalar fade envelope that ramps linearly between 0 and 1 over an authored fade length, and also exposes a separate non-linear kick-in pulse that runs once per fade-in.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2ScalarFader.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2TranslationAdapter -->
## `Tr2TranslationAdapter`

Vector function wrapping a child vector curve behind its own time remapping and rotating the sampled offset by a fixed rotation, falling back to a fixed authored vector when no child curve is attached.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2TranslationAdapter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VectorFunctionModifier -->
## `Tr2VectorFunctionModifier`

Wraps a position source, offsetting and scaling what it reports, optionally in view space.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/Tr2VectorFunctionModifier.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriColorSequencer -->
## `TriColorSequencer`

Color function combining its child color functions with Carbon's multiply or add operator; both paths start from opaque white, so an additive sequencer is offset by white.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/TriColorSequencer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriCurveSet -->
## `TriCurveSet`

Playable group of curves and value bindings sharing one scaled playhead, applying every curve and copying every binding each update while it is playing.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/TriCurveSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriEventCurve -->
## `TriEventCurve`

Time-keyed event track that fires each key once as the playhead passes it, dispatching either a named event to a listener or a queued callable, and restarting the key cursor when time rewinds or a cycle wraps.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/TriEventCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriEventKey -->
## `TriEventKey`

One key of a TriEventCurve: a time in seconds plus either a named event string or a callable and its arguments to invoke when the playhead crosses it.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/key/TriEventKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriPerlinCurve -->
## `TriPerlinCurve`

Scalar curve driven by fractal Perlin noise, mapping the noise band to [offset, offset + scale] and advancing at `speed` from a per-instance random phase.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/TriPerlinCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriVectorSequencer -->
## `TriVectorSequencer`

Vector function combining its child vector functions with Carbon's multiply, add or average operator; multiply starts from ones and the additive paths from zero.

- Export: @carbonenginejs/runtime-trinity/curves
- Source: src/curves/curve/TriVectorSequencer.js
- Visibility: Public
- Kind: CarbonEngineJS


<!-- class:Float4x3 -->
## `Float4x3`

A transform packed into twelve floats, dropping the constant fourth column.

- Export: @carbonenginejs/runtime-trinity/utilities
- Source: src/utilities/Float4x3.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Range -->
## `Range`

A center point with a lower and an upper range point, optionally kept symmetric about the center, and clamped for display against separate slider bounds.

- Export: @carbonenginejs/runtime-trinity/utilities
- Source: src/utilities/Range.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2MaterialBoundsAdjustment -->
## `Tr2MaterialBoundsAdjustment`

How far a material's shader displaces vertices, and the bounds growth that covers it.

- Export: @carbonenginejs/runtime-trinity/utilities
- Source: src/utilities/Tr2MaterialBoundsAdjustment.js
- Visibility: Public
- Kind: CarbonEngineJS
