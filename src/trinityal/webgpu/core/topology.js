// Carbon's topology vocabulary to WebGPU's.
//
// It lived on `trinityBatchDispatcher.js` and was imported from there by
// `psoDescription.js` - a description depending on the dispatcher, which is
// backwards, and doubly so now that the dispatcher is one of the two files
// that dissolve when the batch walk returns to Trinity. A lookup table is not
// the dispatcher's to own.
//
// THE KEYS ARE THE ABSTRACTION LAYER'S VOCABULARY, NOT D3D'S. `Tr2RenderBatch`
// held a `D3dPrimitiveTopology` until 2026-09-05 and everything still drew,
// because the engine translated on the way out. Carbon does not translate:
// `SubmitGeometry` hands `batch.m_topology` straight to `SetTopology`
// (`Tr2RenderContext.cpp:86`), so the two numberings have to BE the same one,
// and the abstraction layer owns it. The old numbering COLLIDED rather than
// merely disagreed - D3D's 4 is TRIANGLELIST, the AL's 4 is TOP_LINES.

import { Topology } from "#consts/render-context";


/**
 * The WebGPU primitive topology for each Carbon `Topology`.
 *
 * `TOP_TRIANGLE_FAN` is absent because WebGPU has no fan primitive. Carbon's
 * own header already says the value is invalid on DX11, so nothing authored
 * for a modern backend reaches it.
 */
export const TOPOLOGIES = Object.freeze({
  [Topology.TOP_TRIANGLES]: "triangle-list",
  [Topology.TOP_TRIANGLE_STRIP]: "triangle-strip",
  [Topology.TOP_LINES]: "line-list",
  [Topology.TOP_LINE_STRIP]: "line-strip",
  [Topology.TOP_POINTS]: "point-list"
});
