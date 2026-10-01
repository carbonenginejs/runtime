// Source: blueexposure/include/ICustomPersist.h:13-20
// Source: blueexposure/InterfaceDefinitions.cpp:23
import { CjsSchema, meta } from "#schema";


/**
 * Supplies storage for a member's custom persisted binary data. Carbon derives
 * this interface from IRoot; JavaScript uses Blue's plain registered interface.
 * Native parameter positions are retained as abstract obligations. Concrete
 * implementations retain their documented JavaScript buffer representations;
 * this contract supplies no pointer or output-argument adapter.
 */
export class ICustomPersist
{
  /**
   * Provides the bytes and used byte count for a named member.
   * Native signature: void GetWriteBufferAndSize(const char* memberName,
   * unsigned char** buffer, size_t* bufferSize) = 0.
   * The two output arguments describe native pointer outputs; this abstract
   * declaration does not prescribe a JavaScript output-slot representation.
   * @param {string} _memberName The persisted member's name.
   * @param {*} _buffer Native output argument for the byte pointer.
   * @param {*} _bufferSize Native output argument for the used byte count.
   * @returns {void} Native result; concrete JavaScript return adaptations remain class-owned.
   */
  GetWriteBufferAndSize(_memberName, _buffer, _bufferSize)
  {
  }

  /**
   * Releases the buffer supplied to a writer, according to the concrete owner.
   * Native signature: void ReleaseWriteBuffer(unsigned char* buffer) = 0.
   * Carbon supplies no default release behavior on this interface.
   * @param {*} _buffer The concrete implementation's write-buffer representation.
   * @returns {void}
   */
  ReleaseWriteBuffer(_buffer)
  {
  }

  /**
   * Allocates writable storage for the requested byte count.
   * Native signature: unsigned char* AllocateReadBuffer(const char* memberName,
   * size_t bufferSize) = 0. The concrete implementation owns the JavaScript
   * representation of the returned writable byte pointer.
   * @param {string} _memberName The persisted member's name.
   * @param {number} _bufferSize Requested storage size in bytes.
   * @returns {*} The concrete implementation's writable buffer representation.
   */
  AllocateReadBuffer(_memberName, _bufferSize)
  {
  }

  /**
   * Accepts filled storage and the number of bytes used for the named member.
   * Native signature: void SetBufferAndSize(const char* memberName,
   * unsigned char* buffer, size_t bufferSize) = 0. The used byte count may be
   * smaller than the allocation; ownership after this call is class-specific.
   * @param {string} _memberName The persisted member's name.
   * @param {*} _buffer The concrete implementation's filled buffer representation.
   * @param {number} _bufferSize Used byte count.
   * @returns {void}
   */
  SetBufferAndSize(_memberName, _buffer, _bufferSize)
  {
  }
}

for (const method of [ "GetWriteBufferAndSize", "ReleaseWriteBuffer", "AllocateReadBuffer", "SetBufferAndSize" ])
{
  CjsSchema.decorateMethod(ICustomPersist, method, meta.compose.abstract, meta.impl.abstract);
}
// Carbon defines an IID, not a class factory. JavaScript registers the interface
// constructor so named declarations and nominal composition resolve one identity.
CjsSchema.define(ICustomPersist, {
  className: "ICustomPersist", carbon: "ICustomPersist", family: "blue", fields: {}
});
