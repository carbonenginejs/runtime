# File-index class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/tools/fileindex`  
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for maintained file-index classes.

<!-- class:CjsFileIndex -->
## `CjsFileIndex`

Represents an immutable file index with deterministic declaration-order lookup.

- Export: `@carbonenginejs/runtime/tools/fileindex`
- Source: `src/tools/fileindex/CjsFileIndex.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFileIndexEntry -->
## `CjsFileIndexEntry`

Represents one immutable row from a CCP-style appfileindex or resfileindex.

- Export: `@carbonenginejs/runtime/tools/fileindex`
- Source: `src/tools/fileindex/CjsFileIndexEntry.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFileIndexDiff -->
## `CjsFileIndexDiff`

Compares two resfileindexes to find what changed between builds.

- Export: `@carbonenginejs/runtime/tools/fileindex`
- Source: `src/tools/fileindex/CjsFileIndexDiff.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFileIndexLibrary -->
## `CjsFileIndexLibrary`

Coordinates one provider/build appfileindex, its named resfileindexes, manual overlays, and resolved sources.

- Export: `@carbonenginejs/runtime/tools/fileindex`
- Source: `src/tools/fileindex/CjsFileIndexLibrary.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFileIndexOverlay -->
## `CjsFileIndexOverlay`

Represents one caller-supplied replacement or fallback resfileindex layer.

- Export: `@carbonenginejs/runtime/tools/fileindex`
- Source: `src/tools/fileindex/CjsFileIndexOverlay.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFileIndexSource -->
## `CjsFileIndexSource`

Maps a compact source ID to an HTTP(S) base URL and resolves safe relative locations.

- Export: `@carbonenginejs/runtime/tools/fileindex`
- Source: `src/tools/fileindex/CjsFileIndexSource.js`
- Visibility: Public
- Kind: CarbonEngineJS
