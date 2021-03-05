import { parse, walk } from 'svelte/compiler';
import { Processor } from 'windicss/lib';
import { StyleSheet } from 'windicss/utils/style';
import { CSSParser } from 'windicss/utils/parser';
import type { TemplateNode } from 'svelte/types/compiler/interfaces';

export function preprocess(options: unknown) {
	// console.log(options);

	const processor = new Processor();
	// const screens = Object.keys(processor.resolveVariants('screen'));
	// const themes = Object.keys(processor.resolveVariants('theme'));
	// const states = Object.keys(processor.resolveVariants('state'));
	// const statics = Object.keys(processor.resolveStaticUtilities(true));
	// const utilities = Object.keys(processor.resolveDynamicUtilities(true));

	return {
		markup({ content, filename }: { content: string, filename: string }) {
			return new Promise((resolve, reject) => {
				const ast = parse(content, { filename });

				const stylesheet = ast.css ? new CSSParser(content.substr(ast.css.content.start, ast.css.content.end - ast.css.content.start)).parse() : new StyleSheet();
				let transformed = content;
				let offset = 0;
				walk(ast.html, {
					enter: function (node: TemplateNode) {
						if (node.type === 'Attribute' && node.name.toLowerCase() === 'class') {
							let [attr_start, attr_end] = node.value.reduce(([start, end]: [number, number], value: any) => {
								return [Math.min(start, value.start), Math.max(end, value.end)];
							}, [node.end, node.start] as [number, number]);
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
							const value = transformed.substr(offset + content_start, content_end - content_start);
							const result = processor.compile(value);

							// TODO warn user if ignored classes had windicss utilitiles/screens/etc

							stylesheet.extend(result.styleSheet);
							const new_value = (result.className ? [result.className] : []).concat(result.ignored).join(' ');
							const before = transformed.substr(0, offset + content_start);
							const after = transformed.substr(offset + content_end);
							transformed = before + new_value + after;
							offset -= value.length;
							offset += new_value.length;
						}
					} as any
				});

				const preflights = processor.preflight(transformed, true, true, true, true);
				preflights.extend(stylesheet);

				if (ast.css) {
					const cssOffset = ast.html.start < ast.css.start ? offset : 0;
					transformed = transformed.substr(0, cssOffset + ast.css.start) + '<style>' + preflights.build() + '</style>' + transformed.substr(cssOffset + ast.css.end);
				} else {
					transformed += `\n\n<style>\n${preflights.build()}\n</style>`;
				}

				return resolve({
					code: transformed
				});
			})
		},
		style({ content, filename }: { content: string, filename: string }) {
			return Promise.resolve({
				code: content
			})
		}
	};
}