// Source: trinity/trinity/Particle/Tr2ParticleElementDeclaration.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema particle/Tr2ParticleElementData.json).
import { meta } from "#schema";
import { blue } from "#blue";

/** Tr2ParticleElementData (particle) - generated from schema shapeHash ca640653.... */
@meta.define({ className: "Tr2ParticleElementData", family: "particle" })
export class Tr2ParticleElementData
{

  /** m_dimension (unsigned) */
  @meta.type.uint32
  dimension = 0;

  /** m_usageIndex (unsigned) */
  @meta.type.uint32
  usageIndex = 0;

  /** m_bufferType (BufferType - enum BufferType) */
  @meta.type.int32
  @meta.type.enum("trinity.Tr2ParticleElementData.BufferType")
  bufferType = 0;

  /** m_offset (unsigned) */
  @meta.type.uint32
  offset = 0;

  /**
   * Creates Carbon's invalid element descriptor: dimension, usage index and
   * offset zero, `bufferType` the COUNT sentinel. `none` is the factory's local
   * name, not a descriptor property.
   */
  @meta.blue.method
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
  static BufferType = {
    /** Buffer that is copied to the GPU vertex buffer. */
    GPU: 0,
    /** CPU-only buffer. */
    CPU: 1,
    /** Number of buffers. */
    COUNT: 2
  };

}


// This native enum has no Blue chooser or enum exposure registration.
blue.enums.Create("trinity.Tr2ParticleElementData.BufferType", Tr2ParticleElementData.BufferType, {
  source: "trinity/trinity/Particle/Tr2ParticleElementDeclaration.h", family: "particle", line: 62
});
