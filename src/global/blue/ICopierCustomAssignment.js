// Source: blueexposure/include/ICopier.h
import { CjsSchema, compose, impl } from "#schema";

/**
 * `ICopierCustomAssignment` - copies data a class holds outside its exposed
 * members, per blueexposure/include/ICopier.h. Carbon's lists and dicts
 * implement it; here list and map FIELDS are copied by the copier itself, so a
 * class implements it only for state it keeps outside its schema.
 */
export class ICopierCustomAssignment
{
  /**
   * `AssignTo` - copy this object's unexposed state onto `other`, which is
   * guaranteed to be the same class.
   *
   * @param {object} _other The destination, already member-copied.
   * @param {ICopier} _copier The copier running this copy, for nested objects.
   * @returns {boolean} False to fail the copy.
   */
  AssignTo(_other, _copier) {}
}

CjsSchema.decorateMethod(ICopierCustomAssignment, "AssignTo", compose.abstract, impl.abstract);

CjsSchema.define(ICopierCustomAssignment, {
  className: "ICopierCustomAssignment", carbon: "ICopierCustomAssignment", family: "blue", fields: {}
});
