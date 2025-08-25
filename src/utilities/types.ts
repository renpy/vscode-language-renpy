/**
 * Converts an `enum` type to an array of objects with name and value properties.
 */
export type EnumToString<Type> = {
    [P in keyof Type]: { name: P; value: Type[P] };
};
