// Source: trinity/trinityal/dx11/Tr2PipelineStatsQueryALDx11.h
//
// The statistics record a pipeline statistics query fills. dx11's holds a
// `D3D11_QUERY_DATA_PIPELINE_STATISTICS` (`Tr2PipelineStatsQueryALDx11.h:11-15`);
// WebGL2 has no pipeline statistics, so this one holds no values, which is what
// `Tr2PipelineStatsQueryALWebgl2.GetValueCount` reports.

import { CjsSchema } from "#schema";

/**
 * A pipeline statistics record on a WebGL2 device, which holds no values.
 */
export class Tr2PipelineStatsDataALWebgl2
{
  /** data: the values, none on WebGL2. */
  data = [];
}

CjsSchema.define(Tr2PipelineStatsDataALWebgl2, { className: "Tr2PipelineStatsDataALWebgl2", carbon: "Tr2PipelineStatsDataAL" });
