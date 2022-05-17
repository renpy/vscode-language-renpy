// This index is used to make it easier to detect what type of token is currently used.
// This also makes sure that token types wont have overlapping ID's.
declare const enum TokenTypeIndex {
    Error = 0,
    KeywordStart = 1,
    EntityStart = 1001,
    ConstantStart = 2001,
    OperatorsStart = 3001,
    CharactersStart = 4001,
    EscapedCharacterStart = 5001,
    MetaStart = 6001,
    UnknownCharacterID = 9998,
    InvalidTokenID = 9999,
}

declare const enum KeywordTokenType {
    // Python statement keywords
    Init = TokenTypeIndex.KeywordStart,
    Python,
    Hide,
    Early,
    Define,
    Default,

    // Renpy keywords
    Label,
    Play,
    Pause,
    Screen,
    Scene,
    Show,
    Image,
    Transform,

    // Renpy sub expression keywords
    Set,
    Expression,
    Sound,
    At,
    With,
    From,
    DollarSign,

    // Conditional control flow keywords
    If,
    Elif,
    Else,

    // Control flow keywords
    For,
    While,
    Pass,
    Return,
    Menu,
    Jump,
    Call,
}

declare const enum EntityTokenType {
    Class = TokenTypeIndex.EntityStart,
    Namespace,
    Function,
    Tag,
    Variable,
}

declare const enum ConstantTokenType {
    String = TokenTypeIndex.ConstantStart,
    UnquotedString,

    Color,

    Integer,
    Float,

    Boolean,
}

declare const enum OperatorTokenType {
    // Arithmetic operators
    Plus = TokenTypeIndex.OperatorsStart, // +
    Minus, // -
    Multiply, // *
    Divide, // /
    Modulo, // %
    Exponentiate, // **
    FloorDivide, // //

    // Bitwise operators
    BitwiseAnd, // &
    BitwiseOr, // |
    BitwiseXOr, // ^
    BitwiseNot, // ~
    BitwiseLeftShift, // <<
    BitwiseRightShift, // >>

    // Assignment operators
    Assign, // =
    PlusAssign, // +=
    MinusAssign, // -=
    MultiplyAssign, // *=
    DivideAssign, // /=
    ModuloAssign, // %=
    ExponentiateAssign, // **=
    FloorDivideAssign, // //=
    BitwiseAndAssign, // &=
    BitwiseOrAssign, // |=
    BitwiseXOrAssign, // ^=
    BitwiseLeftShiftAssign, // <<=
    BitwiseRightShiftAssign, // >>=

    // Comparison operators
    Equals, // ==
    NotEquals, // !=
    GreaterThan, // >
    LessThan, // <
    GreaterThanEquals, // >=
    LessThanEquals, // <=

    And, // and
    Or, // or
    Not, // not

    Is, // is
    IsNot, // is not

    In, // in
    NotIn, // not in
}

declare const enum CharacterTokenType {
    Unknown = TokenTypeIndex.UnknownCharacterID,
    // Expression characters
    OpenParentheses = TokenTypeIndex.CharactersStart,
    CloseParentheses,

    OpenBracket,
    CloseBracket,

    OpenSquareBracket,
    CloseSquareBracket,

    // Other characters
    WhiteSpace, // Tab or space

    Colon,
    Semicolon,
    Comma,

    Hashtag,

    Quote,
    DoubleQuote,
    BackQuote,

    Backslash,

    NewLine,
}

// Only valid inside strings
declare const enum EscapedCharacterTokenType {
    Escaped_Whitespace = TokenTypeIndex.EscapedCharacterStart, // \
    Escaped_Newline, // \n

    Escaped_Quote, // \'
    Escaped_DoubleQuote, // \"
    Escaped_Backslash, // \\
    Escaped_OpenSquareBracket, // [[
    Escaped_OpenBracket, // {{
}

declare const enum MetaTokenType {
    Invalid = TokenTypeIndex.InvalidTokenID,
    Comment = TokenTypeIndex.MetaStart,
    CommentCodeTag,
    PythonLine,
    PythonBlock,
    Arguments,

    TagBlock,
    Placeholder,
    Block,
    EmptyString,
}

declare type TokenType = KeywordTokenType | EntityTokenType | MetaTokenType | ConstantTokenType | OperatorTokenType | CharacterTokenType | EscapedCharacterTokenType;

declare type TokenPatternCapture = {
    readonly [k: string | number]: { readonly token?: TokenType; readonly patterns?: TokenPatternArray };
};

interface TokenMatchPattern {
    readonly token?: TokenType;
    readonly match: RegExp;
    readonly captures?: TokenPatternCapture;

    // These are added to prevent falsy assignment
    include?: never;
    patterns?: never;
    contentToken?: never;
    begin?: never;
    beginCaptures?: never;
    end?: never;
    endCaptures?: never;
}

interface TokenRangePattern {
    readonly token?: TokenType;
    readonly contentToken?: TokenType;

    readonly begin: RegExp;
    readonly beginCaptures?: TokenPatternCapture;

    readonly end: RegExp;
    readonly endCaptures?: TokenPatternCapture;

    readonly patterns?: TokenPatternArray;

    // These are added to prevent falsy assignment
    include?: never;
    match?: never;
    captures?: never;
}

interface TokenIncludePattern {
    readonly include: TokenPattern;

    // These are added to prevent falsy assignment
    patterns?: never;
    token?: never;
    contentToken?: never;
    match?: never;
    begin?: never;
    end?: never;
    captures?: never;
    beginCaptures?: never;
    endCaptures?: never;
}

interface TokenRepoPattern {
    readonly patterns: TokenPatternArray;

    // These are added to prevent falsy assignment
    include?: never;
    token?: never;
    contentToken?: never;
    match?: never;
    begin?: never;
    end?: never;
    captures?: never;
    beginCaptures?: never;
    endCaptures?: never;
}

declare type TokenPatternArray = Array<TokenIncludePattern | TokenRangePattern | TokenMatchPattern>;
declare type TokenPattern = TokenIncludePattern | TokenRangePattern | TokenMatchPattern | TokenRepoPattern;
