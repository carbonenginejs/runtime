import { Traverse } from "./find.js";

/**
 * Collects unique resources in encounter order from a declared object graph.
 * Replaces the supplied array's contents and returns that same array. Includes
 * a resource root and recursively follows declared resource dependencies;
 * unlike legacy model traversal, resource nodes are not terminal by policy.
 *
 * Every visited node may supply the optional OnGetResources() hook for local
 * undeclared resources. It takes no arguments and must return an iterable,
 * excluding strings. Null hook entries are ignored. Hook entries retain the
 * existing caller-supplied contract (no isResource test), while graph objects
 * require isResource===true. Hooks never prune descendant traversal.
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
        if (typeof value.OnGetResources === "function")
        {
            const values = value.OnGetResources();
            if (typeof values === "string" || typeof values?.[Symbol.iterator] !== "function")
            {
                throw new TypeError("OnGetResources must return an iterable of resources.");
            }
            for (const resource of values)
            {
                if (resource !== null && resource !== undefined) resources.add(resource);
            }
        }
    });
    out.length = 0;
    for (const resource of resources) out.push(resource);
    return out;
}
