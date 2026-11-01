// A module beside the device, so Trinity's registry (CjsTrinity.js) and the
// Tr2DeviceResource base name a resource's state without importing each other:
// CjsTrinity.js imports nothing that reaches the device-resource classes.
// Ours: Carbon's Tr2DeviceResource has no state; a resource lives from its
// constructor to its destructor (docs internal/decisions/device-resource-registration.md,
// *Revised lifecycle* § 3).

/**
 * A scene-content device resource's state: `NONE` (no device objects), `PREPARED`
 * (its device objects exist) or `DESTRUCTED` (its owner tore it down; it never
 * prepares again).
 *
 * @cjs
 * @type {{ NONE: number, PREPARED: number, DESTRUCTED: number }}
 */
export const Tr2DeviceResourceState = { NONE: 0, PREPARED: 1, DESTRUCTED: 2 };

/**
 * Blue ticks per second: Blue's frame time counts 100 ns ticks (CcpTime).
 *
 * @type {number}
 */
export const TICKS_PER_SECOND = 10000000;

/**
 * Seconds of Blue frame time a scene-content resource waits after a failed
 * prepare before its next use tries again, so a broken resource does not re-run
 * its prepare for every draw.
 *
 * @cjs Ours, with the rest of the lifecycle (Ruru, 2026-11-02).
 * @type {number}
 */
export const PREPARE_RETRY_SECONDS = 1;
