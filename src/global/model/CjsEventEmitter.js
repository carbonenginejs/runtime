import { installNotify } from "../compose/notify.js";

/**
 * Minimal event emitter with lowercase exact-name dispatch.
 *
 * The IMPLEMENTATION lives in compose/notify.js as the notify method map -
 * one implementation, two deliveries: classes may inherit this base, or
 * compose the same surface with `@compose.notify` and keep their own
 * inheritance slot.
 *
 * Event storage is allocated lazily on first listener, owned by the
 * emitter's `__state`, and deleted when the last listener leaves.
 */
export class CjsEventEmitter
{
}

installNotify(CjsEventEmitter);
