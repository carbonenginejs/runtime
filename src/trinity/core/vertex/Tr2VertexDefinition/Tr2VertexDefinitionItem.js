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
 * Carbon's usage and data type are bit-coded enums; the runtime's element
 * vocabulary is the string names throughout (payload readers, the quad
 * renderer, the AL's binding-plan matcher), so the item carries the names
 * and the byte arithmetic derives from them.
 */
export class Tr2VertexDefinitionItem
{
    usage = "POSITION";

    usageIndex = 0;

    type = "FLOAT32_1";

    offset = 0;

    stream = 0;

    instanceStepRate = 0;
}


