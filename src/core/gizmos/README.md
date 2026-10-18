# Transform gizmos and shared input

Status: Experimental
Scope: `@carbonenginejs/runtime/core` and `@carbonenginejs/runtime/input`
Audience: Viewport and editor integrators
Summary: Compose native Carbon tools with shared camera input and explicit affine targets.

`CjsLibrary.CreateInputManager`, `CreateCameraControls` and
`CreateTransformGizmo` construct the three helpers. Construction is inert with
respect to browser input. Attach the input manager to a canvas, install the
camera and gizmo consumers, and call `input.Update(dt)` between render passes.
Draw the gizmo's primitive scene after the world scene. The host still owns
the camera's update and viewport sizing.

The default mode keys are **W** (translate), **E** (rotate) and **R** (scale).
Pass `keyBindings` when creating a gizmo, or call
`SetKeyBindings({ translation: "KeyG", rotation: "KeyR", scaling: "KeyS" })`.
Values use `KeyboardEvent.code`; `null` unbinds a mode and no arguments restores
the defaults. `GetKeyBindings()` returns a copy for the host's settings UI and
persistence. Shortcuts apply only in the focused viewport, ignore browser
modifier chords and text composition, and consume matching keys before camera
or application actions. Changing tools cancels an unfinished gizmo drag.

Camera controls provide orbit, Shift-drag or middle-drag pan, wheel dolly,
Shift-wheel FOV, **F** to frame and **Home** to reset. Arrow keys orbit;
Shift-arrows pan; Equal/Minus dolly; brackets change FOV. Camera bindings also
support `SetKeyBindings`, with `Shift+ArrowLeft`-style chords. These defaults
leave W/E/R available for gizmos. A host should avoid assigning the same chord
to multiple consumers; their routing priority resolves any overlap.

Provide `getViewport()` and `getBounds()` to the camera controls for panning
and framing. Bounds are `{ centre, radius }` in world space. Call `Resize()`
when the viewport changes and `TargetChanged()` when the target changes.
The mutable `preferences` record holds gesture buttons, sensitivities,
inversion, FOV limits and framing margin. Manual FOV and framing disable the
camera's zoom curve so its next native update preserves the chosen FOV.

The gizmo receives pointer input before the camera. A handle hit acquires the
whole drag; a miss can fall through to the camera. Input arriving during an
awaitable handle pick is queued. Escape, focus loss, pointer cancellation,
detachment and target changes invalidate pending picks and roll back an
unfinished edit. Completed edits remain the host's responsibility.

Targets are explicit records with `readLocal(out)`, `writeLocal(matrix)` and
`readParentWorld(out)`. These accessors support either an object or a locator
without guessing property names. `writeLocal` receives a complete affine
matrix and may return `false` to reject a proposed edit. An accessor backed
only by scale/rotation/translation fields cannot preserve shear. The gizmo
uses an orthonormal frame to display handles, while applying deltas to the
complete target matrix through its parent's inverse.

`getView()` supplies `{ context, projection, view, viewport }`, using the
native render context, projection, view and viewport types. Immediate picking
is awaitable on WebGPU, and the public native picking wrappers use the main
thread render context. The host must configure that context before dispatching
input. Never await a pick while holding an unfinished render pass.

Object selection and handle selection use GPU pick buffers. They do not
require a retained CPU geometry copy. Resource ray queries are a separate
capability and belong on the geometry resource.

Call `Destroy()` on the gizmo, camera controls and input manager when disposing
the viewport. The helpers release their own registrations and resources; the
camera and target remain host-owned. The initial implementation supports
translation, rotation, scaling and shared camera controls. Text labels, snapping,
undo/redo, multi-selection and join validation are outside this delivery.

When retiring an `EveSpaceScene`, stop its render job and call `Destruct()` to
release its owned picking attachments, frame buffers and data texture manager. A caller-owned
`EvePickingContext` retains its independent readback snapshots; destroy that
context explicitly when cancelling pending selections. A completed scene
snapshot may still resolve after scene disposal, so the host must retain its
selection-generation check when replacing a scene.
