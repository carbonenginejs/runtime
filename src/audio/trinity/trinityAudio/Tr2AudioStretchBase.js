import { exposure as be } from "#be";
// Source: trinity/trinity/Audio/Tr2AudioStretchBase.h
// Promoted from generated output 2026-07-18; now hand-owned by the audio
// layer. Verify against trinityAudio/Tr2AudioStretchBase.json.
import { CjsSchema, meta, type, blue } from "#schema";
import { IInitialize } from "#blue/IInitialize";
import { ITr2DebugRenderable } from "#interfaces/ITr2DebugRenderable";
import { ITr2Audio } from "../trinityAudioApi/ITr2Audio.js";
import { AudEmitter } from "../audio/AudEmitter.js";
import { AudGameObjResource } from "../audio/AudGameObjResource.js";
import { StretchAudio } from "../audio/StretchAudio.js";

/** Creates and updates the three Carbon emitters used by a Trinity audio stretch. */
@be.define("Tr2AudioStretchBase")
@blue.inherit(IInitialize, ITr2DebugRenderable, ITr2Audio)
@be.mapInterface(IInitialize)
@be.mapInterface(ITr2DebugRenderable)
@be.mapInterface(ITr2Audio)
export class Tr2AudioStretchBase
{

  /** m_stretchEmitter (ITr2AudEmitterPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("ITr2AudEmitter")
  stretchEmitter = null;

  /** m_destEmitter (ITr2AudEmitterPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("ITr2AudEmitter")
  destinationEmitter = null;

  /** m_sourceEmitter (ITr2AudEmitterPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("ITr2AudEmitter")
  sourceEmitter = null;

  _front = new Float32Array([ 0, 1, 0 ]);

  _top = new Float32Array([ 0, 0, 1 ]);

  /** Creates and initializes Carbon's three-emitter stretch-audio bridge. */
  constructor()
  {
    this.Initialize();
  }

  /** Carbon method Initialize: create the three standard emitters when absent. */

  @meta.implemented
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

  /**
   * Carbon method Update: position endpoints and project the listener onto the beam.
   *
   * Adapted: Carbon reads Tr2Renderer's view position; the device-free audio graph uses the
   * registered audio listener position, or the source position before a listener
   * is registered. Present listeners must supply GetPosition. Carbon Update is
   * Tr2AudioStretchBase.cpp:38-62.
   */

  @meta.adapted
  Update(sourcePosition, destPosition)
  {
    StretchAudio.GetStretchOrientation(sourcePosition, destPosition, this._front, this._top);
    this.sourceEmitter?.SetPosition(this._front, this._top, sourcePosition);
    this.destinationEmitter?.SetPosition(this._front, this._top, destPosition);
    const listener = AudGameObjResource.manager?.GetListener();
    const listenerPosition = listener ? listener.GetPosition() : sourcePosition;
    this.stretchEmitter?.SetPosition(
      this._front,
      this._top,
      Tr2AudioStretchBase._ProjectOntoSegment(listenerPosition, sourcePosition, destPosition));
  }

  /**
   * Finds the first initialized emitter with the requested name.
   * Carbon FindEmitterByName (Tr2AudioStretchBase.cpp:64-79).
   *
   * @param {string} name Emitter name.
   * @returns {ITr2AudEmitter|null} Matching emitter, or null.
   */

  @meta.implemented
  FindEmitterByName(name)
  {
    for (const emitter of [ this.sourceEmitter, this.destinationEmitter, this.stretchEmitter ])
    {
      if (emitter.GetName() === name)
      {
        return emitter;
      }
    }
    return null;
  }

  /** Forwards supported debug options to the three nominal emitter interfaces. */

  @meta.implemented
  GetDebugOptions(options)
  {
    for (const emitter of [ this.sourceEmitter, this.destinationEmitter, this.stretchEmitter ])
    {
      const debug = CjsSchema.cast(emitter, ITr2DebugRenderable);
      if (debug) debug.GetDebugOptions(options);
    }
  }

  /** Forwards debug drawing to the three nominal emitter interfaces. */

  @meta.implemented
  RenderDebugInfo(renderer)
  {
    for (const emitter of [ this.sourceEmitter, this.destinationEmitter, this.stretchEmitter ])
    {
      const debug = CjsSchema.cast(emitter, ITr2DebugRenderable);
      if (debug) debug.RenderDebugInfo(renderer);
    }
  }

  /** Projects one point onto the finite source-to-destination segment. */
  static _ProjectOntoSegment(point, source, destination)
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

