# Use remote file indexes

Status: Evolving  
Scope: `@carbonenginejs/tools-browser/fileindex`  
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
} from "@carbonenginejs/tools-browser/fileindex";

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
} from "@carbonenginejs/tools-browser/fileindex";

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

## Overlay precedence

Resolution order is:

1. matching `override` overlay;
2. the last official resfileindex declaring the path — later declarations
   clobber earlier records of the same logical path, so one record owns each
   path;
3. matching `fallback` overlay.

Ambiguous overlay matches at the same level fail instead of silently selecting
one. Callers can also request one exact index or overlay by name.

## Errors and security

Treat every location as untrusted. Parsing or resolution fails for:

- URL schemes and absolute paths;
- dot-segment or encoded slash traversal;
- malformed percent escapes;
- query strings and fragments;
- duplicate logical paths or layer names;
- locations whose compact source ID is unknown.

Provider credentials, HTTP caching, retries, and filesystem acquisition belong
in the Node toolchain or the calling application.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [API reference](../reference/api.md)
- [File-index class catalog](../reference/classes/fileindex.md)
