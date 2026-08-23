// Source: audio/src/AudPosition.h + AudPosition.cpp
// Hand-owned behavior port. Verify against audio/AudPosition.json.
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";

/**
 * Stores browser-safe front, top, and position vectors for Carbon
 * placement-observer updates.
 */
@type.define({ className: "AudPosition", family: "audio" })
export class AudPosition extends CjsModel
{

  /** Native AkSoundPosition replacement; not part of Blue serialization. */
  value = Object.freeze({
    front: vec3.fromValues(0, 0, 1),
    top: vec3.fromValues(0, 1, 0),
    position: vec3.create()
  });

  /** Carbon IBluePlacementObserver method UpdatePlacement. */
  @carbon.method
  @impl.adapted
  @impl.reason("AkSoundPosition is represented by browser-safe front, top, and position vectors.")
  UpdatePlacement(front, top, position)
  {
    vec3.copy(this.value.front, front);
    vec3.copy(this.value.top, top);
    vec3.copy(this.value.position, position);
  }

  /** Carbon INotify method OnModified. */
  @carbon.method
  @impl.implemented
  OnModified()
  {
    return true;
  }

}
