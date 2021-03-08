import { parse, walk } from 'svelte/compiler';
import { Processor } from 'windicss/lib';
import type { Config } from 'windicss/types/interfaces';
import { StyleSheet } from 'windicss/utils/style';
import { CSSParser, ClassParser } from 'windicss/utils/parser';
import type { TemplateNode } from 'svelte/types/compiler/interfaces';

export interface PreprocessorConfig {
	filename?: string,
	includeBaseStyles?: boolean,
	ignoreDynamicClassesWarning?: boolean
}

export default function preprocessor(
	processor: Processor,
	content: string,
	config?: PreprocessorConfig
): string {
	let transformed = content;

	// Build a regex map of all the class utilities of Tailwind
	const tailwindClasses = {
		staticutilities: new RegExp(`(${Object.keys(processor.resolveStaticUtilities(true)).map(i => `(^|[ :\(])${i}($|[ \)]+)`).join('|')})`, ''),
		dynamicutilities: new RegExp(`(${Object.keys(processor.resolveDynamicUtilities(true)).map(i => `(^|[ :\(]+)(${i}-)`).join('|')})`, ''),
		variantscreen: new RegExp(`(${Object.keys(processor.resolveVariants('screen')).map(i => `(^|[ :\(]+)(${i.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}:)`).join('|')})`, ''),
		variantstate: new RegExp(`(${Object.keys(processor.resolveVariants('state')).map(i => `(^|[ :\(]+)(${i}:)`).join('|')})`, ''),
		// varianttheme: new RegExp(`(${Object.keys(processor.resolveVariants('theme')).join('|')})`, ''),
	};

	// Parse Svelte markup
	const ast = parse(content, { filename: config?.filename ?? 'Unknown.svelte' });

	// Exclude class names in Svelte style tag from being processed
	let stylesheet: StyleSheet;
	let processor_alt: Processor;
	if (ast.css) {
		stylesheet = new CSSParser(content.substr(ast.css.content.start, ast.css.content.end - ast.css.content.start), processor).parse()
		const processorConfig = processor.allConfig as any as Config;
		const separator = processor.config('separator', ':') as string;
		processor_alt = new Processor({
			...processorConfig,
			exclude: [
				...processorConfig.exclude ?? [],
				...stylesheet.children
					.filter(s => s.selector)
					.map(s => {
						const parsed = new ClassParser(s.selector!, separator).parse();
						const selectors = parsed.map(p => (p.content! as string).replace(/^\./, '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).join('|');
						return new RegExp(`(${selectors})`);
					})
			]
		});
	} else {
		stylesheet = new StyleSheet();
		processor_alt = processor;
	}

	// Keep track of the changes in the buffer
	let markupOffset = 0;
	// Walk the html markup for all class attributes
	walk(ast.html, {
		enter: function (node: TemplateNode) {
			if (node.type === 'Attribute' && node.name.toLowerCase() === 'class') {
				// Retrive start/end of the attribute's value (everything within "" or {})
				let [attr_start, attr_end] = node.value.reduce(([start, end]: [number, number], value: any) => {
					return [Math.min(start, value.start), Math.max(end, value.end)];
				}, [node.end, node.start] as [number, number]);

				// Retrive the start/end of the attribute's value content (excluding the {} or {``})
				let content_start = attr_start;
				let content_end = attr_end;
				if (node.value.length === 1 && node.value[0].type === 'MustacheTag') {
					content_start += 1;
					content_end -= 1;
					if (node.value[0].expression.type === 'TemplateLiteral') {
						content_start += 1;
						content_end -= 1;
					}
				}

				// Retrive the attribute value's content
				const value = transformed.substr(markupOffset + content_start, content_end - content_start);

				// Compile the value using WindiCSS
				const result = processor_alt.compile(value);

				// Warn user if ignored class name uses tailwind classes
				if (config?.ignoreDynamicClassesWarning !== true && result.ignored.length) {
					for (const className of result.ignored) {
						if (
							tailwindClasses.staticutilities.test(className) ||
							tailwindClasses.dynamicutilities.test(className) ||
							tailwindClasses.variantscreen.test(className) ||
							tailwindClasses.variantstate.test(className)
						) {
							console.warn(`[svelte-windicss-preprocess-exp] Dynamic classes are not supported. Please use WindiCSS at runtime in ${config?.filename ?? 'svelte file'} for ${className} to generate the appropriate styles.`);
						}
					}
				}

				// Extend stylesheet with the result
				stylesheet.extend(result.styleSheet);

				// Retrieve the new class names
				const new_value = (result.className ? [result.className] : []).concat(result.ignored).join(' ');

				// Replace attribute's value with new value
				const before = transformed.substr(0, markupOffset + content_start);
				const after = transformed.substr(markupOffset + content_end);
				transformed = before + new_value + after;

				// Update offset with current modification
				markupOffset -= value.length;
				markupOffset += new_value.length;
			}
		} as any
	});

	// Extend stylesheet with preflight
	stylesheet.extend(processor.preflight(transformed, config?.includeBaseStyles ?? false, true, true, true));

	if (ast.css) {
		// Replace existing style tag with new one
		const cssOffset = ast.html.start < ast.css.start ? markupOffset : 0;
		transformed = transformed.substr(0, cssOffset + ast.css.start) + '<style>' + stylesheet.build() + '</style>' + transformed.substr(cssOffset + ast.css.end);
	} else {
		// Append new style tag
		transformed += `<style>${stylesheet.build()}</style>`;
	}

	return transformed;
}