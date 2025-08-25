/**
 * Escapes characters in a string that have a special meaning in regular expressions.
 * This allows the string to be used as a literal part of a regular expression pattern.
 *
 * @param value The input string containing characters to be escaped.
 * @returns A new string with special regular expression characters escaped.
 * @example
 * const unsafeString = "c:\\(path)*";
 * const safeString = escapeRegExpCharacters(unsafeString);
 * // safeString is "c:\\\\\(path\)\*"
 * const regex = new RegExp(safeString);
 */
export function escapeRegExpCharacters(value: string): string {
    return value.replace(/[-\\{}*+?|^$.,[\]()#\s]/g, "\\$&");
}
