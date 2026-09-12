// Source: trinity/trinityal/dx11/Tr2VertexLayoutALDx11.cpp:144-155 (FindInputElement)
//   trinity/trinityal/dx11/Tr2VertexLayoutALDx11.cpp:157-226 (SetLayout's match,
//   fabricate-on-miss and per-shader cache)
//
// THE ELEMENT MATCH IS THE VERTEX-LAYOUT AL'S. Carbon's shared Tr2VertexLayoutAL
// (trinityal/src) is only the PIMPL wrapper; each backend implements the walk
// over a vertex shader's declared pipeline inputs itself, looking every input up
// in the mesh's element list. It lived under Tr2VertexDefinition's name in this
// runtime until 2026-09-06, which was naming debt: the definition owns its items
// and ledger, the AL owns what a shader does with them.
//
// Carbon and ccpwgl arrived at this algorithm independently - Carbon walks the
// shader's inputs and looks each one up, ccpwgl merge-joins two sorted element
// lists - which is good evidence it is the right one. Both match on SEMANTIC AND
// INDEX ONLY: neither compares data type, format, offset or stream. A float3
// POSITION0 in the mesh satisfies a float4 POSITION0 in the shader, and the
// hardware converts.
//
// The plan this produces is renderer-neutral, because the two references
// legitimately differ on what to do with a shader input the mesh cannot supply:
//
//   - Carbon's DX11 path FABRICATES an element so CreateInputLayout still
//     succeeds - format derived from the shader's declared scalar type, offset
//     zero, and a hardcoded input slot (cpp:179-207).
//   - ccpwgl DISABLES the attribute array and sets a constant zero vec4.
//
// Both are "supply nothing for this input"; only the mechanism differs. So the
// plan reports the input as unmatched and carries the fallback type the engine
// needs, and each engine applies its own mechanism. Deciding here would bake a
// backend assumption into graph state.


/** The scalar type an unmatched input falls back to when it declares none
 *  (Carbon's `default:` format case, Tr2VertexLayoutALDx11.cpp:190-192). */
export const FALLBACK_INPUT_TYPE = "FLOAT";

// Carbon FindInputElement (Tr2VertexLayoutALDx11.cpp:144-155):
//   element.usageIndex == input.SemanticIndex
//   && semanticNames[element.usage] == input.SemanticName
// Nothing else participates. ccpwgl's CompareDeclarationElements and FindUsage
// compare the same two fields and no others.

/**
 * The mesh element serving a shader input, or null when the mesh has none.
 *
 * @param {object[]|import("../vertex/Tr2VertexDefinition/index.js").Tr2VertexDefinition} elementsOrDefinition
 * @param {object} input A shader pipeline input with `usage` and `usageIndex`.
 * @returns {object|null} The matching element.
 */
export function findInputElement(elementsOrDefinition, input)
{
  const elements = elementsOrDefinition?.items ?? elementsOrDefinition;
  if (!elements) return null;

  for (const element of elements)
  {
    if (element.usageIndex === input.usageIndex && element.usage === input.usage) return element;
  }

  return null;
}

// The resolved plan. Keyed on (declaration handle, shader input signature),
// which is precisely Carbon's DX11 cache key: an ID3D11InputLayout per
// (declaration, vertex-shader pipeline-input hash) pair, created lazily and
// reused across every draw of that pair (Tr2VertexLayoutALDx11.cpp:157-226).
// A WebGL engine caches the same plan as a VAO.

/**
 * Resolves a mesh's element list against a vertex shader's declared pipeline
 * inputs, returning one entry per SHADER INPUT in the shader's own order -
 * the shader's inputs are the requirement, and a mesh element no shader reads
 * is simply absent from the plan.
 *
 * Each entry carries the input, the mesh element serving it or null, and the
 * fallback scalar type an engine substitutes when there is none.
 *
 * @param {object[]|import("../vertex/Tr2VertexDefinition/index.js").Tr2VertexDefinition} elements
 * @param {object[]} pipelineInputs The vertex shader's declared inputs.
 * @returns {{ entries: object[], unmatched: number, complete: boolean }}
 */
export function resolveBindingPlan(elements, pipelineInputs)
{
  const inputs = pipelineInputs ?? [];
  const entries = [];
  let unmatched = 0;

  for (const input of inputs)
  {
    const element = findInputElement(elements, input);

    if (!element) unmatched++;

    entries.push({
      usage: input.usage,
      usageIndex: input.usageIndex,
      registerIndex: input.registerIndex,
      element,
      // Carbon picks the fabricated element's format from the input's own
      // declared scalar type (Tr2VertexLayoutALDx11.cpp:179-195).
      fallbackType: element ? null : (input.type ?? FALLBACK_INPUT_TYPE)
    });
  }

  return { entries, unmatched, complete: unmatched === 0 };
}
