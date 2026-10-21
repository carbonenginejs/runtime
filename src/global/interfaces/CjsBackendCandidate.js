import { CjsSchema, meta } from "../schema/index.js";

/**
 * Dependency-free participant in runtime backend selection.
 *
 * This is deliberately not a device or RHI abstraction. A concrete backend
 * proves itself and returns an opaque backend-owned result to composition.
 */
export class CjsBackendCandidate
{

    name = "";

    limits = null;

    features = null;

    /**
     * Proves this candidate against one resolved composition context.
     *
     * @param {object} _context - Backend-selection context.
     * @returns {*} Backend-owned proof result.
     */
    Prove(_context) {}

}

CjsSchema.decorateMethod(CjsBackendCandidate, "Prove", meta.abstract);

CjsSchema.meta.define("CjsBackendCandidate")(CjsBackendCandidate);
