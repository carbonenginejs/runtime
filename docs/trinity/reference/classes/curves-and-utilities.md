# Controller, curve, and utility classes

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity/controllers`, `@carbonenginejs/runtime/trinity/curves`, `@carbonenginejs/runtime/trinity/utilities`
Audience: Controller authors, animation authors, and engine integrators
Summary: Catalogs controller state machines, the curve and sequencer vocabulary that drives animated values, and small shared utility records.

<!-- class:CjsGrannyCurves -->
## `CjsGrannyCurves`

Decodes Granny's 19 compressed animation-curve formats into explicit knots and controls, and samples them at a time, without depending on a GR2 container reader.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/track/CjsGrannyCurves.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2BoneMatrixCurve -->
## `Tr2BoneMatrixCurve`

Matrix function that tracks a named bone on a skinned object, returning the authored transform composed with that bone's current matrix and the object's world transform rather than sampling its own keys.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2BoneMatrixCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CameraFollowCurveKey -->
## `Tr2CameraFollowCurveKey`

Key of a camera follow curve, holding the camera offset and its tangents plus the field-of-view multiplier and framing angles used to place the camera box at that point in time.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/key/Tr2CameraFollowCurveKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveColor -->
## `Tr2CurveColor`

Color curve composed of four independent scalar curves for r, g, b and a, sampled at time minus timeOffset; an empty alpha curve yields 1, and the result is converted to gamma space when srgbOutput is set.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveColor.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveColorMixer -->
## `Tr2CurveColorMixer`

Color function that blends two authored colors by a fixed lerp factor and applies saturation and brightness, exposing both the mixed color and its linear-space conversion.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveColorMixer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveCombiner -->
## `Tr2CurveCombiner`

Vector function returning the component-wise sum of every child vector function sampled at the same time; its length is the longest child's length.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveCombiner.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveConstant -->
## `Tr2CurveConstant`

Curve returning the same authored vec4 at every time, usable as a scalar, vector, quaternion or color function; its derivatives are always zero (identity for quaternions).

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveConstant.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveEulerRotation -->
## `Tr2CurveEulerRotation`

Quaternion curve built from three scalar curves supplying yaw, pitch and roll in radians.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveEulerRotation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveEulerRotationExpression -->
## `Tr2CurveEulerRotationExpression`

Quaternion curve built from three independently compiled expressions producing yaw, pitch and roll in radians at time divided by timeScale.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveEulerRotationExpression.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveQuaternion -->
## `Tr2CurveQuaternion`

Keyed quaternion curve evaluated in seconds, with per-key interpolation and independent extrapolation modes before the first and after the last key.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveQuaternion.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveQuaternionKey -->
## `Tr2CurveQuaternionKey`

One key of a Tr2CurveQuaternion: a time in seconds, the quaternion value at that time, and the interpolation used to reach the next key.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/key/Tr2CurveQuaternionKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsMt19937 -->
## `CjsMt19937`

Deterministic MT19937 Mersenne Twister used to reproduce the C++ standard library's default random sequence from a persisted seed.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveRandomAxisRotation.js
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:Tr2CurveRandomAxisRotation -->
## `Tr2CurveRandomAxisRotation`

Quaternion curve that spins at a fixed rate of one revolution per `period` seconds about an axis fixed by two seed-derived random rotations applied before and after the spin.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveRandomAxisRotation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveScalar -->
## `Tr2CurveScalar`

Keyed scalar curve evaluated in seconds, with per-key constant, linear or Hermite interpolation and independent clamp, linear, cycle or mirror extrapolation before the first and after the last key.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveScalar.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveScalarExpression -->
## `Tr2CurveScalarExpression`

Scalar curve whose value is produced by a compiled expression evaluated at time divided by timeScale, with input1..input4 and a stable per-instance random constant available as terms.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveScalarExpression.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveScalarKey -->
## `Tr2CurveScalarKey`

One key of a Tr2CurveScalar: a time in seconds, a value, its left and right tangents in value units per unit time, the interpolation used to reach the next key, and the tangent-type rule that maintains the tangents.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/key/Tr2CurveScalarKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveSetRange -->
## `Tr2CurveSetRange`

Named sub-interval of a curve set's scaled timeline, giving a start and end time and whether playback loops inside it.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/Tr2CurveSetRange.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveVector2 -->
## `Tr2CurveVector2`

Two-component vector curve composed of independent scalar curves for x and y; its length is the longer of the two.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveVector2.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveVector3 -->
## `Tr2CurveVector3`

Three-component vector curve composed of independent scalar curves for x, y and z; its length is the longest of the three.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveVector3.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveVector3Expression -->
## `Tr2CurveVector3Expression`

Vector curve whose x, y and z components are each produced by an independently compiled expression evaluated at time divided by timeScale.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveVector3Expression.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveVector3Lerp -->
## `Tr2CurveVector3Lerp`

Vector curve that eases from a fixed initial value into a child vector curve, blending over the interval ending at curveStartTime with the configured start interpolation.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2CurveVector3Lerp.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DistanceTracker -->
## `Tr2DistanceTracker`

Scalar function reporting the distance between two tracked positions, either the full separation or its projection onto a fixed direction, and optionally signed by which side of that direction the target lies.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2DistanceTracker.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2FollowCurve -->
## `Tr2FollowCurve`

Vector curve interpolated through an ordered list of follow-curve keys, each supplying its own position, tangents and interpolation for the segment that follows it.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2FollowCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GrannyEventTrack -->
## `Tr2GrannyEventTrack`

Granny track that replays a text track's timed entries as engine events, firing each entry once as the playhead crosses it.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/track/Tr2GrannyEventTrack.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GrannyTrack -->
## `Tr2GrannyTrack`

Base for curves sampled out of a Granny animation resource, owning the resource path, group and track name plus the cycle flag and resolved duration; subclasses supply the track binding and sampling.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/track/Tr2GrannyTrack.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GrannyTransformTrack -->
## `Tr2GrannyTransformTrack`

Granny track that samples a bone's position, orientation and scale-shear curves together, exposing them as a translation vector, rotation quaternion and scale vector.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/track/Tr2GrannyTransformTrack.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GrannyVectorTrack -->
## `Tr2GrannyVectorTrack`

Granny track that samples a named one-dimensional vector track and exposes it as a scalar value.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/track/Tr2GrannyVectorTrack.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2MatrixKey -->
## `Tr2MatrixKey`

One key of a matrix curve: a time in seconds and the 4x4 matrix value at that time.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/key/Tr2MatrixKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ObjectFollowCurveKey -->
## `Tr2ObjectFollowCurveKey`

Follow-curve key positioned by another object rather than a fixed point, taking its place from that object's locator or offset and optionally rotating its tangents with the object.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/key/Tr2ObjectFollowCurveKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2QuaternionLerpCurve -->
## `Tr2QuaternionLerpCurve`

Quaternion curve that spherically interpolates between two child quaternion curves, ramping the blend from 0 to 1 over `length` seconds starting at `start` and clamping outside that window.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2QuaternionLerpCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RotationAdapter -->
## `Tr2RotationAdapter`

Quaternion function wrapping a child quaternion curve behind its own time remapping, falling back to a fixed authored quaternion when no child curve is attached.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2RotationAdapter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ScalarExprKey -->
## `Tr2ScalarExprKey`

One key of a Tr2ScalarExprKeyCurve whose time, value and tangents can each be produced by an expression over the key's inputs, its random constant and the previous key.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/key/Tr2ScalarExprKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ScalarExprKeyCurve -->
## `Tr2ScalarExprKeyCurve`

Keyed scalar curve whose key times, values and tangents are themselves expressions re-evaluated on every sample, with optional cycling and reversed playback over the key range.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2ScalarExprKeyCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ScalarFader -->
## `Tr2ScalarFader`

Scalar fade envelope that ramps linearly between 0 and 1 over an authored fade length, and also exposes a separate non-linear kick-in pulse that runs once per fade-in.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2ScalarFader.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2TranslationAdapter -->
## `Tr2TranslationAdapter`

Vector function wrapping a child vector curve behind its own time remapping and rotating the sampled offset by a fixed rotation, falling back to a fixed authored vector when no child curve is attached.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2TranslationAdapter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VectorFunctionModifier -->
## `Tr2VectorFunctionModifier`

Wraps a position source, offsetting and scaling what it reports, optionally in view space.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/Tr2VectorFunctionModifier.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriColorSequencer -->
## `TriColorSequencer`

Color function combining its child color functions with Carbon's multiply or add operator; both paths start from opaque white, so an additive sequencer is offset by white.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/TriColorSequencer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriCurveSet -->
## `TriCurveSet`

Playable group of curves and value bindings sharing one scaled playhead, applying every curve and copying every binding each update while it is playing.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/TriCurveSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriEventCurve -->
## `TriEventCurve`

Time-keyed event track that fires each key once as the playhead passes it, dispatching either a named event to a listener or a queued callable, and restarting the key cursor when time rewinds or a cycle wraps.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/TriEventCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriEventKey -->
## `TriEventKey`

One key of a TriEventCurve: a time in seconds plus either a named event string or a callable and its arguments to invoke when the playhead crosses it.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/key/TriEventKey.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriPerlinCurve -->
## `TriPerlinCurve`

Scalar curve driven by fractal Perlin noise, mapping the noise band to [offset, offset + scale] and advancing at `speed` from a per-instance random phase.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/TriPerlinCurve.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriVectorSequencer -->
## `TriVectorSequencer`

Vector function combining its child vector functions with Carbon's multiply, add or average operator; multiply starts from ones and the additive paths from zero.

- Export: @carbonenginejs/runtime/trinity/curves
- Source: src/trinity/curves/curve/TriVectorSequencer.js
- Visibility: Public
- Kind: CarbonEngineJS


<!-- class:Float4x3 -->
## `Float4x3`

A transform packed into twelve floats, dropping the constant fourth column.

- Export: @carbonenginejs/runtime/trinity/utilities
- Source: src/trinity/utilities/Float4x3.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Obb -->
## `Obb`

A portable oriented bounding box with Carbon-compatible clipping helpers.

- Export: `@carbonenginejs/runtime/trinity/utilities`
- Source: `src/trinity/utilities/Obb.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ProjectBoundingBoxBracket -->
## `Tr2ProjectBoundingBoxBracket`

Projects an owned world-space bounding box into a Sprite2D bracket.

- Export: `@carbonenginejs/runtime/trinity/ui`
- Source: `src/trinity/ui/Tr2ProjectBoundingBoxBracket.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Range -->
## `Range`

A center point with a lower and an upper range point, optionally kept symmetric about the center, and clamped for display against separate slider bounds.

- Export: @carbonenginejs/runtime/trinity/utilities
- Source: src/trinity/utilities/Range.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2MaterialBoundsAdjustment -->
## `Tr2MaterialBoundsAdjustment`

How far a material's shader displaces vertices, and the bounds growth that covers it.

- Export: @carbonenginejs/runtime/trinity/utilities
- Source: src/trinity/utilities/Tr2MaterialBoundsAdjustment.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2ControllerAction -->
## `ITr2ControllerAction`

Shared JavaScript adapters for Carbon's ITr2ControllerAction contract.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/ITr2ControllerAction.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionAnimateCurveSet -->
## `Tr2ActionAnimateCurveSet`

Controller action that registers for per-frame updates and drives a curve set's playhead from an expression, by default the elapsed state time.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionAnimateCurveSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionAnimateValue -->
## `Tr2ActionAnimateValue`

Controller action that registers for per-frame updates and continuously writes an expression-driven value, by default the action's curve sampled at state time, into a bound destination property.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionAnimateValue.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionBindRTPC -->
## `Tr2ActionBindRTPC`

Controller action that registers for per-frame updates and pushes an expression-driven value into a named Wwise real-time parameter on a sound emitter.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionBindRTPC.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionCallback -->
## `Tr2ActionCallback`

Controller action that fires a named callback on its controller when the action starts, letting host code hook a point in a state machine or timeline.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionCallback.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionChildEffect -->
## `Tr2ActionChildEffect`

Controller action that attaches a child effect loaded from a resource path to its owner on start and detaches it on stop.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionChildEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionOverlay -->
## `Tr2ActionOverlay`

Controller action that adds a named overlay effect to its owner when the action starts and removes it again when the action stops.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionOverlay.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionPlayCurveSet -->
## `Tr2ActionPlayCurveSet`

Controller action that plays a named curve set (optionally one named range) on its owner for the duration of the action, and can hold off state transitions until a synced range iteration has completed.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionPlayCurveSet.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionPlayMeshAnimation -->
## `Tr2ActionPlayMeshAnimation`

Controller action that plays or enqueues a named geometry animation on a destination object's animation controller when it starts, and stops or enqueues a stop when it ends.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionPlayMeshAnimation.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionPlaySound -->
## `Tr2ActionPlaySound`

Controller action that fires a one-shot audio event on a named emitter when the action starts; it has no stop behaviour.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionPlaySound.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionPython -->
## `Tr2ActionPython`

Controller action that delegates to a host-provided scripted action instance, forwarding link, start, stop and update callbacks and persisting the instance's own opaque state bytes.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionPython.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionResetClipSphereCenter -->
## `Tr2ActionResetClipSphereCenter`

Controller action that moves its owner's clip-sphere center on start, either back to the object center or onto a locator chosen from a named set or from the last damage-locator hit.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionResetClipSphereCenter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionSetAttenuationScaling -->
## `Tr2ActionSetAttenuationScaling`

Controller action that sets an audio emitter's distance-attenuation scaling factor on start, optionally multiplied by a named controller variable.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionSetAttenuationScaling.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionSetAudioEmitterPrefix -->
## `Tr2ActionSetAudioEmitterPrefix`

Controller action that sets the event-name prefix on a named audio emitter when it starts, changing which bank events later sounds resolve to.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionSetAudioEmitterPrefix.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionSetAudioSwitch -->
## `Tr2ActionSetAudioSwitch`

Controller action that sets a Wwise switch group to a given state on a named audio emitter when it starts.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionSetAudioSwitch.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionSetExternalControllerVariable -->
## `Tr2ActionSetExternalControllerVariable`

Controller action that writes a constant or source-variable value into a controller variable on a different object, named by destinationOwner among the owner's binding roots.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionSetExternalControllerVariable.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionSetShaderOption -->
## `Tr2ActionSetShaderOption`

Controller action that sets a named shader option on its owner when it starts, changing which shader permutation the owner renders with.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionSetShaderOption.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionSetValue -->
## `Tr2ActionSetValue`

Controller action that evaluates a value expression once on start and writes the result into a bound destination property.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionSetValue.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ActionSpawnParticles -->
## `Tr2ActionSpawnParticles`

Controller action that emits a one-shot burst of particles from a dynamic emitter when it starts.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/action/Tr2ActionSpawnParticles.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsControllerExpressionCompileError -->
## `CjsControllerExpressionCompileError`

Error raised while tokenizing or parsing an expression, carrying the source text, the reason, and the character position at which parsing failed.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/expression/CjsControllerExpressionProgram.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsControllerExpressionEvaluateError -->
## `CjsControllerExpressionEvaluateError`

Error raised while evaluating a compiled expression, carrying the source text and the reason.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/expression/CjsControllerExpressionProgram.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsControllerExpressionParser -->
## `CjsControllerExpressionParser`

Recursive-descent parser turning expression source into the AST evaluated by CjsControllerExpressionProgram, collecting referenced variable and function names and rejecting identifiers that could reach the JavaScript prototype chain.

- Source: `src/trinity/controllers/expression/CjsControllerExpressionProgram.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsControllerExpressionProgram -->
## `CjsControllerExpressionProgram`

Compiles a Carbon controller or curve expression into an AST and evaluates it without dynamic JavaScript eval, exposing the referenced variable and function names for dirty tracking.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/expression/CjsControllerExpressionProgram.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2BindingPoint -->
## `Tr2BindingPoint`

Resolves an authored `path`/`attribute` pair against named root objects into a concrete property, optionally a single swizzled component of a vector, and reads or writes it.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/expression/Tr2BindingPoint.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ControllerExpression -->
## `Tr2ControllerExpression`

Holds one compiled expression bound to a controller or state machine, together with the variable dirty mask that says when it needs re-evaluating.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/expression/Tr2ControllerExpression.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ControllerFloatVariable -->
## `Tr2ControllerFloatVariable`

One named float slot of a controller's variable set, mirroring its value into the controller's packed expression buffer and raising its dirty bit whenever it changes.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/expression/Tr2ControllerFloatVariable.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2StateMachine -->
## `Tr2StateMachine`

Runs one state at a time from an authored state list, entering at the configured start state and following transitions as controller variables change.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/state/Tr2StateMachine.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2StateMachineState -->
## `Tr2StateMachineState`

One state of a Tr2StateMachine: starts and stops its action list on entry and exit, and evaluates its outgoing transitions each update to decide the next state.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/state/Tr2StateMachineState.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2StateMachineTransition -->
## `Tr2StateMachineTransition`

One outgoing edge of a state machine state: evaluates a boolean condition expression and, when it passes, names the destination state to switch to.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/state/Tr2StateMachineTransition.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TimelineController -->
## `Tr2TimelineController`

Plays a list of controller actions against a scrubbable timeline, starting and stopping each action as the current time enters and leaves its authored start/end range on an enabled track.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/timeline/Tr2TimelineController.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TimelineEntry -->
## `Tr2TimelineEntry`

Defines one action's authored start/end interval and track identifier within a timeline controller.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/timeline/Tr2TimelineEntry.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Controller -->
## `Tr2Controller`

Owns a set of state machines, float variables and event handlers, driving them against a linked owner object on a throttled update.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/Tr2Controller.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ControllerEventHandler -->
## `Tr2ControllerEventHandler`

Binds a named controller event to a list of actions that are run as a single one-shot pulse when the event fires.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/Tr2ControllerEventHandler.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ITr2Controller -->
## `ITr2Controller`

Contract for an object that controls another between Start and Stop; only IsLinked has no default, the other seven verbs inherit Carbon's empty bodies.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/ITr2Controller.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ITr2ActionController -->
## `ITr2ActionController`

Contract for a controller that also drives controller actions, adding the owner, callback, updateable-registration and expression-variable surface that has no sensible default.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/ITr2Controller.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ControllerReference -->
## `Tr2ControllerReference`

Stands in for a controller loaded from a resource path, forwarding the full controller lifecycle to whichever controller the path resolves to.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/Tr2ControllerReference.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SyncToAnimation -->
## `Tr2SyncToAnimation`

State finalizer that holds a state machine in its current state until the animation layer named by `mask` has finished playing.

- Export: `@carbonenginejs/runtime/trinity/controllers`
- Source: `src/trinity/controllers/Tr2SyncToAnimation.js`
- Visibility: Public
- Kind: Carbon
