import { parse, walk } from 'svelte/compiler';
import { Processor } from 'windicss/lib';
import type { Config as WindiCSSConfig } from 'windicss/types/interfaces';
import { StyleSheet, Style, Property } from 'windicss/utils/style';
import { CSSParser, ClassParser } from 'windicss/utils/parser';
import isVarName from 'is-var-name';
import { SourceNode } from 'source-map';
import lineColumn from 'line-column';
import type { TemplateNode } from 'svelte/types/compiler/interfaces';
import { basename } from 'path';

export interface Config {
	filename?: string,
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
): {
	code: string,
	map: string,
} {
	const filename = basename(config?.filename ?? 'Unknown.svelte');
	const mode = config?.mode;
	const sourcemap = new SourceNode(1, 1, filename);
	const linecol = lineColumn(content);

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
	const attributeToParse = new Set(['class']);

	// Parse Svelte markup
	const ast = parse(content, { filename });

	// Exclude class names in Svelte style tag from being processed
	let stylesheet: StyleSheet;
	let forceIncludeBaseStyles = false;
	let processor_alt: Processor;
	if (ast.css) {
		stylesheet = new CSSParser(content.substr(ast.css.content.start, ast.css.content.end - ast.css.content.start), !mode || mode === 'directives-only' ? processor : undefined).parse()
		stylesheet.children = stylesheet.children.reduce((children, child) => {
			child.property = child.property.reduce((properties, property) => {
				if (/*property instanceof InlineAtRule &&*/ property.name === 'windicss' && property.value === 'base') {
					forceIncludeBaseStyles = true;
				} else {
					properties.push(property);
				}
				return properties;
			}, [] as Property[]);
			children.push(child);
			return children;
		}, [] as Style[]);
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

	// Leave module as-is
	if (ast.module) {
		const { line, col } = linecol.fromIndex(ast.module.start)!;
		sourcemap.add(new SourceNode(line, col, filename, content.substr(ast.module.start, ast.module.end - ast.module.start)));
	}
	// Leave script as-is
	if (ast.instance) {
		const { line, col } = linecol.fromIndex(ast.instance.start)!;
		sourcemap.add(new SourceNode(line, col, filename, content.substr(ast.instance.start, ast.instance.end - ast.instance.start)));
	}

	// Only preprocess directives if enabled
	if (!mode || mode === 'attributes-only') {
		const elements: { start: number, end: number, attributes: TemplateNode[] }[] = [];

		// Walk the html markup for all class attributes
		walk(ast.html, {
			enter: ((node: TemplateNode) => {
				if (node.type === 'Element' || node.type === 'InlineComponent') {
					// Find class like attribute
					const classLikeAttributes = node.attributes.filter((a: any) => a.type === 'Class' || attributeToParse.has((a.name ?? '').toLowerCase())) as TemplateNode[];

					if (classLikeAttributes.length) {
						elements.push({
							start: node.start,
							end: node.end,
							attributes: classLikeAttributes
						});
					}
				}
			}) as any
		});

		let htmlLastOffset = ast.html.start;

		// Collapse all class-like attributes
		for (const element of elements) {
			// Leave class-like attributes for now
			for (const attr of element.attributes) {
				const { line, col } = linecol.fromIndex(htmlLastOffset)!;
				const s = content.substr(htmlLastOffset, attr.start - htmlLastOffset);
				sourcemap.add(new SourceNode(line, col, filename, s));
				htmlLastOffset = attr.end;
			}

			// Process class-like attributes
			const class_names: string[] = [];
			const expressions: { key: string, value: string, start: number, end: number }[] = [];
			let uid = 0;
			const addExpression = (exp: string, start: number, end: number): string => {
				const key = `SWPE_REPLACE_TOKEN_${++uid}`;
				expressions.push({ key, value: exp, start, end });
				return key;
			};
			for (let i = 0, l = element.attributes.length; i < l; ++i) {
				const attr = element.attributes[i];
				if (attr.type === 'Class') {
					if (attr.expression.type === 'Identifier' && !isVarName(attr.expression.name)) {
						throw new Error(`Class directive shorthand need a valid variable name, "${attr.expression.name}" is not.`);
					}
					const expression = content.substr(attr.expression.start, attr.expression.end - attr.expression.start);
					const key = addExpression(`\${${expression} ? '${attr.name}' : ''}`, attr.expression.start, attr.expression.end);
					class_names.push(key);
					stylesheet.extend(new CSSParser(`.${attr.name} { @apply ${attr.name} }`, processor).parse());
				} else if (attr.value) {
					let value = '';
					// attr={`...`}
					if (attr.value.length === 1 && attr.value[0].type === 'MustacheTag' && attr.value[0].expression.type === 'TemplateLiteral') {
						const templateLiteral = attr.value[0].expression;
						for (let i = 0, j = 0, l = templateLiteral.quasis.length, t = false; i < l; t = !t) {
							const node = t ? templateLiteral.expressions[j++] : templateLiteral.quasis[i++];
							const text = content.substr(node.start, node.end - node.start);
							if (node.type === 'TemplateElement') {
								value += text;
							} else {
								const key = addExpression('${' + text + '}', node.start, node.end);
								value += key;
							}
						}
					}
					// attr="..."
					else {
						for (let i = 0, l = attr.value.length; i < l; ++i) {
							const start = attr.value[i].start;
							const end = Math.min(attr.value[i].end, i + 1 == l ? Number.MAX_SAFE_INTEGER : attr.value[i + 1].start);
							const text = content.substr(start, end - start);
							if (attr.value[i].type === 'Text') {
								value += text;
							} else {
								const key = addExpression('$' + text, start, end);
								value += key;
							}
						}
					}

					class_names.push(value)
				}
			}

			// Has class_names
			if (class_names.length) {
				const value = class_names.join(' ');

				// Compile the value using WindiCSS
				const result = processor_alt.compile(value, processor_alt.config('prefix', 'windi-') as string);

				// Warn user if ignored class name uses tailwind classes
				if (config?.ignoreDynamicClassesWarning !== true && tailwindLikeRegExp && result.ignored.length) {
					const { line, col } = linecol.fromIndex(element.start)!;
					for (const className of result.ignored) {
						if (tailwindLikeRegExp.test(className)) {
							console.warn(`${filename}:${line}:${col} Dynamic class names are not supported, found "${className}". Use WindiCSS at runtime to generate appropriate styles.`)
						}
					}
				}

				// Extend stylesheet with the result
				stylesheet.extend(result.styleSheet);

				sourcemap.add('class={`');
				const new_value = (result.className ? [result.className] : []).concat(result.ignored).join(' ');
				let curr = 0;
				for (const { key, value, start } of expressions) {
					const { line, col } = linecol.fromIndex(start)!;
					new_value.replace(key, (_, offset) => {
						if (offset - curr > 0) {
							sourcemap.add(new_value.substr(curr, offset - curr));
						}
						sourcemap.add(new SourceNode(line, col, filename, value));
						curr = offset + key.length;
						return '';
					});
				}

				if (curr < new_value.length) {
					sourcemap.add(new_value.substr(curr));
				}
				sourcemap.add('`}');
			}
		}

		// Rest of HTML
		{
			const { line, col } = linecol.fromIndex(htmlLastOffset)!;
			const s = content.substr(htmlLastOffset, ast.html.end - htmlLastOffset);
			sourcemap.add(new SourceNode(line, col, filename, s));
		}
	} else {
		const { line, col } = linecol.fromIndex(ast.html.start)!;
		sourcemap.add(new SourceNode(line, col, filename, content.substr(ast.html.start, ast.html.end - ast.html.start)));
	}

	// Extend stylesheet with preflight
	if (forceIncludeBaseStyles || (config?.includeBaseStyles ?? false)) {
		const baseStyles = processor.preflight('', true, true, true, true);
		baseStyles.children.forEach(style => {
			if (!style.rule.includes(':global')) {
				style.wrapRule(rule => `:global(${rule})`);
			}
		});
		stylesheet.extend(baseStyles);
	}
	stylesheet.extend(processor.preflight(sourcemap.toString(), false, config?.includeGlobalStyles ?? true, config?.includePluginStyles ?? true, true));

	// Insert new style
	sourcemap.add('<style>' + stylesheet.build() + '</style>');

	const { code, map } = sourcemap.toStringWithSourceMap();
	return {
		code,
		map: map.toString()
	};
}