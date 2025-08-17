/**
 * Converts an `enum` type to an array of objects with name and value properties.
 */
export type EnumToString<Type> = {
    [P in keyof Type]: { name: P; value: Type[P] };
};

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

/**
 * Wraps a promise with a timeout. If the promise does not resolve or reject
 * within the specified time, it will be rejected with a timeout error.
 *
 * @template T The type of the promise's resolution value.
 * @param promise The promise to which the timeout will be applied.
 * @param timeout The timeout duration in milliseconds.
 * @param onTimeout An optional callback function to execute when the timeout occurs.
 * @param timeoutMessage An optional custom message for the rejection error on timeout.
 * @returns A new promise that either resolves with the original promise's value
 * or rejects if the timeout is exceeded.
 * @throws Rejects with a timeout message if the promise does not settle within the specified time.
 * @example
 * async function fetchData() {
 *   // Simulate a network request that takes 5 seconds
 *   return new Promise(resolve => setTimeout(() => resolve('Data received'), 5000));
 * }
 *
 * async function run() {
 *   try {
 *     // This will time out because the timeout (2000ms) is less than the task duration (5000ms)
 *     const data = await withTimeout(fetchData(), 2000);
 *     console.log(data);
 *   } catch (error) {
 *     console.error(error); // Expected output: "Promise timed out after 2000ms."
 *   }
 * }
 *
 * run();
 */
export async function withTimeout<T>(promise: Promise<T>, timeout: number, onTimeout?: () => void, timeoutMessage?: string): Promise<T> {
    let timerId: NodeJS.Timeout;
    const timer = new Promise<T>((_, reject) => {
        timerId = setTimeout(() => {
            if (onTimeout) {
                onTimeout();
            }
            const message = timeoutMessage || `Promise timed out after ${timeout}ms.`;
            reject(message);
        }, timeout);
    });

    return await Promise.race([promise, timer]).then((result) => {
        clearTimeout(timerId);
        return result;
    });
}
