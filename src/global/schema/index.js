import { CJS_CLASS_NAME, CJS_ENUM_NAME, CJS_MODEL_BRAND, CjsSchema } from "./CjsSchema.js";

// Namespace decorators re-exported as named bindings so consumers can write
// `import { type, edit } from ".../schema"` and `@type.string` instead of `@CjsSchema.type.string`.
const { type, meta, edit, lifecycle, jessica, impl, carbon, components, compose } = CjsSchema;
const types = type;

export {
    carbon,
    compose,
    components,
    CJS_CLASS_NAME,
    CJS_ENUM_NAME,
    CJS_MODEL_BRAND,
    CjsSchema,
    CjsSchema as schema,
    impl,
    edit,
    jessica,
    lifecycle,
    meta,
    type,
    types
};

export * from "./types/carbonTypes.js";
export * from "./hydration.js";
