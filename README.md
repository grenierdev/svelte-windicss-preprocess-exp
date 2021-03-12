# svelte-windicss-preprocess-exp

> A svelte preprocessor to compile [TailwindCSS](https://github.com/tailwindlabs/tailwindcss) at build time based on [WindiCSS](https://github.com/windicss/windicss) compiler.

This package uses Svelte's and WindiCSS's own parser to carefully target only class attribute, [class directives](https://svelte.dev/docs#class_name), [variant attributes](https://windicss.netlify.app/guide/svelte.html#variant-attributes), [`@apply` directives](https://tailwindcss.com/docs/functions-and-directives#apply), [`@variants` directives](https://tailwindcss.com/docs/functions-and-directives#variants) and [`@screen` directives](https://tailwindcss.com/docs/functions-and-directives#screen).

---

## Why not use [svelte-windicss-preprocess](https://github.com/windicss/svelte-windicss-preprocess/)?
The package `svelte-windicss-preprocess` as of v3 still uses a custom parser built with regular expressions. Regular expressions are not the right tool to parse and preprocess a complex markup like Svelte. As a result, it preprocesses statements in the wrong places (see issue [#43](https://github.com/windicss/svelte-windicss-preprocess/issues/43), [#44](https://github.com/windicss/svelte-windicss-preprocess/issues/44) and [#46](https://github.com/windicss/svelte-windicss-preprocess/issues/46)). It was [decided by the contributors](https://github.com/windicss/svelte-windicss-preprocess/issues/50#issuecomment-793449097) to forego the use of Svelte parser and continue with regular expressions.

Until the `svelte-windicss-preprocess` stabilize their regular expressions, I'll maintain this package as an alternate solution that is, for now, more robust and reliable.

---

## Installation

```sh
npm install --save-dev svelte-windicss-preprocess-exp
```

### Configuration

```js
// svelte.config.js
module.exports = {
  preprocess: require("svelte-windicss-preprocess-exp").preprocess({
    // … see config below
  }),
};
```

<table>
	<thead>
		<tr>
			<th>Configuration</th>
			<th>Description</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>config</td>
			<td>
				Either a <code>string</code> that represent the location of <code>tailwind.config.js</code> or the <a href="https://windicss.netlify.app/guide/configuration.html#configuring-windi-css" target="_blank">WindiCSS configuration's <code>object</code></a>.<br /><br />Defaults to <code>undefined</code>.
			</td>
		</tr>
		<tr>
			<td>mode</td>
			<td>
				When set to <code>attribute-only</code>, it only processes class attribute, class directive and variants attribute. When set to <code>directive-only</code>, only <code>@apply</code>, <code>@screen</code> and <code>@variants</code> directive are processed. When not set or <code>undefined</code>, everything is processed.<br /><br />Defaults to <code>undefined</code>
			</td>
		</tr>
		<tr>
			<td>includeBaseStyles</td>
			<td>
				Include TailwindCSS's base style.<br /><br />Defaults to <code>false</code>
			</td>
		</tr>
		<tr>
			<td>includeGlobalStyles</td>
			<td>
				Include global styles.<br /><br />Defaults to <code>true</code>
			</td>
		</tr>
		<tr>
			<td>includePluginStyles</td>
			<td>
				Include plugin styles.<br /><br />Defaults to <code>true</code>
			</td>
		</tr>
		<tr>
			<td>ignoreDynamicClassesWarning</td>
			<td>
				Do not emit warning when using dynamic classes on TailwindCSS's utility classes<br /><br />Defaults to <code>false</code>
			</td>
		</tr>
	</tbody>
</table>

### Typescript

If you are using Typescript or any other preprocessor, you will need to wrap your preprocessors inside [`svelte-sequential-preprocessor`](https://github.com/pchynoweth/svelte-sequential-preprocessor). Svelte praser will only understand Javascript, HTML, CSS code.

```js
// svelte.config.js
module.exports = {
  preprocess: require("svelte-sequential-preprocessor")([
    require("svelte-preprocess").typescript(),
    require("svelte-windicss-preprocess-exp").preprocess(),
  ]),
};
```

---

## Base styles
The preprocessor will only compile WindiCSS's style within your component. You are left with the responsibility to include the WindiCSS's base styles with `@windicss base;` somewhere in a top-level component's style. The generated base styles will be properly wrapped in `:global(…)`.

```html
<div>…</div>

<style>
  /* Add this to include WindiCSS's base styles in your component */
  @windicss base;
</style>
```

---

## Compatibilities

Attribute's value syntaxe supported : vanilla `<div class="foo">…</div>`, mustache tag `<div class="font-bold {foo} {bar}">…</div>` and template literal ``<div class={`font-bold ${template} ${literals}`}>…</div>``. They all get squashed and normalized into a single class attribute with template literal by this preprocessor.

> **Dynamic classes** are only handled in class directives. They are left untouched by the preprocessor. If you requires to process dynamic classes within mustache tag or template literal, you can call WindiCSS's processor at runtime to generate appropriated styles.

### Class attribute

```html
<h1 class="text-4xl font-extrabold">Hello World</h1>

↓↓↓

<h1 class={`windi-mqgc06`}>Hello World</h1>
<style>
  .windi-mqgc06 {
    font-size: 2.25rem;
    line-height: 2.5rem;
    font-weight: 800;
  }
</style>
```

### [Class directive](https://svelte.dev/docs#class_name)

```html
<h1 class:text-4xl={large} class:font-extra-bold={bold} class:foo class="text-indigo-600">
  Hello World
</h1>

↓↓↓

<h1 class={`windi-u7qal3 ${large ? 'text-4xl' : ''} ${bold ? 'font-extra-bold' : ''} ${foo ? 'foo' : ''}`}>
  Hello World
</h1>
<style>
  .font-extra-bold {
    font-weight: 700;
  }
  .text-4xl {
    font-size: 2.25rem;
    line-height: 2.5rem;
  }
  .windi-u7qal3 {
    --tw-text-opacity: 1;
    color: rgba(79, 70, 229, var(--tw-text-opacity));
  }
</style>
```

### [Variants attribute](https://windicss.netlify.app/guide/svelte.html#variant-attributes)

```html
<h1 sm="text-4xl" hover="text-pink-600" class="text-indigo-600">
  Hello World
</h1>

↓↓↓

<h1 class={`windi-1j0q50z`}>Hello World</h1>
<style>
  .windi-1j0q50z:hover {
    --tw-text-opacity: 1;
    color: rgba(219, 39, 119, var(--tw-text-opacity));
  }
  .windi-1j0q50z {
    --tw-text-opacity: 1;
    color: rgba(79, 70, 229, var(--tw-text-opacity));
  }
  @media (min-width: 640px) {
    .windi-1j0q50z {
      font-size: 2.25rem;
      line-height: 2.5rem;
    }
  }
</style>
```

### [@apply directive](https://windicss.netlify.app/guide/directives.html#apply)

```html
<h1 class="foo">Hello World</h1>
<style>
  .foo {
    @apply text-4xl;
  }
</style>

↓↓↓

<h1 class={`foo`}>Hello World</h1>
<style>
  .foo {
    font-size: 2.25rem;
    line-height: 2.5rem;
  }
</style>
```

### [@screen directive](https://windicss.netlify.app/guide/directives.html#screen)

```html
<h1 class="foo">Hello World</h1>
<style>
  @screen sm {
    .foo {
      font-weight: bold;
    }
  }
</style>

↓↓↓

<h1 class={`foo`}>Hello World</h1>
<style>
  @media (min-width: 640px) {
    .foo {
      font-weight: bold;
    }
  }
</style>
```

### [@variants directive](https://windicss.netlify.app/guide/directives.html#variants)

```html
<h1 class="foo">Hello World</h1>
<style>
  @variants active, hover {
    .foo {
      font-weight: bold;
    }
  }
</style>

↓↓↓

<h1 class={`foo`}>Hello World</h1>
<style>
  .foo:active {
    font-weight: bold;
  }
  .foo:hover {
    font-weight: bold;
  }
</style>
```