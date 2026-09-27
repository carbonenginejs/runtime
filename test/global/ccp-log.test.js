import test from "node:test";
import assert from "node:assert/strict";
import * as Log from "../../src/global/logging/ccpLog.js";

// This new module is plain ESM, so these tests can run without touching the
// shared npm/dist build. Package-build validation is a separate coordinated step.
const { LogType: T, LogEchoPrivilege: P } = Log;

test("Carbon names, enum values and channel defaults", () =>
{
    assert.deepEqual(Object.values(T), [0, 1, 2, 3, 4, 0, 3]);
    assert.deepEqual(Object.values(P), [0, 1]);
    assert.equal(Log.IsLogging(), true);
    const channel = Log.CCP_LOG_DEFINE_CHANNEL("TexturePipeline", "trinity");
    assert.deepEqual({ ...channel }, { oktocall: 1, facility: "trinity", object: "TexturePipeline", channel: 0, source: 0 });
    assert.equal(Log.GetModuleChannel("trinity"), Log.GetModuleChannel("trinity"));
    assert.notEqual(Log.GetModuleChannel("trinity"), Log.GetModuleChannel("blue"));
});

test("console default routes levels and can be replaced by a host sink", t =>
{
    const calls = [];
    for (const method of ["info", "warn", "error"]) t.mock.method(console, method, message => calls.push([method, message]));
    Log.CCP_LOG("info");
    Log.CCP_LOGNOTICE("notice");
    Log.CCP_LOGWARN("warn");
    Log.CCP_LOGERR("error");
    assert.deepEqual(calls.map(call => call[0]), ["info", "info", "warn", "error"]);
    assert.equal(calls[3][1], "[E] carbon-core/Main:error");
    Log.UnregisterLogEcho(Log.LogToDebugger);
    const received = [];
    const sink = (...args) => received.push(args);
    Log.RegisterLogEcho(sink);
    try
    {
        Log.CCP_LOGWARN("host %s", "only");
        assert.equal(calls.length, 4);
        assert.equal(received[0][3], "host only");
    }
    finally
    {
        Log.UnregisterLogEcho(sink);
        Log.RegisterLogEcho(Log.LogToDebugger);
    }
});

test("all macros preserve severity, channel identity and zero userData", () =>
{
    Log.UnregisterLogEcho(Log.LogToDebugger);
    const records = [];
    const sink = (...args) => records.push(args);
    Log.RegisterLogEcho(sink);
    try
    {
        const channel = Log.CCP_LOG_DEFINE_CHANNEL("Animation", "trinity");
        channel.oktocall = 0; // Native dispatcher does not use this field as a gate.
        for (const [level, name] of ["CCP_LOG", "CCP_LOGNOTICE", "CCP_LOGWARN", "CCP_LOGERR"].entries())
        {
            Log[name]("level %d", level);
            Log[name + "_CH"](channel, "channel %s", name);
            assert.equal(records[level * 2][0], Log.GetModuleChannel());
            assert.equal(records[level * 2 + 1][0], channel);
            assert.deepEqual(records[level * 2 + 1].slice(1), [level, 0, "channel " + name]);
        }
        Log.LogFuncChannel(channel, T.LOGTYPE_NOTICE, 73, "%S", "unicode 🛰");
        assert.deepEqual(records.at(-1), [channel, T.LOGTYPE_NOTICE, 73, "unicode 🛰"]);
    }
    finally
    {
        Log.UnregisterLogEcho(sink);
        Log.RegisterLogEcho(Log.LogToDebugger);
    }
});

test("thresholds, duplicate registration and native swap removal order", () =>
{
    Log.UnregisterLogEcho(Log.LogToDebugger);
    const calls = [];
    const a = () => calls.push("a");
    const b = () => calls.push("b");
    const c = () => calls.push("c");
    try
    {
        Log.RegisterLogEcho(a);
        Log.RegisterLogEcho(b);
        Log.RegisterLogEcho(c);
        Log.UnregisterLogEcho(a);
        Log.CCP_LOG("order");
        assert.deepEqual(calls, ["c", "b"]);
        calls.length = 0;
        Log.RegisterLogEcho(b, T.LOGTYPE_WARN);
        Log.RegisterLogEcho(b, T.LOGTYPE_WARN);
        Log.UnregisterLogEcho(c);
        assert.equal(Log.IsLogging(), false);
        assert.equal(Log.IsLogging(T.LOGTYPE_WARN), true);
        Log.CCP_LOGNOTICE("ignored");
        Log.CCP_LOGWARN("warning");
        Log.CCP_LOGERR("error");
        assert.deepEqual(calls, ["b", "b"]);
    }
    finally
    {
        for (const sink of [a, b, c]) Log.UnregisterLogEcho(sink);
        Log.RegisterLogEcho(Log.LogToDebugger);
    }
});

test("privilege policy filters each level and setters return the old flags", () =>
{
    Log.UnregisterLogEcho(Log.LogToDebugger);
    const checked = [];
    const unchecked = [];
    const a = (channel, type) => checked.push(type);
    const b = (channel, type) => unchecked.push(type);
    Log.RegisterLogEcho(a, T.LOGTYPE_INFO, false, P.LOG_ECHO_REQUIRES_PRIVILEGE_CHECK);
    Log.RegisterLogEcho(b);
    const setters = ["Info", "Notice", "Warn", "Err"].map(name => Log["SetLogtype" + name + "IsPrivileged"]);
    try
    {
        for (const [type, setter] of setters.entries())
        {
            assert.equal(setter(true), false);
            assert.equal(Log.IsLogging(type), true);
            Log.LogFunc(type, 0, "filtered");
            assert.equal(setter(false), true);
            Log.LogFunc(type, 0, "visible");
        }
        assert.deepEqual(checked, [0, 1, 2, 3]);
        assert.deepEqual(unchecked, [0, 0, 1, 1, 2, 2, 3, 3]);
    }
    finally
    {
        for (const setter of setters) setter(false);
        Log.UnregisterLogEcho(a);
        Log.UnregisterLogEcho(b);
        Log.RegisterLogEcho(Log.LogToDebugger);
    }
});

test("counts include suppressed output, null is ignored and errors survive without sinks", () =>
{
    Log.UnregisterLogEcho(Log.LogToDebugger);
    try
    {
        const count = Log.GetLogCounter(T.LOGTYPE_INFO);
        Log.CCP_LOG(null);
        assert.equal(Log.GetLogCounter(T.LOGTYPE_INFO), count);
        Log.CCP_LOG("");
        Log.CCP_LOG("suppressed");
        assert.equal(Log.GetLogCounter(T.LOGTYPE_INFO), count + 2);
        Log.CCP_LOGERR("last %d", 7);
        assert.equal(Log.GetLastErrorMessage(), "last 7");
        assert.throws(() => Log.ThrowLastError(), /last 7/);
        assert.throws(() => Log.Throw("explicit"), /explicit/);
        assert.equal(Log.GetLastErrorMessage(), "explicit");
    }
    finally
    {
        Log.RegisterLogEcho(Log.LogToDebugger);
    }
});

test("portable printf formats arguments once and preserves native integer widths", () =>
{
    Log.UnregisterLogEcho(Log.LogToDebugger);
    const messages = [];
    const sink = (channel, type, data, message) => messages.push(message);
    Log.RegisterLogEcho(sink);
    try
    {
        Log.CCP_LOG("%%s %s %S %d %u %#08X %.2f %c", "%d", "雪", -7, -1, 255, 1.25, 65);
        assert.equal(messages.at(-1), "%s %d 雪 -7 4294967295 0X0000FF 1.25 A");
        Log.CCP_LOG("%hhd %hu %llu %I64X", 255, -1, 18446744073709551615n, -1n);
        assert.equal(messages.at(-1), "-1 65535 18446744073709551615 FFFFFFFFFFFFFFFF");
        Log.LogFunc_v(T.LOGTYPE_INFO, 0, "%-4s|%+05d|%.0d|%#.0o", ["x", 3, 0, 0]);
        assert.equal(messages.at(-1), "x   |+0003||0");
        assert.throws(() => Log.CCP_LOG("%p", 12), /Unsupported/);
        assert.throws(() => Log.CCP_LOG("%s"), /Missing/);
        assert.throws(() => Log.CCP_LOG("%"), /Unsupported/);
    }
    finally
    {
        Log.UnregisterLogEcho(sink);
        Log.RegisterLogEcho(Log.LogToDebugger);
    }
});

test("message and last-error limits retain whole UTF-8 code points", () =>
{
    Log.UnregisterLogEcho(Log.LogToDebugger);
    let received;
    const sink = (channel, type, data, message) =>
    {
        received = message;
    };
    Log.RegisterLogEcho(sink);
    try
    {
        Log.CCP_LOGERR("%s", "雪".repeat(30000));
        assert.equal(new TextEncoder().encode(received).length, 65532);
        assert.equal(Log.GetLastErrorMessage(), "雪".repeat(85));
        Log.CCP_LOGERR("%s", "a".repeat(254) + "🛰");
        assert.equal(Log.GetLastErrorMessage(), "a".repeat(254));
    }
    finally
    {
        Log.UnregisterLogEcho(sink);
        Log.RegisterLogEcho(Log.LogToDebugger);
    }
});

test("echo mutations apply next dispatch and error retention follows callbacks", () =>
{
    Log.UnregisterLogEcho(Log.LogToDebugger);
    const order = [];
    const later = () => order.push("later");
    const removed = () => order.push("removed");
    const first = () =>
    {
        order.push("first");
        Log.UnregisterLogEcho(removed);
        Log.RegisterLogEcho(later);
    };
    try
    {
        Log.RegisterLogEcho(first);
        Log.RegisterLogEcho(removed);
        Log.CCP_LOG("first dispatch");
        assert.deepEqual(order, ["first", "removed"]);
        order.length = 0;
        Log.CCP_LOG("second dispatch");
        assert.deepEqual(order, ["first", "later"]);
        Log.UnregisterLogEcho(first);
        Log.UnregisterLogEcho(later);
        Log.CCP_LOGERR("previous error");
        let observed;
        const observe = () =>
        {
            observed = Log.GetLastErrorMessage();
        };
        Log.RegisterLogEcho(observe);
        try
        {
            Log.CCP_LOGERR("new error");
            assert.equal(observed, "previous error");
            assert.equal(Log.GetLastErrorMessage(), "new error");
        }
        finally
        {
            Log.UnregisterLogEcho(observe);
        }
    }
    finally
    {
        for (const sink of [first, removed, later]) Log.UnregisterLogEcho(sink);
        Log.RegisterLogEcho(Log.LogToDebugger);
    }
});

test("sink failures propagate without replacing the retained error", () =>
{
    Log.UnregisterLogEcho(Log.LogToDebugger);
    const failure = new Error("host sink failed");
    const sink = () =>
    {
        throw failure;
    };
    try
    {
        Log.CCP_LOGERR("retained");
        Log.RegisterLogEcho(sink);
        assert.throws(() => Log.CCP_LOGERR("not retained"), error => error === failure);
        assert.equal(Log.GetLastErrorMessage(), "retained");
        assert.throws(() => Log.RegisterLogEcho(sink, T.LOGTYPE_COUNT), RangeError);
        assert.throws(() => Log.RegisterLogEcho(null), TypeError);
        assert.throws(() => Log.RegisterLogEcho(sink, 0, false, 42), RangeError);
    }
    finally
    {
        Log.UnregisterLogEcho(sink);
        Log.RegisterLogEcho(Log.LogToDebugger);
    }
});
