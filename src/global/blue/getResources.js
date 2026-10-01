import { Traverse } from "./find.js";

/**
 * Collects unique resources in encounter order from a declared object graph.
 * Replaces the supplied array's contents and returns that same array. Includes
 * a resource root and recursively follows declared resource dependencies;
 * unlike legacy model traversal, resource nodes are not terminal by policy.
 *
 * Resource-bearing fields, including runtime-only type.resource references,
 * are followed through the same declarations as other graph edges. Only
 * visited objects with isResource===true are collected.
 *
 * @param {object|null} root Root whose declared graph is visited.
 * @param {Array<*>} [out=[]] Replaced output array.
 * @returns {Array<*>} The supplied output array.
 * @impl custom Preserves the CjsModel resource collection contract without a
 * model base, extending it to native stored-reference resource edges.
 */
export function GetResources(root, out = [])
{
    const resources = new Set();
    Traverse(root, value =>
    {
        if (value.isResource === true) resources.add(value);
    });
    out.length = 0;
    for (const resource of resources) out.push(resource);
    return out;
}
