const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const generateBlockAttributeTypes = require( './generate-block-attribute-types' );
const path = require( 'path' );
const glob = require( 'glob' );
const fs = require( 'fs' );

/**
 * Webpack Plugin to trigger TypeScript interface generation for block attributes.
 * Handles initial generation and watches `block.json` files for changes during development.
 */
class GenerateTypesWebpackPlugin {
	constructor( options = {} ) {
		this.options = {
			searchPattern: 'src/**/block.json',
			cwd: process.cwd(),
			...options,
		};
		this.pluginName = 'GenerateTypesWebpackPlugin';
		this.initialRun = true;
	}

	apply( compiler ) {
		this.options.cwd = compiler.context;

		compiler.hooks.beforeCompile.tapAsync(
			this.pluginName,
			async ( params, callback ) => {
				if ( this.initialRun ) {
					await generateBlockAttributeTypes( this.options );
					this.initialRun = false;
				}
				callback();
			}
		);

		if ( compiler.options.mode === 'development' ) {
			compiler.hooks.afterCompile.tap(
				this.pluginName,
				( compilation ) => {
					const blockJsonFiles = glob.sync(
						this.options.searchPattern,
						{ cwd: this.options.cwd, absolute: true }
					);
					blockJsonFiles.forEach( ( file ) => {
						compilation.fileDependencies.add( file );
					} );
				}
			);

			compiler.hooks.watchRun.tapAsync(
				this.pluginName,
				async ( compiler, callback ) => {
					const modifiedFiles = Array.from(
						compiler.modifiedFiles || []
					);
					const blockJsonSearchPaths = glob.sync(
						this.options.searchPattern,
						{ cwd: this.options.cwd, absolute: true }
					);

					const relevantChanges = modifiedFiles.filter( ( file ) =>
						blockJsonSearchPaths.includes( file )
					);

					if ( relevantChanges.length > 0 ) {
						await generateBlockAttributeTypes( this.options );
					}
					callback();
				}
			);
		}
	}
}

// Dynamically resolve entry points for single (src/index.ts/js) or multi-block (src/blocks/*/index.ts/js) structures.
const customEntryPoints = {};
const currentWorkingDir = process.cwd();

/**
 * Helper function to find block entry points, prioritizing .ts over .js.
 * @param {string} basePath - The base directory to search (e.g., 'src', 'src/blocks').
 * @param {string} blockGlob - The glob pattern for the block directory (e.g., 'index', '*').
 * @returns {Record<string, string>} A map of entry point names to their absolute paths.
 */
const findBlockEntry = ( basePath, blockGlob ) => {
	const entryMap = {};
	const absoluteBasePath = path.resolve( currentWorkingDir, basePath );

	// Look for TypeScript entry files first
	const tsFiles = glob.sync(
		`${ absoluteBasePath }/${ blockGlob }/index.ts`,
		{ cwd: currentWorkingDir, absolute: true }
	);
	tsFiles.forEach( ( file ) => {
		const blockName = path.basename( path.dirname( file ) );
		entryMap[ blockName ] = file;
	} );

	// For any blocks not found in TS, look for JavaScript entry files
	const jsFiles = glob.sync(
		`${ absoluteBasePath }/${ blockGlob }/index.js`,
		{ cwd: currentWorkingDir, absolute: true }
	);
	jsFiles.forEach( ( file ) => {
		const blockName = path.basename( path.dirname( file ) );
		if ( ! entryMap[ blockName ] ) {
			entryMap[ blockName ] = file;
		}
	} );
	return entryMap;
};

// Populate customEntryPoints for single block (src/index.ts or src/index.js)
Object.assign( customEntryPoints, findBlockEntry( 'src', '' ) );

// Populate customEntryPoints for multi-block (src/blocks/*/index.ts or src/blocks/*/index.js)
Object.assign( customEntryPoints, findBlockEntry( 'src/blocks', '*' ) );

// Ensure defaultConfig is an array for mapping, if not already.
const configs = Array.isArray( defaultConfig )
	? defaultConfig
	: [ defaultConfig ];

// Export the array of modified configurations.
module.exports = configs.map( ( config, index ) => {
	// Detect if this is the experimental module build.
	const isModuleBuild = config.experiments && config.experiments.outputModule;

	// Add type generation only to the FIRST config.
	const plugins = [ ...( config.plugins || [] ) ];
	if ( index === 0 ) {
		plugins.push( new GenerateTypesWebpackPlugin() );
	}

	// Apply .ts/.tsx extension resolution to ALL builds.
	const resolve = {
		...config.resolve,
		extensions: [
			...( config.resolve && config.resolve.extensions
				? config.resolve.extensions
				: [ '.js', '.jsx', '.json' ] ),
			'.ts',
			'.tsx',
		],
	};

	// Apply editor entry points only into the standard build.
	let entry = { ...config.entry };
	if ( ! isModuleBuild ) {
		entry = { ...entry, ...customEntryPoints };
	}

	return {
		...config,
		entry,
		resolve,
		plugins,
	};
} );
