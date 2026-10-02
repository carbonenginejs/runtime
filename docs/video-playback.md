# Browser video playback

Status: Experimental
Scope: Shared dynamic video textures and their cached average colour
Audience: Runtime integrators and renderer maintainers
Summary: Describes browser decoding, persistent GPU storage, colour sampling and ownership.

## Current integration

Configure `RegisterVideoPlaylists` from the `resource/video` export with the
existing resource manager, host-defined `inspacevideos` and `hangarvideos`
playlists, and `{ createPlayer: () => new VideoPlayer() }`. `VideoPlayer` is
exported by `core/platform`. Without the factory, registration remains
headless and produces the existing black placeholder.

Each registered playlist owns one `TriTextureRes`, player and sampler. Every
consumer resolves that same resource. Clip bytes come through
`CjsBlueResMan.ReadResource`, preserving configured paths and byte providers.
Re-registering replaces the playlist while retaining the texture resource;
an empty list unregisters and stops it. Removing one billboard does not own
the shared player's lifetime. Resource purge stops playback and releases
owned media, callbacks, object URLs and renderer resources.

## Browser requirements

Playback needs a browser document, `HTMLVideoElement.requestVideoFrameCallback`,
object URLs and a browser-supported codec for the supplied clip. The module
itself imports without a document or GPU. Advertising is muted by default;
`withSound: true` deliberately opts into audio. A rejected autoplay attempt
sets `autoplayBlocked`; the host calls `Resume()` from a user gesture. It does
not cause a retry loop.

The browser media clock owns presentation. `GetMediaTime`, `GetDuration`,
`GetDownloadedMediaTime` and `Seek` use **seconds**, not Blue's 100 ns ticks.
`GetVideoInfo().hasAlpha` is `null`: HTML video does not expose that metadata.
Unsupported media and no-progress deadlines stop a clip; the playlist makes
at most one failed pass before waiting for a host replacement. Defaults are
a 30-second byte-read deadline and 15-second presentation deadline.

## Upload and binding lifetime

A decoded-frame notification increments the presentation serial. The renderer
bridge uploads that serial at most once, into an ordinary one-mip RGBA8
texture. Same-size frames and clips reuse storage, views and material
bindings. Dimensions or a recreated WebGPU device require new storage;
texture-change notifications invalidate bindings then, never every frame.
Paused playback retains the last texture. Explicit `ClearTextures()` clears
the existing storage and cached colour until a new frame is presented.

WebGPU uses `copyExternalImageToTexture`, requesting sRGB-encoded straight
RGBA with no vertical flip. WebGL2 uses `texSubImage2D` and preserves caller
unpack state; its separately stored sRGB view is updated alongside the
ordinary view. There is no full-resolution JavaScript pixel conversion in
normal presentation.

## Average colour

`TriTextureRes.SetAverageColor` is the only publication channel. Plane,
banner and textured-point-light consumers continue reading the existing
cached value. Reading that value never decodes, uploads, samples or waits.

WebGPU reduces the **already uploaded current frame** using an `rgba8unorm`
view. Sixty-four compute groups produce partial means; a second reduction
produces four floats. Three reusable buffers total 1,056 bytes. Only the
16-byte result is mapped asynchronously. Shader pipelines are shared per
device; bindings are retained for the texture lifetime. There is at most
one pending map, and generation/texture checks reject obsolete results.
Lights retain the previous completed colour while it is pending.

The browser fallback reuses one 32×32 2D canvas and samples the current
decoded element in a deferred callback. Both paths are gated by new decoded
frames and a default 125 ms interval (at most 8 Hz). A pending sample causes
new requests to be skipped, not queued. Sampling errors retain the last
valid colour and are exposed through `averageColorError`.

Carbon's decoder averages straight encoded BGRA channels without gamma
conversion, alpha weighting, smoothing or brightness adjustment. The GPU
reduction preserves this arithmetic over the browser's RGBA output. It
does not reproduce Carbon's fixed YUV coefficients: the browser performs
codec colour conversion. Transparent pixels' hidden RGB can be lost in the
browser. Canvas resampling additionally mixes premultiplied channels; its
straight-channel mean is an approximation around alpha boundaries. Neither
path silently adds a transfer function or changes light intensity.

## Validation and limits

Synthetic tests cover shared identity, frame deduplication, cached lighting,
pause/resume, autoplay refusal, failed playlists, pending reads, source and
dimension replacement, resource recreation and stale asynchronous colours.
The browser validation compares the reduction and small canvases against
full-frame reference pixels; full-frame CPU readback belongs only to that
measurement, not playback.

Asynchronous mapping avoids a synchronous main-thread readback, but completion
latency depends on GPU load. Initialization may compile pipelines. The
resource byte provider currently supplies a complete clip before playback;
this is not a segmented streaming implementation. Browser codec and alpha
support remain platform-dependent.

## References

- [Video frame callback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
- [WebGPU external-image copy](https://gpuweb.github.io/gpuweb/#dom-gpuqueue-copyexternalimagetotexture)
