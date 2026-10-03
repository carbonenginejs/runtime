# PSD merged images

Status: Stable
Scope: `@carbonenginejs/runtime/resource/formats/psd`
Audience: Image pipeline and format integrators
Summary: Read PSD merged images into Carbon ImageIO bitmaps and write uncompressed PSD files.

## Read and save through ImageIO

```js
import { ImageIO, HostBitmap, LoadParameters } from "@carbonenginejs/runtime/resource/imageio";

const bitmap = new HostBitmap();
const result = ImageIO.readImage(bytes, new LoadParameters("input.psd"), bitmap);
if (!result.IsOk()) throw new Error(result.GetErrorMessage());

const saved = ImageIO.saveImage("output.psd", bitmap);
if (!saved.result.IsOk()) throw new Error(saved.result.GetErrorMessage());
// saved.bytes is a Uint8Array; the caller owns filesystem or network I/O.
```

The PSD handler is registered between PNG and TGA. Reads accept version 1,
8-bit grayscale or RGB headers and raw or PackBits compression. The reader skips
color-mode data, image resources, and layer/mask data and decodes the stored
merged image. It does not composite layers or apply embedded color profiles.

The native channel mapping is:

| Channels | HostBitmap format |
| --- | --- |
| 1 | `PIXEL_FORMAT_R8_UNORM` |
| 2 | `PIXEL_FORMAT_R8G8_UNORM` |
| 3 | `PIXEL_FORMAT_B8G8R8X8_UNORM`, with X set to 255 |
| 4 | `PIXEL_FORMAT_B8G8R8A8_UNORM` |

Save accepts one 2D image in these four formats, writes the top mip, emits
uncompressed planar channels, and leaves the three auxiliary blocks empty.
It does not preserve layers, image resources, profiles, or metadata. Reading
resets the metadata cutout after a supported header has been accepted.

## Standalone payloads

```js
import { CjsPsdFormat } from "@carbonenginejs/runtime/resource/formats/psd";

const image = CjsPsdFormat.read(bytes, { emit: "rgba" });
const encoded = CjsPsdFormat.write(image);
```

The shared `raw` output is the default. `rgba` and `image` return the common
RGBA8 payload; grayscale expands to RGB and its second channel becomes alpha.
Use the native ImageIO route when the original channel storage matters.
Profiles also support `Read`, `ReadAsync`, `Inspect`, and `Write`.

## Compatibility limits

Header failures leave the destination bitmap intact; pixel-read failures destroy
the new bitmap. Unsupported depth, version, color mode, channel counts above
four, or compression return `HEADER_NOT_SUPPORTED`. Missing-file failures
belong to the caller's acquisition layer; an empty byte stream returns
`READ_FAILURE`.

Carbon's PackBits decoder ignores row-length entries and lets packets cross rows;
this behavior is retained. Its color-mode-dependent stride is also retained.
Native buffer overruns from truncated literal runs or incompatible RLE channel
layouts have no defined portable result; those accesses return `INVALID_DATA`.
The writer always emits raw data, including for grayscale with alpha.
