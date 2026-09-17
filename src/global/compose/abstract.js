// Installs the body of a method that an implementer must supply.
//
// The throwing body was previously written by hand at every site - four video
// decoder interfaces and the interface roots in `global/contracts` carry twenty
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
function AbstractMessage(getClassName, instance, declaringName, methodName)
{
    const runtimeName = instance?.constructor
        ? (getClassName(instance.constructor) || instance.constructor.name || null)
        : null;
    const declaring = declaringName || runtimeName || "<unregistered>";

    if (!runtimeName || runtimeName === declaring)
    {
        return `${declaring}.${methodName} must be implemented.`;
    }
    return `${runtimeName} does not implement ${declaring}.${methodName}.`;
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
            let declaringName = null;
            context.addInitializer?.(function ()
            {
                // Runs with `this` as the instance (or the class, for a static),
                // which is the first moment the declaring class is knowable.
                const Constructor = typeof this === "function" ? this : this?.constructor;
                declaringName = declaringName
                    || (Constructor ? getClassName(Constructor) || Constructor.name : null);
            });
            return function (...args)
            {
                throw new Error(AbstractMessage(getClassName, this, declaringName, methodName));
            };
        }

        // The legacy form used by `CjsSchema.decorateMethod`, which hands over a
        // prototype and a name rather than a function and a context.
        const prototype = value;
        const methodName = String(context);
        if (!prototype || typeof prototype !== "object")
        {
            throw new TypeError("compose.abstract only supports methods.");
        }
        const declaringName = prototype.constructor
            ? getClassName(prototype.constructor) || prototype.constructor.name
            : null;
        Object.defineProperty(prototype, methodName, {
            configurable: true,
            writable: true,
            enumerable: false,
            value: function (...args)
            {
                throw new Error(AbstractMessage(getClassName, this, declaringName, methodName));
            }
        });
        return undefined;
    };
}
