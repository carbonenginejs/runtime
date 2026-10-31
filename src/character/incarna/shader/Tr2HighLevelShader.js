// Incarna: reconstructed from Black records; no Carbon donor. See ../README.md.
import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
import { meta, type } from "#schema";

/**
 * One Incarna shader as a material names it: its source, the permutation tags
 * that select a compiled row, and its parameters' descriptions.
 *
 * Current Carbon names the class only as the second owner of an effect
 * description's string table, beside Tr2EffectRes
 * (`trinity/trinity/Shader/Tr2EffectDescription.h:44-45`), and no header
 * declares it. The members, and their order, are those of build 1142708's
 * `res:/graphics/shaders/shaderdescriptions.black` and
 * `res:/graphics/shaders/shaderdescriptions/*.black`. The exposure flags are
 * guessed; the records show only that the members persist.
 *
 * A compiled row's stored key is the OR of its active tags' `tagBits`: every
 * one of build 1142708's 10,950 `.fxt` rows uses only its shader's declared
 * bits, and every tag a key sets has a true predicate.
 *
 * Data only.
 *
 * @adapted
 */
@meta.define("Tr2HighLevelShader")
@meta.adapted
export class Tr2HighLevelShader extends IRoot
{

  /** The name a material gives in `highLevelShaderName`, such as "IncarnaDetailed". Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  name = "";

  /**
   * The HLSL source, such as "res:/graphics/shaders/IncarnaDetailed.fx". Not
   * always the name's: IncarnaSimple_Shadow's is IncarnaDetailed_Shadow.fx.
   * Flags guessed.
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.path
  shaderPath = "";

  /** The permutation tags, in file order. Flags guessed. */
  @be.mapAttribute(be.READ | be.PERSIST)
  @type.list("Tr2ShaderPermuteTag")
  permuteTags = [];

  /** The pass the shader draws in: "opaque", "transparent", "shadow", "normaldepth" and others. Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  renderClass = "";

  /**
   * The parameters' descriptions: Tr2ShaderTexDesc and the Tr2ShaderFloat*Desc
   * classes, in file order. Flags guessed.
   */
  @be.mapAttribute(be.READ | be.PERSIST)
  @type.list("IRoot")
  parameterDescriptions = [];

}

export default Tr2HighLevelShader;
