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
    EOFTokenID = 9996,
    DeprecatedTokenID = 9997,
    UnknownCharacterID = 9998,
    InvalidTokenID = 9999,
}

export const enum KeywordTokenType {
    // Python statement keywords
    Init = TokenTypeIndex.KeywordStart,
    Offset,
    Python,
    Hide,
    Early,
    Define,
    Default,

    // Renpy keywords
    Label,
    Menu,
    Pause,
    Style,
    Screen,
    Scene,
    Camera,
    Show,
    Auto,
    Image,
    Layeredimage,
    Window,
    Frame,
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
    Animation,
    From,
    Time,
    Repeat,
    DollarSign,
    Sensitive,
    Text,
    Other,
    OtherPython,
    OtherAudio,
    Layer,
    Always,
    Group,
    Attribute,
    Nopredict,

    // Renpy style sub-expression keywords
    Take,
    Del,
    Clear,
    Variant,

    // Renpy screen sub-expression keywords
    Vbox,
    Hbox,
    Fixed,

    // Renpy control flow keywords
    At,
    As,
    With,
    Onlayer,
    Zorder,
    Behind,

    // Conditional control flow keywords
    If,
    Elif,
    Else,

    // Control flow keywords
    In, // in
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

    // Python keywords
    Import,
    Class,
    Metaclass,
    Lambda,
    Async,
    Def,
    Global,
    Nonlocal,
}

export const enum EntityTokenType {
    ClassName = TokenTypeIndex.EntityStart,
    InheritedClassName,
    TypeName,
    NamespaceName,
    FunctionName,
    TagName,
    Identifier,

    // Renpy entities
    StyleName,
    TransformName,
    ImageName,
    TextName,
    AudioName,
    CharacterName,
    LayeredimageName,
    LanguageName,

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
    Assignment, // =
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

    NotIn, // not in

    Unpacking, // * or **
    PositionalParameter, // /

    // Regex operators
    Quantifier, // [+*?]\??
    Disjunction, // |
    Negation, // ^
    Lookahead, // (?=
    LookaheadNegative, // (?!
    Lookbehind, // (?<=
    LookbehindNegative, // (?<!
    Conditional, // ?
    ConditionalNegative, // ?!
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
    Whitespace, // Tab or space
    NewLine,

    Dot, // .
    Colon, // :
    Semicolon, // ;
    Comma, // ,
    Hashtag, // #
    Caret, // ^
    DollarSymbol, // $
    AtSymbol, // @
    EqualsSymbol, // =
    ExclamationMark, // !

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
    EscPercent, // %%
}

export const enum MetaTokenType {
    Invalid = TokenTypeIndex.InvalidTokenID,
    Deprecated = TokenTypeIndex.DeprecatedTokenID,
    EOF = TokenTypeIndex.EOFTokenID,

    Comment = TokenTypeIndex.MetaStart,
    CommentCodeTag,
    CommentRegionTag, // #region / #endregion
    TypehintComment,
    TypehintDirective,
    TypehintIgnore,
    TypehintType,
    TypehintPunctuation,
    TypehintVariable,
    Docstring,

    StringBegin,
    StringEnd,

    SimpleExpression,

    LayeredimageBlock,
    LayeredimageStatement,
    LayeredimageParameters,
    LayeredimageGroupStatement,
    LayeredimageGroupParameters,
    LayeredimageAttributeStatement,
    LayeredimageAttributeParameters,

    TranslateBlock,
    TranslateStatement,
    TranslateParameters,

    ScreenCall,

    RenpyBlock,
    CodeBlock,
    PythonLine,
    PythonBlock,
    PythonExpression,
    Arguments,

    EmptyString,
    StringTag,
    TagBlock,
    TaggedString,
    Placeholder,

    MenuStatement,
    MenuBlock,
    MenuOption,
    MenuOptionBlock,

    LabelStatement,
    LabelCall,
    LabelAccess,

    BehindStatement,
    OnlayerStatement,
    ZorderStatement,
    AtStatement,
    AsStatement,
    WithStatement,

    ImageStatement,
    CameraStatement,
    SceneStatement,
    ShowStatement,
    HideStatement,
    WindowStatement,

    CallStatement,
    CallArguments,
    FromClause,
    FromArguments,
    JumpStatement,

    PlayAudioStatement,
    QueueAudioStatement,
    StopAudioStatement,

    ScreenStatement,
    ScreenSensitive,
    ScreenFrame,
    ScreenFrameStatement,
    ScreenFixed,
    ScreenFixedStatement,
    ScreenWindow,
    ScreenWindowStatement,
    ScreenText,
    ScreenBlock,
    ScreenVboxStatement,
    ScreenHboxStatement,

    StyleStatement,
    StyleParameters,
    StyleBlock,

    NarratorSayStatement,
    SayStatement,
    CharacterNameString,
    SayNarrator,
    SayCharacter,

    AtParameters,
    AsParameters,
    BehindParameters,
    OnlayerParameters,
    WithParameters,
    ZorderParameters,
    PauseStatement,
    PauseParameters,

    ATLBlock,
    ATLChoiceBlock,
    TransformBlock,
    ATLContains,
    ATLWith,
    ATLEvent,
    ATLFunction,
    ATLWarper,
    ATLOnStatement,
    ATLOnParameters,
    ATLChoiceStatement,
    ATLChoiceParameters,
    ATLBlockStatement,
    ATLParallelStatement,
    ATLContainsStatement,
    TransformStatement,
    TransformParameters,

    MemberAccess,
    ItemAccess,
    IndexedName,
    DataAttribute,
    ClassDefinition,
    ClassInheritance,
    FunctionDefinition,
    LambdaFunction,
    FunctionLambdaParameters,
    FunctionParameters,
    FunctionDecorator,
    FunctionCall,
    FunctionCallGeneric,

    Fstring,
    InterpolateFlags,

    // Temporary tokens for python parsing
    ControlFlowKeyword,
    LogicalOperatorKeyword,
    Operator,
    ArithmeticOperator,
    BitwiseOperatorKeyword,
    ComparisonOperatorKeyword,
    ConstantLiteral,
    ConstantNumeric,
    ConstantCaps,
    BuiltinExceptionType,
    BuiltinType,
    MagicVariable,

    EscapeSequence,

    FormatPercent,
    FormatBrace,

    StringStorageType,
    FormatStorageType,
    ImaginaryNumberStorageType,
    NumberStorageType,
    ClassStorageType,

    // Regex
    CommentBegin,
    CommentEnd,

    Backreference,
    BackreferenceNamed,
    CharacterSet,
    Named,
    ModifierFlagStorageType,
}

export type TypeOfTokenType = typeof KeywordTokenType &
    typeof EntityTokenType &
    typeof MetaTokenType &
    typeof LiteralTokenType &
    typeof OperatorTokenType &
    typeof CharacterTokenType &
    typeof EscapedCharacterTokenType;
export type TokenType =
    | KeywordTokenType
    | EntityTokenType
    | MetaTokenType
    | LiteralTokenType
    | OperatorTokenType
    | CharacterTokenType
    | EscapedCharacterTokenType;
