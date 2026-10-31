export class NotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(`Inte implementerat ännu: ${provider}.${method}`);
    this.name = "NotImplementedError";
  }
}
