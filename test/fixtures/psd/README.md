# Original Photoshop PSD fixtures

These five images were created from scratch in Adobe Photoshop 26.11.6 using
scripted channel fills. They contain no CCP image data. The filenames,
dimensions and corner expectations remain the reference values from
`imageio/tests/TestPsdHandler.cpp:11-30`.

All files are version 1 PSDs with 8-bit channels and a stored merged image.
Grayscale/RGB component channels are followed by one saved alpha channel where
specified; the alpha values are not layer opacity percentages. The four small
images use uncompressed planar data. The larger image uses PackBits RLE.

| File | Dimensions | Channels | Compression | Top-left | Bottom-right |
| --- | --- | --- | --- | --- | --- |
| `r.psd` | 5 x 12 | Gray | Raw | 0 | 4 |
| `al.psd` | 5 x 12 | Gray, alpha | Raw | 0, 121 | 4, 209 |
| `rgb.psd` | 5 x 12 | RGB | Raw | 0, 0, 0 | 16, 0, 0 |
| `rgba.psd` | 5 x 12 | RGBA | Raw | 0, 0, 0, 121 | 16, 0, 0, 209 |
| `rgbRle.psd` | 32 x 32 | RGB | PackBits | 99, 97, 97 | 191, 191, 191 |

All channel values are bytes (0-255). For reproducible original artwork, fill
channel `c` (zero-based) with `32 + 41*c`, then fill the inset rectangle from
`(1, 1)` to `(width - 1, height - 1)` with `160 + 17*c`, then set the two corner
pixels above. Save without an embedded color profile. Photoshop's grayscale
fill percentage is `100 - 100*value/255`.

The tests assert the original Carbon dimensions, pixel formats and corners,
plus read/save round trips and malformed-input behavior. Independent byte
inspection also verified channel counts, bit depth and compression after
Photoshop saved the files.
