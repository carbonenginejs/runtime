// Incarna: reconstructed from Black records; no Carbon donor. See ../README.md.
import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
import { meta, type } from "#schema";

/**
 * The material an Incarna mesh area holds in place of a Tr2Effect: a high-level
 * shader name and its parameters.
 *
 * Carbon names the class only in comments (`trinity/trinity/Tr2Blitter.cpp:77`;
 * `trinity/trinity/Shader/Tr2Effect.cpp:1239` names its interface,
 * ITr2ShaderMaterial), and no header declares it. The three members, and their
 * order, are those of build 1142708's Black records: every
 * `res:/graphics/interior/<race>/modular_<kit>/<piece>.black` writes
 * `highLevelShaderName`, `parameters`, then `defaultSituation` when present.
 * The exposure flags are guessed; the records show only that the members
 * persist.
 *
 * Data only. The shaders it names (`IncarnaDetailed`, `IncarnaSimple` and their
 * passes) are not loaded (operator, 2026-10-25), so it compiles nothing and
 * draws nothing. A consumer that draws Incarna content puts a Tr2Effect in the
 * area instead.
 *
 * It sits in `Tr2MeshArea.effect`, which current Carbon declares as
 * `Tr2EffectPtr` (`trinity/trinity/Tr2MeshArea.h:77`); the Black reader assigns
 * the class the file names.
 */
@meta.define("Tr2ShaderMaterial")
@meta.adapted
export class Tr2ShaderMaterial extends IRoot
{

  /** The metashader-library shader this material uses, such as "IncarnaDetailed". Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  highLevelShaderName = "";

  /**
   * The shader's parameters, keyed by parameter name. The records store a
   * dictionary of the ordinary parameter classes (TriTextureParameter,
   * Tr2FloatParameter, Tr2Vector2/3/4Parameter). Flags guessed, as Carbon maps
   * Tr2MaterialParameterStore's dictionary (READ | PERSIST).
   */
  @be.mapAttribute(be.READ | be.PERSIST)
  @type.map("ITriEffectParameter")
  parameters = new Map();

  /**
   * Space-separated situation names, such as "TwoSided SHLighting FlatNormal".
   * Absent from most records. Flags guessed.
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  defaultSituation = "";

  /**
   * Always false: nothing here can be drawn.
   *
   * Adapted: the batch path asks an area's effect `IsGood()` before drawing it.
   * Answering false makes an area that still holds this material skip cleanly
   * instead of failing mid-render, since the Incarna shaders are not loaded.
   *
   * @returns {boolean} false.
   */
  @meta.adapted
  IsGood()
  {
    return false;
  }

}

export default Tr2ShaderMaterial;
