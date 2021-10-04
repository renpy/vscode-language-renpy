// Displayable Class
'use strict';

export class Displayable {
	name: string;
	tag: string;
	image_type: string;
	definition: string;
	filename: string;
	location: number;

	constructor(name: string, image_type: string, definition: string, filename: string, location: number) {
		this.name = name;
		this.image_type = image_type;
		this.definition = definition;
		this.filename = filename;
		this.location = location;
		if (name.indexOf(' ') > 0) {
			this.tag = name.split(' ')[0];
		} else {
			this.tag = name;
		}
	}
}
