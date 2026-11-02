// Incarna: reconstructed from Black records; no Carbon donor. See ../README.md.
import { exposure as be } from "#be";
import { blue } from "#blue";
import { IRoot } from "#blueexposure/IRoot";
import { CjsSchema, meta, type } from "#schema";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { Tr2Effect } from "../../../trinity/shader/Tr2Effect.js";
import { ITriEffectResourceParameter } from "../../../trinity/shader/parameter/ITriEffectResourceParameter.js";
import { Tr2ShaderManager } from "./Tr2ShaderManager.js";

/** Each resource manager's shader library, once loaded. */
const loadedLibraries = new WeakMap();

/** Each resource manager's shader library load, while it runs and after. */
const libraryLoads = new WeakMap();

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
 * It is read, then converted: `CreateEffect` gives the Tr2Effect it becomes, and
 * the owner drops the material (operator, 2026-10-25). Until then it sits in
 * `Tr2MeshArea.effect`, which current Carbon declares as `Tr2EffectPtr`
 * (`trinity/trinity/Tr2MeshArea.h:77`); the Black reader assigns the class the
 * file names.
 *
 * @adapted
 */
@meta.define("Tr2ShaderMaterial")
export class Tr2ShaderMaterial extends IRoot
{

  /** The shader library's shader this material uses, such as "IncarnaDetailed". Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  highLevelShaderName = "";

  /**
   * The shader's parameters, keyed by parameter name. The records store a
   * dictionary of the ordinary parameter classes (TriTextureParameter,
   * Tr2FloatParameter, Tr2Vector2/3/4Parameter), each carrying its own name.
   * Flags guessed, as Carbon maps Tr2MaterialParameterStore's dictionary
   * (READ | PERSIST).
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

  /** Incarna's shader library: a Tr2ShaderManager of every Tr2HighLevelShader. */
  static shaderLibraryPath = "res:/graphics/shaders/shaderdescriptions.black";

  /**
   * Always false: a material is drawn only as the Tr2Effect it becomes.
   *
   * @adapted the batch path asks an area's effect `IsGood()` before drawing it.
   *   Answering false makes an area that still holds this material, such as one
   *   read without initializing, skip cleanly instead of failing mid-render.
   * @returns {boolean} false.
   */
  IsGood()
  {
    return false;
  }

  /**
   * Always false, as IsGood: the batch path's draw-readiness question
   * (Tr2Effect.EnsureGood). A material holds nothing to renew.
   *
   * @cjs As Tr2Effect `EnsureGood`.
   * @returns {boolean} false.
   */
  EnsureGood()
  {
    return false;
  }

  /**
   * The Tr2Effect this material becomes. Textures go to its `resources` and
   * constants to its `parameters`, as Tr2Effect keeps them. The parameter
   * objects move rather than copy, so the material is spent; its owner drops
   * it. The effect's path follows once the shader library names the
   * shader's source (`_ResolveEffectPath`), and setting it initializes the
   * effect.
   *
   * No row is chosen from `defaultSituation`. Below container version 5
   * current Carbon reads only a container's first row
   * (`trinity/trinity/Resources/Tr2EffectRes.cpp:232-234`), and that row is
   * what the effect draws.
   *
   * @implemented
   * @returns {Tr2Effect} The effect, its path still unset.
   */
  CreateEffect()
  {
    const effect = new Tr2Effect();
    effect.name = this.highLevelShaderName;
    for (const parameter of this.parameters.values())
    {
      if (!parameter) continue;
      if (CjsSchema.cast(parameter, ITriEffectResourceParameter)) effect.resources.push(parameter);
      else effect.parameters.push(parameter);
    }
    this.parameters.clear();
    this._ResolveEffectPath(effect);
    return effect;
  }

  /**
   * Sets the effect's path from the shader library: the material's
   * Tr2HighLevelShader names its source (`shaderPath`), and
   * `compiledEffectPath` gives the compiled container. The name alone is not
   * enough, since IncarnaSimple_Shadow's source is IncarnaDetailed_Shadow.fx.
   *
   * @adapted the library loads asynchronously. Once `loadShaderLibrary` has
   *   loaded it for the resource manager, the path is set before this returns, so
   *   `CreateEffect` gives an effect that has it; until then the path arrives
   *   after the effect exists. A library that fails to load, or a shader it
   *   lacks, leaves the effect without a path; it never draws, and the failure is
   *   logged.
   * @param {Tr2Effect} effect The effect from `CreateEffect`.
   * @returns {Promise<void>} Settles once the path is set or the failure logged.
   */
  async _ResolveEffectPath(effect)
  {
    const name = this.highLevelShaderName;
    let library = loadedLibraries.get(blue.resMan) ?? null;
    if (library === null)
    {
      try
      {
        library = await Tr2ShaderMaterial.loadShaderLibrary(blue.resMan);
      }
      catch (error)
      {
        CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Shader library ${Tr2ShaderMaterial.shaderLibraryPath} failed to load for ${name}: ${error?.message ?? error}`);
        return;
      }
    }
    const shader = library.shaderLibrary.find(candidate => candidate?.name === name);
    if (!shader)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Shader library has no high-level shader ${name}`);
      return;
    }
    effect.SetEffectPathName(Tr2ShaderMaterial.compiledEffectPath(shader.shaderPath));
  }

  /**
   * The compiled container for a high-level shader's source, in the shipped
   * dx11 tree: `res:/graphics/shaders/compiled/dx11/<file name>.fxt`, the file
   * name lowercased and the source's folder dropped. Holds for every one of
   * build 1142708's 75 shaders, including the visualizers, whose sources sit
   * in `graphics/shaders/visualizers/`. The dx11 container is named because a
   * translation made in memory keeps its source path (operator, 2026-10-25).
   *
   * @implemented
   * @param {string} shaderPath A Tr2HighLevelShader's `shaderPath`.
   * @returns {string} The compiled container's path.
   */
  static compiledEffectPath(shaderPath)
  {
    const file = String(shaderPath).split("/").pop().replace(/\.fx$/iu, "").toLowerCase();
    return `res:/graphics/shaders/compiled/dx11/${file}.fxt`;
  }

  /**
   * Loads the shader library once per resource manager and keeps it, so every
   * material resolves its path from the same library. A material converted
   * after the load resolves its path at once (`_ResolveEffectPath`); a caller
   * that needs loaded statics to hold their effects' paths awaits this first.
   * A failed load is not kept, so a later call tries again.
   *
   * @implemented
   * @param {object} resourceManager The `BlueResMan` to load through.
   * @returns {Promise<Tr2ShaderManager>} The library.
   * @throws {TypeError} When the file is not a Tr2ShaderManager.
   */
  static loadShaderLibrary(resourceManager)
  {
    let load = libraryLoads.get(resourceManager);
    if (!load)
    {
      load = resourceManager.LoadObject(Tr2ShaderMaterial.shaderLibraryPath).then(object =>
      {
        const library = CjsSchema.cast(object, Tr2ShaderManager);
        if (!library) throw new TypeError(`Shader library ${Tr2ShaderMaterial.shaderLibraryPath} is not a Tr2ShaderManager`);
        loadedLibraries.set(resourceManager, library);
        return library;
      });
      load.catch(() => libraryLoads.delete(resourceManager));
      libraryLoads.set(resourceManager, load);
    }
    return load;
  }

}

export default Tr2ShaderMaterial;
