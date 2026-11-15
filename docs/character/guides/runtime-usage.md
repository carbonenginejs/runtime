# Runtime character usage

Status: Evolving
Reviewed: 2026-11-11
Scope: `@carbonenginejs/runtime/character`
Audience: Runtime and application integrators
Summary: Reads character files into typed records, keeps them by kind, and hands every caller its own copy.

## The shared library

`CjsLibrary` installs one `CjsCharacterLibraryManager` at `blue.characterLibrary`. With nothing installed, its first
query indexes the character sources through Blue's paths and reads each file through Blue's resMan when first needed.

```js
const option = (await blue.characterLibrary.FetchOptions("female", "makeup/blush"))[0];
const palettes = await blue.characterLibrary.FetchPalettes(option);
const type = await blue.characterLibrary.FetchType(option.typePath);
```

Every answer is the caller's own copy (`CjsCharacterLibraryManager.copy`). Changing it never changes the library;
that is an explicit library call. Each record carries `_pdpID`, its opaque library ID (today its path; never parse
it), and `_pdpType`, the file shape its reader read (`CjsCharacterPdpType`). Both are read-only and travel through
the record's values.

## Records

A reader reads a file and creates its record class; there is no second, raw-shape record. The configuration
(`CjsCharacterLibraryConfiguration.kinds`) names each kind's class and file shape; its `sourceLists` translate a file's
tuples into named fields (a palette's `colors` into `color1`–`color3`). A `.type` reads into
`CjsCharacterType.partPath`, `variation`, `colorVariant`, `bloodlineIDs`; a camera or post is read in either of its
two layouts, kept in `_pdpType`. Black, texture, clip, rig, state and static resources are stored as paths.

Recipes (`.prs`) are DNA, read by the character factory: `CjsCharacterFactory.fetchRecipe(path)` answers a fresh
`CjsCharacterRecipe` (`sex`, `modifiers`) per call, and `readRecipe(path)` turns it into a DNA.

## Build, save and install a library

```js
import { CjsCharacterLibrary, CjsCharacterLibraryBuilder, CjsCharacterLibraryManager } from "@carbonenginejs/runtime/character";

const builder = new CjsCharacterLibraryBuilder({ paths, resMan });
const library = await builder.Build({ lazy: false });  // every record; { lazy: true } indexes only
const data = library.GetData();                           // the format: every item's values, by kind
const manager = new CjsCharacterLibraryManager(new CjsCharacterLibrary().SetData(data));
```

The builder reads through the `paths` (`Filter`, `FileExists`) and `resMan` (`LoadObject`, with the character object
builders registered by the manager's `Initialize`) it is given: Blue's in a browser, an exact build's file access in
tools-core. The data format is version 2 (2026-11-16: keyed collections are lists of named records, as values
hold no maps); earlier formats are not read. Each item carries its library ID, the name it was stored under;
change a kind's items with `AddKind`/`RemoveKind`.

## Resource and graphics boundary

The library is GPU-free. Rendering, texture loading and resource lifetime stay with Trinity and resMan; see
`src/character/trinity/README.md`.
