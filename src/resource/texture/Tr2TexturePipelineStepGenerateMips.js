// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepGenerateMips.h
// Marker step: Carbon registers the class with zero attributes; the mip
// generation itself happens where the pipeline is executed.
import { carbon, CjsSchema, impl, type } from "#schema";
import { CjsModel } from "#model";

/** Attribute-free persisted Blue marker step mirroring Carbon's mip-generation step; the mip generation itself happens where the pipeline executes. */
export class Tr2TexturePipelineStepGenerateMips extends CjsModel
{

  /**
   * Carbon's ITr2TexturePipelineStep default (ITr2TexturePipelineStep.h:21):
   * this step names no resources.
   *
   * @param {Set<string>} [resources] Caller-owned; allocated when omitted.
   * @returns {Set<string>} The set, unchanged.
   */
  GetResourceDependencies(resources = new Set())
  {
    return resources;
  }

  /**
   * Carbon Execute (cpp:9-15): generate the bitmap's full mip chain.
   *
   * @param {import("#imageio").HostBitmap} bitmap The pipeline's bitmap.
   * @returns {boolean} Whether the step succeeded.
   */
  Execute(bitmap)
  {
    // Carbon: CCP_LOGERR("Tr2TexturePipelineStepGenerateMips: invalid input bitmap")
    if (!bitmap.IsValid()) return false;

    return bitmap.GenerateMipMaps();
  }

}

CjsSchema.define(Tr2TexturePipelineStepGenerateMips, {
  className: "Tr2TexturePipelineStepGenerateMips", family: "resources",
  fields: {

  },
  methods: {
    GetResourceDependencies: [ carbon.method, impl.implemented ],
    Execute: [ carbon.method, impl.implemented ]
  }
});
