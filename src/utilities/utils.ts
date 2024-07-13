export type EnumToString<Type> = {
    [P in keyof Type]: { name: P; value: Type[P] };
};

export function escapeRegExpCharacters(value: string): string {
    return value.replace(/[-\\{}*+?|^$.,[\]()#\s]/g, "\\$&");
}

export function withTimeout<T>(promise: Promise<T>, timeout: number, onTimeout?: () => void, timeoutMessage?: string): Promise<T> {
    const timer = new Promise<T>((resolve, reject) => {
        setTimeout(() => {
            if (onTimeout) {
                onTimeout();
            }
            const message = timeoutMessage || `Promise timed out after ${timeout}ms.`;
            reject(message);
        }, timeout);
    });
    return Promise.race([promise, timer]);
}
