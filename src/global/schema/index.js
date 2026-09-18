import { CJS_CLASS_NAME, CJS_ENUM_NAME, CJS_MODEL_BRAND, CjsSchema } from "./CjsSchema.js";

// Namespace decorators re-exported as named bindings so consumers can write
// `import { type, edit } from ".../schema"` and `@type.string` instead of `@CjsSchema.type.string`.
const { type, edit, lifecycle, invalidation, jessica, impl, carbon, components, compose } = CjsSchema;

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
    invalidation,
    jessica,
    lifecycle,
    type
};

export * from "./types/carbonTypes.js";
export * from "./hydration.js";
