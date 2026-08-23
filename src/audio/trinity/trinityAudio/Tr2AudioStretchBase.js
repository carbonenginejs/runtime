// Source: trinity/trinity/Audio/Tr2AudioStretchBase.h
// Promoted from generated output 2026-07-18; now hand-owned by the audio
// layer. Verify against trinityAudio/Tr2AudioStretchBase.json.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { AudEmitter } from "../audio/AudEmitter.js";
import { AudGameObjResource } from "../audio/AudGameObjResource.js";
import { StretchAudio } from "../audio/StretchAudio.js";

/** Tr2AudioStretchBase (trinityAudio) - generated from schema shapeHash f6d14e40.... */
@type.define({ className: "Tr2AudioStretchBase", family: "trinityAudio" })
export class Tr2AudioStretchBase extends CjsModel
{

  /** m_stretchEmitter (ITr2AudEmitterPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITr2AudEmitter")
  stretchEmitter = null;

  /** m_destEmitter (ITr2AudEmitterPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITr2AudEmitter")
  destinationEmitter = null;

  /** m_sourceEmitter (ITr2AudEmitterPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITr2AudEmitter")
  sourceEmitter = null;

  #front = new Float32Array([ 0, 1, 0 ]);

  #top = new Float32Array([ 0, 0, 1 ]);

  /** Creates and initializes Carbon's three-emitter stretch-audio bridge. */
  constructor()
  {
    super();
    this.Initialize();
  }

  /** Carbon method Initialize: create the three standard emitters when absent. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    if (!this.sourceEmitter)
    {
      this.sourceEmitter = new AudEmitter();
      this.sourceEmitter.SetName("stretch_source_sfx");
    }
    if (!this.destinationEmitter)
    {
      this.destinationEmitter = new AudEmitter();
      this.destinationEmitter.SetName("stretch_dest_sfx");
    }
    if (!this.stretchEmitter)
    {
      this.stretchEmitter = new AudEmitter();
      this.stretchEmitter.SetName("stretch_mid_sfx");
    }
    return true;
  }

  /** Carbon method Update: position endpoints and project the listener onto the beam. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads Tr2Renderer's view position; the device-free audio graph uses the registered audio listener position.")
  Update(sourcePosition, destPosition)
  {
    StretchAudio.GetStretchOrientation(sourcePosition, destPosition, this.#front, this.#top);
    this.sourceEmitter?.SetPosition?.(this.#front, this.#top, sourcePosition);
    this.destinationEmitter?.SetPosition?.(this.#front, this.#top, destPosition);
    const listenerPosition = AudGameObjResource.manager?.GetListener?.()?.GetPosition?.() ?? sourcePosition;
    this.stretchEmitter?.SetPosition?.(
      this.#front,
      this.#top,
      Tr2AudioStretchBase.#ProjectOntoSegment(listenerPosition, sourcePosition, destPosition));
  }

  /** Carbon method FindEmitterByName. */
  @carbon.method
  @impl.implemented
  FindEmitterByName(name)
  {
    for (const emitter of [ this.sourceEmitter, this.destinationEmitter, this.stretchEmitter ])
    {
      if (emitter?.GetName?.() === name)
      {
        return emitter;
      }
    }
    return null;
  }

  /** Projects one point onto the finite source-to-destination segment. */
  static #ProjectOntoSegment(point, source, destination)
  {
    const x = destination[0] - source[0];
    const y = destination[1] - source[1];
    const z = destination[2] - source[2];
    const lengthSquared = x * x + y * y + z * z;
    if (lengthSquared < 1e-6)
    {
      return [ source[0], source[1], source[2] ];
    }
    const offsetX = point[0] - source[0];
    const offsetY = point[1] - source[1];
    const offsetZ = point[2] - source[2];
    const t = Math.max(0, Math.min(1, (offsetX * x + offsetY * y + offsetZ * z) / lengthSquared));
    return [ source[0] + t * x, source[1] + t * y, source[2] + t * z ];
  }

}
