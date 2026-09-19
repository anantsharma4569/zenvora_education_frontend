export type Val = string | boolean | Array<Record<string, string>>;
export type Values = Record<string, Val>;

export interface Option {
	value: string;
	label: string;
	group?: string;
}

export interface FieldDef {
	key: string;
	label: string;
	type: "text" | "email" | "number" | "date" | "time" | "password" | "textarea" | "select" | "checkbox" | "custom";
	required?: boolean;
	/** Mandatory only in some situations (e.g. email is required once a password is typed). */
	requiredWhen?: (v: Values) => boolean;
	options?: Option[] | ((v: Values) => Option[]);
	placeholder?: string;
	help?: string | ((v: Values) => string | undefined);
	/** Bounds for date/number inputs, computed from the other values (e.g. the section's term). */
	min?: (v: Values) => string | undefined;
	max?: (v: Values) => string | undefined;
	/** Span both columns of the form grid. */
	full?: boolean;
	/** Only on the Add form (hidden while editing). */
	createOnly?: boolean;
	/** Shown but not editable on the Edit form. */
	lockedOnEdit?: boolean;
	hidden?: (v: Values, editing: boolean) => boolean;
	/** Visible but unusable for now (e.g. Section until a Class is chosen). */
	disabled?: (v: Values) => boolean;
	validate?: (v: Values) => string | null;
}

export interface DeleteResult {
	name: string;
	ok: boolean;
	message: string;
}
