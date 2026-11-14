/**
 * What an editor needs about a class, beside its ClassInfo and built only when asked for.
 * Blue, readers and writers never read it: presentation changes nothing a value does.
 * @cjs Carbon keeps these as `:jessica-*:` tags in its exposure docstrings (BlueExposureMacros.h).
 */
export class CjsGraphClassUIInfo
{

  /** Class-level settings, such as `nameProperty` and `icon`. */
  settings = {};

  /**
   * One record per member name: Carbon's annotations (`group`, `description`, `hidden`, `widget`,
   * `numericRange`, `fileFilter`, `icon`, `iconColor`, `placement`, `deprecated`, `favorite`,
   * `tupleType`, `helpUrl`, `skipValidation`, `choices`), and what Carbon lacks (`label`, `step`,
   * `precision`, `min`, `max`).
   */
  members = Object.create(null);

  /**
   * Named values that are not members, with the same fields as a member's record, plus `member`,
   * the member a wrapper writes through Tr2ExternalParameter, and `convert`, an optional function
   * from the shown value to that member's. A parameter is never saved.
   */
  parameters = Object.create(null);

  /**
   * Layers one description over what is held; later fields win, member by member.
   * @cjs
   */
  Merge({ settings, members, parameters })
  {
    if (settings) Object.assign(this.settings, settings);

    for (const [ target, source ] of [ [ this.members, members ], [ this.parameters, parameters ] ])
    {
      if (!source) continue;

      for (const name of Object.keys(source)) target[name] = { ...target[name], ...source[name] };
    }
  }

  /** Stable class identity. */
  static className = "CjsGraphClassUIInfo";

}
