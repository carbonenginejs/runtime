/**
 * Nominal composition boundary that resolves Trinity CPU batch references for
 * a concrete renderer. Implementations may return promises.
 */
export class CjsTrinityBatchResolver
{

  /** Resolves a canonical batch's material into renderer-owned pipeline inputs. */
  ResolveMaterial(_material, _batch, _context)
  {
    throw new Error("CjsTrinityBatchResolver.ResolveMaterial must be implemented by a concrete resolver.");
  }

  /** Resolves a canonical batch's geometry source into renderer-owned geometry. */
  ResolveGeometry(_geometrySource, _batch, _context)
  {
    throw new Error("CjsTrinityBatchResolver.ResolveGeometry must be implemented by a concrete resolver.");
  }

  /** Resolves a canonical batch's object data into renderer-owned bindings. */
  ResolveBindings(_batch, _objectData, _context)
  {
    throw new Error("CjsTrinityBatchResolver.ResolveBindings must be implemented by a concrete resolver.");
  }

}
