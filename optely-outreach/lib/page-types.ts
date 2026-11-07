/** Sidprops för rutter (fungerar även innan Next har genererat sina rutt-typer). */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export type IdParams = Promise<{ id: string }>;
