import { CJS_CLASS_NAME, CJS_ENUM_NAME, CJS_MODEL_BRAND, CjsSchema } from "./CjsSchema.js";

// Namespace decorators re-exported as named bindings so consumers can write
// `import { type, io } from ".../schema"` and `@type.string` instead of `@CjsSchema.type.string`.
const { type, io, jessica, impl, carbon, components } = CjsSchema;

export {
    carbon,
    components,
    CJS_CLASS_NAME,
    CJS_ENUM_NAME,
    CJS_MODEL_BRAND,
    CjsSchema,
    CjsSchema as schema,
    impl,
    io,
    jessica,
    type
};

export * from "./types/carbonTypes.js";
