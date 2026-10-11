import { CjsBlue } from "./CjsBlue.js";

/**
 * Collects the unique resources reachable from an object, including a
 * resource root, and follows resource dependencies, since resources are graph
 * edges like any other. Replaces the supplied array's contents and returns it.
 *
 * Ours: Carbon has no such collector. The walk is the shape of Carbon's Find
 * functions (`FindInterface`, Find.cpp:352-396): an explicit stack, each object
 * visited once, children from `CjsBlue.enumerateChildren` (the static body
 * of `blue.EnumerateChildren`; importing the `blue` instance here would be an
 * import cycle, since the holder's resource manager imports this module). Resources are listed
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

    CjsBlue.enumerateChildren(obj, child => stack.push(child));
  }
  return out;
}
