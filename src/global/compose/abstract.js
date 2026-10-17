// Installs the body of an abstract method: one an implementer must supply.
//
// `meta.abstract` and `blue.abstract` both record implementation status
// `abstract` AND install this throwing body (operator ruling, 2026-10-17:
// "abstract's whole point is it should throw"). The method is still declared
// at its site exactly as it is called, with Carbon's full parameter list; its
// body is replaced, so nobody hand-writes the error and no message can drift
// from a rename.
//
// Every thrower is recorded with the method's name, its declared parameters
// and, once known, the class that declares it. The message is built from that
// record when the thrower runs.

import { getRegisteredClassName } from "./className.js";

/**
 * What one installed thrower stands for.
 *
 * @typedef {object} AbstractRecord
 * @property {string} methodName The abstract method's name.
 * @property {string[]} parameters The declared parameter names, as written.
 * @property {Function|null} Declaring The class (or interface) that declares the method, once known.
 */

/** @type {WeakMap<Function, AbstractRecord>} Installed thrower -> its record. */
const ABSTRACT_RECORDS = new WeakMap();

/**
 * The parameter names in a function's own declaration, read from its source
 * text when the decorator runs. Defaults and comments are dropped; a rest
 * parameter keeps its `...`; a destructuring pattern is kept as written. One
 * leading run of underscores is dropped from a plain name: it is the JS
 * spelling for "unused here", not part of the name, so `_count` prints as
 * Carbon's `count`.
 *
 * A minified build prints whatever the minifier named them (esbuild's
 * identifier minification gives one- or two-letter names, e.g. `(e, t, n)`);
 * the count and order still hold.
 *
 * @param {Function} fn The declared method.
 * @returns {string[]} The parameter names, or an empty list when unreadable.
 */
function ReadParameters(fn)
{
    if (typeof fn !== "function") return [];

    const source = Function.prototype.toString.call(fn);
    const open = source.indexOf("(");
    if (open < 0) return [];

    // Walk to the matching ")" tracking nesting, strings and comments, and cut
    // at top-level commas.
    const parameters = [];
    let current = "";
    let depth = 0;
    for (let i = open + 1; i < source.length; i++)
    {
        const ch = source[i];
        const next = source[i + 1];

        if (ch === "/" && next === "*")
        {
            const end = source.indexOf("*/", i + 2);
            i = end < 0 ? source.length : end + 1;
            continue;
        }
        if (ch === "/" && next === "/")
        {
            const end = source.indexOf("\n", i + 2);
            i = end < 0 ? source.length : end;
            continue;
        }
        if (ch === "\"" || ch === "'" || ch === "`")
        {
            let j = i + 1;
            while (j < source.length && source[j] !== ch) j += source[j] === "\\" ? 2 : 1;
            current += source.slice(i, j + 1);
            i = j;
            continue;
        }

        if (ch === "(" || ch === "[" || ch === "{") depth++;
        if (ch === ")" || ch === "]" || ch === "}")
        {
            if (depth === 0)
            {
                parameters.push(current);
                break;
            }
            depth--;
        }
        if (ch === "," && depth === 0)
        {
            parameters.push(current);
            current = "";
            continue;
        }
        current += ch;
    }

    const names = [];
    for (const parameter of parameters)
    {
        const name = StripDefault(parameter).trim().replace(/\s+/gu, " ");
        if (!name) continue;
        names.push(name.replace(/^(\.\.\.)?_+(?=[A-Za-z$])/u, "$1"));
    }
    return names;
}

/**
 * A parameter without its top-level `= default`.
 *
 * @param {string} parameter One parameter's source text.
 * @returns {string} The binding alone.
 */
function StripDefault(parameter)
{
    let depth = 0;
    for (let i = 0; i < parameter.length; i++)
    {
        const ch = parameter[i];
        if (ch === "(" || ch === "[" || ch === "{") depth++;
        else if (ch === ")" || ch === "]" || ch === "}") depth--;
        else if (ch === "=" && depth === 0) return parameter.slice(0, i);
    }
    return parameter;
}

/**
 * Builds the message for an abstract method that was reached without an
 * implementation.
 *
 * Two names, because they answer different questions: the declaring class says
 * what the interface is, and the receiver's class says who failed to honour
 * it. When they are the same, nothing implements the interface at all, and
 * saying the name once is clearer than twice:
 *
 *     EveChildModifierBillboard2D does not implement IEveChildTransformModifier.ApplyTransform(context, transform, boneCount, bones, out).
 *     IEveVolume.GetIntensity(position) must be implemented.
 *
 * Names are registered names, never `constructor.name`, which a minifying
 * bundler rewrites.
 *
 * @param {object|Function} receiver The receiver (an instance, or a class for a static).
 * @param {Function} thrower The installed throwing body.
 * @returns {string} The message.
 */
function AbstractMessage(receiver, thrower)
{
    const record = ABSTRACT_RECORDS.get(thrower);
    const isClass = typeof receiver === "function";
    const ReceiverClass = isClass ? receiver : (receiver === null || receiver === undefined ? null : receiver.constructor);
    const receiverName = typeof ReceiverClass === "function" ? getRegisteredClassName(ReceiverClass) : null;

    const Declaring = record.Declaring ?? DeclaringClass(receiver, record.methodName, thrower);
    const declaringName = (Declaring ? getRegisteredClassName(Declaring) : null) ?? receiverName ?? "<unregistered>";
    const signature = `${declaringName}.${record.methodName}(${record.parameters.join(", ")})`;

    if (!receiverName || receiverName === declaringName) return `${signature} must be implemented.`;
    return `${receiverName} does not implement ${signature}.`;
}

/**
 * The class whose prototype (or, for a static, the class itself) holds this
 * thrower, for a thrower whose declaring class was never recorded: one on a
 * class that never registered. Walked from the receiver, so it can only find
 * an ancestor.
 *
 * @param {object|Function} receiver The receiver (an instance, or a class for a static).
 * @param {string} methodName The abstract method's name.
 * @param {Function} thrower The installed throwing body.
 * @returns {Function|null} The declaring class, or `null`.
 */
function DeclaringClass(receiver, methodName, thrower)
{
    const isClass = typeof receiver === "function";
    let current = isClass ? receiver : (receiver === null || receiver === undefined ? null : Object.getPrototypeOf(receiver));
    let found = null;
    while (current)
    {
        if (Object.hasOwn(current, methodName) && Object.getOwnPropertyDescriptor(current, methodName).value === thrower)
        {
            // The farthest holder wins: `blue.inherit` copies a thrower onto
            // its consumers, and the copy is never the declaration.
            found = isClass ? current : current.constructor;
        }
        current = Object.getPrototypeOf(current);
    }
    return found;
}

/**
 * A new throwing body for one abstract method.
 *
 * @param {string} methodName The abstract method's name.
 * @param {Function|undefined} declared The method as declared, read for its parameters.
 * @param {Function|null} Declaring The declaring class, when already known.
 * @returns {Function} The thrower.
 */
function CreateThrower(methodName, declared, Declaring)
{
    const thrower = function ()
    {
        throw new Error(AbstractMessage(this, thrower));
    };
    ABSTRACT_RECORDS.set(thrower, { methodName, parameters: ReadParameters(declared), Declaring });

    // The declared arity, so `length` checks (`blue.contextual`) see the method.
    if (typeof declared === "function") Object.defineProperty(thrower, "length", { value: declared.length });
    return thrower;
}

/**
 * The 2022-03 method-decorator half: given the declared method and its
 * context, returns the thrower that replaces it. Its declaring class is
 * recorded when the class registers (`claimAbstractMethods`), because a method
 * decorator runs before its class exists.
 *
 * @param {Function} value The declared method.
 * @param {object} context The decorator context; `kind` must be `"method"`.
 * @returns {Function} The thrower.
 */
export function decorateAbstractMethod(value, context)
{
    if (context.kind !== "method") throw new TypeError("meta.abstract only supports methods.");
    return CreateThrower(String(context.name), value, null);
}

/**
 * The imperative half (`CjsSchema.decorateMethod`, and a `define({ methods })`
 * entry): replaces `target[methodName]` with a thrower. The declaring class is
 * the target's own.
 *
 * @param {object|Function} target A prototype, or a class for a static.
 * @param {string} methodName The abstract method's name.
 * @returns {Function} The installed thrower.
 */
export function installAbstractMethod(target, methodName)
{
    if (!target || (typeof target !== "object" && typeof target !== "function"))
    {
        throw new TypeError("meta.abstract only supports methods.");
    }
    const name = String(methodName);
    const Declaring = typeof target === "function" ? target : target.constructor;
    const existing = Object.getOwnPropertyDescriptor(target, name);
    const thrower = CreateThrower(name, existing?.value ?? target[name], typeof Declaring === "function" ? Declaring : null);
    Object.defineProperty(target, name, {
        configurable: true,
        writable: true,
        enumerable: false,
        value: thrower
    });
    return thrower;
}

/**
 * Records `Constructor` as the declaring class of every abstract thrower it
 * holds as its own and that has no declaring class yet. Registration calls it,
 * before any consumer can copy the throwers (`blue.inherit`).
 *
 * @param {Function} Constructor The class being registered.
 */
export function claimAbstractMethods(Constructor)
{
    for (const holder of [ Constructor.prototype, Constructor ])
    {
        if (!holder) continue;
        for (const name of Object.getOwnPropertyNames(holder))
        {
            const value = Object.getOwnPropertyDescriptor(holder, name).value;
            const record = typeof value === "function" ? ABSTRACT_RECORDS.get(value) : undefined;
            if (record && !record.Declaring) record.Declaring = Constructor;
        }
    }
}
