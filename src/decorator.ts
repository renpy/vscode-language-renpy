import { ConfigurationTarget, workspace } from "vscode";

export type TextMateRule = { scope: string | string[]; settings: { fontStyle?: string; foreground?: string } };
type TextMateRules = { textMateRules: TextMateRule[] };

const customFontStyleRules: TextMateRule[] = [
    { scope: "renpy.meta.plain", settings: { fontStyle: "" } },
    { scope: "renpy.meta.i", settings: { fontStyle: "italic" } },
    { scope: "renpy.meta.b", settings: { fontStyle: "bold" } },
    { scope: ["renpy.meta.u", "renpy.meta.a"], settings: { fontStyle: "underline" } },
    { scope: "renpy.meta.s", settings: { fontStyle: "strikethrough" } },

    { scope: "renpy.meta.i renpy.meta.b", settings: { fontStyle: "italic bold" } },
    { scope: "renpy.meta.i renpy.meta.u", settings: { fontStyle: "italic underline" } },
    { scope: "renpy.meta.i renpy.meta.s", settings: { fontStyle: "italic strikethrough" } },
    { scope: "renpy.meta.b renpy.meta.u", settings: { fontStyle: "bold underline" } },
    { scope: "renpy.meta.b renpy.meta.s", settings: { fontStyle: "bold strikethrough" } },
    { scope: "renpy.meta.u renpy.meta.s", settings: { fontStyle: "underline strikethrough" } },

    { scope: "renpy.meta.i renpy.meta.b renpy.meta.u", settings: { fontStyle: "italic bold underline" } },
    { scope: "renpy.meta.i renpy.meta.b renpy.meta.s", settings: { fontStyle: "italic bold strikethrough" } },
    { scope: "renpy.meta.i renpy.meta.u renpy.meta.s", settings: { fontStyle: "italic underline strikethrough" } },
    { scope: "renpy.meta.b renpy.meta.u renpy.meta.s", settings: { fontStyle: "bold underline strikethrough" } },

    { scope: "renpy.meta.i renpy.meta.b renpy.meta.u  renpy.meta.s", settings: { fontStyle: "italic bold underline strikethrough" } },

    { scope: "renpy.meta.color.text", settings: { foreground: "#ffffff" } },
];

export function injectCustomTextmateTokens(rules: TextMateRule[]) {
    const tokensConfig = workspace.getConfiguration("editor");

    // If the config didn't exist yet, push the default tokens
    const tokenColorCustomizations = tokensConfig.get<TextMateRules>("tokenColorCustomizations") ?? { textMateRules: customFontStyleRules };
    const currentRules = tokenColorCustomizations.textMateRules;

    // Build the new rules for this file
    const newRules = customFontStyleRules.concat(rules); // Always add the default rules
    const filteredRules = newRules.filter((y) => {
        return !currentRules.some((x) => {
            if (x.scope instanceof Array && y.scope instanceof Array) {
                return x.scope.length === y.scope.length && x.scope.every((value, index) => value === y.scope[index]);
            }

            return x.scope === y.scope || (x.scope === y.scope && (x.settings.foreground !== y.settings.foreground || x.settings.fontStyle !== y.settings.fontStyle));
        });
    });

    if (filteredRules.length !== 0) {
        tokenColorCustomizations.textMateRules = currentRules.concat(filteredRules);
        tokensConfig.update("tokenColorCustomizations", tokenColorCustomizations, ConfigurationTarget.Workspace).then(
            () => {
                console.log("Successfully updated the tokenColorCustomizations config");
            },
            (reason) => {
                console.error("Failed to update the tokenColorCustomizations config! : " + reason);
            }
        );
    }
}
