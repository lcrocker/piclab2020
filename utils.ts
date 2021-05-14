
export function hasKeys<T, K extends string | number | symbol>(obj: T, keys: K | K[]): obj is T & { [_P in K]: unknown } {
    return null !== obj && (Array.isArray(keys) ? keys.every((k) => k in Object(obj)) : keys in Object(obj));
    // return Array.isArray(keys) ? keys.every((k) => k in obj) : keys in obj;
}

export interface JsonMap { [x: string]: string | number | boolean | null | JsonArray | JsonMap }
export type JsonArray = Array<string | number | boolean | null | JsonArray | JsonMap>;
export type Jsonable = JsonMap | JsonArray | string | number | boolean;
