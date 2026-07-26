import assert from "node:assert/strict";
import test from "node:test";

import {
    CJS_OPERATION_CANCELLED,
    CjsCancellationError,
    CjsError
} from "@carbonenginejs/runtime-utils/errors";

test("CjsError preserves stable operational identity and detached safe details", () =>
{
    const
        cause = new Error("provider rejected the request"),
        sourceDetails = {
            mediaId: "1234",
            provider: {
                name: "fixture",
                attempts: [ 1, 2 ]
            }
        },
        error = new CjsError(
            "CJS_AUDIO_MEDIA_UNAVAILABLE",
            "Audio media 1234 is unavailable.",
            {
                cause,
                details: sourceDetails
            }
        );

    assert.equal(error.name, "CjsError");
    assert.equal(error.message, "Audio media 1234 is unavailable.");
    assert.equal(error.code, "CJS_AUDIO_MEDIA_UNAVAILABLE");
    assert.equal(error.cause, cause);
    assert.deepEqual(error.details, sourceDetails);
    assert.notEqual(error.details, sourceDetails);
    assert.notEqual(error.details.provider, sourceDetails.provider);
    assert.equal(Object.isFrozen(error.details), true);
    assert.equal(Object.isFrozen(error.details.provider), true);
    assert.equal(Object.isFrozen(error.details.provider.attempts), true);
    assert.equal(CjsError.hasCode(error, "CJS_AUDIO_MEDIA_UNAVAILABLE"), true);
    assert.equal(CjsError.hasCode(error, "CJS_AUDIO_MEDIA_MISSING"), false);
    assert.throws(() =>
    {
        error.code = "CJS_AUDIO_MEDIA_MISSING";
    }, TypeError);
    assert.throws(() =>
    {
        error.details.mediaId = "5678";
    }, TypeError);

    sourceDetails.provider.attempts.push(3);
    assert.deepEqual(error.details.provider.attempts, [ 1, 2 ]);
});

test("CjsError supports gradual adoption from legacy coded errors", () =>
{
    const
        plain = new CjsError("CJS_OPERATION_FAILED", "The operation failed."),
        legacy = new Error("legacy");

    legacy.code = "CJS_RESOURCE_NOT_FOUND";

    assert.equal(plain.details, null);
    assert.equal(Object.hasOwn(plain, "cause"), false);
    assert.equal(CjsError.hasCode(legacy, "CJS_RESOURCE_NOT_FOUND"), true);
    assert.equal(CjsError.hasCode(legacy, "resource_not_found"), false);
    assert.equal(CjsError.hasCode(null, "CJS_RESOURCE_NOT_FOUND"), false);
    assert.equal(CjsError.hasCode({
        get code()
        {
            throw new Error("inaccessible");
        }
    }, "CJS_RESOURCE_NOT_FOUND"), false);
});

test("CjsError rejects malformed contract values with native TypeError", () =>
{
    assert.throws(
        () => new CjsError("audio_missing", "Missing."),
        TypeError
    );
    assert.throws(
        () => new CjsError("CJS_AUDIO_MISSING", ""),
        TypeError
    );
    assert.throws(
        () => new CjsError("CJS_AUDIO_MISSING", "Missing.", []),
        TypeError
    );
    assert.throws(
        () => new CjsError("CJS_AUDIO_MISSING", "Missing.", {
            details: { value: Number.NaN }
        }),
        TypeError
    );
    assert.throws(
        () => new CjsError("CJS_AUDIO_MISSING", "Missing.", {
            details: { callback() {} }
        }),
        TypeError
    );

    const details = {};
    details.self = details;

    assert.throws(
        () => new CjsError("CJS_AUDIO_MISSING", "Missing.", { details }),
        TypeError
    );
});

test("CjsCancellationError uses stable and platform-compatible cancellation identity", () =>
{
    const
        cause = new Error("request signal aborted"),
        error = new CjsCancellationError(undefined, {
            cause,
            details: { mediaId: "1234" }
        });

    assert.ok(error instanceof Error);
    assert.ok(error instanceof CjsError);
    assert.ok(error instanceof CjsCancellationError);
    assert.equal(error.name, "AbortError");
    assert.equal(error.code, CJS_OPERATION_CANCELLED);
    assert.equal(error.message, "The operation was cancelled.");
    assert.equal(error.cause, cause);
    assert.deepEqual(error.details, { mediaId: "1234" });
    assert.equal(CjsCancellationError.is(error), true);
    assert.equal(CjsCancellationError.is({ name: "AbortError" }), true);
    assert.equal(CjsCancellationError.is({ code: CJS_OPERATION_CANCELLED }), true);
    assert.equal(CjsCancellationError.is(new Error("other")), false);
});

test("errors are available from the common root without environment initialization", async () =>
{
    const root = await import("@carbonenginejs/runtime-utils");

    assert.equal(root.CjsError, CjsError);
    assert.equal(root.CjsCancellationError, CjsCancellationError);
    assert.equal(root.errors.CJS_OPERATION_CANCELLED, CJS_OPERATION_CANCELLED);
});
