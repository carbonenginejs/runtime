# WebGPU demo controls

The demo keeps camera mathematics in `EveCamera` and routes browser events through
`Tr2MainWindow`. Interaction policy and commands in this directory are demo helpers,
with no additional runtime public API.

Click the viewport to focus it. The focus outline shows where keyboard shortcuts
apply. Editors, dialogs, IME composition and browser modifier chords are excluded.

| Control | Default |
| --- | --- |
| Orbit | Primary drag or arrow keys; both axes inverted |
| Pan | Shift+primary drag, middle drag, or Shift+arrows |
| Dolly | Wheel, Equal or Minus |
| Field of view | Shift+wheel or brackets |
| Frame hull / reset initial view | F / R |
| Post processing / warp visual state | P / W |
| Cloak / alternate skin | C / K |
| Decrease / increase / stop speed | Comma / Period / Digit0 |
| Save viewport PNG | V |
| Open camera settings and shortcut help | H |

Settings → Camera and shortcuts offers degree-based FOV, axis inversion,
sensitivity, shortcut rebinding, unbinding and default restoration. Availability
comes from the current ship and pending operations. Panel, console and keyboard
commands share actual state and errors. Warp changes the hull's visual controller
state; it does not navigate.

Framing uses the native projection, including its aspect-ratio rule and center
offset. A new hull refits its world sphere while keeping orientation and FOV; a
skin-only replacement preserves the pose. Resize refits; a zero-size viewport
waits for dimensions. Manual FOV disables this demo camera's authored zoom curve.

PNG export captures the next rendered viewport at its backing resolution, excludes
UI, and uses the runtime PNG writer. It copies the texture used by that frame
before yielding. The CPU tests cover padded rows, BGRA conversion, PNG decoding,
submission ordering and cleanup with a fake device. They do not verify rendering
or screenshot correctness on a GPU.

`?still=1` disables live camera, keyboard and capture controls with a visible note.
`demo.dispose()` removes input listeners, stops subsequent demo ticks and cancels
pending capture. It is not a general engine-resource teardown API.

Node checks: `node --test test/trinityal/demo-*.test.js`. The package's normal build
must already have produced `npm/dist`. Demo bundling uses `npm run build:webgpu:demo`;
generated `demo.bundle.js` is not edited by hand.
