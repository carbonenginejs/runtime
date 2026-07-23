# Dropped Carbon resource shapes

This directory preserves source-backed Carbon shapes that runtime-resource does
not use as public JavaScript classes. Files here are provenance/reference only:
they are not exported, bundled, or part of the supported package API.

## Tr2AsyncSave

Carbon coordinates main-thread preparation and worker-thread saving through an
abstract callback base. JavaScript uses promises and format-owned `Write` /
`WriteAsync` operations instead. Resource-specific compatibility status methods
remain on the applicable maintained resource class; the standalone Carbon base
is not needed.

Replacement surfaces:

- `src/formats/*` writer methods, including CMF and STL writers
- `src/resources/TriTextureRes.js` save/status compatibility methods

## Tr2LoadPrepareFence

Carbon's helper inserts callbacks into separate load and prepare queues. The
general runtime-resource prepare graph was removed. `CjsResMan.Wait()` now owns
the JavaScript snapshot-fence contract for active queued resource roots, so the
Carbon helper must not be exported as a second fence model.

Replacement surfaces:

- `src/CjsResMan.js` (`Wait`)
- `src/CjsResManQueue.js`
- `docs/reference/queues.md` snapshot-fence contract

## Tr2CmfContents and CmfVertexReader

These native helpers own CMF section lifetime/decompression and vertex-element
pointer lookup. The JavaScript CMF format already performs parsing, bounded
section access, meshoptimizer decompression, channel decoding, and writing with
plain typed-array data. Retaining separate public pointer-shaped classes would
duplicate that implementation and expose native lifetime concepts that do not
apply in JavaScript.

Replacement surfaces:

- `src/formats/cmf/CjsCmfFormat.js`
- `src/formats/cmf/core/schema.js`
- `src/formats/cmf/core/buffers.js`
- `src/formats/cmf/core/writer.js`
