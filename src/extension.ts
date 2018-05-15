// Based on https://raw.githubusercontent.com/Microsoft/vscode/master/extensions/python/src/pythonMain.ts from Microsoft vscode
//
// Licensed under MIT License. See LICENSE in the project root for license information.
'use strict';
import { ExtensionContext, languages, IndentAction} from 'vscode';

export function activate(context: ExtensionContext): any {
	languages.setLanguageConfiguration('renpy', {
		onEnterRules: [
			{
				// indentation for Ren'Py and Python blocks
				beforeText: /^\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|label|menu|init|\":|\':|python|).*?:\s*$/,
				action: { indentAction: IndentAction.Indent }
			}
		]
	});
}
