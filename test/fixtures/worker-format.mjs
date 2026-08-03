export class CjsTestWorkerFormat
{
  static async readAsync(input, options = {}, context = null) {
    return {
      bytes: Array.from(input),
      context,
      options,
      worker: true
    };
  }
}
