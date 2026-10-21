import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

/** Reads only JSDoc attached to a class, never strings, method comments or free functions. */
export function classDonorComments(sourceOrAst)
{
    const ast = typeof sourceOrAst === "string"
        ? parse(sourceOrAst, { sourceType: "module", plugins: ["decorators"] }) : sourceOrAst;
    const result = [];
    function visit(node, parent)
    {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) { for (const child of node) visit(child, parent); return; }
        if (["ClassDeclaration", "ClassExpression"].includes(node.type) && node.id)
        {
            const comments = [...(node.leadingComments ?? []),
                ...(parent?.type?.startsWith("Export") ? parent.leadingComments ?? [] : [])];
            const entries = [], seen = new Set();
            for (const comment of comments)
            {
                if (comment.type !== "CommentBlock" || !comment.value.startsWith("*") || seen.has(comment.start)) continue;
                seen.add(comment.start);
                for (const [offset, raw] of comment.value.split(/\r?\n/).entries())
                {
                    const text = raw.replace(/^\s*\*?\s*/, "").trim();
                    if (!/^(?:Carbon|Modelled on):/.test(text)) continue;
                    const match = /^(Carbon|Modelled on): ([\w:~]+) \(([^():\s]+):(\d+)(?:-(\d+))?\)$/.exec(text);
                    entries.push(match ? { kind: match[1], name: match[2], file: match[3],
                        start: Number(match[4]), end: Number(match[5] ?? match[4]), line: comment.loc.start.line + offset, text }
                        : { line: comment.loc.start.line + offset, text, error: "Expected Carbon: Name (file:lines) or Modelled on: Name (file:lines)." });
                }
            }
            result.push({ name: node.id.name, start: node.start, entries });
        }
        for (const [key, child] of Object.entries(node))
            if (!["loc", "comments", "leadingComments", "trailingComments", "innerComments", "tokens"].includes(key)
                && typeof child === "object") visit(child, node);
    }
    visit(ast, null);
    return result;
}

/** Checks the declared path and inclusive range against Carbon; never resolves outside its root. */
export function validateDonorComment(entry, carbonRoot)
{
    if (entry.error) return entry.error;
    const root = fs.realpathSync(carbonRoot), target = path.resolve(root, entry.file);
    const inside = file => { const relative = path.relative(root, file); return relative && !relative.startsWith("..") && !path.isAbsolute(relative); };
    if (!inside(target)) return "Donor file must be inside CARBON_ROOT.";
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return "Donor declaration file does not exist.";
    if (!inside(fs.realpathSync(target))) return "Donor file resolves outside CARBON_ROOT.";
    const source = fs.readFileSync(target, "utf8");
    const length = source.split(/\r?\n/).length - (source.endsWith("\n") ? 1 : 0);
    if (entry.start < 1 || entry.end < entry.start || entry.end > length) return `Donor range must be within lines 1-${length}.`;
    return null;
}
