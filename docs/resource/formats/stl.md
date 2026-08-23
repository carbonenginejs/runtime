# STL export

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource/formats/stl`
Audience: Users and integrators  
Summary: Defines the STL writer contract for shared geometry, including validation and watertight checking.

## Contract

`CjsStlFormat` writes shared geometry directly to binary or ASCII STL. The
writer consumes `mesh.vertex.position` and triangular `mesh.indices[].faces`;
multiple meshes and index groups are flattened in encounter order because STL
does not carry portable scene, material, skin, or animation structure.

```js
import { CjsStlFormat } from "@carbonenginejs/runtime/resource/formats/stl";

const bytes = CjsStlFormat.write(sharedGeometry, {
  binary: true,
  solidName: "ship_hull",
  scale: 1000,
  requireWatertight: true
});
```

Writes do not mutate the shared input. Facet normals are recalculated from
winding by default; set `recalculateNormals: false` to average valid vertex
normals. Degenerate triangles are skipped by default. Index values must be
safe integers within the position channel, and binary output rejects
coordinates outside float32 range instead of silently emitting infinities.
The `requireWatertight` option rejects open, non-manifold, inconsistently
wound, or degenerate output.

## Related documentation

- [Format subpaths](README.md)
- [Format ownership and fork provenance](provenance.md)
