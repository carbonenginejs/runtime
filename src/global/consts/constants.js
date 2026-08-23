/**
 * Small WebGL numeric constants used by the typed-array pool helpers.
 *
 * These stay local to keep the math subpaths independently browser-friendly:
 * importing the old ccpwgl `constant` alias would pull the package back toward
 * an application-specific module graph.
 */

export const GL_BYTE = 5120;
export const GL_UNSIGNED_BYTE = 5121;
export const GL_SHORT = 5122;
export const GL_UNSIGNED_SHORT = 5123;
export const GL_INT = 5124;
export const GL_UNSIGNED_INT = 5125;
export const GL_FLOAT = 5126;
