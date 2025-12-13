/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, InspectorControls, ColorPalette } from '@wordpress/block-editor';

import { useState } from '@wordpress/element';

/**
 * Import our dynamically generated BlockAttributes type.
 */
import { BlockAttributes } from './block-attributes'

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @param {Object}   props               Properties passed to the function.
 * @param {Object}   props.attributes    Available block attributes.
 * @param {Function} props.setAttributes Function that updates individual attributes.
 *
 * @return {Element} Element to render.
 */
// Define the type for the block's attributes
interface EditProps {
	attributes: BlockAttributes;
	setAttributes: ( attributes: Partial< BlockAttributes > ) => void;
}

const Edit: React.FC< EditProps > = ( { attributes, setAttributes } ) => {
	const lightThemeBgColor = attributes.lightThemeBgColor;
	const lightThemeTextColor = attributes.lightThemeTextColor;
	const darkThemeBgColor = attributes.darkThemeBgColor;
	const darkThemeTextColor = attributes.darkThemeTextColor;

	const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const blockProps = useBlockProps({
		className: currentTheme === 'dark' ? 'dark-theme' : 'light-theme',
		style: {
			'--light-theme-bg-color': lightThemeBgColor,
			'--light-theme-text-color': lightThemeTextColor,
			'--dark-theme-bg-color': darkThemeBgColor,
			'--dark-theme-text-color': darkThemeTextColor,
		} as React.CSSProperties,
	});

	const themeText = currentTheme === 'dark'
		? __('Switch to Light', 'typed-attributes-demo')
		: __('Switch to Dark', 'typed-attributes-demo');

	return (
		<>
			<InspectorControls>
				<div style={{ padding: '1em 0' }}>
					<strong>Background Color</strong>
					<ColorPalette
						value={lightThemeBgColor}
						onChange={(newColor) => setAttributes({ lightThemeBgColor: newColor })}
					/>
					<ColorPalette
						value={darkThemeBgColor}
						onChange={(newColor) => setAttributes({ darkThemeBgColor: newColor })}
					/>
					<ColorPalette
						value={lightThemeTextColor}
						onChange={(newColor) => setAttributes({ lightThemeTextColor: newColor })}
					/>
					<ColorPalette
						value={darkThemeTextColor}
						onChange={(newColor) => setAttributes({ darkThemeTextColor: newColor })}
					/>
				</div>
			</InspectorControls>
			<div { ...blockProps }>
				<button
					type="button"
					onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
				>
					{themeText}
				</button>
				<button
					type="button"
					onClick={() => setIsOpen((open) => !open)}
					aria-expanded={isOpen}
					aria-controls="typed-attributes-demo-paragraph"
				>
					{__('Toggle', 'typed-attributes-demo')}
				</button>
				<p
					id="typed-attributes-demo-paragraph"
					hidden={!isOpen}
					style={currentTheme === 'dark'
						? { backgroundColor: darkThemeBgColor, color: darkThemeTextColor }
						: { backgroundColor: lightThemeBgColor, color: lightThemeTextColor }
					}
				>
					{__('Typed Attributes Demo - hello from an interactive block!', 'typed-attributes-demo')}
				</p>
			</div>
		</>
	);
};

export default Edit;
