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

// Ensure defaultConfig is an array for mapping, if not already.
const configs = Array.isArray( defaultConfig )
	? defaultConfig
	: [ defaultConfig ];

// Export the array of modified configurations.
module.exports = configs.map( ( config, index ) => {

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

	return {
		...config,
		resolve,
		plugins,
	};
} );
