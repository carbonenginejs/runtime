// Source: core/include/CcpLog.h

/**
 * Identifies the facility and object that produced a Carbon log message.
 *
 * This is a plain record, not a persisted Blue model. CcpLog passes the same
 * record to each echo, allowing a host to assign channel/source identifiers.
 * Like Carbon's dispatcher, CcpLog does not interpret oktocall as a filter.
 */
export class CcpLogChannel_t
{
    /** @type {number} Native channel initialization flag. */
    oktocall = 1;

    /** @type {string} Native module name, such as "trinity". */
    facility;

    /** @type {string} Channel description, usually "Main". */
    object;

    /** @type {number} Host-assigned channel buffer index. */
    channel = 0;

    /** @type {number} Host-assigned source identifier. */
    source = 0;

    /**
     * Initializes the record represented by CCP_LOG_DEFINE_CHANNEL in Carbon.
     * Adapted: a constructor replaces C++ aggregate initialization; JavaScript
     * modules have no link-time g_moduleName, so the caller supplies the facility.
     * @param {string} [facility="carbon-core"] Module name.
     * @param {string} [object="Main"] Channel description.
     */
    constructor(facility = "carbon-core", object = "Main")
    {
        this.facility = facility;
        this.object = object;
    }
}
