import { parse, walk } from 'svelte/compiler';
import { Processor } from 'windicss/lib';
import type { Config } from 'windicss/types/interfaces';
import { StyleSheet } from 'windicss/utils/style';
import { CSSParser, ClassParser } from 'windicss/utils/parser';

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

	const attributeToParse = new Set([
		'class',
		...Object.keys(processor.resolveVariants('screen')),
		...Object.keys(processor.resolveVariants('state'))
	]);

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
		enter(node: any) {
			if (node.type === 'Element') {
				// Find class like attribute
				const classLikeAttributes: any[] = node.attributes.filter((a: any) => attributeToParse.has(a.name.toLowerCase()));

				let class_values: string[] = [];

				// Gather the attribute's value into class_values
				for (const attr of classLikeAttributes) {

					// attr={`...`}
					if (attr.value.length === 1 && attr.value[0].type === 'MustacheTag' && attr.value[0].expression.type === 'TemplateLiteral') {
						const content_start = attr.value[0].start;
						const content_end = attr.value[attr.value.length - 1].end;

						const content = transformed.substr(markupOffset + content_start + 2, content_end - 4 - content_start);
						if (attr.name.toLowerCase() === 'class') {
							class_values.push(content);
						} else {
							class_values.push(attr.name + ':(' + content + ')');
						}
					}

					// attr="..."
					else {
						let attrOffset = 0;
						let tmp = transformed;
						const content_start = attr.value[0].start;
						const content_end = attr.value[attr.value.length - 1].end;
						walk(attr, {
							enter(node: any) {
								// {bar} → ${bar}
								if (node.type === 'MustacheTag') {
									tmp = tmp.substr(0, markupOffset + attrOffset + node.start) + '$' + tmp.substr(markupOffset + attrOffset + node.start, node.end - node.start) + tmp.substr(markupOffset + attrOffset + node.end);
									attrOffset += 1;
								}
							}
						});

						const content = tmp.substr(markupOffset + content_start, content_end + attrOffset - content_start);
						if (attr.name.toLowerCase() === 'class') {
							class_values.push(content);
						} else {
							class_values.push(attr.name + ':(' + content + ')');
						}

					}
					transformed = transformed.substr(0, markupOffset + attr.start) + transformed.substr(markupOffset + attr.end);
					markupOffset -= attr.end - attr.start;
				}

				// Has classes
				if (class_values.length) {
					const value = class_values.join(' ');

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
					const before = transformed.substr(0, classLikeAttributes[0].start);
					const after = transformed.substr(classLikeAttributes[0].start);
					transformed = before + 'class={`' + new_value + '`}' + after;

					// Update offset with current modification
					markupOffset += new_value.length + 10;
				}

				this.skip();
			}
		}
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