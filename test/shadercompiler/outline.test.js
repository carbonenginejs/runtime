import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ParserState, InlineString, CachingIncludeHandler, CompileMessageQueue, ParserUtils, FXAnalyzer, ASTNode } from "../../src/shadercompiler/index.js";
import { LIBRARY_ROOT } from "../../scripts/shadercompiler/cbuffer-headers.mjs";

/**
 * Parses a library effect as Carbon's driver does: the entry file is opened
 * through the include handler, so its includes resolve from its own folder.
 *
 * @param {string} effect The effect's library path.
 * @returns {{ ok: boolean, messages: string[], state: ParserState }} The parse.
 */
function compileEffect(effect)
{
    const handler = new CachingIncludeHandler(path => (existsSync(join(LIBRARY_ROOT, path)) ? readFileSync(join(LIBRARY_ROOT, path), "utf8") : null));
    const file = handler.Open(effect);
    const messages = new CompileMessageQueue();
    const state = new ParserState(InlineString.makeInlineString__StartEnd(file.data, 1, file.data.text.length), { includeHandler: handler, messages });
    const ok = state.Parse();
    return { ok, messages: messages.GetMessages(), state };
}

/**
 * Every node of a type in a tree, depth first.
 *
 * @param {import("../../src/shadercompiler/index.js").ASTNode} node The root.
 * @param {number} type An `ASTNodeType` value.
 * @param {import("../../src/shadercompiler/index.js").ASTNode[]} [out=[]] Receives the nodes.
 * @returns {import("../../src/shadercompiler/index.js").ASTNode[]} The nodes.
 */
function findNodes(node, type, out = [])
{
    if (node.GetNodeType() === type)
    {
        out.push(node);
    }
    node.GetChildren().filter(Boolean).forEach(child => findNodes(child, type, out));
    return out;
}

/**
 * A parameter's annotations as name to text, string literals unquoted.
 *
 * @param {import("../../src/shadercompiler/index.js").Symbol} symbol The parameter.
 * @returns {Record<string, string>} The annotations.
 */
function annotationsOf(symbol)
{
    return Object.fromEntries(symbol.annotations.map(annotation =>
    {
        const text = annotation.value.stringValue;
        return [annotation.name.ToString(), text.CharAt(text.start) === 34 ? ParserUtils.ParseString(text) : text.ToString()];
    }));
}

const EFFECTS = ["outline/unpacked_quadoutline.fx", "outline/unpackedskinned_quadoutline.fx", "outline/quadoutline.fx", "outline/skinned_quadoutline.fx"];

test("both quad outline effects compile", () =>
{
    for (const effect of EFFECTS)
    {
        const { ok, messages } = compileEffect(effect);
        assert.deepEqual(messages, [], effect);
        assert.equal(ok, true, effect);
    }
});

test("only the skinned variant reads bones", () =>
{
    const [plain, skinned] = EFFECTS.map(effect => compileEffect(effect).state.GetSymbolTable());
    assert.equal(plain.LookupGlobal("BoneTransforms"), null);
    assert.equal(skinned.LookupGlobal("BoneTransforms").type.ToString(), "StructuredBuffer");
});

test("the per-frame and per-object blocks land in Carbon's slots", () =>
{
    const { state } = compileEffect("outline/unpackedskinned_quadoutline.fx");
    ParserUtils.PatchCBuffers(state);
    const slots = Object.fromEntries(findNodes(state.GetTree(), ASTNode.ASTNodeType.NT_CBUFFER)
        .map(node => [node.GetSymbol().name.ToString(), [...node.GetSymbol().registerSpecifier.values()].map(r => `${r.registerType}${r.registerNumber}`).join()]));
    assert.deepEqual(slots, { PerFrameVS: "b1", PerFramePS: "b2", PerObjectVS: "b3", PerObjectPS: "b4" });
});

test("the pass culls the opposite faces to Carbon's default, as the shipped Shadow pass does", () =>
{
    const { state } = compileEffect("outline/unpacked_quadoutline.fx");
    const cull = findNodes(state.GetTree(), ASTNode.ASTNodeType.NT_STATE_ASSIGNMENT).find(node => node.GetToken().stringValue.ToString() === "CullMode");
    const blob = { value: 0 };
    assert.equal(FXAnalyzer.ParseStateAssignment(state, cull, FXAnalyzer.g_renderStates, blob), true);
    // D3DCULL_CCW, the value the shipped quad Shadow passes store.
    assert.equal(blob.value, 3);
});

test("every outline parameter is exposed and fully described, every component named", () =>
{
    const symbols = compileEffect("outline/unpacked_quadoutline.fx").state.GetSymbolTable();
    for (const name of ["OutlineColour", "OutlineSettings", "OutlineAnimationSettings"])
    {
        const annotations = annotationsOf(symbols.LookupGlobal(name));
        assert.equal(annotations.SasUiVisible, "true", name);
        assert.equal(annotations.Group, "Outline", name);
        assert.ok(annotations.SasUiDescription, name);
        assert.ok(annotations.UIWidget, name);
        if (annotations.UIWidget === "VectorMixed")
        {
            for (const component of ["Component1", "Component2", "Component3", "Component4"])
            {
                assert.ok(annotations[component], `${name}.${component}`);
            }
        }
    }
    assert.deepEqual(
        ["Component1", "Component2", "Component3", "Component4"].map(c => annotationsOf(symbols.LookupGlobal("OutlineSettings"))[c]),
        ["Brightness", "Width in pixels", "Animated (0 = off, 1 = on)", "unused"]
    );
});
