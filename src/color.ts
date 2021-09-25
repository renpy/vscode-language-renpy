// Color conversion methods for Color provider
'use strict';

import { Color, ColorInformation, ColorPresentation, Range, TextDocument, TextEdit } from "vscode";

/**
 * Finds all colors in the given document and returns their ranges and color
 * @param document - the TextDocument to search
 * @returns - ColorInformation[] - an array that provides a range and color for each match 
 */
export function getColorInformation(document: TextDocument): ColorInformation[] {
	// find all colors in the document
	let colors: ColorInformation[] = [];
	for (let i = 0; i < document.lineCount; ++i) {
		const line = document.lineAt(i);
		if (!line.isEmptyOrWhitespace) {
			const text = line.text;
			let matches = findColorMatches(text);
			if (matches) {
				let start = 0;
				for (let idx in matches) {
					const match = matches[idx];
					const range = new Range(line.lineNumber, text.indexOf(match, start), line.lineNumber, text.indexOf(match, start) + match.length);
					if (match.startsWith('"#')) {
						const color = convertHtmlToColor(match);
						if (color) {
							colors.push(new ColorInformation(range, color));
						}
					} else if (match.startsWith('rgb')) {
						const color = convertRgbColorToColor(match);
						if (color) {
							colors.push(new ColorInformation(range, color));
						}
					} else if (match.startsWith('color')) {
						const color = convertRenpyColorToColor(match);
						if (color) {
							colors.push(new ColorInformation(range, color));
						}
					} else if (match.startsWith('Color(')) {
						// match is Color((r, g, b[, a]))
						const color = convertRenpyColorToColor(match);
						if (color) {
							// shift the range so the color block is inside the Color() declaration
							const shifted = new Range(range.start.line, range.start.character + 6, range.end.line, range.end.character);
							colors.push(new ColorInformation(shifted, color));
						}
					}
					start = text.indexOf(match, start) + 1;
				}
			}
		}
	}
	return colors;
}

/**
 * Called when the user hovers or taps a color block, allowing the user to replace the original color match with a new color.
 * @param color - The newly chosen Color from the color picker
 * @param document - The TextDocument
 * @param range - The Range of the color match
 * @returns - ColorPresentation to replace the color in the document with the new chosen color
 */
export function getColorPresentations(color: Color, document: TextDocument, range: Range): ColorPresentation[] | undefined {
	// user hovered/tapped the color block/return the color they picked
	let colors: ColorPresentation[] = [];
	const line = document.lineAt(range.start.line).text;
	const text = line.substring(range.start.character, range.end.character);
	const oldRange = new Range(range.start.line, range.start.character, range.start.line, range.start.character + text.length);

	const colR = Math.round(color.red * 255);
	const colG = Math.round(color.green * 255);
	const colB = Math.round(color.blue * 255);
	const colA = Math.round(color.alpha * 255);

	if (text.startsWith('"#')) {
		let hex: string = "";
		if (colA === 255 && (text.length === 6 || text.length === 9)) {
			hex = convertRgbToHex(colR, colG, colB) || "";
		} else {
			hex = convertRgbToHex(colR, colG, colB, colA) || "";
		}

		let hexColorPres = new ColorPresentation(`${hex}`);
		hexColorPres.textEdit = new TextEdit(oldRange, `"${hex}"`);
		colors.push(hexColorPres);
	} else if (text.startsWith('rgb')) {
		const rgbTuple = convertColorToRgbTuple(color);
		let rgbColorPres = new ColorPresentation(rgbTuple);
		rgbColorPres.textEdit = new TextEdit(oldRange, rgbTuple);
		colors.push(rgbColorPres);
	} else if (text.startsWith('color')) {
		const rgbTuple = `color=(${colR}, ${colG}, ${colB}, ${colA})`;
		let rgbColorPres = new ColorPresentation(rgbTuple);
		rgbColorPres.textEdit = new TextEdit(oldRange, rgbTuple);
		colors.push(rgbColorPres);
	} else if (text.startsWith('(') && text.endsWith(')')) {
		const rgbTuple = `(${colR}, ${colG}, ${colB}, ${colA})`;
		let rgbColorPres = new ColorPresentation(rgbTuple);
		rgbColorPres.textEdit = new TextEdit(oldRange, rgbTuple);
		colors.push(rgbColorPres);
	}
	return colors;
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
	let rx = /("#)[0-9a-fA-F]{8}(")|("#)[0-9a-fA-F]{6}(")|("#)[0-9a-fA-F]{4}(")|("#)[0-9a-fA-F]{3}(")|Color\(\((\d+),\s*(\d+),\s*(\d+)?\)|Color\(\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)?\)|rgb\s*=\s*\(([.\d]+),\s*([.\d]+),\s*([.\d]+)?\)|color\s*=\s*\((\d+),\s*(\d+),\s*(\d+)?\)|color\s*=\s*\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)?\)/ig;
	let matches = text.match(rx);
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
export function convertRgbToHex(r: number, g: number, b: number, a?: number): string | undefined {
	if (r > 255 || g > 255 || b > 255) {
		return;
	}

	if (a === undefined) {
		return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	} else {
		return "#" + (256 + r).toString(16).substr(1) + ((1 << 24) + (g << 16) + (b << 8) + a).toString(16).substr(1);
	}
}

/**
 * Returns an rgb tuple representation of a color provider Color
 * @param color - The color provider Color
 * @returns The `rgb=(r, g, b)` tuple representation of the given Color
 */
export function convertColorToRgbTuple(color: Color): string {
	const red = color.red.toFixed(4).toString().replace('.0000', '.0').replace('.000', '.0').replace('.00', '.0');
	const green = color.green.toFixed(4).toString().replace('.0000', '.0').replace('.000', '.0').replace('.00', '.0');
	const blue = color.blue.toFixed(4).toString().replace('.0000', '.0').replace('.000', '.0').replace('.00', '.0');

	const tuple = `rgb=(${red}, ${green}, ${blue})`;
	return tuple;
}

/**
 * Returns a Color provider object based on the given html hex color
 * @param hex - The html hex representation 
 * @returns The `Color` provider object
 */
export function convertHtmlToColor(hex: string) : Color | null {
	hex = hex.replace(/"/g, '');
	// Add alpha value if not supplied
	if (hex.length === 4) {
		hex = hex + 'f';
	} else if (hex.length === 7) {
		hex = hex + 'ff';
	}

	// Expand shorthand form (e.g. "#03FF") to full form (e.g. "#0033FFFF")
	const shorthandRegex = /^#?([A-Fa-f\d])([A-Fa-f\d])([A-Fa-f\d])([A-Fa-f\d])$/i;
	hex = hex.replace(shorthandRegex, function(m, r, g, b, a) {
		return r + r + g + g + b + b + a + a;
	});

	// Parse #rrggbbaa into Color object
	const result = /^#?([A-Fa-f\d]{2})([A-Fa-f\d]{2})([A-Fa-f\d]{2})([A-Fa-f\d]{2})$/i.exec(hex);
	return result ? new Color(
		parseInt(result[1], 16) / 255,
		parseInt(result[2], 16) / 255,
		parseInt(result[3], 16) / 255,
		parseInt(result[4], 16) / 255
		) : null;
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
		const colorTuple = renpy.replace("Color(", "").replace("color", "").replace("=", "").replace(" ", "").replace('(','[').replace(')',']');
		const result = JSON.parse(colorTuple);
		if (result.length === 3) {
			return new Color(
				parseInt(result[0], 16) / 255,
				parseInt(result[1], 16) / 255,
				parseInt(result[2], 16) / 255,
				1.0
				);
		} else if (result.length === 4) {
			return new Color(
				parseInt(result[0], 16) / 255,
				parseInt(result[1], 16) / 255,
				parseInt(result[2], 16) / 255,
				parseInt(result[3], 16) / 255,
				);
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
 * @param renpy - Renpy `rgb` tuple (e.g., `rgb=(r, g, b)`)
 * @returns The `Color` provider object
 */
export function convertRgbColorToColor(renpy: string): Color | null {
	try {
		const colorTuple = renpy.replace("rgb", "").replace("=", "").replace(" ", "").replace('(','[').replace(')',']');
		const result = JSON.parse(colorTuple);
		if (result.length === 3) {
			return new Color(
				parseFloat(result[0]),
				parseFloat(result[1]),
				parseFloat(result[2]),
				1.0
				);
		} 
		return null;
	} catch (error) {
		return null;
	}
}
