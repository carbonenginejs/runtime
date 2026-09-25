# FSD format

The two variants keep separate directories. `64/` reads modern cFSD, which
identifies itself by a 32-byte header whose 64-bit payload length must
match the supplied bytes. `32/` is legacy FSD: headerless, with its layout
supplied separately, so bytes cannot identify it; the caller must declare
it (`bitWidth: 32` or `variant: "fsd32"`), and reading it is not
implemented yet. A failed modern probe is never treated as legacy.

Modern reads go through an explicit dataset reader: pass `options.reader`
(or `options.registry`), for example a `CjsFsd64Reader` populated by
`CjsFsd64ReaderSetCharacterStaticData.registerAll`, plus `options.path`, the
logical resource path the registry is keyed by. `emit: "json"` / `readJSON`
returns JSON-compatible data with wide identifiers as lossless decimal
strings; the default output keeps the readers' `Map` representation.

This module owns byte validation, declarative layouts, schema decoding,
exact-path reader registration and the approved dataset readers. It does no
filesystem discovery, network access, build selection, caching or
localization, and ships no `.fsdbinary` data.

Error codes (`error.code`):
- `CJS_FSD_32_UNSUPPORTED`: the caller declared legacy 32-bit FSD.
- `CJS_FSD_VARIANT_UNKNOWN`: neither declared legacy nor valid modern cFSD.
- `CJS_FSD_READER_REQUIRED`: modern cFSD without a reader/registry exposing
  `Read` (or `ReadJSON` for JSON output).
- `CJS_FSD_READER_NOT_FOUND`: the registry has no reader for the normalized path.
- `CJS_FSD_READER_EXISTS`, `CJS_FSD_READER_INVALID`,
  `CJS_FSD_JSON_READER_INVALID`, `CJS_FSD_PATH_INVALID`: registry misuse.
- `CJS_FSD_SCHEMA_UNSUPPORTED`: the reader does not accept the container's
  layout/schema identity.
- `CJS_FSD_HEADER_INVALID`, `CJS_FSD_LENGTH_INVALID`, `CJS_FSD_INPUT_INVALID`:
  bad envelope or input.
- `CJS_FSD_OFFSET_INVALID`, `CJS_FSD_COUNT_INVALID`,
  `CJS_FSD_RECORD_COUNT_INVALID`, `CJS_FSD_RECORD_SIZE_INVALID`,
  `CJS_FSD_UINT64_UNSAFE`, `CJS_FSD_STRING_INVALID`, `CJS_FSD_LIST_INVALID`,
  `CJS_FSD_FLAGS_UNSUPPORTED`, `CJS_FSD_DUPLICATE_KEY`,
  `CJS_FSD_BINARY_SCHEMA_INVALID`: payload or layout decode failures.
