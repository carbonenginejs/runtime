# Class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource` classes
Audience: Users, maintainers, and automated readers  
Summary: Indexes the one-sentence purpose descriptors for every maintained class in the package.

## Purpose

Every maintained class carries exactly one catalog entry with a stable HTML
marker, so a class can be located with an exact low-cost search:

```sh
rg 'class:CjsResMan' docs/reference/classes
```

Entries record a one-sentence responsibility plus Export, Source, Visibility,
and Kind metadata. The catalog is an index, not a replacement for the API
reference or source documentation, and it is validated by the shared
documentation check against the actual source tree.

## Catalog pages

- [core.md](core.md): the resource manager, MotherLode cache, fetch provider,
  core resource class, and the format/probe bases.
- [audio.md](audio.md): raw audio-byte owners and individually addressable
  audio resource views.
- [resources.md](resources.md): the Carbon-shaped semantic resource and data
  classes in the `src/resource` family tree.
- [texture.md](texture.md): texture-array aggregation classes under
  `src/resource/texture`.
- [formats.md](formats.md): format entry classes and their internal reader
  machinery under `src/resource/formats`.
- [dropped.md](dropped.md): retained native shapes under `src/resource/dropped` that
  are documented but never exported or bundled.
