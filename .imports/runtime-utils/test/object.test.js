import assert from "node:assert/strict";
import test from "node:test";

import { hasOwnThen } from "../src/object.js";

test("hasOwnThen invokes only explicitly provided option handlers", () =>
{
    const inherited = { ignored: true };
    const options = Object.assign(Object.create(inherited), {
        paths: { res: "https://example.invalid/" },
        enabled: false
    });
    const calls = [];
    const count = hasOwnThen(options, {
        paths: (value, source, property) => calls.push([ property, value, source ]),
        enabled: value => calls.push([ "enabled", value ]),
        ignored: () => calls.push([ "ignored" ])
    });

    assert.equal(count, 2);
    assert.equal(calls[0][0], "paths");
    assert.equal(calls[0][1], options.paths);
    assert.equal(calls[0][2], options);
    assert.deepEqual(calls[1], [ "enabled", false ]);
});

test("hasOwnThen can bind class method handlers to a context", () =>
{
    const context = {
        values: [],
        SetValue(value)
        {
            this.values.push(value);
        }
    };

    assert.equal(
        hasOwnThen({ value: 7 }, { value: context.SetValue }, context),
        1
    );
    assert.deepEqual(context.values, [ 7 ]);
});
