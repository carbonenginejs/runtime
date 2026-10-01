// Source: blueexposure/include/Find.h, EnumerateChildren.
// JavaScript collections stand in for native IList/IBlueDict interfaces.
// RouteStep and FindFirstRoute describe replayable routes; this visitor does
// not implement those separate APIs or their StepType vocabulary.
import { CjsSchema } from "../schema/CjsSchema.js";
import { getCarbonTypeDefinition, inferCarbonTypeFromCpp } from "../schema/types/carbonTypes.js";

/**
 * Enumerates immediate stored object references and explicitly typed embedded
 * objects. Canonical members are ordered derived-to-base, in each class's
 * declaration order, matching Carbon rather than the legacy model field table.
 *
 * Collections retain insertion order (array index order); maps visit values,
 * never keys. Declared maps accept Map or record data entries, and declared
 * sets accept Set or arrays because readers also produce those representations.
 * Weak, opaque, unknown and accessor-only declarations are not edges. Reading
 * storage or collection entries never invokes an accessor. Resources are edges
 * too; enumeration does not prescribe copying, initialization or ownership.
 *
 * @param {object|null} root Object whose immediate children are enumerated.
 * @param {function(object, object, *): void} onChild Child, member declaration,
 * and collection key/index (null for a direct member). Return values are ignored.
 * @param {object} [options={}]
 * @param {boolean} [options.reverse=false] Reverse member and collection order.
 * @param {boolean} [options.ownedOnly=false] Select lifecycle.ownership=owned.
 * This is a JavaScript edge filter, not a native lifecycle policy.
 * @returns {object|null} The supplied root. Repeated references are reported.
 * @impl adapted Native member addresses become data-property keys/indexes;
 * declared JS collections replace native mapped list/dictionary interfaces.
 */
export function EnumerateChildren(root, onChild, options = {})
{
    if (typeof onChild !== "function") throw new TypeError("EnumerateChildren requires a callback.");
    if (root === null || typeof root !== "object") return root;

    const members = CjsSchema.getSchema(root.constructor).members;
    const reverse = options.reverse === true;
    const step = reverse ? -1 : 1;
    for (let i = reverse ? members.length - 1 : 0;
        reverse ? i >= 0 : i < members.length; i += step)
    {
        const member = members[i];
        if (member.role !== "member") continue;
        if (options.ownedOnly === true && member.lifecycle?.ownership !== "owned") continue;
        let value = readData(root, member.key);
        if (member.index !== undefined) value = readData(value, member.index);
        enumerateValue(value, member.type, (child, index) => onChild(child, member, index), reverse);
    }
    return root;
}

/**
 * Visits a declared object graph once per identity, including resources.
 * Uses depth-first canonical member order; reverse reverses both members and
 * collection entries. Preorder false prunes descendants, while postorder return
 * values are ignored. Edges are captured after the preorder callback. The
 * explicit stack permits deep graphs without consuming the JavaScript stack.
 *
 * @param {object|null} root Root to visit; null is an empty graph.
 * @param {function(object): (boolean|void)} visitor Object callback.
 * @param {object} [options={}]
 * @param {Set<object>} [options.visited] Shared visited set, updated in place.
 * @param {"pre"|"post"} [options.order="pre"] Visitor timing.
 * @param {boolean} [options.reverse=false] Reverse immediate edge order.
 * @param {boolean} [options.ownedOnly=false] Follow only declared owned edges.
 * @param {boolean} [options.includeRoot=true] False excludes the root callback,
 * but still marks it visited so a cycle cannot introduce it again.
 * @returns {object|null} The supplied root.
 * @impl custom JavaScript visitor compatibility over Carbon EnumerateChildren;
 * this operation installs no model state and invokes no lifecycle methods.
 */
export function Traverse(root, visitor, options = {})
{
    if (typeof visitor !== "function") throw new TypeError("Traverse requires a visitor function.");
    const visited = options.visited instanceof Set ? options.visited : new Set();
    const post = options.order === "post";
    const stack = [{ value: root, exit: false }];
    while (stack.length)
    {
        const { value, exit } = stack.pop();
        if (exit)
        {
            visitor(value);
            continue;
        }
        if (value === null || typeof value !== "object" || visited.has(value)) continue;
        visited.add(value);
        const include = value !== root || options.includeRoot !== false;
        if (!post && include && visitor(value) === false) continue;
        if (post && include) stack.push({ value, exit: true });
        const children = [];
        EnumerateChildren(value, child => children.push(child), options);
        for (let i = children.length - 1; i >= 0; i--)
        {
            stack.push({ value: children[i], exit: false });
        }
    }
    return root;
}

/** Reads declared storage without executing a live getter. */
function readData(value, key)
{
    for (let current = value; current !== null && typeof current === "object";
        current = Object.getPrototypeOf(current))
    {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor) return descriptor.value;
    }
    return undefined;
}

/** Resolves a collection's constructor/name shorthand without inventing fields. */
function descriptorOf(type)
{
    if (typeof type === "function") return { kind: "objectRef", className: type };
    if (typeof type !== "string") return type;
    if (type === "weakRef") return { kind: "weakRef" };
    if (CjsSchema.GetConstructor(type)) return { kind: "objectRef", className: type };
    const declared = getCarbonTypeDefinition(type);
    if (declared.kind !== "unknown" || type === "unknown") return declared;
    const native = inferCarbonTypeFromCpp(type);
    if (native.kind !== "unknown" && native.kind !== "enum") return native;
    // Unregistered native interface names are still explicit reference types.
    return { kind: "objectRef", className: type };
}

/** Expands only the collection shapes named by the declaration. */
function enumerateValue(value, declaration, onChild, reverse, index = null)
{
    if (value === null || typeof value !== "object") return;
    const type = descriptorOf(declaration);
    switch (type?.kind)
    {
        case "model":
        case "objectRef":
            onChild(value, index);
            return;

        case "struct":
            if (type.className) onChild(value, index);
            return;

        case "array":
        case "list":
        case "set":
        {
            const items = type.kind === "set" && value instanceof Set ? Array.from(value) : value;
            if (!Array.isArray(items)) return;
            const step = reverse ? -1 : 1;
            for (let i = reverse ? items.length - 1 : 0;
                reverse ? i >= 0 : i < items.length; i += step)
            {
                const entry = Object.getOwnPropertyDescriptor(items, i);
                enumerateValue(entry?.value, type.itemType, onChild, reverse, i);
            }
            return;
        }

        case "map":
        {
            const entries = value instanceof Map
                ? Array.from(value.entries())
                : Object.keys(value).map(key => [key, Object.getOwnPropertyDescriptor(value, key).value]);
            const step = reverse ? -1 : 1;
            for (let i = reverse ? entries.length - 1 : 0;
                reverse ? i >= 0 : i < entries.length; i += step)
            {
                enumerateValue(entries[i][1], type.valueType, onChild, reverse, entries[i][0]);
            }
            return;
        }
    }
}
