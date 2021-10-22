// Folding Ranges
'use strict';

import { TextDocument, FoldingRange } from "vscode";

export function getFoldingRanges(document: TextDocument): FoldingRange[] {
    let ranges: FoldingRange[] = [];
    const rxFolding = /^\s*(screen|label|class|layeredimage|def|init)\s+([a-zA-Z0-9_]+)\((.*)\)\s*:|^\s*(screen|label|class|layeredimage|def|init)\s+([a-zA-Z0-9_]+)\s*:/;
    const rxRegionFolding = /^\s*#region[\S]*\s*/;
    const rxendRegionFolding = /^\s*#endregion[\S]*\s*/;

    let levels: {[name: number]: number} = {};

    let indent_level = 0;
    let last_real_line = 0;

    let region_start_line = 0;

    for (let i = 0; i < document.lineCount; ++i) {
        try {
            const line = document.lineAt(i).text;
            const char = line.trimLeft();
            indent_level = line.length - char.length;
            if (line === null || char === "") {
                continue;
            }
            const matches = line.match(rxFolding);
            const rs_matches = line.match(rxRegionFolding);
            const rd_matches = line.match(rxendRegionFolding);
            if (indent_level in levels) {
                for (let il of Object.keys(levels).map(key => parseInt(key))) {
                    if (il < indent_level) {
                        continue;
                    }
                    ranges.push(new FoldingRange(levels[il], last_real_line));
                    delete levels[il];
                }
            }
            if (matches && !(indent_level in levels)) {
                levels[indent_level] = i;
            } else if (rs_matches) {
                region_start_line = i;
            } else if (rd_matches) {
                if (i > region_start_line) {
                    ranges.push(new FoldingRange(region_start_line, i));
                }
            }
            last_real_line = i;
        } catch (error) {
            console.log(`foldingProvider error: ${error}`);
        }
    }

    for (let start of Object.values(levels)) {
        ranges.push(new FoldingRange(start, last_real_line));
    }

    return ranges;
}
