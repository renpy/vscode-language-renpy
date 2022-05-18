// Character class
"use strict";

import { getDefinitionFromFile } from "./hover";
import { NavigationData } from "./navigation-data";

export class Character {
    name: string;
    image: string;
    resolvedName: string;
    dynamic: boolean;
    arguments: string[];
    filename: string;
    location: number;

    constructor(name: string, image: string, dynamic: string, args: string[], filename: string, location: number) {
        this.name = name;
        this.image = image;
        this.dynamic = dynamic === "True";
        this.arguments = args;
        this.filename = filename;
        this.location = location;

        if (!this.dynamic) {
            this.resolvedName = name;
        } else {
            this.resolvedName = name;
            const resolved = NavigationData.data.location["define"][name];
            if (resolved) {
                const def = getDefinitionFromFile(resolved[0], resolved[1]);
                if (def) {
                    const split = def.keyword.split("=");
                    if (split && split.length === 2) {
                        this.resolvedName = split[1].trim();
                    }
                }
            }
        }
    }
}
