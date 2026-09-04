// Source: trinity/trinityal/Tr2VertexDefinition.h:17-30 (Carbon UsageCode)
//   against runtime/src/resource/formats/cmf/core/constants.js (CMF Usage).
//
// Two vocabularies name the same semantics and agree on almost nothing.
//
// CMF stores a usage as a byte and its reader turns that into a NAME, so a decl
// element carries `usage: "Position"`. A shader's pipeline input carries a
// NUMBER - Carbon's UsageCode - because that is what the effect container
// stores. `Tr2VertexDefinition.findElement` compares the two with `===`, so a
// CMF element cannot match any shader input until one is translated.
//
// Passing the CMF byte through untranslated would be worse than not matching,
// because the two numberings COLLIDE rather than merely disagree:
//
//   CMF     0 Position  1 Normal  2 Tangent  3 Binormal  4 TexCoord  5 Color
//   Carbon  0 POSITION  1 COLOR   2 NORMAL   3 TANGENT   4 BITANGENT 5 TEXCOORD
//
// Only Position, BoneIndices and BoneWeights land on the same number. A mesh's
// normals would bind to the shader's colour input and draw something plausible
// and wrong.
//
// Two entry points, because a decoded payload arrives in one of two shapes,
// and which one is the CALLER'S choice rather than the format's. A GR2 read
// emits deinterleaved channels with no declaration by default, and emits a
// CMF-shaped declaration when asked for one (`emit: "cmf"`, or the `@cmf`
// request suffix), because the GR2 reader builds through the CMF builder.
// EVE ships are GR2 today; CMF is the Frontier path; both reach both shapes.
//
// So: a payload carrying a declaration translates its elements, and a payload
// carrying only channels is addressed by channel name and has a declaration
// built rather than translated.
//
// The two formats already agree on channel names (`position`, `normal`,
// `tangent`, `binormal`, `texcoord0`, `texcoord1`, `blendIndice`,
// `blendWeight`), which is what makes one channel mapping serve both.
//
// This lives beside Tr2VertexDefinition because matching is its job, and
// because the resource layer may not import Trinity to reach the usage codes.
import { Tr2VertexUsageCode } from "./usageCode.js";


const { POSITION, COLOR, NORMAL, TANGENT, BITANGENT, TEXCOORD, BLENDINDICES, BLENDWEIGHTS } =
  Tr2VertexUsageCode;


/**
 * CMF usage names to Carbon's `UsageCode`.
 *
 * This is Carbon's own switch, case for case
 * (`BuildFromCMFVertexDecl`, trinity/trinity/Tr2VertexDefinitionUtilities.cpp:336-369).
 *
 * A PACKED TANGENT IS A TANGENT, NOT A STORAGE DETAIL. Carbon maps both packed
 * usages onto `TANGENT` (:363-368) and lets the element's four-component type
 * carry the difference. It has no packed usage code because it needs none.
 *
 * There are dedicated shader variants for the two layouts, so the distinction
 * is real and must survive: the `quad*v5` family declares `TANGENT0` as a
 * float4 and no NORMAL or BITANGENT at all, while the `unpacked_quad*v5` family
 * declares three-component NORMAL, TANGENT and BITANGENT separately. Dropping
 * the element leaves a packed mesh with no tangent frame whatsoever, and the
 * packed variant's only frame input bound to nothing.
 */
const CARBON_USAGE_BY_CMF_NAME = Object.freeze({
  Position: POSITION,
  Color: COLOR,
  Normal: NORMAL,
  Tangent: TANGENT,
  Binormal: BITANGENT,
  TexCoord: TEXCOORD,
  BoneIndices: BLENDINDICES,
  BoneWeights: BLENDWEIGHTS,
  PackedTangent: TANGENT,
  PackedTangentLegacy: TANGENT
});


/**
 * Translates one CMF usage name into Carbon's numeric usage code.
 *
 * @param {string} usage CMF usage name.
 * @returns {number|null} Carbon usage code, or null when there is no counterpart.
 */
export function CarbonUsageFromCmf(usage)
{
  // A producer that already speaks Carbon's vocabulary is passed through, which
  // makes translation idempotent. Without this a numeric usage would miss the
  // name table and be DROPPED, so running a Carbon-shaped declaration through
  // here twice would empty it.
  if (typeof usage === "number") return usage;

  const code = CARBON_USAGE_BY_CMF_NAME[usage];

  return code === undefined ? null : code;
}


// THE RESULT MUST HAVE A STABLE IDENTITY, not merely stable contents.
//
// Tr2VertexDefinition.getHandle interns by linear scan and memoises on the
// element array's IDENTITY, which is what makes its own comment true: "the scan
// is amortised because a declaration is interned once per distinct mesh layout,
// not per draw". A translation that allocated a fresh array per call would
// defeat that memo, and every batch of every mesh would rescan the whole intern
// table comparing element by element. At a few meshes that is invisible; at the
// several hundred a real scene carries it is quadratic work per frame.
//
// A geometry resource hands back the same declaration array for the life of the
// payload, so keying on it collapses the whole cost to once per mesh layout.
// Weak, because the entry must not outlive the payload it describes.
const translations = new WeakMap();


/**
 * Rewrites a CMF declaration's elements into Carbon's usage vocabulary.
 *
 * The result is what `Tr2VertexDefinition` can intern and match: same order,
 * same offsets, same types, with `usage` translated. An element with no Carbon
 * counterpart is DROPPED rather than passed through, because a passed-through
 * CMF byte would collide with a different Carbon usage and bind silently.
 *
 * Every usage the format defines now has a counterpart, so nothing is dropped
 * in practice; the guard remains for a payload naming something this does not
 * know. Dropping is lossy for round-tripping, so this is for the binding path
 * only - never write a CMF file from the result.
 *
 * Offsets are preserved rather than recomputed. Carbon repacks them from its
 * own type sizes (Tr2VertexDefinitionUtilities.cpp:330-334) because it lays the
 * buffer out itself; our packer writes at the declaration's offsets, so keeping
 * them is what makes the layout describe the bytes.
 *
 * @param {Array} elements CMF declaration elements.
 * @returns {Array} Elements carrying Carbon usage codes.
 */
export function CarbonVertexElements(elements)
{
  if (!elements) return [];

  const memoised = translations.get(elements);

  if (memoised !== undefined) return memoised;

  const translated = [];

  for (const element of elements)
  {
    const usage = CarbonUsageFromCmf(element?.usage);

    if (usage === null) continue;

    translated.push({ ...element, usage });
  }

  translations.set(elements, translated);

  return translated;
}


/**
 * Decoded channel names to Carbon's `UsageCode` and semantic index.
 *
 * Both geometry readers emit these names (`runtime/src/resource/formats/gr2/core/shared.js`
 * `VERTEX_CHANNELS` and the CMF equivalent), so one table serves both. The
 * trailing digit on a texture-coordinate or colour channel is the SEMANTIC
 * INDEX, which is why the mapping yields a pair rather than a code: `texcoord1`
 * is TEXCOORD at usage index 1, and matching needs both halves.
 *
 * `packedtangent` and `packedtangentlegacy` map to TANGENT for the same reason
 * as above. Note a packed frame usually arrives in the ORDINARY `tangent`
 * channel at four components rather than under a packed name, so the component
 * count is what identifies it, not the channel.
 */
const CARBON_USAGE_BY_CHANNEL = Object.freeze({
  position: POSITION,
  normal: NORMAL,
  tangent: TANGENT,
  binormal: BITANGENT,
  color: COLOR,
  texcoord: TEXCOORD,
  blendindice: BLENDINDICES,
  blendweight: BLENDWEIGHTS,
  packedtangent: TANGENT,
  packedtangentlegacy: TANGENT
});


/**
 * Translates a decoded channel name into a Carbon usage and semantic index.
 *
 * Handles the trailing-index convention: `texcoord0` and `texcoord1` are the
 * same usage at different indices, and a bare `position` is index 0.
 *
 * @param {string} channel Decoded channel name.
 * @returns {{usage: number, usageIndex: number}|null} Usage pair, or null.
 */
export function CarbonUsageFromChannel(channel)
{
  const name = String(channel ?? "");
  const match = /^([a-z]+?)(\d*)$/u.exec(name.toLowerCase());

  if (!match) return null;

  const usage = CARBON_USAGE_BY_CHANNEL[match[1]];

  if (usage === undefined) return null;

  return { usage, usageIndex: match[2] ? Number(match[2]) : 0 };
}
