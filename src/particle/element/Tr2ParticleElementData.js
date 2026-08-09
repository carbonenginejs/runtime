// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Particle/Tr2ParticleElementDeclaration.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema particle/Tr2ParticleElementData.json).
import { schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Tr2ParticleElementData (particle) - generated from schema shapeHash ca640653.... */
@type.define({ className: "Tr2ParticleElementData", family: "particle" })
export class Tr2ParticleElementData extends CjsModel
{

  /** m_dimension (unsigned) */
  @type.uint32
  dimension = 0;

  /** m_usageIndex (unsigned) */
  @type.uint32
  usageIndex = 0;

  /** m_bufferType (BufferType - enum BufferType) */
  @type.int32
  @schema.enum("BufferType")
  bufferType = 0;

  /** m_offset (unsigned) */
  @type.uint32
  offset = 0;

  /** none (Tr2ParticleElementData) */
  @type.rawStruct("Tr2ParticleElementData")
  none = null;

  static BufferType = Object.freeze({
    Vertex: 0,
    Index: 1,
    Storage: 2,
    Undefined: 3,
  });

}
