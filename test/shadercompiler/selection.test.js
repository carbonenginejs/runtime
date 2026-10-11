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

const EFFECTS = ["selection/selectionmask.fx", "selection/skinned_selectionmask.fx", "selection/selectionoutline.fx", "selection/selectionsilhouette.fx", "selection/skinned_selectionsilhouette.fx", "selection/selectionvisibleoutline.fx"];

test("the selection effects compile", () =>
{
    for (const effect of EFFECTS)
    {
        const { ok, messages } = compileEffect(effect);
        assert.deepEqual(messages, [], effect);
        assert.equal(ok, true, effect);
    }
});

test("only the skinned mask reads bones", () =>
{
    const [plain, skinned] = EFFECTS.map(effect => compileEffect(effect).state.GetSymbolTable());
    assert.equal(plain.LookupGlobal("BoneTransforms"), null);
    assert.equal(skinned.LookupGlobal("BoneTransforms").type.ToString(), "StructuredBuffer");
});

test("the per-frame and per-object blocks land in Carbon's slots", () =>
{
    const { state } = compileEffect("selection/skinned_selectionmask.fx");
    ParserUtils.PatchCBuffers(state);
    const slots = Object.fromEntries(findNodes(state.GetTree(), ASTNode.ASTNodeType.NT_CBUFFER)
        .map(node => [node.GetSymbol().name.ToString(), [...node.GetSymbol().registerSpecifier.values()].map(r => `${r.registerType}${r.registerNumber}`).join()]));
    assert.deepEqual(slots, { PerFrameVS: "b1", PerFramePS: "b2", PerObjectVS: "b3", PerObjectPS: "b4" });
});

test("the mask is depth-tested and does not write depth", () =>
{
    const { state } = compileEffect("selection/selectionmask.fx");
    const states = Object.fromEntries(findNodes(state.GetTree(), ASTNode.ASTNodeType.NT_STATE_ASSIGNMENT).map(node =>
    {
        const blob = { value: 0 };
        assert.equal(FXAnalyzer.ParseStateAssignment(state, node, FXAnalyzer.g_renderStates, blob), true);
        return [node.GetToken().stringValue.ToString(), blob.value];
    }));
    assert.equal(states.ZEnable, 1);
    assert.equal(states.ZWriteEnable, 0);
});

test("every outline parameter is exposed and fully described, every component named", () =>
{
    const symbols = compileEffect("selection/selectionoutline.fx").state.GetSymbolTable();
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

test("the shader footprint remains visible at 1px and reaches the requested width through 8px", () =>
{
    // Evaluate the shader's scalar weight expression itself, not a copied formula.
    // This catches a zero-weight first ring without starting a hardware device.
    const source = readFileSync(join(LIBRARY_ROOT, "selection/selectionoutline.fx"), "utf8");
    const expression = source.match(/coverage\s*\+=\s*([^;]+);/u)[1];
    const weight = new Function("radius", "x", "y", "smoothstep", "length", "float2", `return ${expression};`);
    const smoothstep = (a, b, value) =>
    {
        const t = Math.min(1, Math.max(0, (value - a) / (b - a)));
        return t * t * (3 - 2 * t);
    };
    // The float2 argument is a vector; emulate HLSL length for this expression.
    const coverage = (radius, x, y) => weight(radius, x, y, smoothstep, v => Math.hypot(...v), (x, y) => [x, y]);
    for (let width = 1; width <= 8; ++width)
    {
        assert.ok(coverage(width, 1, 0) > 0, `visible inner edge at width ${width}`);
        assert.ok(coverage(width, width, 0) > 0, `visible requested outer ring ${width}`);
        assert.equal(coverage(width, width + 1, 0), 0, `no extra outer ring at ${width}`);
    }
});


test("silhouette masks ignore scene depth without writing it", () =>
{
    for (const effect of ["selection/selectionsilhouette.fx", "selection/skinned_selectionsilhouette.fx"])
    {
        const { state } = compileEffect(effect);
        const states = Object.fromEntries(findNodes(state.GetTree(), ASTNode.ASTNodeType.NT_STATE_ASSIGNMENT).map(node =>
        {
            const blob = { value: 0 };
            assert.equal(FXAnalyzer.ParseStateAssignment(state, node, FXAnalyzer.g_renderStates, blob), true);
            return [node.GetToken().stringValue.ToString(), blob.value];
        }));
        assert.equal(states.ZEnable, 0);
        assert.equal(states.ZWriteEnable, 0);
    }
});

test("visible silhouette distinguishes an occluder hole from the object's own edge", () =>
{
    const source = readFileSync(join(LIBRARY_ROOT, "selection/selectionoutline.fx"), "utf8");
    // Evaluate the actual shader conditions against synthetic overlapping masks.
    const gate = source.match(/#ifdef VISIBLE_SILHOUETTE\s+if\( ([^\n]+) \)/u)[1];
    const edge = source.match(/#ifdef VISIBLE_SILHOUETTE\s+if\( (!SilhouetteCovered[^\n]+) \)/u)[1];
    const discarded = new Function("Covered", "SilhouetteCovered", "pixel", "size", `return ${gate};`);
    const contributes = new Function("SilhouetteCovered", "pixel", "x", "y", "size", "int2", `return ${edge};`);
    assert.equal(discarded(() => false, () => true, 0, 0), true, "no outline on a foreground object");
    assert.equal(discarded(() => true, () => true, 0, 0), false, "visible selected pixels may be outlined");
    assert.equal(discarded(() => true, () => false, 0, 0), true, "jittered visibility cannot extend the stable silhouette");
    assert.equal(contributes(() => true, 0, 0, 0, 0, () => 0), false, "occluder hole is still inside full silhouette");
    assert.equal(contributes(() => false, 0, 0, 0, 0, () => 0), true, "background outside the full silhouette is a real edge");
});
