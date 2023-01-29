/* eslint-disable no-shadow */
// This index is used to make it easier to detect what type of token is currently used.
// This also makes sure that token types wont have overlapping ID's.
export const enum TokenTypeIndex {
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

export const enum KeywordTokenType {
    // Python statement keywords
    Init = TokenTypeIndex.KeywordStart,
    Python,
    Hide,
    Early,
    Define,
    Default,

    // Renpy keywords
    Label,
    Menu,
    Pause,
    Screen,
    Scene,
    Camera,
    Show,
    Image,
    LayeredImage,
    Window,
    Transform,
    Translate,
    Extend,
    NVLClear,

    // Audio
    Voice,
    Sound,
    Play,
    Queue,
    Stop,
    Fadeout,

    // Renpy sub expression keywords
    Set,
    Expression,
    At,
    As,
    With,
    OnLayer,
    ZOrder,
    Behind,
    Animation,
    From,
    Time,
    Repeat,
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
    Jump,
    Call,
    Contains,
    Parallel,
    Block,
    Choice,

    // ATL keywords
    Warp,
    Circles,
    Clockwise,
    Counterclockwise,
    Event,
    On,
    Function,
}

export const enum EntityTokenType {
    Class = TokenTypeIndex.EntityStart,
    Namespace,
    FunctionName,
    Tag,
    VariableName,

    // ATL entities
    EventName,
    PropertyName,
}

export const enum LiteralTokenType {
    String = TokenTypeIndex.ConstantStart,
    UnquotedString,

    Color,

    Integer,
    Float,

    Boolean,
}

export const enum OperatorTokenType {
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

export const enum CharacterTokenType {
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

    Period, // .
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
export const enum EscapedCharacterTokenType {
    EscWhitespace = TokenTypeIndex.EscapedCharacterStart,
    EscNewline, // \n

    EscQuote, // \'
    EscDoubleQuote, // \"
    EscBackslash, // \\
    EscOpenSquareBracket, // [[
    EscOpenBracket, // {{
}

export const enum MetaTokenType {
    Invalid = TokenTypeIndex.InvalidTokenID,
    Comment = TokenTypeIndex.MetaStart,
    CodeBlock,

    PythonLine,
    PythonBlock,
    Arguments,

    CommentCodeTag,
    EmptyString,
    TagBlock,
    Placeholder,

    MenuStatement,
    MenuBlock,
    MenuOption,
    MenuOptionBlock,

    CameraStatement,
    SceneStatement,
    ShowStatement,
    ImageStatement,

    NarratorSayStatement,
    SayStatement,
    CharacterNameString,

    CallStatement,
    JumpStatement,

    PlayAudioStatement,
    StopAudioStatement,

    LabelStatement,
    LabelCall,
    LabelAccess,

    AtStatement,
    AsStatement,
    WithStatement,

    ATLBlock,
    ATLChoiceBlock,
    ATLContains,
    ATLWith,
    ATLEvent,
    ATLFunction,
    ATLWarper,
    ATLOn,
}

export type TokenType = KeywordTokenType | EntityTokenType | MetaTokenType | LiteralTokenType | OperatorTokenType | CharacterTokenType | EscapedCharacterTokenType;
