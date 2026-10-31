// Incarna: reconstructed from Black records; no Carbon donor. See ../README.md.
import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
import { vec4 } from "#math/vec4";
import { meta, type } from "#schema";

/**
 * Describes one four-component parameter of a Tr2HighLevelShader, with its
 * default and whether the editor shows it as a colour.
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
@meta.define("Tr2ShaderFloat4Desc")
export class Tr2ShaderFloat4Desc extends IRoot
{

  /** The value used when a material sets none. Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.vec4
  defaultValue = vec4.create();

  /** Whether the editor shows the value as a colour. Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.boolean
  isColor = false;

  /** The shader parameter, such as "MaterialDiffuseColor". Flags guessed. */
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

  /** The editor's section. Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  section = "";

}

export default Tr2ShaderFloat4Desc;
