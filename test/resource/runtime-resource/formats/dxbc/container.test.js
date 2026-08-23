import test from "node:test";
import assert from "node:assert/strict";

import { CjsDxbcFormat } from "../../../../../src/resource/formats/dxbc/index.js";
import { DxbcContainer } from "../../../../../src/resource/formats/dxbc/core/container.js";
import { buildContainer, buildMinimalVertexDxbc } from "./synthetic.js";

test("DxbcContainer reads a synthetic chunk directory", () =>
{
    const bytes = buildContainer([
        { fourCC: "SHEX", payload: new Uint8Array(8) },
        { fourCC: "ISGN", payload: new Uint8Array(12) }
    ]);
    const container = new DxbcContainer().Read(bytes, { source: "synthetic" });

    assert.equal(container.version, 1);
    assert.equal(container.totalSize, bytes.length);
    assert.equal(container.chunks.length, 2);
    assert.equal(container.chunks[0].fourCC, "SHEX");
    assert.equal(container.chunks[1].fourCC, "ISGN");
    assert.equal(container.getChunk("ISGN").size, 12);
    assert.equal(container.getChunk("MISSING"), null);
});

test("magic sniffing accepts DXBC and rejects junk", () =>
{
    assert.equal(CjsDxbcFormat.isDxbc(buildMinimalVertexDxbc()), true);
    assert.equal(CjsDxbcFormat.isDxbc(new Uint8Array([ 1, 2, 3, 4, 5 ])), false);
    assert.equal(CjsDxbcFormat.isDxbc(new Uint8Array(0)), false);
});

test("truncated containers throw a read error", () =>
{
    const bytes = buildMinimalVertexDxbc();
    assert.throws(() => new DxbcContainer().Read(bytes.subarray(0, 16)), /DXBC/);
});
