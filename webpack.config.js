const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const generateBlockAttributeTypes = require( './generate-block-attribute-types' );
const path = require( 'path' );
const glob = require( 'glob' );
const fs = require( 'fs' );

/**
 * Webpack Plugin to trigger TypeScript interface generation for block attributes.
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

		// In watch mode, regenerate types if any block.json files change
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

					if (
						modifiedFiles.some( ( file ) =>
							blockJsonSearchPaths.includes( file )
						)
					) {
						await generateBlockAttributeTypes( this.options );
					}
					callback();
				}
			);
		}
	}
}

// Detect entry points -- either single-block or multi-block structure
// modified to support TypeScript entry files (.ts)
const customEntryPoints = {};
const currentWorkingDir = process.cwd();

if ( fs.existsSync( path.resolve( currentWorkingDir, 'src/index.ts' ) ) ) {
	customEntryPoints.index = path.resolve( currentWorkingDir, 'src/index.ts' );
} else {
	const blockIndexFiles = glob.sync( 'src/blocks/*/index.ts', {
		cwd: currentWorkingDir,
		absolute: false,
	} );
	blockIndexFiles.forEach( ( file ) => {
		const blockName = path.basename( path.dirname( file ) );
		customEntryPoints[ blockName ] = path.resolve(
			currentWorkingDir,
			file
		);
	} );
}

const configs = Array.isArray( defaultConfig )
	? defaultConfig
	: [ defaultConfig ];

module.exports = configs.map( ( config, index ) => {
	// Detect if this is the experimental module build (Interactivity API, etc.)
	// These builds typically have experiments.outputModule = true
	const isModuleBuild = config.experiments && config.experiments.outputModule;

	// Add type generation only to the FIRST config to prevent double-running
	const plugins = [ ...( config.plugins || [] ) ];
	if ( index === 0 ) {
		plugins.push( new GenerateTypesWebpackPlugin() );
	}

	// Apply .ts/.tsx extension resolution to ALL builds (modules might use TS too)
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

	// Only inject standard editor entry points (registerBlockType) into the STANDARD build.
	// Do not inject them into the module build.
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
