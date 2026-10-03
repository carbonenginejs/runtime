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

## Cloud test page

After the normal runtime build, `npm run build:webgpu:demo` also produces
`clouds.bundle.js`. Serve without launching a browser:
`node scripts/trinityal/webgpu/run-webgpu-demo.js --serve --port 5503`.
Open `http://127.0.0.1:5503/test/trinityal/webgpu/demo/clouds.html` yourself.
Resources come through tools-core; the page displays the server's pinned build.

The case selector reloads the page with an intact authored graph:

- **Legacy / aquapuff**: `EveChildCloud` with DDS volume textures.
- **Cloud2 / swirl**: VTA density and temperature volumes, incremental compute lightmap.
- **Cloud2 / interior**: camera-attached infinite cloud with its authored start controller.

Drag to orbit, use the wheel to dolly, or click Frame cloud to refit. The interior
case follows the camera and does not auto-frame. Quality, blur and shadow controls
exercise the scene driver. Pause stops subsequent frame submissions. Switching
cases or leaving the page disposes the demo's device.

Inspect the canvas: draw counts include full-screen passes and are not a visual
pass verdict. The diagnostics show shader readiness, density dimensions, lightmap
cursor/dirty state, compute submissions and errors. Use Copy diagnostics when
reporting a failure; also capture the browser console for a stack trace. Runtime
fog-density and fog-reflection paths outside these cloud cases still throw where
their Carbon port is unfinished. CPU tests and bundling do not validate the GPU.
