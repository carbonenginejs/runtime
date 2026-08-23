// Conformance against real resfileindex entries. The fixtures below are copied
// verbatim from a shipped index, so they assert agreement with the GAME's
// naming rather than with our own output.
import assert from "node:assert/strict";
import test from "node:test";

import {
    fnv164,
    isResFileAddressFor,
    parseResFileAddress,
    resFileAddress,
} from "../../../src/global/utils/resFile.js";

const FIXTURES = [
    [ "res:/graphics/interior/amarr/modular_ceiling/ceiling_01_ama_01_nm.dds", "bc/bce582ba34593376_29ef35b9a16668fd0eabfcc9641633d0" ],
    [ "res:/graphics/interior/amarr/modular_ceiling/ceiling_01_ama_02_os.dds", "97/97f5ffbd937ff28a_6192dbd06d34a46c6dfc420e18c96044" ],
    [ "res:/graphics/interior/amarr/modular_wall/wall_02_ama_os.dds", "db/dbea61e3c032f470_398a243107e7b3c9bad48bf0d90cca08" ],
    [ "res:/graphics/placeable/gallente/furniture_table_sofa_01_gal/furniture_table_sofa_01_gal.black", "e5/e5aedfd3fb95db45_6dd63fe2dc5f1aafc54cc8b36e7da3df" ],
    [ "res:/ui/texture/classes/cqsidescreens/piscreenbg.png", "11/1114ba678075ea82_bf9b2763773cb612ea3b48d255a508fa" ],
];

test("reproduces shipped resource addresses exactly", () =>
{
    for (const [ logicalPath, address ] of FIXTURES)
    {
        const { pathHash, checksum } = parseResFileAddress(address);

        assert.equal(fnv164(logicalPath), pathHash, logicalPath);
        assert.equal(resFileAddress(logicalPath, checksum), address, logicalPath);
        assert.ok(isResFileAddressFor(address, logicalPath), logicalPath);
    }
});

test("the shard is the first two characters of the path hash, not a separate value", () =>
{
    for (const [ , address ] of FIXTURES)
    {
        const { shard, pathHash } = parseResFileAddress(address);

        assert.equal(shard, pathHash.slice(0, 2));
    }
});

test("a different path gives a different address", () =>
{
    const [ logicalPath, address ] = FIXTURES[0];
    const { checksum } = parseResFileAddress(address);

    // The negative control: without this, a stub returning a constant would
    // pass every assertion above.
    assert.notEqual(resFileAddress(`${logicalPath}x`, checksum), address);
    assert.ok(!isResFileAddressFor(address, `${logicalPath}x`));
});

test("a different digest gives a different address", () =>
{
    const [ logicalPath ] = FIXTURES[0];

    assert.notEqual(
        resFileAddress(logicalPath, "0".repeat(32)),
        resFileAddress(logicalPath, "1".repeat(32)),
    );
});

test("plain overlay paths are not addresses, and say so quietly", () =>
{
    // Overlay indexes carry both forms; "not an address" is ordinary.
    assert.equal(parseResFileAddress("graphics/effect.gles2/utility/textureviewer.sm_lo"), null);
    assert.equal(parseResFileAddress(""), null);
    assert.equal(parseResFileAddress(null), null);
    assert.equal(parseResFileAddress("bc/short_29ef35b9a16668fd0eabfcc9641633d0"), null);
    assert.equal(isResFileAddressFor("not-an-address", "res:/x.dds"), false);
});

test("a bad digest is refused rather than embedded", () =>
{
    for (const bad of [ "", "xyz", "0".repeat(31), "0".repeat(33), null ])
    {
        assert.throws(() => resFileAddress("res:/x.dds", bad), /32 hex digits/u);
    }
});

test("a non-ASCII path throws instead of guessing", () =>
{
    // Two implementations exist and disagree beyond ASCII; no real path has
    // ever been non-ASCII, so there is no evidence for either. Returning a
    // plausible value would be the wrong answer to a question we cannot answer.
    assert.throws(() => fnv164("res:/textures/caf\u00e9.dds"), /only defined for ASCII/u);
    assert.throws(() => fnv164("res:/textures/\u65e5\u672c\u8a9e.dds"), /only defined for ASCII/u);
    assert.throws(() => resFileAddress("res:/caf\u00e9.dds", "0".repeat(32)), /only defined for ASCII/u);
});

test("hashing is stable and case sensitive", () =>
{
    const path = "res:/graphics/interior/amarr/modular_wall/wall_02_ama_os.dds";

    assert.equal(fnv164(path), fnv164(path));
    assert.notEqual(fnv164(path), fnv164(path.toUpperCase()));
});
