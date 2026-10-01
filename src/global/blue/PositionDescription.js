// Source: blue/include/IBluePlacementObserver.h:36-44

/**
 * One forward vector and position in a multi-placement update.
 * JavaScript construction models native aggregate value-initialization
 * (`PositionDescription{}`), which zeros the six floats. Native default-initialized
 * stack storage is unspecified; this does not claim that storage is zeroed.
 * This plain value record has no Blue class registration or interface identity.
 */
export class PositionDescription
{
  /** @type {number} Forward-vector x component (native float). */
  front_x = 0;

  /** @type {number} Forward-vector y component (native float). */
  front_y = 0;

  /** @type {number} Forward-vector z component (native float). */
  front_z = 0;

  /** @type {number} Position x component (native float). */
  pos_x = 0;

  /** @type {number} Position y component (native float). */
  pos_y = 0;

  /** @type {number} Position z component (native float). */
  pos_z = 0;
}
