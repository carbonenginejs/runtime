import { optionalString, snapshotWebIdl } from "./browserHelpers.js";

/**
 * Browser-visible subset of Carbon's Tr2VideoDriver (Tr2VideoAdapters.h), a
 * read-only report its adapter fills.
 *
 * Browsers normally withhold native driver versions and dates. Unknown values
 * remain null rather than being inferred from the user agent or adapter name.
 */
export class Tr2VideoDriver
{
    /** Driver release date, or null when the browser withholds it. */
    driverDate = null;

    /** Driver vendor company, or null. */
    driverVendor = null;

    /** Driver version as a number, or null. */
    driverVersion = null;

    /** Driver version as a string, or null. */
    driverVersionString = null;

    /** Whether the machine runs AMD Dynamic Switchable graphics, or null when unknown. */
    isAmdDynamicSwitchable = null;

    /** Whether the machine runs Optimus graphics, or null when unknown. */
    isOptimus = null;

    /** Human-readable driver description, or null. */
    description = null;

    /** Whether the browser exposed any driver information at all. */
    available = false;

    /**
     * Creates a driver report from GPU adapter information, as Carbon fills
     * its report from the device's driver info.
     *
     * @param {object} [adapterInfo] A GPUAdapterInfo-like object.
     * @returns {Tr2VideoDriver} The report.
     */
    static FromGPUAdapterInfo(adapterInfo = {})
    {
        const info = snapshotWebIdl(adapterInfo);
        const driver = new Tr2VideoDriver();
        driver.driverDate = optionalString(info.driverDate);
        driver.driverVendor = optionalString(info.driverVendor ?? info.vendor);
        driver.driverVersion = info.driverVersion ?? null;
        driver.driverVersionString = optionalString(info.driverVersionString ?? info.driver);
        driver.isAmdDynamicSwitchable = info.isAmdDynamicSwitchable ?? null;
        driver.isOptimus = info.isOptimus ?? null;
        driver.description = optionalString(info.description);
        driver.available = [
            driver.driverDate,
            driver.driverVendor,
            driver.driverVersion,
            driver.driverVersionString,
            driver.description
        ].some(value => value !== null);
        return driver;
    }
}

export default Tr2VideoDriver;
