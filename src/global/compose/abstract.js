// Installs the body of a method that an implementer must supply.
//
// The throwing body was previously written by hand at every site - four video
// decoder interfaces and the interface roots in `global/interfaces` carry twenty
// or so identical `throw new Error("X.Y must be implemented.")` lines, each one
// repeating a class name that a rename would silently desynchronise, and each
// one paired with an `@impl.abstract` marker that has to agree with it.
//
// `@impl.abstract` still DESCRIBES the method; this INSTALLS it. Both are
// applied, which is the split `CjsSchema.compose` exists to keep.

/**
 * Builds the message for a method that was reached without an implementation.
 *
 * Two names, because they answer different questions: the declaring class says
 * what the interface is, and the runtime class says who failed to honour it.
 * When they match, nothing real is installed behind the interface at all, and
 * saying so once is clearer than saying it twice.
 *
 * Names come from the registered class name rather than `constructor.name`,
 * which a minifying bundler rewrites - a shipped consumer would otherwise read
 * `e.GetResource must be implemented`.
 */
function AbstractMessage(getClassName, instance, thrower, methodName)
{
    const isClass = typeof instance === "function";
    const runtimeName = isClass ? getClassName(instance) : (instance?.constructor ? getClassName(instance.constructor) : null);
    const Declaring = DeclaringClass(instance, methodName, thrower);
    const declaring = (Declaring ? getClassName(Declaring) : null) || runtimeName || "<unregistered>";

    if (!runtimeName || runtimeName === declaring)
    {
        return `${declaring}.${methodName} must be implemented.`;
    }
    return `${runtimeName} does not implement ${declaring}.${methodName}.`;
}

/**
 * The class whose prototype (or, for a static, the class itself) holds this
 * thrower. Found when the thrower runs, because neither decorator form can
 * name it earlier: `decorateMethod` runs before `define` registers the
 * name, and a 2022 method decorator's initializer sees whichever instance is
 * constructed first, often a subclass.
 *
 * @param {object|Function} instance The receiver (an instance, or a class for a static).
 * @param {string} methodName The abstract method's name.
 * @param {Function} thrower The installed throwing body.
 * @returns {Function|null} The declaring class, or `null`.
 */
function DeclaringClass(instance, methodName, thrower)
{
    const isClass = typeof instance === "function";
    let current = isClass ? instance : (instance === null || instance === undefined ? null : Object.getPrototypeOf(instance));
    while (current)
    {
        if (Object.hasOwn(current, methodName) && Object.getOwnPropertyDescriptor(current, methodName).value === thrower)
        {
            return isClass ? current : current.constructor;
        }
        current = Object.getPrototypeOf(current);
    }
    return null;
}

/**
 * Creates the `@compose.abstract` method decorator.
 *
 * @param {(Constructor: Function) => string|null} getClassName Registered-name resolver.
 * @returns {Function} The decorator.
 */
export function composeAbstractDecorator(getClassName)
{
    return function (value, context)
    {
        // The 2022 decorator form: a method decorator receives the function and
        // a context carrying its name and kind.
        if (context && typeof context === "object" && "kind" in context)
        {
            if (context.kind !== "method")
            {
                throw new TypeError("compose.abstract only supports methods.");
            }
            const methodName = String(context.name);
            const thrower = function (...args)
            {
                throw new Error(AbstractMessage(getClassName, this, thrower, methodName));
            };
            return thrower;
        }

        // The legacy form used by `CjsSchema.decorateMethod`, which hands over a
        // prototype and a name rather than a function and a context.
        const prototype = value;
        const methodName = String(context);
        if (!prototype || typeof prototype !== "object")
        {
            throw new TypeError("compose.abstract only supports methods.");
        }
        const thrower = function (...args)
        {
            throw new Error(AbstractMessage(getClassName, this, thrower, methodName));
        };
        Object.defineProperty(prototype, methodName, {
            configurable: true,
            writable: true,
            enumerable: false,
            value: thrower
        });
        return undefined;
    };
}
