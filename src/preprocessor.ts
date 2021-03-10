import { parse, walk } from 'svelte/compiler';
import { Processor } from 'windicss/lib';
import type { Config as WindiCSSConfig } from 'windicss/types/interfaces';
import { StyleSheet } from 'windicss/utils/style';
import { CSSParser, ClassParser } from 'windicss/utils/parser';
import isVarName from 'is-var-name';

export interface Config {
	filename?: string,
	prefix?: string,
	mode?: 'attributes-only' | 'directives-only',
	includeBaseStyles?: boolean,
	includeGlobalStyles?: boolean,
	includePluginStyles?: boolean,
	ignoreDynamicClassesWarning?: boolean
}

export default function preprocessor(
	processor: Processor,
	content: string,
	config?: Config
): string {
	const mode = config?.mode;
	let transformed = content;

	// Build a regex map of all the class utilities of Tailwind
	let tailwindLikeRegExp: RegExp | undefined = undefined;
	if (config?.ignoreDynamicClassesWarning !== true) {
		const tailwindClasses = [
			...Object.keys(processor.resolveStaticUtilities(true)),
			...Object.keys(processor.resolveDynamicUtilities(true)).map(c => c + '-'),
			...Object.keys(processor.resolveVariants('screen')).map(c => c.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + ':'),
			...Object.keys(processor.resolveVariants('state')).map(c => c + ':')
		];
		tailwindLikeRegExp = new RegExp(`(^|\s|[:\(])(${tailwindClasses.join('|')})`);
	}

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
		stylesheet = new CSSParser(content.substr(ast.css.content.start, ast.css.content.end - ast.css.content.start), !mode || mode === 'directives-only' ? processor : undefined).parse()
		const processorConfig = processor.allConfig as any as WindiCSSConfig;
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

	// Only preprocess directives if enabled
	if (!mode || mode === 'attributes-only') {
		// Walk the html markup for all class attributes
		walk(ast.html, {
			enter(node: any) {
				if (node.type === 'Element') {
					// Find class like attribute
					const classLikeAttributes: any[] = node.attributes.filter((a: any) => a.type === 'Class' || attributeToParse.has(a.name.toLowerCase()));

					let class_values: string[] = [];
					let uid = 0;
					let literal_element = new Map<string, string>();
					const addLiteralElement = (elem: string): string => {
						const key = `SWPE_REPLACE_TOKEN_${++uid}`;
						literal_element.set(key, elem);
						return key;
					};

					// Gather the attribute's value into class_values
					for (const attr of classLikeAttributes) {
						// Class directive
						if (attr.type === 'Class') {
							if (attr.expression.type === 'Identifier' && !isVarName(attr.name)) {
								throw new Error('Class directive shorthand need a valid variable name.');
							}
							const name = attr.name;
							const expression = transformed.substr(markupOffset + attr.expression.start, attr.expression.end - attr.expression.start);
							const key = addLiteralElement(expression);
							literal_element.set(key, `\${${expression} ? '${name}' : ''}`);
							class_values.push(key);
							stylesheet.extend(new CSSParser(`.${name} { @apply ${name} }`, processor).parse());
						}
						// Class & variant attribute
						else {
							let content = '';

							// attr={`...`}
							if (attr.value.length === 1 && attr.value[0].type === 'MustacheTag' && attr.value[0].expression.type === 'TemplateLiteral') {
								const templateLiteral = attr.value[0].expression;
								for (let i = 0, j = 0, l = templateLiteral.quasis.length, t = false; i < l; t = !t) {
									const node = t ? templateLiteral.expressions[j++] : templateLiteral.quasis[i++];
									if (node.type === 'TemplateElement') {
										content += transformed.substr(markupOffset + node.start, node.end - node.start);
									} else {
										const expression = '${' + transformed.substr(markupOffset + node.start, node.end - node.start) + '}';
										const key = addLiteralElement(expression);
										content += key;
									}
								}
							}
							// attr="..."
							else {
								for (let i = 0, l = attr.value.length; i < l; ++i) {
									const start = attr.value[i].start;
									const end = Math.min(attr.value[i].end, i + 1 == l ? Number.MAX_SAFE_INTEGER : attr.value[i + 1].start);
									if (attr.value[i].type === 'Text') {
										content += transformed.substr(markupOffset + start, end - start);
									} else {
										const expression = '$' + transformed.substr(markupOffset + start, end - start);
										const key = addLiteralElement(expression);
										content += key;
									}
								}
							}

							class_values.push(attr.name.toLowerCase() === 'class' ? content : `${attr.name}:(${content})`);
						}
						transformed = transformed.substr(0, markupOffset + attr.start) + transformed.substr(markupOffset + attr.end);
						markupOffset -= attr.end - attr.start;
					}

					// Has classes
					if (class_values.length) {
						const value = class_values.join(' ');

						// Compile the value using WindiCSS
						const result = processor_alt.compile(value, processor_alt.config('prefix', 'windi-') as string);

						// Warn user if ignored class name uses tailwind classes
						if (config?.ignoreDynamicClassesWarning !== true && tailwindLikeRegExp && result.ignored.length) {
							for (const className of result.ignored) {
								if (tailwindLikeRegExp.test(className)) {
									console.warn(`[svelte-windicss-preprocess-exp] Dynamic classes are not supported. Please use WindiCSS at runtime in ${config?.filename ?? 'svelte file'} for ${className} to generate the appropriate styles.`);
								}
							}
						}

						// Extend stylesheet with the result
						stylesheet.extend(result.styleSheet);

						// Retrieve the new class names
						let new_value = (result.className ? [result.className] : []).concat(result.ignored).join(' ');
						for (const [key, expression] of literal_element) {
							new_value = new_value.replace(key, expression);
						}

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
	}

	// Extend stylesheet with preflight
	stylesheet.extend(processor.preflight(transformed, config?.includeBaseStyles ?? false, config?.includeGlobalStyles ?? true, config?.includePluginStyles ?? true, true));

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