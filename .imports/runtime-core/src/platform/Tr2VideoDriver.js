import { optionalString, snapshotWebIdl } from "./browserHelpers.js";

/**
 * Browser-visible subset of Carbon's Tr2VideoDriver.
 *
 * Browsers normally withhold native driver versions and dates. Unknown values
 * remain null rather than being inferred from the user agent or adapter name.
 */
export class Tr2VideoDriver
{
    /** Creates a browser-visible video-driver snapshot. */
    constructor(values = {})
    {
        this.SetValues(values);
    }

    /** Applies browser-visible driver values and returns this snapshot. */
    SetValues(values = {})
    {
        this.driverDate = optionalString(values.driverDate);
        this.driverVendor = optionalString(values.driverVendor);
        this.driverVersion = values.driverVersion ?? null;
        this.driverVersionString = optionalString(values.driverVersionString);
        this.isAmdDynamicSwitchable = values.isAmdDynamicSwitchable ?? null;
        this.isOptimus = values.isOptimus ?? null;
        this.description = optionalString(values.description);
        this.available = values.available ?? [
            this.driverDate,
            this.driverVendor,
            this.driverVersion,
            this.driverVersionString,
            this.description
        ].some(value => value !== null);
        return this;
    }

    /** Returns a detached record of browser-visible driver values. */
    GetValues()
    {
        return {
            driverDate: this.driverDate,
            driverVendor: this.driverVendor,
            driverVersion: this.driverVersion,
            driverVersionString: this.driverVersionString,
            isAmdDynamicSwitchable: this.isAmdDynamicSwitchable,
            isOptimus: this.isOptimus,
            description: this.description,
            available: this.available
        };
    }

    /** Creates a driver snapshot from GPU adapter information. */
    static FromGPUAdapterInfo(adapterInfo = {})
    {
        const info = snapshotWebIdl(adapterInfo);
        return new Tr2VideoDriver({
            driverDate: info.driverDate,
            driverVendor: info.driverVendor ?? info.vendor,
            driverVersion: info.driverVersion,
            driverVersionString: info.driverVersionString ?? info.driver,
            isAmdDynamicSwitchable: info.isAmdDynamicSwitchable,
            isOptimus: info.isOptimus,
            description: info.description
        });
    }
}

export default Tr2VideoDriver;
