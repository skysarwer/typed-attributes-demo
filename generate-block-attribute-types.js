const fs = require( 'fs' );
const path = require( 'path' );
const { compile } = require( 'json-schema-to-typescript' );
const glob = require( 'glob' );
const prettierConfig = require( '@wordpress/prettier-config' );
/**
 * Generates TypeScript interfaces for block attributes from all found block.json files.
 * This utility supports both single-block and multi-block plugin structures.
 *
 * @param {object} [options={}] - Configuration options.
 * @param {string} [options.cwd=process.cwd()] - The current working directory for file searches.
 * @param {string} [options.searchPattern] - Glob pattern to find block.json files.
 * @param {string[]} [options.filesToProcess] - Optional array of absolute paths to block.json files to process.
 */
async function generateBlockAttributeTypes( options = {} ) {
	// Determine the current working directory from options or Node.js process.
	const cwd = options.cwd || process.cwd();
	// Determine the file search pattern from options or default to common WordPress block paths.
	const searchPattern = options.searchPattern || 'src/**/block.json';

	// The interface name for generated block attributes, kept consistent across all blocks.
	const attributesInterfaceName = 'BlockAttributes';

	// Use filesToProcess if provided, otherwise glob
	let blockJsonFiles = options.filesToProcess;

	if ( ! blockJsonFiles || blockJsonFiles.length === 0 ) {
		// Fallback to glob only if no specific files are provided (e.g., direct script run)
		blockJsonFiles = glob.sync( searchPattern, {
			cwd: cwd,
			absolute: true, // IMPORTANT: Ensure these are absolute paths
		} );
	}

	if ( blockJsonFiles.length === 0 ) {
		console.warn(
			`No 'block.json' files found matching pattern '${ searchPattern }' in '${ cwd }'. Skipping block attribute type generation.`
		);
		return; // Exit if no blocks are found.
	}

	console.log(
		`Found ${ blockJsonFiles.length } 'block.json' file(s). Generating attribute types...`
	);

	for ( const blockJsonRelativePath of blockJsonFiles ) {
		// Resolve absolute paths for reading block.json and writing the output .d.ts file.
		const blockJsonFullPath = path.resolve( cwd, blockJsonRelativePath );
		const blockDir = path.dirname( blockJsonFullPath );
		const attributesOutputTsPath = path.join(
			blockDir,
			'block-attributes.d.ts'
		);

		try {
			// Read and parse the block's metadata.
			const blockJson = JSON.parse(
				fs.readFileSync( blockJsonFullPath, 'utf8' )
			);
			const blockAttributes = blockJson.attributes || {}; // Get the attributes definition

			// Construct a the root JSON Schema object for `json-schema-to-typescript`.
			const rootAttributesSchema = {
				title: attributesInterfaceName,
				type: 'object',
				properties: {},
				required: [], // This array will be populated based on attribute defaults/roles.
				additionalProperties: false, // Crucial to prevent '[k: string]: unknown;' in the output interface.
			};

			// Iterate over each attribute defined in block.json.
			for ( const key in blockAttributes ) {
				if (
					Object.prototype.hasOwnProperty.call( blockAttributes, key )
				) {
					const attr = blockAttributes[ key ];

					const schemaProperty = buildBaseSchemaProperty( attr );

					// Add Default Value (for documentation in the schema)
					if (
						Object.prototype.hasOwnProperty.call( attr, 'default' )
					) {
						schemaProperty.default = attr.default;
					}

					// Handle `source: "query"` attributes (officially supported for structured array items).
					// This is the *only* officially supported mechanism for strictly defining structured arrays of objects.
					if ( attr.source === 'query' && attr.query ) {
						// Force type to array because source:query ALWAYS returns an array.
						schemaProperty.type = 'array';

						// Warn if the attribute's declared type is inconsistent with source: "query".
						if ( attr.type && attr.type !== 'array' ) {
							console.warn(
								`[Type Gen] Warning: Attribute "${ key }" in block "${ blockJson.name }" has source: "query" but type: "${ attr.type }". This source always returns an array. The generated interface will treat it as an array.`
							);
						}

						// Use helper to recursively process the query definition into an items schema.
						schemaProperty.items = processQueryDefinition(
							attr.query
						);
					}
					// Handle `type: "object"` (non-query). `block.json` lacks explicit schema for nested properties.
					// JSTT infers from 'default' value using recursion, making nested properties optional.
					else if ( attr.type === 'object' ) {
						if (
							Object.prototype.hasOwnProperty.call(
								attr,
								'default'
							) &&
							attr.default !== null &&
							typeof attr.default === 'object'
						) {
							// Recursively infer schema from the default object, ensuring nested properties are optional.
							const inferredObjectSchema =
								createSchemaFragmentFromJsValue( attr.default );
							schemaProperty.properties =
								inferredObjectSchema.properties;
							schemaProperty.required =
								inferredObjectSchema.required;
							schemaProperty.additionalProperties =
								inferredObjectSchema.additionalProperties;
						} else {
							// If no default object, it's a generic object with any properties.
							schemaProperty.properties = {};
							schemaProperty.additionalProperties = true;
						}
					}
					// Handle `type: "array"` (non-query). `block.json` lacks explicit schema for `items`.
					// JSTT infers item types from 'default' array contents using recursion.
					else if ( attr.type === 'array' ) {
						if (
							Array.isArray( attr.default ) &&
							attr.default.length > 0
						) {
							// Infer items type from the first element of the default array recursively.
							schemaProperty.items =
								createSchemaFragmentFromJsValue(
									attr.default[ 0 ]
								);
						} else {
							// If no default array, it's an array of any type.
							schemaProperty.items = { type: 'any' };
						}
					}

					rootAttributesSchema.properties[ key ] = schemaProperty;

					// Determine if the attribute should be 'required' (non-optional) in the TypeScript interface.
					// An attribute is considered required if it has an explicit default value
					// or if its role is 'content' (implying expected presence for the block's core functionality).
					if (
						Object.prototype.hasOwnProperty.call(
							attr,
							'default'
						) ||
						attr.role === 'content'
					) {
						rootAttributesSchema.required.push( key );
					}
				}
			}

			// Compile the constructed JSON Schema into a TypeScript interface string.
			const compiledAttributes = await compile(
				rootAttributesSchema,
				attributesInterfaceName,
				{
					bannerComment:
						'/* eslint-disable */\n/**\n * This file was automatically generated by json-schema-to-typescript.\n * DO NOT MODIFY IT BY HAND. Instead, modify your block.json and rerun the script.\n */',
					// Configure formatting to match @wordpress/scripts' prettier config for consistency.
					style: {
						...prettierConfig,
					},
				}
			);

			// Read existing content to avoid unnecessary file writes in watch mode.
			const currentContent = fs.existsSync( attributesOutputTsPath )
				? fs.readFileSync( attributesOutputTsPath, 'utf8' )
				: '';

			// Write the new content only if it's different from the existing file.
			if ( currentContent !== compiledAttributes ) {
				fs.writeFileSync(
					attributesOutputTsPath,
					compiledAttributes,
					'utf8'
				);
				console.log(
					`  Updated '${ path.relative(
						cwd,
						attributesOutputTsPath
					) }' for '${ path.relative( cwd, blockJsonFullPath ) }'`
				);
			} else {
				console.log(
					`  No changes needed for '${ path.relative(
						cwd,
						attributesOutputTsPath
					) }'`
				);
			}
		} catch ( error ) {
			// Log specific error for the failed block but continue processing others.
			console.error(
				`  Error processing '${ path.relative(
					cwd,
					blockJsonFullPath
				) }':`,
				error.message
			);
		}
	}
	console.log( 'Block attribute type generation complete.' );
}

/**
 * Constructs the base JSON Schema property from a block attribute definition.
 * Handles type normalization (including default: null logic) and enums.
 *
 * @param {object} attr - The attribute definition from block.json
 * @returns {object} - The base JSON schema property (type, enum)
 */
function buildBaseSchemaProperty( attr ) {
	let schemaType = attr.type;

	// HANDLE DEFAULT: NULL
	// If default is explicitly null, we must allow null in the type definition.
	if (
		Object.prototype.hasOwnProperty.call( attr, 'default' ) &&
		attr.default === null
	) {
		if ( Array.isArray( schemaType ) ) {
			if ( ! schemaType.includes( 'null' ) ) {
				schemaType = [ ...schemaType, 'null' ];
			}
		} else if ( schemaType ) {
			schemaType = [ schemaType, 'null' ];
		} else {
			schemaType = [
				'string',
				'number',
				'boolean',
				'object',
				'array',
				'null',
			];
		}
	}

	return {
		type: schemaType,
		...( attr.enum && { enum: attr.enum } ),
		// We do not handle 'default' here yet, as it's handled differently in schema vs query
	};
}

/**
 * Recursively infers a JSON Schema fragment from a JavaScript value.
 * This is used to generate schema definitions from complex default values for `type: "object"`
 * and `type: "array"` attributes (non-query), reflecting their structure in the generated types.
 * Nested properties are intentionally made optional.
 *
 * @param {any} value - The JavaScript value to infer the schema from.
 * @returns {object} A JSON Schema fragment describing the value.
 */
function createSchemaFragmentFromJsValue( value ) {
	const fragment = {};

	if ( value === null ) {
		fragment.type = 'null';
	} else if ( Array.isArray( value ) ) {
		fragment.type = 'array';
		if ( value.length > 0 ) {
			// Infer items type from the first element. Recursively call for nested arrays/objects.
			fragment.items = createSchemaFragmentFromJsValue( value[ 0 ] );
		}
		// For arrays within a generic object attribute, additional elements are allowed.
	} else if ( typeof value === 'object' ) {
		fragment.type = 'object';
		fragment.properties = {};
		fragment.required = []; // Nested properties are not marked as required, making them optional.
		fragment.additionalProperties = true; // Default to true, as block.json doesn't formally close these.

		for ( const propKey in value ) {
			if ( Object.prototype.hasOwnProperty.call( value, propKey ) ) {
				// Recursively infer schema for nested object properties.
				fragment.properties[ propKey ] =
					createSchemaFragmentFromJsValue( value[ propKey ] );
			}
		}
	} else {
		// Primitive types (string, number, boolean)
		fragment.type = typeof value;
	}
	return fragment;
}

/**
 * Recursively transforms a WordPress `query` definition into a JSON Schema object.
 * This handles nested queries and ensures strictly typed object arrays.
 *
 * @param {object} queryDefinition - The `query` property from block.json.
 * @returns {object} A JSON Schema object describing the query items.
 */
function processQueryDefinition( queryDefinition ) {
	const properties = {};
	const required = [];

	for ( const propKey in queryDefinition ) {
		if (
			Object.prototype.hasOwnProperty.call( queryDefinition, propKey )
		) {
			const attrDef = queryDefinition[ propKey ];

			// Base schema for this property
			const propSchema = buildBaseSchemaProperty( attrDef );

			if ( Object.prototype.hasOwnProperty.call( attrDef, 'default' ) ) {
				propSchema.default = attrDef.default;

				// If a query attribute has a default, it is required.
				// The parser will provide the default if the selector fails.
				required.push( propKey );
			}

			// RECURSION: handle nested query definitions.
			if ( attrDef.source === 'query' && attrDef.query ) {
				propSchema.type = 'array';
				propSchema.items = processQueryDefinition( attrDef.query );
			}

			properties[ propKey ] = propSchema;
		}
	}

	return {
		type: 'object',
		properties: properties,
		required: required,
		additionalProperties: false, // Queries are strict schemas.
	};
}

// Export the function directly for programmatic use (e.g., by the Webpack plugin).
module.exports = generateBlockAttributeTypes;

// If the script is executed directly (e.g., via `npm run generate-types`),
// invoke the function with default options and handle any unhandled errors.
if ( require.main === module ) {
	generateBlockAttributeTypes().catch( ( error ) => {
		console.error(
			'Unhandled error during block attribute type generation:',
			error
		);
		process.exit( 1 );
	} );
}
