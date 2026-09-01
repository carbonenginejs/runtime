// A decoded mesh to the options `CjsWebgpuDevice.CreateGeometry` takes.
//
// This is the piece that was missing between a loaded ship and a draw. Every
// vertex layout in the tree was a hardcoded fixture literal, so a real
// declaration had no route to a pipeline at all.
//
// The split follows /docs/contracts/geometry-vertex-binding.md: the geometry
// layer packs BYTES and reports the stride it wrote, this names the formats and
// assembles the request. Nothing here recomputes a stride - the packer knows
// the one it actually used, and a second derivation would disagree silently.
import { PackLodGeometry } from "#resource/geometry/pack";

import { WebgpuVertexBufferLayout } from "./vertexFormat.js";


/**
 * The `CreateGeometry` options for one LOD of a decoded mesh.
 *
 * `bindingPlan` decides which elements become attributes and at which shader
 * location, so a mesh drawn by two different shaders yields two different
 * layouts over the SAME bytes. That is why the plan is an argument rather than
 * something derived here: the geometry does not know its shader.
 *
 * The declaration handed to the binding plan must already carry Carbon usages.
 * A plan built from an untranslated declaration matches nothing, every entry
 * arrives with a null element, and the result is a geometry with no attributes
 * that the device then rejects.
 *
 * @param {object} mesh Decoded mesh carrying a declaration and channels.
 * @param {Array<object>} bindingPlan Entries from `Tr2VertexDefinition.resolveBindingPlan`.
 * @param {object} [options]
 * @param {number} [options.lodIndex] Which LOD to realize.
 * @param {string} [options.label] Device label for the buffers.
 * @returns {object} Options for `CjsWebgpuDevice.CreateGeometry`.
 * @throws {Error} When no shader input is supplied by the mesh.
 */
export function WebgpuGeometryOptions(mesh, bindingPlan, options = {})
{
  const packed = PackLodGeometry(mesh, options.lodIndex ?? 0);
  const layout = WebgpuVertexBufferLayout(packed.vertex.stride, bindingPlan);

  if (!layout.attributes.length)
  {
    throw new Error(
      "Geometry supplies none of the shader's vertex inputs. A declaration carrying "
      + "the producer's usage names rather than Carbon's matches nothing - translate it "
      + "with CarbonVertexElements before resolving the binding plan."
    );
  }

  const request = {
    vertexBuffers: [ { slot: 0, data: packed.vertex.bytes, layout } ]
  };

  if (options.label !== undefined) request.label = options.label;

  // A device rejects an index buffer with no data, and an unindexed mesh is a
  // legitimate payload, so absence is expressed by omitting the key.
  if (packed.index)
  {
    request.indexBuffer = { data: packed.index.bytes, format: packed.index.format };
  }

  return request;
}
