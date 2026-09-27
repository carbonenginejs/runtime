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

  /**
   * Copies the placement vectors into the retained position record.
   *
   * Adapted: JavaScript vectors represent the native AkSoundPosition fields
   * assigned by AudPosition::UpdatePlacement (audio/src/AudPosition.cpp:16-18).
   * Components are copied unchanged; this method does not convert handedness.
   *
   * @param {ArrayLike<number>} front Forward direction.
   * @param {ArrayLike<number>} top Up direction.
   * @param {ArrayLike<number>} position Position.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  UpdatePlacement(front, top, position)
  {
    vec3.copy(this.value.front, front);
    vec3.copy(this.value.top, top);
    vec3.copy(this.value.position, position);
  }

  /**
   * Accepts a modification notification without further work.
   *
   * Matches AudPosition::OnModified (audio/src/AudPosition.cpp:21-24).
   *
   * @returns {boolean} Always true.
   */
  @carbon.method
  @impl.implemented
  OnModified()
  {
    return true;
  }

}
