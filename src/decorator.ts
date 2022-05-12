import { DecorationOptions, ExtensionContext, OverviewRulerLane, window, workspace } from "vscode";
import { tokenizeDocument } from "./tokenizer";

let timeout: NodeJS.Timer | undefined = undefined;

// create a decorator type that we use to decorate small numbers
const smallNumberDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    overviewRulerColor: "blue",
    overviewRulerLane: OverviewRulerLane.Right,
    light: {
        // this color will be used in light color themes
        borderColor: "darkblue",
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: "lightblue",
    },
});

// create a decorator type that we use to decorate large numbers
const largeNumberDecorationType = window.createTextEditorDecorationType({
    cursor: "crosshair",
    // use a themable color. See package.json for the declaration and default values.
    backgroundColor: "red",
});

function updateDecorations() {
    let activeEditor = window.activeTextEditor;
    if (!activeEditor) {
        return;
    }

    const tokens = tokenizeDocument(activeEditor.document);

    const smallNumbers: DecorationOptions[] = [];
    const largeNumbers: DecorationOptions[] = [];

    tokens.forEach((token) => {
        const content = activeEditor?.document.getText(token.range);

        const decoration = { range: token.range, hoverMessage: "Number **" + content + "**" };
        if (content && content.length < 3) {
            smallNumbers.push(decoration);
        } else {
            largeNumbers.push(decoration);
        }
    });

    activeEditor.setDecorations(smallNumberDecorationType, smallNumbers);
    activeEditor.setDecorations(largeNumberDecorationType, largeNumbers);
}

function triggerUpdateDecorations(throttle = false) {
    if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
    }
    if (throttle) {
        timeout = setTimeout(updateDecorations, 500);
    } else {
        updateDecorations();
    }
}

export function registerDecorator(context: ExtensionContext) {
    triggerUpdateDecorations();

    // A TextDocument was changed
    context.subscriptions.push(
        workspace.onDidChangeTextDocument((event) => {
            let activeEditor = window.activeTextEditor;

            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations(true);
            }
        })
    );

    // The active text editor was changed
    context.subscriptions.push(
        window.onDidChangeActiveTextEditor(() => {
            triggerUpdateDecorations();
        })
    );
}
