/* eslint-disable no-shadow */
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
    OpenParentheses = TokenTypeIndex.CharactersStart, // (
    CloseParentheses, // )

    OpenBracket, // {
    CloseBracket, // }

    OpenSquareBracket, // [
    CloseSquareBracket, // ]

    // Other characters
    WhiteSpace, // Tab or space
    NewLine,

    Colon, // :
    Semicolon, // ;
    Comma, // ,
    Hashtag, // #

    Quote, // '
    DoubleQuote, // "
    BackQuote, // `

    Backslash, // \
    ForwardSlash, // /
}

// Only valid inside strings
declare const enum EscapedCharacterTokenType {
    EscWhitespace = TokenTypeIndex.EscapedCharacterStart,
    EscNewline, // \n

    EscQuote, // \'
    EscDoubleQuote, // \"
    EscBackslash, // \\
    EscOpenSquareBracket, // [[
    EscOpenBracket, // {{
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
