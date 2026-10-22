import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
import "#blue/values";
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.h
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.cpp
// Source: trinity/trinity/Resources/TexturePipeline/ITr2TexturePipelineStep.h
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLoad.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLimitSize.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepCompress.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.cpp
import * as CcpLog from "../../global/logging/ccpLog.js";
import { CjsSchema, meta, type, blue } from "#schema";
import { Tr2TexturePipelineParams } from "./Tr2TexturePipelineParams.js";
import { Tr2TexturePipelineStepLimitSize } from "./Tr2TexturePipelineStepLimitSize.js";

// Source: trinity/trinity/Resources/TexturePipeline/ITr2TexturePipelineStep.h:26
const s_texturePipelineChannel = CcpLog.CCP_LOG_DEFINE_CHANNEL("TexturePipeline", "trinity");

/**
 * Carbon texture-specific CPU bitmap transformation pipeline.
 *
 * The steps share one ImageIO::HostBitmap, exactly as Carbon does: each step
 * reads and rewrites it, and the caller supplies every input bitmap the steps
 * name, keyed by resource path.
 */
export class Tr2TexturePipeline extends IRoot
{

  /** m_pipelineType (std::string) [READWRITE, PERSIST] */
  pipelineType = "";

  /** m_steps (PITr2TexturePipelineStepVector) [READ, PERSIST] */
  steps = [];


  /**
   * The res paths of this pipeline's resource dependencies, for script.
   *
   * Carbon: Tr2TexturePipeline::GetResourceDependenciesFromScript (trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.cpp:48-55;
   * Tr2TexturePipeline.h:22). Exposed as "GetResourceDependencies"
   * (Tr2TexturePipeline_Blue.cpp:20-23, MAP_METHOD_AND_WRAP).
   *
   * Carbon copies the sorted `std::set` that `GetResourceDependencies` fills into a
   * `std::vector`. `GetResourceDependencies` already returns that sorted list here, so
   * this returns its call.
   *
   * @returns {string[]} Resource dependency paths, sorted.
   */
  GetResourceDependenciesFromScript()
  {
    return this.GetResourceDependencies();
  }

  /**
   * Loads every dependency, executes the pipeline against them and returns the resulting bitmap, for script.
   *
   * Carbon: Tr2TexturePipeline::ExecuteFromScript (trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.cpp:57-90;
   * Tr2TexturePipeline.h:23). Exposed as "Execute"
   * (Tr2TexturePipeline_Blue.cpp:24-30, MAP_METHOD_AND_WRAP_OPTIONAL_ARGS with 2 optional arguments).
   *
   * Not implemented: Carbon loads each dependency with `Tr2HostBitmap::CreateFromFile`
   * (Tr2HostBitmap.cpp:486-510), which reads the file through `BePaths->GetFileContentsWithYield` and
   * decodes it with `ImageIO::ReadImage`. Neither is available to this class: `Tr2HostBitmap` has no
   * `CreateFromFile`, the resource layer has no global `BePaths` or `BeResMan`, and a JS file read is
   * asynchronous where Carbon's yields. `TriTextureRes.LoadPipeline` loads the dependencies through a
   * resource manager and runs `Execute`; use it.
   *
   * @param {number} _maxWidth Max resulting texture width.
   * @param {number} _maxHeight Max resulting texture height.
   * @returns {never}
   * @throws {Error} Always.
   */
  ExecuteFromScript(_maxWidth, _maxHeight)
  {
    throw new Error("Tr2TexturePipeline.ExecuteFromScript: Tr2HostBitmap.CreateFromFile (BePaths file read and ImageIO::ReadImage) is not ported; use TriTextureRes.LoadPipeline.");
  }

  /**
   * Carbon Execute (cpp:24-45): run every step against one bitmap, then apply
   * the caller's size limit.
   *
   * diverged: a failed step stops the pipeline. Carbon ignores each step's
   * result and runs the next one as though it had succeeded, so a failed Load
   * leaves the following steps working on an empty bitmap (Carbon imageio
   * issue 19).
   *
   * Adapted: Carbon ignores each step's result and runs the next one regardless; ours stops
   * on the first failure (issue 19).
   *
   * @param {import("#imageio").HostBitmap} result Bitmap to fill; destroyed first.
   * @param {Map<string, import("#imageio").HostBitmap>} inputs Loaded inputs by path.
   * @param {Tr2TexturePipelineParams} params Caller size limits.
   * Browser compression runs in a worker, so every step is awaited before the
   * following step can consume its bitmap.
   * @param {object} [options] Worker construction and cancellation options.
   * @returns {Promise<boolean>} Whether the pipeline succeeded.
   */
  async Execute(result, inputs, params = new Tr2TexturePipelineParams(), options = {})
  {
    result.Destroy();

    if (!this.steps.length)
    {
      CcpLog.CCP_LOGERR_CH(s_texturePipelineChannel, "Tr2TexturePipeline: no steps");
      return false;
    }

    for (const step of this.steps)
    {
      if (!await step.Execute(result, inputs, params, options)) return false;
    }

    if (params.maxHeight || params.maxWidth)
    {
      return Tr2TexturePipelineStepLimitSize.limitSize(result, params.maxWidth, params.maxHeight);
    }

    return true;
  }

  /**
   * Carbon GetResourceDependencies (cpp:15-22): every path the steps need.
   *
   * Adapted: Carbon fills a caller-owned set; ours returns the paths sorted, for a stable
   * load order.
   *
   * @returns {string[]} Resource dependency paths.
   */
  GetResourceDependencies()
  {
    const resources = new Set();
    for (const step of this.steps) step.GetResourceDependencies(resources);
    return [ ...resources ].sort();
  }

}

CjsSchema.blue.inherit(IRoot)(Tr2TexturePipeline);

CjsSchema.decorateField(Tr2TexturePipeline, "pipelineType", be.mapAttribute(be.READWRITE | be.PERSIST), type.string);
CjsSchema.decorateField(Tr2TexturePipeline, "steps", be.mapAttribute(be.READ | be.PERSIST), type.list("ITr2TexturePipelineStep"));
CjsSchema.decorateMethod(Tr2TexturePipeline, "Execute", meta.adapted);
CjsSchema.decorateMethod(Tr2TexturePipeline, "ExecuteFromScript", be.mapMethodAndWrapOptionalArgs("Execute"), meta.notImplemented);
CjsSchema.decorateMethod(Tr2TexturePipeline, "GetResourceDependencies", meta.adapted);
CjsSchema.decorateMethod(Tr2TexturePipeline, "GetResourceDependenciesFromScript", be.mapMethodAndWrap("GetResourceDependencies"), meta.adapted);
CjsSchema.exposure.define("Tr2TexturePipeline")(Tr2TexturePipeline);
