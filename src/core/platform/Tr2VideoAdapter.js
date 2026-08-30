import { optionalString, snapshotFeatures, snapshotWebIdl } from "./browserHelpers.js";
import { Tr2VideoDriver } from "./Tr2VideoDriver.js";

/** Privacy-respecting browser snapshot of Carbon's Tr2VideoAdapter. */
export class Tr2VideoAdapter
{
    /** Creates a privacy-safe video-adapter snapshot. */
    constructor(values = {})
    {
        this.SetValues(values);
    }

    /** Applies adapter values and returns this snapshot. */
    SetValues(values = {})
    {
        this.index = Number.isSafeInteger(values.index) ? values.index : 0;
        this.revision = values.revision ?? null;
        this.deviceName = optionalString(values.deviceName);
        this.description = optionalString(values.description);
        this.deviceID = optionalString(values.deviceID);
        this.subSystemID = optionalString(values.subSystemID);
        this.vendorID = optionalString(values.vendorID);
        this.driver = optionalString(values.driver);
        this.driverVersion = values.driverVersion ?? null;
        this.architecture = optionalString(values.architecture);
        this.deviceIdentifier = optionalString(values.deviceIdentifier);
        this.isFallbackAdapter = values.isFallbackAdapter ?? false;
        this.features = Array.from(values.features ?? [], String).sort();
        this.limits = { ...(values.limits ?? {}) };
        this.driverInfo = values.driverInfo instanceof Tr2VideoDriver
            ? values.driverInfo
            : new Tr2VideoDriver(values.driverInfo);
        return this;
    }

    /** Returns the stable browser-visible adapter identifier, if available. */
    GetDeviceIdentifierString()
    {
        return this.deviceIdentifier ?? "";
    }

    /** Returns a detached video-driver snapshot. */
    GetDriverInfo()
    {
        return new Tr2VideoDriver(this.driverInfo.GetValues());
    }

    /** Returns a detached record of browser-visible adapter values. */
    GetValues()
    {
        return {
            index: this.index,
            revision: this.revision,
            deviceName: this.deviceName,
            description: this.description,
            deviceID: this.deviceID,
            subSystemID: this.subSystemID,
            vendorID: this.vendorID,
            driver: this.driver,
            driverVersion: this.driverVersion,
            architecture: this.architecture,
            deviceIdentifier: this.deviceIdentifier,
            isFallbackAdapter: this.isFallbackAdapter,
            features: [ ...this.features ],
            limits: { ...this.limits },
            driverInfo: this.driverInfo.GetValues()
        };
    }

    /** Creates a privacy-safe snapshot from a GPUAdapter-like object. */
    static async FromGPUAdapter(adapter, values = {})
    {
        if (!adapter || typeof adapter !== "object") throw new TypeError("Tr2VideoAdapter requires a GPUAdapter-like object.");

        let rawInfo = adapter.info ?? null;
        if (!rawInfo && typeof adapter.requestAdapterInfo === "function") rawInfo = await adapter.requestAdapterInfo();
        const info = snapshotWebIdl(rawInfo);
        const limits = snapshotWebIdl(adapter.limits);
        const features = snapshotFeatures(adapter.features);
        const vendor = optionalString(info.vendor);
        const architecture = optionalString(info.architecture);
        const device = optionalString(info.device);
        const identifier = [ vendor, architecture, device ].filter(Boolean).join(":") || null;
        const driverInfo = Tr2VideoDriver.FromGPUAdapterInfo(info);

        return new Tr2VideoAdapter({
            ...values,
            deviceName: values.deviceName ?? device ?? architecture,
            description: values.description ?? info.description,
            deviceID: values.deviceID ?? device,
            vendorID: values.vendorID ?? vendor,
            driver: values.driver ?? info.driver,
            driverVersion: values.driverVersion ?? info.driverVersion,
            architecture: values.architecture ?? architecture,
            deviceIdentifier: values.deviceIdentifier ?? identifier,
            isFallbackAdapter: values.isFallbackAdapter ?? info.isFallbackAdapter ?? adapter.isFallbackAdapter ?? false,
            features,
            limits,
            driverInfo
        });
    }
}

export default Tr2VideoAdapter;
