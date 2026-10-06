import { optionalString, snapshotFeatures, snapshotWebIdl } from "./browserHelpers.js";
import { Tr2VideoDriver } from "./Tr2VideoDriver.js";

/**
 * Privacy-respecting browser snapshot of Carbon's Tr2VideoAdapter
 * (Tr2VideoAdapters.h), a read-only report the adapter query fills.
 *
 * Records the browser-visible adapter info, sorted feature names, numeric
 * limits, fallback status and a Tr2VideoDriver. Native identifiers, versions,
 * dates and switchable-GPU flags stay null when the browser withholds them;
 * nothing is inferred from the user agent or adapter name. `architecture`,
 * `isFallbackAdapter`, `features` and `limits` are WebGPU facts Carbon's
 * adapter info does not have.
 */
export class Tr2VideoAdapter
{
    /** Video adapter index. */
    index = 0;

    /** Adapter revision, or null. */
    revision = null;

    /** Adapter device name, or null. */
    deviceName = null;

    /** Human-readable adapter name, or null. */
    description = null;

    /** Adapter device ID, or null. */
    deviceID = null;

    /** Adapter sub-system ID, or null. */
    subSystemID = null;

    /** Adapter vendor ID, or null. */
    vendorID = null;

    /** Video driver name, or null. */
    driver = null;

    /** Video driver version, or null. */
    driverVersion = null;

    /** WebGPU adapter architecture, or null. */
    architecture = null;

    /** Stable browser-visible adapter identifier, or null. */
    deviceIdentifier = null;

    /** Whether WebGPU reported a fallback (software) adapter. */
    isFallbackAdapter = false;

    /** Sorted WebGPU feature names. */
    features = [];

    /** WebGPU numeric limits. */
    limits = {};

    /** The adapter's driver report. */
    driverInfo = new Tr2VideoDriver();

    /**
     * Carbon's GetDeviceIdentifierString: the stable adapter identifier, or an
     * empty string when the browser exposes none.
     *
     * @returns {string} The identifier.
     */
    GetDeviceIdentifierString()
    {
        return this.deviceIdentifier ?? "";
    }

    /**
     * Carbon's GetDriverInfo: a new driver report holding a copy of this
     * adapter's driver info.
     *
     * @returns {Tr2VideoDriver} The copy.
     */
    GetDriverInfo()
    {
        return Object.assign(new Tr2VideoDriver(), this.driverInfo);
    }

    /**
     * Creates an adapter report from a GPUAdapter, as Carbon's adapter query
     * fills its report from the device.
     *
     * @param {object} adapter A GPUAdapter-like object.
     * @param {object} [overrides] Fields that replace what the adapter reports, such as `index`.
     * @returns {Promise<Tr2VideoAdapter>} The report.
     */
    static async FromGPUAdapter(adapter, overrides = {})
    {
        if (!adapter || typeof adapter !== "object") throw new TypeError("Tr2VideoAdapter requires a GPUAdapter-like object.");

        let rawInfo = adapter.info ?? null;
        if (!rawInfo && typeof adapter.requestAdapterInfo === "function") rawInfo = await adapter.requestAdapterInfo();
        const info = snapshotWebIdl(rawInfo);
        const vendor = optionalString(info.vendor);
        const architecture = optionalString(info.architecture);
        const device = optionalString(info.device);

        const result = new Tr2VideoAdapter();
        result.index = Number.isSafeInteger(overrides.index) ? overrides.index : 0;
        result.revision = overrides.revision ?? null;
        result.deviceName = optionalString(overrides.deviceName ?? device ?? architecture);
        result.description = optionalString(overrides.description ?? info.description);
        result.deviceID = optionalString(overrides.deviceID ?? device);
        result.subSystemID = optionalString(overrides.subSystemID);
        result.vendorID = optionalString(overrides.vendorID ?? vendor);
        result.driver = optionalString(overrides.driver ?? info.driver);
        result.driverVersion = overrides.driverVersion ?? info.driverVersion ?? null;
        result.architecture = optionalString(overrides.architecture ?? architecture);
        result.deviceIdentifier = optionalString(overrides.deviceIdentifier
            ?? ([ vendor, architecture, device ].filter(Boolean).join(":") || null));
        result.isFallbackAdapter = overrides.isFallbackAdapter ?? info.isFallbackAdapter ?? adapter.isFallbackAdapter ?? false;
        result.features = Array.from(snapshotFeatures(adapter.features), String).sort();
        result.limits = { ...snapshotWebIdl(adapter.limits) };
        result.driverInfo = Tr2VideoDriver.FromGPUAdapterInfo(info);
        return result;
    }
}

export default Tr2VideoAdapter;
