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

    // Carbon's copy constructor: the copy holds the same callable, and
    // destroying it leaves the original valid.
    const copied = new CjsScriptCallback(fromFunction);

    assert.equal(copied.Call(3), "function-result");
    copied.Destroy();
    assert.equal(fromFunction.IsValid(), true);
    assert.equal(CjsScriptCallback.from(fromFunction), fromFunction);
    assert.equal(CjsScriptCallback.from(null), null);
    // Carbon's script callback holds one kind of callable; a callback-shaped
    // object is not one.
    assert.throws(() => CjsScriptCallback.from({ Call() {}, CallVoid() {} }), /function or a CjsScriptCallback/u);
    assert.deepEqual(calls, [
        [ 1 ],
        [ 2 ],
        [ 3 ]
    ]);
});
