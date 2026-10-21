import { random } from "#math/random";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { meta, type, blue } from "#schema";
import { INotify, blue as be } from "#blue";
import { Tr2CurveScalar } from "../../../curves/curve/Tr2CurveScalar.js";
import { Tr2CurveExtrapolation } from "../../../curves/enums.js";
import { TriPerlinCurve } from "../../../curves/curve/TriPerlinCurve.js";
import { EveVirtualCameraBehaviourFloatBase } from "./EveVirtualCameraBehaviourFloatBase.js";


/**
 * Float behaviour that adds a Perlin-noise wobble to a scalar camera value such
 * as field of view or roll.
 */
@blue.define("EveVirtualCameraBehaviourFloatNoise")
@blue.interface(INotify)
@blue.chainTo(EveVirtualCameraBehaviourFloatBase)
export class EveVirtualCameraBehaviourFloatNoise extends EveVirtualCameraBehaviourFloatBase
{
  static _nextPhase = 0;

  @blue.readwrite
  @blue.persist
  @type.int32
  octaves = 8;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2CurveScalar")
  magnitudeCurve = null;

  @blue.readwrite
  @blue.persist
  @type.float32
  magnitude = 1;

  @blue.readwrite
  @blue.persist
  @type.float32
  perlineScale = 1;

  _phase = EveVirtualCameraBehaviourFloatNoise._allocatePhase();

  /**
   * Creates the default magnitude envelope curve and names the behaviour
   * "Shake".
   */
  constructor()
  {
    super();
    this.magnitudeCurve = EveVirtualCameraBehaviourFloatNoise._createMagnitudeCurve();
    this.SetName("Shake");
    random.triSrand(be.os.GetCurrentFrameTime()); // Carbon constructor reseeds the shared stream.
  }

  /**
   * Sets the behaviour name and renames the owned magnitude curve to match.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:164-167
   */

  @meta.implemented
  SetName(name)
  {
    super.SetName(name);
    this.magnitudeCurve.SetName(`${this.name} - Magnitude Curve`);
  }

  /**
   * Returns the authored magnitude scaled by a 1D Perlin sample of the
   * phase-offset local time (rate set by perlineScale, detail by octaves) and by
   * the magnitude envelope at normalized timeline time.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp:170-181
   * Adapted: the existing Perlin implementation and allocated instance phase replace native noise and pointer-derived phase.
   */

  @meta.adapted
  Update(camera, _current, _deltaTime, localElapsedTime)
  {
    let offset = this.magnitude * TriPerlinCurve.PerlinNoise1D(
      (localElapsedTime + this._phase) * this.perlineScale,
      2,
      2,
      this.octaves
    );
    if (this.magnitudeCurve)
    {
      const duration = camera.GetAnimationTimelineLength();
      const time = localElapsedTime / duration;
      offset *= this.magnitudeCurve.GetValue(time);
    }
    return offset;
  }

  /**
   * Builds the default envelope over normalized time: a near-instant ramp to
   * full magnitude by 0.1, then a linear fade to zero at the end of the
   * timeline.
   */
  static _createMagnitudeCurve()
  {
    const curve = new Tr2CurveScalar();
    curve.SetExtrapolation(Tr2CurveExtrapolation.LINEAR);
    curve.AddKey(0, 0);
    curve.AddKey(0.001, 0.8);
    curve.AddKey(0.1, 1);
    curve.AddKey(1, 0);
    return curve;
  }

  /**
   * Hands each new instance a distinct noise phase from a rolling 12-bit
   * counter, keeping simultaneous noise behaviours from moving in lockstep.
   */
  static _allocatePhase()
  {
    const phase = EveVirtualCameraBehaviourFloatNoise._nextPhase & 0xfff;
    EveVirtualCameraBehaviourFloatNoise._nextPhase++;
    return phase;
  }
}
