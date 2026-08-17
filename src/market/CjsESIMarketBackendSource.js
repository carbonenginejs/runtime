import { CjsESIMarket } from "./CjsESIMarket.js";

/** Adapts the app-facing market client to the standalone UI source contract. */
export class CjsESIMarketBackendSource extends CjsESIMarket
{

    GetRegions({ selectedRegionID, signal } = {})
    {
        return super.GetRegions(selectedRegionID ?? null, { signal });
    }

    GetOrders({ regionID, typeID, signal })
    {
        return super.GetOrders(typeID, regionID, { signal });
    }

    GetHistory({ regionID, typeID, signal })
    {
        return super.GetHistory(typeID, regionID, { signal });
    }

}
