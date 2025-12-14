const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const generateBlockAttributeTypes = require( './scripts/generate-block-attribute-types' );
const path = require( 'path' );
const glob = require( 'glob' );

/**
 * Webpack Plugin to trigger TypeScript interface generation for block attributes.
 * Handles initial generation and smart watching for block.json changes.
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

		// CACHE: A Set to store the absolute paths of known block.json files.
		this.knownBlockFiles = new Set();
	}

	apply( compiler ) {
		this.options.cwd = compiler.context;

		// Initial Compilation: Scan once, populate cache, generate types.
		compiler.hooks.beforeCompile.tapAsync(
			this.pluginName,
			async ( params, callback ) => {
				if ( this.initialRun ) {
					// Perform the initial scan
					const foundFiles = glob.sync( this.options.searchPattern, {
						cwd: this.options.cwd,
						absolute: true,
					} );

					// Populate Cache
					foundFiles.forEach( ( f ) =>
						this.knownBlockFiles.add( path.resolve( f ) )
					);

					// Run the generator
					await generateBlockAttributeTypes( {
						...this.options,
						filesToProcess: Array.from( this.knownBlockFiles ),
					} );
					this.initialRun = false;
				}
				callback();
			}
		);

		// Watch Mode Optimization: Check only changed files against our cache.
		compiler.hooks.watchRun.tapAsync(
			this.pluginName,
			async ( compiler, callback ) => {
				// Get the Set of changed files from Webpack
				const modifiedFiles = compiler.modifiedFiles;

				if ( ! modifiedFiles || modifiedFiles.size === 0 ) {
					return callback();
				}

				const filesToRegenerate = new Set();

				let shouldRun = false;

				for ( const filePath of modifiedFiles ) {
					// Case A: Is this a known block.json file that changed?
					if (
						this.knownBlockFiles.has( path.resolve( filePath ) )
					) {
						filesToRegenerate.add( path.resolve( filePath ) );
					}

					// Case B: Is this a NEW block.json file?
					// (Matches the extension and isn't in our cache yet)
					if (
						filePath.endsWith( 'block.json' ) &&
						! this.knownBlockFiles.has(
							path.resolve( filePath )
						) &&
						path
							.relative( this.options.cwd, filePath )
							.startsWith(
								path.dirname(
									this.options.searchPattern
										.replace( /\*\*\//g, '' )
										.replace( '**', '' )
								)
							) // Basic check if it's within expected 'src' folder etc.
					) {
						// It's likely a new block. Add to cache and run.
						this.knownBlockFiles.add( path.resolve( filePath ) );
						filesToRegenerate.add( path.resolve( filePath ) );
					}
				}

				if ( filesToRegenerate.size > 0 ) {
					// Run the generator only for the files that actually changed
					await generateBlockAttributeTypes( {
						...this.options,
						filesToProcess: Array.from( filesToRegenerate ),
					} );
				}
				callback();
			}
		);

		// Dependency Tracking: Ensure Webpack watches these files
		if ( compiler.options.mode === 'development' ) {
			compiler.hooks.afterCompile.tap(
				this.pluginName,
				( compilation ) => {
					// Use our cached list of block.json files
					this.knownBlockFiles.forEach( ( file ) => {
						compilation.fileDependencies.add( file );
					} );
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
