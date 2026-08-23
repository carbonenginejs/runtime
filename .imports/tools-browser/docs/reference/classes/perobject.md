# Per-object class catalog

Status: Evolving
Scope: `@carbonenginejs/tools-browser/perobject`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for maintained per-object tooling classes.

<!-- class:CjsPerObjectDecoder -->
## `CjsPerObjectDecoder`

Resolves `cbN[i].c` to a named constant, across both naming sources.

- Export: `@carbonenginejs/tools-browser/perobject`
- Source: `src/perobject/CjsPerObjectDecoder.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsPerObjectLayoutError -->
## `CjsPerObjectLayoutError`

Thrown when a struct cannot be laid out, or a supplied definition contradicts the Carbon ABI.

- Export: `@carbonenginejs/tools-browser/perobject`
- Source: `src/perobject/CjsPerObjectPacker.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsPerObjectPacker -->
## `CjsPerObjectPacker`

Resolves Carbon per-object struct layouts, and packs values into them.

- Export: `@carbonenginejs/tools-browser/perobject`
- Source: `src/perobject/CjsPerObjectPacker.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsPerObjectSynthesizer -->
## `CjsPerObjectSynthesizer`

Produces Carbon-faithful per-object values for space objects and their attachments.

- Export: `@carbonenginejs/tools-browser/perobject`
- Source: `src/perobject/CjsPerObjectSynthesizer.js`
- Visibility: Public
- Kind: CarbonEngineJS
