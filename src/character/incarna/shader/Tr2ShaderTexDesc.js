// Incarna: reconstructed from Black records; no Carbon donor. See ../README.md.
import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
import { meta, type } from "#schema";

/**
 * Describes one texture parameter of a Tr2HighLevelShader, with the texture
 * used when a material leaves it unset.
 *
 * Current Carbon declares no such class. The members, and their order, are
 * those of build 1142708's `res:/graphics/shaders/shaderdescriptions.black`.
 * The exposure flags are guessed; the records show only that the members
 * persist.
 *
 * Data only.
 *
 * @adapted
 */
@meta.define("Tr2ShaderTexDesc")
@meta.adapted
export class Tr2ShaderTexDesc extends IRoot
{

  /** The texture used when a material sets none; empty for some. Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.path
  defaultTexture = "";

  /** The shader parameter, such as "OverlayMap". Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  parameterName = "";

  /** The editor's label. Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  name = "";

  /** The editor's help text. Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  helpText = "";

  /** The editor's section, such as "Base Maps". Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  section = "";

}

export default Tr2ShaderTexDesc;
