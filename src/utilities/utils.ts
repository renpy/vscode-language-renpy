export type EnumToString<Type> = {
    [P in keyof Type]: { name: P; value: Type[P] };
};

export function escapeRegExpCharacters(value: string): string {
    return value.replace(/[-\\{}*+?|^$.,[\]()#\s]/g, "\\$&");
}

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
