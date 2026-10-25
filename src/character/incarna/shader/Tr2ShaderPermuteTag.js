// Incarna: reconstructed from Black records; no Carbon donor. See ../README.md.
import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
import { meta, type } from "#schema";

/**
 * One permutation tag of a Tr2HighLevelShader: a define its compiled rows were
 * built with, and the bit it sets in a row's key.
 *
 * Current Carbon declares no such class. The members, and their order, are
 * those of build 1142708's `res:/graphics/shaders/shaderdescriptions.black`.
 * The exposure flags are guessed; the records show only that the members
 * persist. What `unused` and `precompileHint` mean is not established.
 *
 * Data only.
 */
@meta.define("Tr2ShaderPermuteTag")
@meta.adapted
export class Tr2ShaderPermuteTag extends IRoot
{

  /**
   * The tag's name: a situation a material names ("ReflectionGlow"), a vertex
   * input ("TEXCOORD1") or an option ("OPT_INTERIOR_SM_HIGH"). Flags guessed.
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  name = "";

  /** The define the tag sets, such as "OPT_REFLECTION_GLOW". Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  permuteDefineString = "";

  /** The bit the tag sets in a compiled row's key. Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.uint32
  tagBits = 0;

  /** An expression over defines, such as "OPT_GENERATE_ALBEDO or OPT_GENERATE_EMISSIVE". Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  unused = "";

  /** An expression over defines that holds wherever the tag is set. Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  predicate = "";

  /** 1 or 0xffffffff where present. Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.uint32
  precompileHint = 0;

}

export default Tr2ShaderPermuteTag;
