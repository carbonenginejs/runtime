// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLoad.h
// Schema: format-carbon resources/Tr2TexturePipelineStepLoad.json; maintained by the runtime resource layer.
import * as CcpLog from "../../global/logging/CcpLog.js";
import { carbon, CjsSchema, edit, impl, type } from "#schema";
import { CjsModel } from "#model";

// Source: trinity/trinity/Resources/TexturePipeline/ITr2TexturePipelineStep.h:26
const s_texturePipelineChannel = CcpLog.CCP_LOG_DEFINE_CHANNEL("TexturePipeline", "trinity");

/** Persisted pipeline-step record mirroring Carbon's load step, holding the source texture path the pipeline reads. */
export class Tr2TexturePipelineStepLoad extends CjsModel
{

  /** m_path (std::wstring) [READWRITE, PERSIST] */
  path = "";

  /**
   * Carbon GetResourceDependencies (cpp:9-12): this step needs its own path.
   *
   * @param {Set<string>} [resources] Caller-owned; allocated when omitted.
   * @returns {Set<string>} The set.
   */
  GetResourceDependencies(resources = new Set())
  {
    if (this.path) resources.add(String(this.path));
    return resources;
  }

  /**
   * Carbon Execute (cpp:14-30): copy the named input into the pipeline bitmap.
   *
   * @param {import("#imageio").HostBitmap} bitmap The pipeline's bitmap.
   * @param {Map<string, import("#imageio").HostBitmap>} inputs Loaded inputs by path.
   * @returns {boolean} Whether the step succeeded.
   */
  Execute(bitmap, inputs)
  {
    if (bitmap.IsValid())
    {
      CcpLog.CCP_LOGWARN_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepLoad: output bitmap is not empty");
    }
    const input = inputs?.get(String(this.path)) ?? null;

    if (!input)
    {
      CcpLog.CCP_LOGERR_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepLoad: failed to get input texture %S", this.path);
      return false;
    }

    if (!bitmap.CreateFromBitmapDimensions(input))
    {
      CcpLog.CCP_LOGERR_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepLoad: failed to create output for input texture %S", this.path);
      return false;
    }

    bitmap.GetRawData().set(input.GetRawData());
    return true;
  }

}

CjsSchema.define(Tr2TexturePipelineStepLoad, {
  className: "Tr2TexturePipelineStepLoad", family: "resources",
  fields: {
    path: [ edit.persist, type.string ]
  },
  methods: {
    GetResourceDependencies: [ carbon.method, impl.implemented ],
    Execute: [ carbon.method, impl.implemented ]
  }
});
