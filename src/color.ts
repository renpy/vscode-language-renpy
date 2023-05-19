// Color conversion methods for Color provider
import { CancellationToken, Color, ColorInformation, ColorPresentation, DocumentColorProvider, Range, TextDocument, TextEdit } from "vscode";
/*import { tokenizeDocument } from "./tokenizer/tokenizer";
import { injectCustomTextmateTokens, TextMateRule } from "./decorator";
import { LiteralTokenType } from "./tokenizer/renpy-tokens";
import { ValueEqualsSet } from "./utilities/hashset";*/

export class RenpyColorProvider implements DocumentColorProvider {
    public provideDocumentColors(document: TextDocument, token: CancellationToken): Thenable<ColorInformation[]> {
        return getColorInformation(document);
    }
    public provideColorPresentations(color: Color, context: { document: TextDocument; range: Range }, token: CancellationToken): Thenable<ColorPresentation[]> {
        return getColorPresentations(color, context.document, context.range);
    }
}

/**
 * Finds all colors in the given document and returns their ranges and color
 * @param document - the TextDocument to search
 * @returns - Thenable<ColorInformation[]> - an array that provides a range and color for each match
 */
export function getColorInformation(document: TextDocument): Thenable<ColorInformation[]> {
    injectCustomColorStyles(document);

    // find all colors in the document
    const colors: ColorInformation[] = [];
    for (let i = 0; i < document.lineCount; ++i) {
        const line = document.lineAt(i);
        if (!line.isEmptyOrWhitespace) {
            const text = line.text;
            const matches = findColorMatches(text);
            if (matches) {
                let start = 0;
                for (const idx in matches) {
                    const match = matches[idx];
                    let range = new Range(line.lineNumber, text.indexOf(match, start), line.lineNumber, text.indexOf(match, start) + match.length);
                    let color;

                    if (match.startsWith('"#') || match.startsWith("'#")) {
                        const quote = match.substring(0, 1);
                        if (match.endsWith(quote)) {
                            color = convertHtmlToColor(match);
                        }
                    } else if (match.startsWith("rgb")) {
                        color = convertRgbColorToColor(match);
                    } else if (match.startsWith("color")) {
                        color = convertRenpyColorToColor(match);
                    } else if (match.startsWith("Color(")) {
                        // match is Color((r, g, b[, a]))
                        color = convertRenpyColorToColor(match);
                        if (color) {
                            // shift the range so the color block is inside the Color() declaration
                            range = new Range(range.start.line, range.start.character + 6, range.end.line, range.end.character);
                        }
                    }

                    if (color) {
                        colors.push(new ColorInformation(range, color));
                    }

                    start = text.indexOf(match, start) + 1;
                }
            }
        }
    }
    return Promise.resolve(colors);
}

/**
 * Called when the user hovers or taps a color block, allowing the user to replace the original color match with a new color.
 * @param color - The newly chosen Color from the color picker
 * @param document - The TextDocument
 * @param range - The Range of the color match
 * @returns - ColorPresentation to replace the color in the document with the new chosen color
 */
export function getColorPresentations(color: Color, document: TextDocument, range: Range): Thenable<ColorPresentation[]> {
    // user hovered/tapped the color block/return the color they picked
    const colors: ColorPresentation[] = [];
    const line = document.lineAt(range.start.line).text;
    const text = line.substring(range.start.character, range.end.character);
    const oldRange = new Range(range.start.line, range.start.character, range.start.line, range.start.character + text.length);

    const colR = Math.round(color.red * 255);
    const colG = Math.round(color.green * 255);
    const colB = Math.round(color.blue * 255);
    const colA = Math.round(color.alpha * 255);

    let colorLabel = "";
    if (text.startsWith('"#') || text.startsWith("'#")) {
        const quote = text.substring(0, 1);
        if (colA === 255 && (text.length === 6 || text.length === 9)) {
            colorLabel = convertRgbToHex(colR, colG, colB) || "";
        } else {
            colorLabel = convertRgbToHex(colR, colG, colB, colA) || "";
        }
        colorLabel = quote + colorLabel + quote;
    } else if (text.startsWith("rgb")) {
        colorLabel = convertColorToRgbTuple(color);
    } else if (text.startsWith("color")) {
        colorLabel = `color=(${colR}, ${colG}, ${colB}, ${colA})`;
    } else if (text.startsWith("(") && text.endsWith(")")) {
        colorLabel = `(${colR}, ${colG}, ${colB}, ${colA})`;
    }

    if (colorLabel.length > 0) {
        const rgbColorPres = new ColorPresentation(colorLabel);
        rgbColorPres.textEdit = new TextEdit(oldRange, colorLabel);
        colors.push(rgbColorPres);
    }

    return Promise.resolve(colors);
}

export function injectCustomColorStyles(document: TextDocument) {
    // Disabled until filter is added to the tree class
    /*const documentTokens = tokenizeDocument(document);
    // TODO: Should probably make sure this constant is actually part of a tag, but for now this is fine.
    const colorTags = documentTokens.filter((x) => x.tokenType === LiteralTokenType.Color);
    const colorRules = new ValueEqualsSet<TextMateRule>();

    // Build the new rules for this file
    colorTags.forEach((color) => {
        const lowerColor = document.getText(color.getRange()).toLowerCase();
        const newRule = new TextMateRule(`renpy.meta.color.${lowerColor}`, { foreground: lowerColor });
        colorRules.add(newRule);
    });

    injectCustomTextmateTokens(colorRules);*/
}

/**
 * Search the given text for any color references
 * @remarks
 * This method supports colors in the format `"#rrggbb[aa]"`, `"#rgb[a]"`, `Color((r, g, b[, a]))`, `rgb=(r, g, b)`
 *
 * @param text - The text to search
 * @returns A `RegExpMatchArray` containing any color matches
 */
export function findColorMatches(text: string): RegExpMatchArray | null {
    const rx =
        /(["']#)[0-9a-fA-F]{8}(["'])|(["']#)[0-9a-fA-F]{6}(["'])|(["']#)[0-9a-fA-F]{4}(["'])|(["']#)[0-9a-fA-F]{3}(["'])|Color\(\((\d+),\s*(\d+),\s*(\d+)?\)|Color\(\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)?\)|rgb\s*=\s*\(([.\d]+),\s*([.\d]+),\s*([.\d]+)?\)|color\s*=\s*\((\d+),\s*(\d+),\s*(\d+)?\)|color\s*=\s*\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)?\)/gi;
    const matches = text.match(rx);
    return matches;
}

/**
 * Converts r, g, b, a into a hex color string
 * @param r - The red value (0-255)
 * @param g - The green value (0-255)
 * @param b - The green value (0-255)
 * @param a - The alpha value (0-255) [optional]
 * @returns The hex color representation (`"#rrggbbaa"`) of the given rgba values
 */
export function convertRgbToHex(r: number, g: number, b: number, a?: number): string | null {
    if (r > 255 || g > 255 || b > 255 || (a ?? 0) > 255) {
        return null;
    }

    if (a === undefined) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } else {
        return "#" + (256 + r).toString(16).substring(1) + ((1 << 24) + (g << 16) + (b << 8) + a).toString(16).substring(1);
    }
}

/**
 * Returns an rgb tuple representation of a color provider Color
 * @param color - The color provider Color
 * @returns The `rgb=(r, g, b)` tuple representation of the given Color
 */
export function convertColorToRgbTuple(color: Color): string {
    const red = color.red.toFixed(4).toString().replace(".0000", ".0").replace(".000", ".0").replace(".00", ".0");
    const green = color.green.toFixed(4).toString().replace(".0000", ".0").replace(".000", ".0").replace(".00", ".0");
    const blue = color.blue.toFixed(4).toString().replace(".0000", ".0").replace(".000", ".0").replace(".00", ".0");

    const tuple = `rgb=(${red}, ${green}, ${blue})`;
    return tuple;
}

/**
 * Returns a Color provider object based on the given html hex color
 * @param htmlHex - The html hex representation
 * @returns The `Color` provider object
 */
export function convertHtmlToColor(htmlHex: string): Color | null {
    // Check if this is a valid hex color
    const hexRe = /^(?:"|')?#(?:[a-f\d]{8}|[a-f\d]{6}|[a-f\d]{3,4})(?:"|')?$/gi;
    if (!hexRe.test(htmlHex)) {
        return null;
    }

    let hex = htmlHex.replace(/"|'|#/g, "");

    // Add alpha value if not supplied
    if (hex.length === 3) {
        hex += "f";
    } else if (hex.length === 6) {
        hex += "ff";
    }

    if (hex.length === 4) {
        // Expand shorthand form (e.g. "#03FF") to full form (e.g. "#0033FFFF")
        hex = hex.replace(/([a-f\d])/gi, "$1$1");
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = hex.match(/[a-f\d]{2}/gi)!;
    return new Color(parseInt(result[0], 16) / 255, parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255);
}

/**
 * Returns a Color provider object based on the given Ren'Py Color tuple
 * @remarks
 * The Color tuple values should be numeric values between 0 and 255 (e.g., `Color((255, 0, 0, 255))`)
 * @param renpy - Renpy `Color` tuple (e.g., `Color((r, g, b, a))`)
 * @returns The `Color` provider object
 */
export function convertRenpyColorToColor(renpy: string): Color | null {
    try {
        const colorTuple = renpy.replace("Color(", "").replace("color", "").replace("=", "").replace(" ", "").replace("(", "[").replace(")", "]");
        const result = JSON.parse(colorTuple);
        if (result.length === 3) {
            return new Color(parseInt(result[0], 16) / 255, parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, 1.0);
        } else if (result.length === 4) {
            return new Color(parseInt(result[0], 16) / 255, parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255);
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Returns a Color provider object based on the given Ren'Py rgb tuple
 * @remarks
 * The rgb tuple values should be numeric values between 0.0 and 1.0 (e.g., `rgb=(1.0, 0.0, 0.0)`)
 * @param renpyColor - Renpy `rgb` color tuple (e.g., `rgb=(r, g, b)`)
 * @returns The `Color` provider object
 */
export function convertRgbColorToColor(renpyColor: string): Color | null {
    try {
        const colorTuple = renpyColor.replace("rgb", "").replace("=", "").replace(" ", "").replace("(", "[").replace(")", "]");
        const result = JSON.parse(colorTuple);
        if (result.length === 3) {
            return new Color(parseFloat(result[0]), parseFloat(result[1]), parseFloat(result[2]), 1.0);
        }
        return null;
    } catch (error) {
        return null;
    }
}
