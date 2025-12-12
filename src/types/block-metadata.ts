import { BlockAttribute } from '@wordpress/blocks';

/**
 * Defines the TypeScript interface for the canonical structure of a block's `block.json` file.
 * This interface is designed to be shared and imported across multiple block registrations.
 *
 * The `attributes` property defines the *schema* of each attribute for `registerBlockType`.
 * Its generic `unknown` indicates that the specific *value types* for individual attributes
 * are expected to be provided by a separate, dynamically generated interface (e.g., `BlockAttributes`)
 * for actual attribute consumption in `edit.tsx` and `save.tsx`.
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
    attributes?: Record<string, BlockAttribute<unknown>>;
    example?: object;
    supports?: object;
    textdomain?: string;
    editorScript?: string;
    editorStyle?: string;
    style?: string;
    render?: string;
    viewScriptModule?: string;
}