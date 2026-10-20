import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { YamlReader } from "../../npm/dist/global/blue/YamlReader.js";
import "../../npm/dist/global/blue/values.js";
import { CjsGraphFormat } from "../../npm/dist/resource/formats/graph/CjsGraphFormat.js";
import { EveVirtualCameraBehaviourVector3Damping } from "../../npm/dist/trinity/index.js";
import { TriStepToggleCubemap } from "../../npm/dist/trinity/renderJob/index.js";

// Carbon exposes these two members under their C++ names, prefix included:
// MAP_ATTRIBUTE( "m_dampingRatio", m_dampingRatio, ..., Be::READWRITE | Be::PERSIST )
// (EveVirtualCameraBehaviour_Blue.cpp:206) and MAP_ATTRIBUTE( "m_showCubemap",
// m_showCubemap, ..., Be::READWRITE ) (TriStepToggleCubemap_Blue.cpp:17-21).
// The JS keys drop the prefix, so every reader and writer must resolve the
// exposed name through `blue.attribute`, never the JS key.
const DAMPING = "EveVirtualCameraBehaviourVector3Damping";
const TOGGLE = "TriStepToggleCubemap";
function readRed(text) {
    const reader = new YamlReader();
    reader._isStrict = true;
    return reader.CreateObjectFromString(text);
}

test("the schema declares Carbon's exposed name apart from the JS key", () =>
{
    const damping = CjsSchema.getSchema(EveVirtualCameraBehaviourVector3Damping).members.find(member => member.key === "dampingRatio");
    assert.equal(damping.name, "m_dampingRatio");
    assert.equal(damping.carbon.member, true);
    assert.equal(damping.edit.persist, true);
    const toggle = CjsSchema.getSchema(TriStepToggleCubemap).members.find(member => member.key === "showCubemap");
    assert.equal(toggle.name, "m_showCubemap");
    assert.equal(toggle.edit.persist, undefined, "Carbon exposes m_showCubemap READWRITE, not PERSIST");
    assert.equal(Object.hasOwn(new EveVirtualCameraBehaviourVector3Damping(), "m_dampingRatio"), false);
    assert.equal(Object.hasOwn(new TriStepToggleCubemap(), "m_showCubemap"), false);
});

test("Black reads m_dampingRatio into dampingRatio and keeps the exposed name in its payload", () =>
{
    const black = new BlackFixture();
    const bytes = black.Finish(black.Object(1, DAMPING, [ [ "m_dampingRatio", f32(0.25) ] ]));
    const instance = new CjsBlackReader(bytes, { schema: null }).CreateObject();
    assert.ok(instance instanceof EveVirtualCameraBehaviourVector3Damping);
    assert.equal(instance.dampingRatio, 0.25);
    assert.equal(Object.hasOwn(instance, "m_dampingRatio"), false);
    const payload = new CjsBlackReader(bytes, { schema: null }).ReadPayload().object;
    assert.equal(payload.m_dampingRatio, 0.25);
    assert.equal(Object.hasOwn(payload, "dampingRatio"), false);

    // The JS key is not a Black field name.
    const byKey = new BlackFixture();
    const keyed = byKey.Finish(byKey.Object(1, DAMPING, [ [ "dampingRatio", f32(0.25) ] ]));
    assert.throws(() => new CjsBlackReader(keyed, { schema: null }).CreateObject(), /No persisted member declared for Black field EveVirtualCameraBehaviourVector3Damping\.dampingRatio/);
});

test("YamlReader reads the exposed name and the values service exports it", () =>
{
    const red = `type: ${DAMPING}\nm_dampingRatio: 0.25\n`;
    const instance = readRed(red);
    assert.ok(instance instanceof EveVirtualCameraBehaviourVector3Damping);
    assert.equal(instance.dampingRatio, 0.25);
    assert.equal(Object.hasOwn(instance, "m_dampingRatio"), false);
    const payload = CjsSchema.getValues(instance, {}, { typeTags: true });
    assert.equal(payload.m_dampingRatio, 0.25);
    assert.equal(Object.hasOwn(payload, "dampingRatio"), false);

    // The JS key is not a Red attribute name.
    assert.throws(() => readRed(`type: ${DAMPING}\ndampingRatio: 0.25\n`), /dampingRatio/);
});

test("Black and strict YamlReader refuse nonpersisted m_showCubemap under either spelling", () =>
{
    // IRootReaderBase::FindEntry (IRootReader.cpp:303-318) matches PERSIST entries only.
    for (const name of [ "m_showCubemap", "showCubemap" ])
    {
        const black = new BlackFixture();
        const bytes = black.Finish(black.Object(1, TOGGLE, [ [ name, new Uint8Array([ 0 ]) ] ]));
        assert.throws(() => new CjsBlackReader(bytes, { schema: null }).CreateObject(), new RegExp(`No persisted member declared for Black field ${TOGGLE}\\.${name}`));
    }
    for (const name of [ "m_showCubemap", "showCubemap" ])
    {
        assert.throws(() => readRed(`type: ${TOGGLE}\n${name}: 0\n`), new RegExp(name));
    }
});

test("the graph writer emits m_dampingRatio, not the JS key, and reads it back into dampingRatio", () =>
{
    const source = new EveVirtualCameraBehaviourVector3Damping();
    source.dampingRatio = 0.5;
    const text = new TextDecoder().decode(CjsGraphFormat.write(source));
    assert.match(text, /"m_dampingRatio"/u);
    assert.doesNotMatch(text, /"dampingRatio"/u);
    const read = CjsGraphFormat.read(text, { emit: "runtime" }).root;
    assert.ok(read instanceof EveVirtualCameraBehaviourVector3Damping);
    assert.equal(read.dampingRatio, 0.5);

    // READWRITE without PERSIST is not written (Carbon's PERSIST gate).
    const toggle = new TriStepToggleCubemap();
    toggle.showCubemap = false;
    const toggleText = new TextDecoder().decode(CjsGraphFormat.write(toggle));
    assert.doesNotMatch(toggleText, /showCubemap/u);
});

class BlackFixture
{
    strings = [];
    String(value)
    {
        let index = this.strings.indexOf(value);
        if (index === -1) { index = this.strings.length; this.strings.push(value); }
        return u16(index);
    }
    Object(id, kind = null, fields = [])
    {
        if (kind === null) return u32(id);
        const parts = [ this.String(kind) ];
        for (const [ name, value ] of fields) parts.push(concat([ this.String(name), value ]));
        const body = concat(parts);
        return concat([ u32(id), u32(body.length), body ]);
    }
    Finish(root)
    {
        const narrowParts = [ u16(this.strings.length) ];
        for (const value of this.strings) narrowParts.push(concat([ new TextEncoder().encode(value), new Uint8Array(1) ]));
        const strings = concat(narrowParts), wideStrings = u16(0);
        return concat([ u32(0xb1acf11e), u32(1), u32(strings.length), strings, u32(wideStrings.length), wideStrings, root ]);
    }
}

function concat(parts)
{
    const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return bytes;
}

function u16(value)
{
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
}

function u32(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    return bytes;
}

function f32(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setFloat32(0, value, true);
    return bytes;
}
