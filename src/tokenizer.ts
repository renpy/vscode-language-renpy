// Workspace and file functions
"use strict";

import { Range, TextDocument } from "vscode";
import { Token, TokenPattern, isIncludePattern, isRangePattern, isMatchPattern } from "./token-definitions";
import { basePatterns } from "./token-patterns";

export function tokenizeDocument(document: TextDocument): Token[] {
    const text = document.getText();
    const tokens: Token[] = [];

    let match: RegExpExecArray | null;
    while ((match = regEx.exec(text))) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);

        tokens.push(new Token(TokenType.Number, PunctuationSubType.WhiteSpace, new Range(startPos, endPos)));
    }

    /*while(
    Foreach pattern p in basePatterns
         executePattern(p);*/

    executePattern(basePatterns, text, tokens, document);
    return tokens;
}

function executePattern(p: TokenPattern, text: string, tokens: Token[], document: TextDocument): boolean {
    if (isIncludePattern(p)) return executePattern(p.include, text, tokens, document);

    if (isRangePattern(p)) {
        const re: RegExp = p.begin;
        if (!re.global || !re.hasIndices) console.error("To match this pattern, g and d flags are required!");
        /*if match begin:
            mEnd = match p.end
            Range = mStart.index <> mEnd.index+length;
            ContentRange = mStart.index+length<> mEnd.index;
            
            ExecuteCaptures(mStart, beginCaputes);
            ExecuteCaptures(mEnd, endCaptures)
        */
    } else if (isMatchPattern(p)) {
        const re: RegExp = p.match;
        if (!re.global) console.error("To match this pattern the 'g' flag is required!");

        const match: RegExpExecArray | null = re.exec(text);
        if (match && match.indices) {
            if (p.token) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                tokens.push(new Token(p.token, new Range(startPos, endPos)));
            }

            if (p.captures) {
                if (!re.hasIndices) console.error("To match this pattern the 'd' flag is required!");
                for (let i = 0; i < match.indices.length; i++) {
                    if (p.captures[i] === undefined) continue;

                    const capturePattern = p.captures[i];

                    if (capturePattern.token) {
                        const startPos = document.positionAt(match.indices[i][0]);
                        const endPos = document.positionAt(match.indices[i][1]);
                        tokens.push(new Token(capturePattern.token, new Range(startPos, endPos)));
                    }

                    if (capturePattern.patterns) {
                        const matchContent = match[i];
                        for (let j = 0; j < capturePattern.patterns.length; j++) {
                            const pattern = capturePattern.patterns[j];
                            if (executePattern(pattern, matchContent, tokens, document)) {
                                break; // Once the first pattern has matched, the remainder should be ignored
                            }
                        }
                    }
                }
            }
        }
    }

    if (p.patterns) {
        for (let j = 0; j < p.patterns.length; j++) {
            const pattern = p.patterns[j];
            if (executePattern(pattern, text, tokens, document)) {
                break; // Once the first pattern has matched, the remainder should be ignored
            }
        }
    }

    return true;
}

/*function executeRegExp(re: RegExp)
     let regEx = null;
     if(currentPattern.match !== undefined){
         regEx = currentPattern.match;
     } else if (currentPattern.begin !== undefined) {
         regEx = currentPattern.begin;
     }
    
    let match: RegExpExecArray | null = regEx.exec(text);
    while (match) {

         const captures = currentPattern.captures if not null else currentPattern.beginCaptures if not null && is range pattern;
         if (captures){
             foreach(cap in captures){
                 const capture = match[cap.key];
                 const startPos = document.positionAt(capture.index);
               const endPos = document.positionAt(capture.index + capture.length);

                 tokens.push(new Token(TokenType.Number, PunctuationSubType.WhiteSpace, new Range(startPos, endPos)));

                if(cap.patterns) {
                    if(recurse exec pattern[i] on capture.text -> !got match)
                recurse exec pattern [i+1 < n]
                }
             }
         }
        
         if(currentPattern.patterns) {
             if(recurse exec pattern[i] on match[0] -> !got match)
                recurse exec pattern [i+1 < n]
            
         }
        
        if(token)
            add token for match[0];

        tokens.push(new Token(TokenType.Number, PunctuationSubType.WhiteSpace, new Range(startPos, endPos)));

          match = regEx.exec(text);
    }
 
    return tokens;
};*/
