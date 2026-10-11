import { blue } from "./blue.js";

/**
 * Collects the unique resources reachable from an object, including a
 * resource root, and follows resource dependencies, since resources are graph
 * edges like any other. Replaces the supplied array's contents and returns it.
 *
 * Ours: Carbon has no such collector. The walk is the shape of Carbon's Find
 * functions (`FindInterface`, Find.cpp:352-396): an explicit stack, each object
 * visited once, children from `blue.EnumerateChildren`. Resources are listed
 * in that visit order.
 *
 * @param {object|null} root Root whose declared graph is visited.
 * @param {Array<*>} [out=[]] Replaced output array.
 * @returns {Array<*>} The supplied output array.
 */
export function GetResources(root, out = [])
{
  out.length = 0;
  if (!root) return out;

  const stack = [ root ];
  const seen = new Set();
  while (stack.length)
  {
    const obj = stack.pop();
    if (seen.has(obj)) continue;
    seen.add(obj);

    if (obj.isResource === true) out.push(obj);

    blue.EnumerateChildren(obj, child => stack.push(child));
  }
  return out;
}
