// Source: core/include/CcpLog.h
// Source: core/CcpLog.cpp
/**
 * Carbon's synchronous logging functions and macro equivalents.
 *
 * RegisterLogEcho installs host sinks without platform or Node dependencies.
 * LogToDebugger is registered by default and writes to console (an intentional
 * adaptation; native Carbon starts with no echoes). Replace it by calling
 * UnregisterLogEcho(LogToDebugger), then RegisterLogEcho(hostSink). Additional
 * registrations fan out; registering the same function replaces its options.
 * Sink exceptions propagate, as native callback exceptions would.
 *
 * Each JavaScript realm owns its own channels, echoes and counters. No native
 * thread IDs are shared between workers. GetModuleChannel accepts an explicit
 * facility because ES modules have no linker-provided g_moduleName; plain
 * CCP_LOG variants use carbon-core/Main, and callers in other facilities use
 * the _CH variants with their own channel. All levels are enabled.
 *
 * Adapted: printf handles strings (%s/%S), decimal/unsigned/hex/octal integers,
 * fixed-point numbers (%f/%F), characters (%c), and literal %%. Width, precision
 * and -, +, space, 0, # flags are supported; integer h/hh/l/ll/z/t/I64 modifiers
 * use hh=8, h=16, l/default=32 and ll/z/t/I64=64 bits (Windows long width). Native pointers, %n and other conversions
 * have no implementation here and throw TypeError instead of reading memory.
 * Strings use UTF-8 with complete-code-point truncation at Carbon's 65534-byte
 * message and 255-byte last-error limits. Float formatting follows JavaScript's
 * toFixed rounding, not a claim of C-library bit-for-bit printf parity.
 *
 * @example
 * import { CcpLog } from "@carbonenginejs/runtime/global";
 * CcpLog.UnregisterLogEcho(CcpLog.LogToDebugger);
 * CcpLog.RegisterLogEcho((channel, type, userData, message) =>
 * {
 *     host.writeLog(channel.facility, channel.object, type, message);
 * });
 * const channel = CcpLog.GetModuleChannel("trinity");
 * CcpLog.CCP_LOGERR_CH(channel, "Could not load %s", "res:/example.red");
 */
import { LogType, LogEchoPrivilege } from "../consts/ccpLog.js";
import { CcpLogChannel_t } from "./CcpLogChannel_t.js";

export { LogType, LogEchoPrivilege, CcpLogChannel_t };

/**
 * @callback LogEchoFunc
 * @param {CcpLogChannel_t} channel Caller-owned channel record.
 * @param {number} type LogType severity.
 * @param {number} userData Caller data, zero for the macro equivalents.
 * @param {string} message Formatted message.
 * @returns {void}
 */

const echoes = Array.from({ length: 4 }, () => []);
const counters = new Uint32Array(4);
const privileged = [ false, false, false, false ];
const moduleChannels = new Map();
const defaultChannel = new CcpLogChannel_t();
let lastError = "";

/**
 * Creates a channel with Carbon's macro defaults.
 * @param {string} desc Channel description.
 * @param {string} [facility="carbon-core"] Adapted explicit g_moduleName.
 * @returns {CcpLogChannel_t} New mutable channel record.
 */
export function CCP_LOG_DEFINE_CHANNEL(desc, facility = "carbon-core")
{
    return new CcpLogChannel_t(facility, desc);
}

/**
 * Returns the stable Main channel for a module.
 * @param {string} [facility="carbon-core"] Adapted explicit g_moduleName.
 * @returns {CcpLogChannel_t} Shared record for this facility within this realm.
 */
export function GetModuleChannel(facility = "carbon-core")
{
    if (!moduleChannels.has(facility)) moduleChannels.set(facility, CCP_LOG_DEFINE_CHANNEL("Main", facility));
    return moduleChannels.get(facility);
}

/**
 * Adds an echo for threshold and every higher severity, replacing duplicates.
 * Adapted: each realm dispatches synchronously on its own thread, so the native
 * isThreadSafe argument needs no cross-thread gate. Hosts must register worker
 * sinks inside each worker. Registration during dispatch affects the next call.
 * @param {LogEchoFunc} cb Host sink.
 * @param {number} [threshold=LogType.LOGTYPE_INFO] Minimum LogType severity.
 * @param {boolean} [isThreadSafe=false] Retained native argument; realm-local.
 * @param {number} [privilege=LogEchoPrivilege.LOG_ECHO_NO_PRIVILEGE_CHECK] Privilege policy.
 * @returns {void}
 * @throws {TypeError|RangeError} If callback, threshold or privilege is invalid.
 */
export function RegisterLogEcho(cb, threshold = LogType.LOGTYPE_INFO, isThreadSafe = false, privilege = LogEchoPrivilege.LOG_ECHO_NO_PRIVILEGE_CHECK)
{
    if (typeof cb !== "function") throw new TypeError("Log echo must be a function");
    checkType(threshold);
    if (privilege !== 0 && privilege !== 1) throw new RangeError("Invalid LogEchoPrivilege");
    UnregisterLogEcho(cb);
    const entry = { func: cb, privilege, isThreadSafe };
    for (let type = threshold; type < LogType.LOGTYPE_COUNT; ++type) echoes[type].push(entry);
}

/**
 * Removes an echo from every level using Carbon's swap-with-last removal order.
 * @param {LogEchoFunc} cb Sink to remove; absence is a no-op.
 * @returns {void}
 */
export function UnregisterLogEcho(cb)
{
    for (const list of echoes)
    {
        const index = list.findIndex(entry => entry.func === cb);
        if (index !== -1)
        {
            list[index] = list[list.length - 1];
            list.pop();
        }
    }
}

/**
 * Tests for an echo at a severity, regardless of privilege filtering.
 * @param {number} [threshold=LogType.LOGTYPE_INFO] Severity to inspect.
 * @returns {boolean} Whether at least one echo is registered at this level.
 */
export function IsLogging(threshold = LogType.LOGTYPE_INFO)
{
    checkType(threshold);
    return echoes[threshold].length !== 0;
}

/**
 * Reads Carbon's wrapping uint32 message count for a severity.
 * Adapted: returns a number rather than exposing a mutable C++ reference.
 * @param {number} type LogType severity.
 * @returns {number} Count, including messages suppressed by missing sinks.
 */
export function GetLogCounter(type)
{
    checkType(type);
    return counters[type];
}

/**
 * Establishes the logging thread in Carbon; each JS realm already owns its state.
 * Adapted: workers must register their own echoes; no OS thread API is used.
 * @returns {void}
 */
export function SetLogMainThreadId()
{
    // JavaScript execution within this module's realm is already serialized.
}

/**
 * Returns the last error even when no sink accepted it.
 * @returns {string} UTF-8-bounded error text, initially empty.
 */
export function GetLastErrorMessage()
{
    return lastError;
}

/**
 * Writes a formatted message to carbon-core/Main.
 * @param {number} type LogType severity.
 * @param {number} userData Host-defined data.
 * @param {string|null} format Printf format; null is ignored.
 * @param {...*} args Format arguments.
 * @returns {void}
 */
export function LogFunc(type, userData, format, ...args)
{
    LogFunc_v(type, userData, format, args);
}

/**
 * Array-argument equivalent of LogFunc (adapted from native va_list).
 * @param {number} type LogType severity.
 * @param {number} userData Host-defined data.
 * @param {string|null} format Printf format.
 * @param {Array<*>} args Format arguments.
 * @returns {void}
 */
export function LogFunc_v(type, userData, format, args)
{
    LogFuncChannel_v(defaultChannel, type, userData, format, args);
}

/**
 * Writes a formatted message to a caller-owned channel.
 * @param {CcpLogChannel_t} logObject Channel passed unchanged to echoes.
 * @param {number} type LogType severity.
 * @param {number} userData Host-defined data.
 * @param {string|null} format Printf format; null is ignored.
 * @param {...*} args Format arguments.
 * @returns {void}
 */
export function LogFuncChannel(logObject, type, userData, format, ...args)
{
    LogFuncChannel_v(logObject, type, userData, format, args);
}

/**
 * Formats, counts and dispatches a message (adapted va_list array).
 * Errors are stored after echoes run, following Carbon's ordering.
 * @param {CcpLogChannel_t} logObject Caller-owned channel.
 * @param {number} type LogType severity.
 * @param {number} userData Host-defined data.
 * @param {string|null} format Printf format; null/undefined produces no count.
 * @param {Array<*>} args Format arguments.
 * @returns {void}
 * @throws {TypeError|RangeError} On unsupported formats or invalid severity/arguments.
 */
export function LogFuncChannel_v(logObject, type, userData, format, args)
{
    if (format == null) return;
    checkType(type);
    counters[type]++;
    if (type !== LogType.LOGTYPE_ERR && echoes[type].length === 0) return;
    const message = truncateUtf8(formatMessage(format, args), 65534);
    // Adapted: snapshotting defines callback mutation behavior; C++ iterator
    // invalidation during registration/removal has no portable semantics.
    for (const entry of echoes[type].slice())
    {
        if (entry.privilege === LogEchoPrivilege.LOG_ECHO_REQUIRES_PRIVILEGE_CHECK && privileged[type]) continue;
        entry.func(logObject, type, userData, message);
    }
    if (type === LogType.LOGTYPE_ERR) lastError = truncateUtf8(message, 255);
}

/**
 * Carbon's debugger echo, adapted to browser/host console without OS bindings.
 * @param {CcpLogChannel_t} logObject Channel included in the console prefix.
 * @param {number} type LogType severity (notice maps to console.info).
 * @param {number} userData Unused native callback argument.
 * @param {string} message Already formatted text.
 * @returns {void}
 */
export function LogToDebugger(logObject, type, userData, message)
{
    const method = [ "info", "info", "warn", "error" ][type];
    const label = [ "I", "N", "W", "E" ][type];
    globalThis.console[method](`[${label}] ${logObject.facility}/${logObject.object}:${message}`);
}

/**
 * Logs an error and a warning, then throws a JavaScript Error.
 * @param {string} message Error text.
 * @returns {never}
 */
export function Throw(message)
{
    CCP_LOGERR("%s", message);
    CCP_LOGWARN("Exception thrown");
    throw new Error(message);
}

/**
 * Logs a warning and throws the retained error text.
 * @returns {never}
 */
export function ThrowLastError()
{
    CCP_LOGWARN("Exception thrown");
    throw new Error(GetLastErrorMessage());
}

/**
 * Validates a severity before indexing the native-sized tables.
 * @param {number} type LogType severity.
 * @returns {void}
 */
function checkType(type)
{
    if (!Number.isInteger(type) || type < 0 || type >= LogType.LOGTYPE_COUNT) throw new RangeError("Invalid LogType");
}

/**
 * Truncates text without leaving an incomplete UTF-8 code point.
 * @param {string} text Input.
 * @param {number} limit Byte limit.
 * @returns {string} Complete UTF-8 prefix.
 */
function truncateUtf8(text, limit)
{
    const bytes = new TextEncoder().encode(text);
    if (bytes.length <= limit) return text;
    return new TextDecoder().decode(bytes.subarray(0, limit), { stream: true });
}

/**
 * Formats the portable printf subset described in the module documentation.
 * @param {string} format Format text.
 * @param {Array<*>} args Arguments, consumed once without recursive formatting.
 * @returns {string} Formatted text.
 */
function formatMessage(format, args)
{
    let cursor = 0;
    const source = String(format).split("\0", 1)[0];
    return source.replace(/%(%|([-+ #0]*)(\d*)(?:\.(\d+))?(hh|ll|I64|[hlzt])?([a-zA-Z]))|%/g, (token, literal, flags = "", widthText = "", precisionText, length, conversion) =>
    {
        if (literal === "%") return "%";
        if (!conversion || !"sSdiuxXofFc".includes(conversion)) throw new TypeError(`Unsupported CcpLog format: ${token}`);
        if (cursor >= args.length) throw new TypeError(`Missing CcpLog argument for ${token}`);
        const value = args[cursor++];
        const width = Number(widthText || 0);
        const precision = precisionText === undefined ? undefined : Number(precisionText);
        if (width > 65534 || precision > 65534) throw new RangeError("CcpLog format width/precision exceeds buffer size");
        let text;
        let prefix = "";
        const numeric = "diuxXofF".includes(conversion);
        if (conversion === "s" || conversion === "S")
        {
            text = value == null ? "(null)" : String(value).split("\0", 1)[0];
            if (precision !== undefined) text = truncateUtf8(text, precision);
        }
        else if (conversion === "c") text = String.fromCharCode(Number(value));
        else if (conversion === "f" || conversion === "F")
        {
            const number = Number(value);
            if (precision > 100) throw new RangeError("CcpLog floating precision must not exceed 100");
            prefix = number < 0 || Object.is(number, -0) ? "-" : flags.includes("+") ? "+" : flags.includes(" ") ? " " : "";
            text = Math.abs(number).toFixed(precision ?? 6);
            if (flags.includes("#") && precision === 0 && Number.isFinite(number)) text += ".";
        }
        else
        {
            const bits = length === "hh" ? 8 : length === "h" ? 16 : [ "ll", "I64", "z", "t" ].includes(length) ? 64 : 32;
            const raw = typeof value === "bigint" ? value : BigInt(Math.trunc(Number(value)));
            const signed = conversion === "d" || conversion === "i";
            const number = signed ? BigInt.asIntN(bits, raw) : BigInt.asUintN(bits, raw);
            const base = "xX".includes(conversion) ? 16 : conversion === "o" ? 8 : 10;
            const magnitude = number < 0n ? -number : number;
            prefix = number < 0n ? "-" : signed && flags.includes("+") ? "+" : signed && flags.includes(" ") ? " " : "";
            text = magnitude === 0n && precision === 0 ? "" : magnitude.toString(base);
            if (precision !== undefined) text = text.padStart(precision, "0");
            if (flags.includes("#"))
            {
                if (base === 16 && magnitude !== 0n) prefix += "0x";
                if (base === 8 && !text.startsWith("0")) prefix += "0";
            }
            if (conversion === "X")
            {
                prefix = prefix.toUpperCase();
                text = text.toUpperCase();
            }
        }
        const padding = Math.max(0, width - prefix.length - text.length);
        if (flags.includes("-")) return prefix + text + " ".repeat(padding);
        if (numeric && flags.includes("0") && (precision === undefined || "fF".includes(conversion))) return prefix + "0".repeat(padding) + text;
        return " ".repeat(padding) + prefix + text;
    });
}

/**
 * Carbon's CCP_LOG macro as a JavaScript function.
 * @param {string|null} format Printf format; null is ignored.
 * @param {...*} args Format arguments.
 * @returns {void}
 */
export function CCP_LOG(format, ...args)
{
    LogFuncChannel_v(GetModuleChannel(), LogType.LOGTYPE_INFO, 0, format, args);
}

/**
 * Carbon's CCP_LOG_CH macro as a JavaScript function.
 * @param {CcpLogChannel_t} logObject Caller-owned channel.
 * @param {string|null} format Printf format; null is ignored.
 * @param {...*} args Format arguments.
 * @returns {void}
 */
export function CCP_LOG_CH(logObject, format, ...args)
{
    LogFuncChannel_v(logObject, LogType.LOGTYPE_INFO, 0, format, args);
}

/**
 * Carbon's CCP_LOGNOTICE macro as a JavaScript function.
 * @param {string|null} format Printf format; null is ignored.
 * @param {...*} args Format arguments.
 * @returns {void}
 */
export function CCP_LOGNOTICE(format, ...args)
{
    LogFuncChannel_v(GetModuleChannel(), LogType.LOGTYPE_NOTICE, 0, format, args);
}

/**
 * Carbon's CCP_LOGNOTICE_CH macro as a JavaScript function.
 * @param {CcpLogChannel_t} logObject Caller-owned channel.
 * @param {string|null} format Printf format; null is ignored.
 * @param {...*} args Format arguments.
 * @returns {void}
 */
export function CCP_LOGNOTICE_CH(logObject, format, ...args)
{
    LogFuncChannel_v(logObject, LogType.LOGTYPE_NOTICE, 0, format, args);
}

/**
 * Carbon's CCP_LOGWARN macro as a JavaScript function.
 * @param {string|null} format Printf format; null is ignored.
 * @param {...*} args Format arguments.
 * @returns {void}
 */
export function CCP_LOGWARN(format, ...args)
{
    LogFuncChannel_v(GetModuleChannel(), LogType.LOGTYPE_WARN, 0, format, args);
}

/**
 * Carbon's CCP_LOGWARN_CH macro as a JavaScript function.
 * @param {CcpLogChannel_t} logObject Caller-owned channel.
 * @param {string|null} format Printf format; null is ignored.
 * @param {...*} args Format arguments.
 * @returns {void}
 */
export function CCP_LOGWARN_CH(logObject, format, ...args)
{
    LogFuncChannel_v(logObject, LogType.LOGTYPE_WARN, 0, format, args);
}

/**
 * Carbon's CCP_LOGERR macro as a JavaScript function.
 * @param {string|null} format Printf format; null is ignored.
 * @param {...*} args Format arguments.
 * @returns {void}
 */
export function CCP_LOGERR(format, ...args)
{
    LogFuncChannel_v(GetModuleChannel(), LogType.LOGTYPE_ERR, 0, format, args);
}

/**
 * Carbon's CCP_LOGERR_CH macro as a JavaScript function.
 * @param {CcpLogChannel_t} logObject Caller-owned channel.
 * @param {string|null} format Printf format; null is ignored.
 * @param {...*} args Format arguments.
 * @returns {void}
 */
export function CCP_LOGERR_CH(logObject, format, ...args)
{
    LogFuncChannel_v(logObject, LogType.LOGTYPE_ERR, 0, format, args);
}

/**
 * Sets whether info messages bypass echoes requiring privilege checks.
 * @param {boolean} value New privileged-only flag.
 * @returns {boolean} Previous flag.
 */
export function SetLogtypeInfoIsPrivileged(value)
{
    const previous = privileged[LogType.LOGTYPE_INFO];
    privileged[LogType.LOGTYPE_INFO] = Boolean(value);
    return previous;
}

/**
 * Sets whether notice messages bypass echoes requiring privilege checks.
 * @param {boolean} value New privileged-only flag.
 * @returns {boolean} Previous flag.
 */
export function SetLogtypeNoticeIsPrivileged(value)
{
    const previous = privileged[LogType.LOGTYPE_NOTICE];
    privileged[LogType.LOGTYPE_NOTICE] = Boolean(value);
    return previous;
}

/**
 * Sets whether warn messages bypass echoes requiring privilege checks.
 * @param {boolean} value New privileged-only flag.
 * @returns {boolean} Previous flag.
 */
export function SetLogtypeWarnIsPrivileged(value)
{
    const previous = privileged[LogType.LOGTYPE_WARN];
    privileged[LogType.LOGTYPE_WARN] = Boolean(value);
    return previous;
}

/**
 * Sets whether err messages bypass echoes requiring privilege checks.
 * @param {boolean} value New privileged-only flag.
 * @returns {boolean} Previous flag.
 */
export function SetLogtypeErrIsPrivileged(value)
{
    const previous = privileged[LogType.LOGTYPE_ERR];
    privileged[LogType.LOGTYPE_ERR] = Boolean(value);
    return previous;
}

// Adapted: the operator-requested console default is a removable native echo.
RegisterLogEcho(LogToDebugger);
