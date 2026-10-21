// Source: trinity/trinity/Particle/Tr2ParticleElementDeclaration.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema particle/Tr2ParticleElementData.json).
import { meta, type, blue } from "#schema";
import { blue as be } from "#blue";

/** Tr2ParticleElementData (particle) - generated from schema shapeHash ca640653.... */
@meta.carbon("Tr2ParticleElementData")
export class Tr2ParticleElementData
{

  /** m_dimension (unsigned). Carbon leaves it unset (Tr2ParticleElementDeclaration.h:74). */
  @type.uint32
  dimension = 0;

  /** m_usageIndex (unsigned). Carbon leaves it unset (Tr2ParticleElementDeclaration.h:76). */
  @type.uint32
  usageIndex = 0;

  /** m_bufferType (BufferType - enum BufferType). Carbon leaves it unset (Tr2ParticleElementDeclaration.h:78). */
  @type.int32
  @type.enum("trinity.Tr2ParticleElementData.BufferType")
  bufferType = 0;

  /** m_offset (unsigned). Carbon leaves it unset (Tr2ParticleElementDeclaration.h:80). */
  @type.uint32
  offset = 0;

  /**
   * Creates an invalid element descriptor with zero dimension, usage index and offset,
   * and the COUNT buffer sentinel.
   * Carbon Invalid (Tr2ParticleElementDeclaration.h:82-90).
   *
   * @returns {Tr2ParticleElementData} The invalid descriptor.
   */
  @blue.method
  @meta.implemented
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
be.enums.Create("trinity.Tr2ParticleElementData.BufferType", Tr2ParticleElementData.BufferType);
