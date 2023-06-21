import { ConfigurationTarget, workspace } from "vscode";
import * as util from "util";
import { IEquatable, ValueEqualsSet } from "./utilities/hashset";
import { LogLevel, logMessage } from "./logger";

export class TextMateRule implements IEquatable<TextMateRule> {
    public scope: string | string[];
    public settings: { fontStyle?: string; foreground?: string };

    constructor(scope: string | string[], settings: { fontStyle?: string; foreground?: string }) {
        this.scope = scope;
        this.settings = settings;
    }

    equals(other: TextMateRule): boolean {
        return util.isDeepStrictEqual(this, other);
    }
}
type TextMateRuleConfiguration = { scope: string | string[]; settings: { fontStyle?: string; foreground?: string } };
type TextMateRules = { textMateRules: TextMateRuleConfiguration[] };

const customFontStyleRules = new ValueEqualsSet<TextMateRule>([
    new TextMateRule("renpy.meta.plain", { fontStyle: "" }),
    new TextMateRule("renpy.meta.i", { fontStyle: "italic" }),
    new TextMateRule("renpy.meta.b", { fontStyle: "bold" }),
    new TextMateRule(["renpy.meta.u", "renpy.meta.a"], { fontStyle: "underline" }),
    new TextMateRule("renpy.meta.s", { fontStyle: "strikethrough" }),

    new TextMateRule("renpy.meta.i renpy.meta.b", { fontStyle: "italic bold" }),
    new TextMateRule("renpy.meta.i renpy.meta.u", { fontStyle: "italic underline" }),
    new TextMateRule("renpy.meta.i renpy.meta.s", { fontStyle: "italic strikethrough" }),
    new TextMateRule("renpy.meta.b renpy.meta.u", { fontStyle: "bold underline" }),
    new TextMateRule("renpy.meta.b renpy.meta.s", { fontStyle: "bold strikethrough" }),
    new TextMateRule("renpy.meta.u renpy.meta.s", { fontStyle: "underline strikethrough" }),

    new TextMateRule("renpy.meta.i renpy.meta.b renpy.meta.u", { fontStyle: "italic bold underline" }),
    new TextMateRule("renpy.meta.i renpy.meta.b renpy.meta.s", { fontStyle: "italic bold strikethrough" }),
    new TextMateRule("renpy.meta.i renpy.meta.u renpy.meta.s", { fontStyle: "italic underline strikethrough" }),
    new TextMateRule("renpy.meta.b renpy.meta.u renpy.meta.s", { fontStyle: "bold underline strikethrough" }),

    new TextMateRule("renpy.meta.i renpy.meta.b renpy.meta.u  renpy.meta.s", { fontStyle: "italic bold underline strikethrough" }),

    new TextMateRule("renpy.meta.color.text", { foreground: "#ffffff" }),
]);

export function injectCustomTextmateTokens(rules: ValueEqualsSet<TextMateRule>) {
    const tokensConfig = workspace.getConfiguration("editor");

    // If the config didn't exist yet, push the default tokens
    let tokenColorCustomizations = tokensConfig.get<TextMateRules>("tokenColorCustomizations");
    if (tokenColorCustomizations === undefined || tokenColorCustomizations.textMateRules === undefined) {
        tokenColorCustomizations = { textMateRules: customFontStyleRules.toArray() };
    }

    const currentRules = tokenColorCustomizations.textMateRules;

    // Build the new rules for this file
    const newRules = customFontStyleRules.addRange(rules); // Always add the default rules
    for (const rule of currentRules) {
        newRules.add(new TextMateRule(rule.scope, rule.settings));
    }

    if (newRules.size !== currentRules.length) {
        tokenColorCustomizations.textMateRules = newRules.toArray();
        tokensConfig.update("tokenColorCustomizations", tokenColorCustomizations, ConfigurationTarget.Workspace).then(
            () => {
                logMessage(LogLevel.Info, "Successfully updated the tokenColorCustomizations config");
            },
            (reason) => {
                logMessage(LogLevel.Error, "Failed to update the tokenColorCustomizations config! : " + reason);
            }
        );
    }
}
