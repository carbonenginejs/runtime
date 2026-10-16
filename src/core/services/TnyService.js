import { CjsSchema } from "#schema/CjsSchema";

/**
 * Our host service base, not a Blue object or native service port.
 * The manager injects a scoped store only when storagePolicy requests one.
 */
export class TnyService
{
    static storagePolicy = null;

    /** Release service-owned work; the storage manager owns the store lifetime. */
    async Close() {}
}

CjsSchema.meta.define(TnyService, { className: "TnyService" });
