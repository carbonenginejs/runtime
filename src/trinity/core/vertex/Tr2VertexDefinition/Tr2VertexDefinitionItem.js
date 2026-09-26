// Source: trinity/trinityal/Tr2VertexDefinition.h:14-207 (the definition and its items)
//   trinity/trinityal/Tr2VertexDefinition.cpp:25-42 (item and definition equality)
//
// This class is the definition and NOTHING ELSE: items, the per-stream offset
// ledger, Add/Find/empty, and its own equality. The intern table lives on
// Tr2EffectStateManager (Carbon s_vertexLayoutMap) and the shader-input match
// lives in the vertex-layout AL (trinityal/vertexLayoutMatch.js) - both were
// parked under this class's name until 2026-09-06, before it had its real
// Carbon surface.

import { Tr2VertexUsageCode } from "../usageCode.js";

/**
 * One vertex element (Carbon Tr2VertexDefinition::Item, h:123-141).
 *
 * The usage is Carbon's numeric UsageCode (h:128), which is what the AL's
 * binding-plan matcher compares against a shader input's usage. The data type
 * stays a name ("FLOAT32_4"); the byte arithmetic derives from it.
 */
export class Tr2VertexDefinitionItem
{
    usage = Tr2VertexUsageCode.POSITION;

    usageIndex = 0;

    type = "FLOAT32_1";

    offset = 0;

    stream = 0;

    instanceStepRate = 0;
}


