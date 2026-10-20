/**
 * Character libraries, typed records, CPU appearance planning and native scene classes.
 *
 * The library builder accepts decoded inputs; the manager hydrates the prepared
 * schema-v11 graph. Resolution and planning retain source identity and diagnostics.
 * This entry exposes no character creator or rendering backend. Resource decoding
 * stays in the resource layer; library-builder accepts injected acquisition.
 */

export { CjsCharacterLibraryBuilder } from "./library-builder/CjsCharacterLibraryBuilder.js";
export { CjsCharacterLibrary } from "./library/CjsCharacterLibrary.js";
export { CjsCharacterLibraryDocuments } from "./library/CjsCharacterLibraryDocuments.js";
export { CjsCharacterLibraryManager } from "./library/CjsCharacterLibraryManager.js";
export { CjsCharacterUnresolvedRelationship } from "./library/CjsCharacterUnresolvedRelationship.js";
export * from "./model/index.js";
export { CjsCharacterRigBinding } from "./controls/CjsCharacterRigBinding.js";
export * from "./generated/index.js";
export * from "./trinity/index.js";
