// Character class
'use strict';

import { getDefinitionFromFile } from "./hover";
import { NavigationData } from "./navigationdata";

export class Character {
	name: string;
	image: string;
	resolved_name: string;
	dynamic: boolean;
	arguments: string[];
	filename: string;
	location: number;

	constructor(name: string, image: string, dynamic: string, args: string[], filename: string, location: number) {
		this.name = name;
		this.image = image;
		this.dynamic = dynamic === 'True';
		this.arguments = args;
		this.filename = filename;
		this.location = location;

		if (!this.dynamic) {
			this.resolved_name = name;
		} else {
			this.resolved_name = name;
			const resolved = NavigationData.data.location['define'][name];
			if (resolved) {
				const def = getDefinitionFromFile(resolved[0], resolved[1]);
				if (def) {
					const split = def.keyword.split('=');
					if (split && split.length === 2) {
						this.resolved_name = split[1].trim();
					}
				}
			}
		}
	}
}
