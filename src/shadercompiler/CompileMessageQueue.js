// Source: trinity/shadercompiler/CompileMessageQueue.h
// Source: trinity/shadercompiler/CompileMessageQueue.cpp

/**
 * Compiler errors and warnings: Carbon's `CompileMessageQueue`.
 *
 * Adapted: Carbon queues messages to a thread that prints each distinct
 * message to stdout once. A browser library neither prints nor runs that
 * thread, so `Flush` runs Carbon's `OutputMessages` on the queue itself and
 * appends each line Carbon would print to `output`, handing it to the optional
 * listener as well. Carbon has one global queue, `g_messages`; each
 * compilation here gets its own, so concurrent compiles do not mix messages.
 */
export class CompileMessageQueue
{
    /** Not in Carbon: stands in for stdout. */
    _listener = null;

    /** Carbon's `m_messages`: queued, not yet output. @type {string[]} */
    _messages = [];

    /** Carbon's `m_printedMessages`. @type {Set<string>} */
    _printedMessages = new Set();

    /** Carbon's `m_entryFileName`. */
    _entryFileName = "";

    /**
     * Not in Carbon: the lines Carbon prints with `printf( "%s\n" )`,
     * without their newline, in order.
     *
     * @type {string[]}
     */
    output = [];

    /**
     * @param {((message: string) => void)|null} [listener=null] Called with each line Carbon would print.
     */
    constructor(listener = null)
    {
        this._listener = listener;
    }

    /**
     * Carbon's `AddMessage( const char* format, ... )`. JavaScript callers
     * format the text first, so this takes the result: Carbon's own callers
     * with a single string pass it as `"%s"`, which reads it as a C string up
     * to its first NUL.
     *
     * @param {string} message The formatted message.
     */
    AddMessage(message)
    {
        const nul = message.indexOf("\u0000");
        this._messages.push(nul < 0 ? message : message.slice(0, nul));
    }

    /**
     * Carbon's `Flush`: returns once every queued message has been output.
     */
    Flush()
    {
        while (this._messages.length > 0)
        {
            const buffer = this._messages.shift();
            // Carbon's `std::string` was sized for `vsnprintf`'s terminator
            // and keeps it, so its size is one past the text.
            this._OutputMessages(buffer, buffer.length + 1);
        }
    }

    /**
     * Carbon's `SetEntryFileName`: the name `OutputMessages` puts in place of
     * the in-memory source's `\memory` path.
     *
     * @param {string} fileName The entry file's name.
     */
    SetEntryFileName(fileName)
    {
        this._entryFileName = fileName;
    }

    /** @returns {string} The entry file's name. */
    GetEntryFileName()
    {
        return this._entryFileName;
    }

    /**
     * Carbon's private `OutputMessages`: splits a buffer into messages at
     * each newline followed by a non-space, outputs each distinct message
     * once, and replaces the source path up to `memory(` or `memory:` with the
     * entry file name.
     *
     * Quirk (CompileMessageQueue.cpp:148-156; Carbon known defect CE-94): the
     * replacement looks for `memory:` anywhere in the message, so a message
     * such as `#error out of memory: x` loses everything before that `:` too.
     *
     * @param {string} messages The buffer; reads past its end are NUL.
     * @param {number} length Carbon's `length`.
     */
    _OutputMessages(messages, length)
    {
        const at = i => (i < messages.length ? messages.charCodeAt(i) : 0);
        let start = 0;
        let end = 1;
        while (at(start) !== 0 && start < length)
        {
            if (at(end) === 0 || end >= length || (at(end) === 10 && (end + 1 >= length || !isSpace(at(end + 1)))))
            {
                let message = messages.slice(start, end);
                if (!this._printedMessages.has(message))
                {
                    this._printedMessages.add(message);
                    for (const memoryRef of ["\\memory(", "/memory(", "/memory:", "memory:"])
                    {
                        const pos = message.indexOf(memoryRef);
                        if (pos >= 0)
                        {
                            message = this._entryFileName + message.slice(pos + memoryRef.length - 1);
                        }
                    }
                    this.output.push(message);
                    if (this._listener)
                    {
                        this._listener(message);
                    }
                }
                if (at(end) === 0)
                {
                    return;
                }
                start = end + 1;
            }
            ++end;
        }
    }

    /**
     * Not in Carbon: every message so far, as Carbon would print it. Flushes
     * first.
     *
     * @returns {string[]} The output lines.
     */
    GetMessages()
    {
        this.Flush();
        return this.output;
    }
}

/**
 * C `isspace` in the "C" locale.
 *
 * @param {number} code A character code.
 * @returns {boolean} Whether it is white space.
 */
function isSpace(code)
{
    return code === 32 || (code >= 9 && code <= 13);
}
