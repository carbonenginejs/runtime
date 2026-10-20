# BMP image format

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/bmp`
Audience: Format and ImageIO consumers
Summary: Read and write Carbon-compatible uncompressed BMP images without registering a codec globally.

## Current behavior

`CjsBmpFormat` reads uncompressed 24-bit BGR and 32-bit BGRA BMPs. Native ImageIO
reads preserve BGRX8 (opaque alpha) or BGRA8 (including zero alpha), with top-left
bitmap storage. File rows are bottom-up and padded to four bytes. Indexed
palettes, RLE, bitfields, embedded JPEG/PNG, 16-bit pixels and the OS/2 12-byte
CORE layout are unsupported.

```js
import { CjsBmpFormat } from "@carbonenginejs/runtime/resource/formats/bmp";

const image = CjsBmpFormat.read(bytes, { emit: "rgba" });
const encoded = CjsBmpFormat.write(image);
```

The default `read` output is a raw record retaining the source bytes and header
metadata. `image` and `rgba` produce RGBA8 payloads using shared ImageIO
conversion. Instances keep default options; `ReadAsync` and static `readAsync`
inherit the synchronous-reader fallback. `inspect` reads headers only;
`getSupport` is advisory and `verifySupport` attempts the selected output.

`canWrite("rgba")` describes the payload writer. Native `isSaveSupported` accepts
only a single 2D BGRX8/BGRA8 bitmap; `save` writes the top mip of an accepted mip
chain and returns `{ result, bytes }`. Metadata is not serialized. Importing
the format does not register it: callers can pass the class to
`ImageIO.registerImageHandler`.

## Native quirks and bounded reads

The reader mirrors `Tr2BmpHandler.cpp`: headers of at least 40 bytes use the
fixed first 40 bytes and the advertised pixel offset. Smaller headers still
use Carbon's 16-byte minimum layout and its relative-seek quirk, so their
effective pixel start is 24 bytes before `offBits`. This is not general
support for legacy BMP header variants. Plane count, declared file/image
sizes and reserved fields are not validation gates.

Carbon reads dimensions as unsigned values; this port does not reinterpret a
negative height as a top-down image. Incomplete or unaddressable pixel spans
fail before allocation, preserving the failed-read result and invalidating
the destination. Header failures leave the previous bitmap intact. The native
zero-height success with an empty bitmap is retained.

The writer intentionally retains Carbon's size-field bug for 24-bit rows with
padding: it counts padding bytes as pixels when declaring `sizeImage` and file
size, while emitting only the actual row bytes and padding. Consumers should
use the returned byte length. A change to that native behavior requires a
separate compatibility decision.
