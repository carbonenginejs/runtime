# Use remote file indexes

Status: Evolving  
Scope: `@carbonenginejs/runtime/tools/fileindex`  
Audience: Browser application authors and integrators  
Summary: Shows how to parse file-index data and resolve validated locations without filesystem access.

## Purpose

The file-index family reads CCP-style appfileindex and resfileindex text from
caller-supplied strings, bytes, or HTTP(S) responses. It preserves named
indexes and resolves logical paths without owning a cache or filesystem.

## Parse an index

```js
import {
    CjsFileIndex
} from "@carbonenginejs/runtime/tools/fileindex";

const index = CjsFileIndex.parseResFileIndex(`
res:/graphics/example.red,objects/example.red
res:/texture/example.png,textures/example.png
`);

const entry = index.Find("res:/graphics/example.red");
```

Entries and indexes are immutable. Lookup normalizes slash direction and
logical-path case while preserving declaration order for iteration.

## Resolve a storage location

```js
import {
    CjsFileIndexSource
} from "@carbonenginejs/runtime/tools/fileindex";

const source = new CjsFileIndexSource({
    id: "default",
    baseURL: "https://assets.example.test/res"
});

const url = source.Resolve(entry.location);
```

The resolver accepts relative locations and matching compact source prefixes.
It rejects paths that escape the configured HTTP(S) base.

## Load through Fetch

`CjsFileIndex.loadAppFileIndex` and `CjsFileIndex.loadResFileIndex` accept a URL
plus an optional injected `fetch` function. The app index can discover named
resfileindex declarations such as `windows_prefetch`.

`CjsFileIndexLibrary.load` coordinates provider/build selection, app-index
loading, declared resfileindexes, sources, and manual overlays. It does not
persist provider responses or resource bytes.

## Provider and build contract

A provider declares four distinct HTTP(S) endpoints:

- `metadataBaseURL` for client build metadata;
- `indexBaseURL` for `eveonline_<build>.txt`;
- `appBaseURL` for app-index-declared resfileindexes; and
- `resBaseURL` for the default resource source.

An exact numeric build performs no metadata request. A named client resolves
through that client's metadata. `latest` compares all configured clients, or
one explicitly selected client, and keeps the highest exact build. Passing
both a named build reference and a separate client is rejected.

## Overlay precedence

Resolution order is:

1. matching `override` overlay;
2. the last official resfileindex declaring the path — later declarations
   clobber earlier records of the same logical path, so one record owns each
   path;
3. matching `fallback` overlay.

Ambiguous overlay matches at the same level fail instead of silently selecting
one. Callers can also request one exact index or overlay by name.

For the selected layer, compact source resolution uses this order:

1. a source ID encoded in the entry location;
2. the layer's declared `sourceID`; and
3. the provider's `default` resource source.

An unknown source ID fails rather than falling through to another endpoint.

## Errors and security

Treat every location as untrusted. Parsing or resolution fails for:

- URL schemes and absolute paths;
- dot-segment or encoded slash traversal;
- malformed percent escapes;
- query strings and fragments;
- duplicate logical paths within one parsed index;
- duplicate layer names or ambiguous same-level overlays;
- locations whose compact source ID is unknown.

Provider credentials, HTTP caching, retries, and filesystem acquisition belong
in the Node toolchain or the calling application.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [API reference](../reference/api.md)
- [File-index class catalog](../reference/classes/fileindex.md)
