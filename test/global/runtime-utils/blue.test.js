import assert from "node:assert/strict";
import test from "node:test";
import { CjsScriptCallback } from "@carbonenginejs/runtime/blue";

test("an unset script callback is invalid and safe to invoke", () =>
{
    // Carbon's default-constructed BlueScriptCallback holds no callable and
    // returns CALL_ERROR rather than failing (BlueScriptCallback.cpp:282-287),
    // so a caller never has to test for absence first.
    const callback = new CjsScriptCallback();

    assert.equal(callback.IsValid(), false);
    assert.equal(callback.Call(1, 2), undefined);
    assert.equal(callback.CallVoid(1, 2), undefined);
});

test("Destroy releases the callback and leaves it invalid", () =>
{
    const callback = CjsScriptCallback.from(() => "result");

    assert.equal(callback.IsValid(), true);
    assert.equal(callback.Call(), "result");

    callback.Destroy();

    assert.equal(callback.IsValid(), false);
    assert.equal(callback.Call(), undefined);
});

test("script callbacks adapt external values once to one nominal identity", () =>
{
    const calls = [];
    const fromFunction = CjsScriptCallback.from((...args) =>
    {
        calls.push(args);
        return "function-result";
    });

    assert.ok(fromFunction instanceof CjsScriptCallback);
    assert.equal(fromFunction.Call(1), "function-result");
    assert.equal(fromFunction.CallVoid(2), undefined);

    const external = {
        Call(...args)
        {
            calls.push([ "Call", ...args ]);
            return "external-result";
        },
        CallVoid(...args)
        {
            calls.push([ "CallVoid", ...args ]);
        }
    };
    const adapted = CjsScriptCallback.from(external);

    assert.ok(adapted instanceof CjsScriptCallback);
    assert.equal(adapted.Call(3), "external-result");
    assert.equal(adapted.CallVoid(4), undefined);
    assert.equal(CjsScriptCallback.from(adapted), adapted);
    assert.equal(CjsScriptCallback.from(null), null);
    assert.throws(() => CjsScriptCallback.from({ Call() {} }), /Call and CallVoid/u);
    assert.deepEqual(calls, [
        [ 1 ],
        [ 2 ],
        [ "Call", 3 ],
        [ "CallVoid", 4 ]
    ]);
});
