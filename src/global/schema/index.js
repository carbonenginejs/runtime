import { CJS_CLASS_NAME, CJS_ENUM_NAME, CjsSchema } from "./CjsSchema.js";

/** Decorators grouped by vocabulary ownership; stored schema records are unchanged. */
const { meta } = CjsSchema;

export { CJS_CLASS_NAME, CJS_ENUM_NAME, CjsSchema, CjsSchema as schema, meta };
export * from "./types/carbonTypes.js";
export * from "./hydration.js";
