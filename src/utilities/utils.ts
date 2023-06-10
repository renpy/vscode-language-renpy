export type EnumToString<Type> = {
    [P in keyof Type]: { name: P; value: Type[P] };
};
