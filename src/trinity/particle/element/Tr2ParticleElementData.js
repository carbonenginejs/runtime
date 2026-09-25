// Source: trinity/trinity/Particle/Tr2ParticleElementDeclaration.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema particle/Tr2ParticleElementData.json).
import { carbon, type } from "#schema";
import { blue } from "#blue";
import { CjsModel } from "#model";

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
  @type.enum("trinity.Tr2ParticleElementData.BufferType")
  bufferType = 0;

  /** m_offset (unsigned) */
  @type.uint32
  offset = 0;

  /**
   * Creates Carbon's invalid element descriptor: dimension, usage index and
   * offset zero, `bufferType` the COUNT sentinel. `none` is the factory's local
   * name, not a descriptor property.
   */
  @carbon.method
  static Invalid()
  {
    const none = new Tr2ParticleElementData();
    none.dimension = 0;
    none.usageIndex = 0;
    none.bufferType = Tr2ParticleElementData.BufferType.COUNT;
    none.offset = 0;
    return none;
  }

  /**
   * Which of a particle system's two buffers an element lives in.
   *
   * Carbon indexes the buffer array with this directly - `particle[element
   * .m_bufferType] + element.m_offset` (Tr2ParticleSystem.cpp:448,
   * Tr2ConsecutiveIntegerAttributeGenerator.cpp:50) - so GPU and CPU are
   * positions, and COUNT is the array's length rather than a state.
   */
  static BufferType = Object.freeze({
    /** Buffer that is copied to the GPU vertex buffer. */
    GPU: 0,
    /** CPU-only buffer. */
    CPU: 1,
    /** Number of buffers. */
    COUNT: 2
  });

}


// This native enum has no Blue chooser or enum exposure registration.
blue.enums.RegisterEnum("trinity.Tr2ParticleElementData.BufferType", Tr2ParticleElementData.BufferType, {
  source: "trinity/trinity/Particle/Tr2ParticleElementDeclaration.h", family: "particle", line: 62
});
