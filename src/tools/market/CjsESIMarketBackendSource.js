import { CjsESIMarket } from "./CjsESIMarket.js";

/** Adapts the app-facing market client to the standalone UI source contract. */
export class CjsESIMarketBackendSource extends CjsESIMarket
{

    /** Delegates region acquisition to the configured market backend. */
    GetRegions({ selectedRegionID, signal } = {})
    {
        return super.GetRegions(selectedRegionID ?? null, { signal });
    }

    /** Delegates order acquisition to the configured market backend. */
    GetOrders({ regionID, typeID, signal })
    {
        return super.GetOrders(typeID, regionID, { signal });
    }

    /** Delegates history acquisition to the configured market backend. */
    GetHistory({ regionID, typeID, signal })
    {
        return super.GetHistory(typeID, regionID, { signal });
    }

}
