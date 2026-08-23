const VALUE_NAME = /\bvalue\d+(?:_[xyzw])?\b/g;

/**
 * Hoists arm-local value declarations that are referenced outside their
 * lexical scope. SSA may legally resolve a post-join read to one arm's
 * definition (the other path diverges through return/discard), but structured
 * WGSL scoping requires the declaration to dominate the read lexically. Each
 * escaping declaration becomes an uninitialized function-top `var` (WGSL
 * zero-initializes function-scope var) plus an in-place assignment; the value
 * is never read on a path that did not assign it, so the zero initial value is
 * unobservable.
 *
 * @param {Array<object>} statements Mutable typed statement tree.
 * @returns {Array<object>} The statement list, with hoisted declarations prepended.
 */
export function hoistEscapingValues(statements)
{
    const declared = new Map();
    const escapes = new Set();

    (function walk(list, scopes)
    {
        const scope = new Set();
        scopes.push(scope);
        for (let index = 0; index < list.length; index += 1)
        {
            const statement = list[index];
            const codes = [];
            if (statement.condition?.code) codes.push(statement.condition.code);
            if (statement.expression?.code) codes.push(statement.expression.code);
            for (const code of codes)
            {
                for (const name of code.match(VALUE_NAME) || [])
                {
                    if (declared.has(name) && !scopes.some((entry) => entry.has(name))) escapes.add(name);
                }
            }
            if ((statement.kind === "let" || statement.kind === "var") && statement.name)
            {
                scope.add(statement.name);
                declared.set(statement.name, { list, index, statement });
            }
            if (statement.kind === "if")
            {
                walk(statement.statements, scopes);
                if (statement.elseStatements) walk(statement.elseStatements, scopes);
            }
            if (statement.kind === "switch")
            {
                for (const clause of statement.clauses) walk(clause.statements, scopes);
            }
            if (statement.kind === "loop")
            {
                walk(statement.statements, scopes);
                if (statement.continuing) walk(statement.continuing, scopes);
            }
        }
        scopes.pop();
    })(statements, []);

    if (!escapes.size) return statements;
    const hoists = [];
    for (const name of escapes)
    {
        const entry = declared.get(name);
        hoists.push({ kind: "var", name, type: entry.statement.type, expression: null });
        entry.list[entry.index] = {
            kind: "value-assignment",
            instructionIndex: entry.statement.instructionIndex,
            dxbcOffset: entry.statement.dxbcOffset,
            name,
            type: entry.statement.type,
            expression: entry.statement.expression
        };
    }
    return [ ...hoists, ...statements ];
}
