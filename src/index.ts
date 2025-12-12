/**
 * Registers a new block provided a unique name and an object defining its behavior.
 *
 * @see https://developer.wordpress.org/block-editor/developers/block-api/#registering-a-block
 */
import { registerBlockType, BlockConfiguration, BlockAttribute } from '@wordpress/blocks';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * All files containing `style` keyword are bundled together. The code used
 * gets applied both to the front of your site and to the editor. All other files
 * get applied to the editor only.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './style.scss';
import './editor.scss';

/**
 * Internal dependencies
 */
import Edit from './edit'; 
import metadataJson from './block.json';

/**
 * BlockJSONMetadata is imported from a central, shared location.
 * This allows for a single source of truth for the block.json structure across all blocks.
 */
import { BlockJSONMetadata } from './types/block-metadata'; 

/**
 * Asserts the type of the imported `block.json` data.
 */
const metadata: BlockJSONMetadata = metadataJson;

/**
 * Defines the generic type for the actual attribute *values* passed to block components.
 * For now, `Record<string, any>`. Will eventually use generated `BlockAttributes`.
 */
type BlockAttributesValues = Record<string, any>; // Using `any` for simplicity in `index.ts`, `unknown` is also valid

/**
 * Every block starts by registering a new block type definition.
 *
 * @see https://developer.wordpress.org/block-editor/developers/block-api/#registering-a-block
 */
registerBlockType<BlockAttributesValues>(
    metadata.name,
    {
        // Spread all properties from the `block.json` metadata into the block settings.
        ...metadata,

        /**
         * The `edit` component for the block.
         * @see ./edit.tsx (or .ts)
         */
        edit: Edit,

		/**
         * The `save` component for the block.
         * Define this if your block renders static content on the frontend.
         * If using the Interactivity API with client-side rendering, this might return null.
         *
         * @param props The block's save properties, including attributes.
         * @returns React element representing the block on the frontend.
         * @see ./save.tsx (if present)
         */
        // save: Save, // Uncomment and import Save if needed

    } as BlockConfiguration<BlockAttributesValues> // Explicitly cast the entire settings object to BlockConfiguration.
);