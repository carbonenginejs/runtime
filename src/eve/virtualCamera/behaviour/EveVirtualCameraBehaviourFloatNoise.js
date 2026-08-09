// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.h
// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2CurveScalar } from "../../../curves/curves/Tr2CurveScalar.js";
import { Tr2CurveExtrapolation } from "../../../curves/enums.js";
import { TriPerlinCurve } from "../../../curves/curves/TriPerlinCurve.js";
import { EveVirtualCameraBehaviourFloatBase } from "./EveVirtualCameraBehaviourFloatBase.js";


/**
 * Float behaviour that adds a Perlin-noise wobble to a scalar camera value such
 * as field of view or roll.
 */
@type.define({
  className: "EveVirtualCameraBehaviourFloatNoise",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourFloatNoise extends EveVirtualCameraBehaviourFloatBase
{
  static #nextPhase = 0;

  @io.persist
  @type.int32
  octaves = 8;

  @io.persist
  @type.objectRef("Tr2CurveScalar")
  magnitudeCurve = null;

  @io.persist
  @type.float32
  magnitude = 1;

  @io.persist
  @type.float32
  perlineScale = 1;

  #phase = EveVirtualCameraBehaviourFloatNoise.#allocatePhase();

  /**
   * Creates the default magnitude envelope curve and names the behaviour
   * "Shake".
   */
  constructor()
  {
    super();
    this.magnitudeCurve = EveVirtualCameraBehaviourFloatNoise.#createMagnitudeCurve();
    this.SetName("Shake");
  }

  /** Sets the behaviour name and renames the owned magnitude curve to match. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    super.SetName(name);
    this.magnitudeCurve?.SetName?.(`${this.name} - Magnitude Curve`);
  }

  /**
   * Returns the authored magnitude scaled by a 1D Perlin sample of the
   * phase-offset local time (rate set by perlineScale, detail by octaves) and by
   * the magnitude envelope at normalized timeline time.
   */
  @carbon.method
  @impl.adapted
  Update(camera, _current, _deltaTime, localElapsedTime)
  {
    let offset = this.magnitude * TriPerlinCurve.PerlinNoise1D(
      (localElapsedTime + this.#phase) * this.perlineScale,
      2,
      2,
      this.octaves
    );
    if (this.magnitudeCurve)
    {
      const duration = Number(camera?.GetAnimationTimelineLength?.() ?? 0);
      const time = duration !== 0 ? localElapsedTime / duration : 0;
      offset *= Number(this.magnitudeCurve.GetValue?.(time) ?? 1);
    }
    return offset;
  }

  /**
   * Builds the default envelope over normalized time: a near-instant ramp to
   * full magnitude by 0.1, then a linear fade to zero at the end of the
   * timeline.
   */
  static #createMagnitudeCurve()
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
  static #allocatePhase()
  {
    const phase = EveVirtualCameraBehaviourFloatNoise.#nextPhase & 0xfff;
    EveVirtualCameraBehaviourFloatNoise.#nextPhase++;
    return phase;
  }
}
