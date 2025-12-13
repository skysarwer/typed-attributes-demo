/**
 * Defines a raw, JSON-friendly representation of a single block attribute definition.
 * This type is used for directly importing `block.json` where `type` is inferred
 * as a general `string` rather than a specific literal string like `"string"`.
 *
 * This allows TypeScript to successfully assign `metadataJson` (from `block.json`)
 * to `BlockJSONMetadata` without type errors on the `type` property.
 *
 * See https://developer.wordpress.org/block-editor/reference-guides/block-api/block-attributes
 */

/**
 * @TODO: In the future, this interface could potentially be automatically generated
 * from the main `block.json` schema using a utility, to achieve full type automation and reduce maintenance.
 * That automation would likely need to integrate with `@wordpress/blocks`' `BlockAttribute` type, which adds complexity
 * and is beyond the scope of this demo for now.
 */
interface RawBlockAttributeDefinition {
	// We keep 'type' as generic string to match JSON inference, even though
	// conceptually it is an enum of specific types (string, boolean, etc.)
	type?: string;
	source?: string;
	selector?: string;
	attribute?: string;
	default?: any; // Loosen 'default' to accept any type, matching JSON inference
	// Keep as generic string for now, despite being an enum conceptually
	// (e.g., 'content', 'local', etc..)
	role?: string;
	enum?: any[];
	query?: Record< string, RawBlockAttributeDefinition >; // For source: "query" (repeating DOM elements)
	// For source: "children"
	children?: true;
	// For source: "html"
	multiline?: string;
	// For source: "meta"
	meta?: string;
	// For source: "text"
	text?: string;
}

/**
 * Defines the TypeScript interface for the canonical structure of a block's `block.json` file.
 * This interface uses `RawBlockAttributeDefinition` for its `attributes` to accurately
 * reflect the shape of data imported directly from a JSON file.
 *
 * For now, this interface is manually defined. Fully automating its generation
 * from the main `block.json` schema would add significant complexity due to
 * integrating `@wordpress/blocks`' `BlockAttribute` type.
 */
export interface BlockJSONMetadata {
	$schema?: string;
	apiVersion: number;
	name: string;
	version: string;
	title: string;
	category: string;
	icon: string;
	description: string;
	attributes?: Record< string, RawBlockAttributeDefinition >; // Use the raw, JSON-friendly type
	example?: object;
	supports?: object;
	textdomain?: string;
	editorScript?: string;
	editorStyle?: string;
	style?: string;
	render?: string;
	viewScriptModule?: string;
}
