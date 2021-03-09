# svelte-windicss-preprocess-exp

> A svelte preprocessor to compile [TailwindCSS](https://github.com/tailwindlabs/tailwindcss) at build time based on [WindiCSS](https://github.com/windicss/windicss) compiler.

This package uses Svelte's and WindiCSS's own parser to carefully target only class attribute, [class directives](https://svelte.dev/docs#class_name), [variant attributes](https://windicss.netlify.app/guide/svelte.html#variant-attributes), [`@apply` directives](https://tailwindcss.com/docs/functions-and-directives#apply), [`@variants` directives](https://tailwindcss.com/docs/functions-and-directives#variants) and [`@screen` directives](https://tailwindcss.com/docs/functions-and-directives#screen).

---

## Why not use [svelte-windicss-preprocess](https://github.com/windicss/svelte-windicss-preprocess/)?
The package `svelte-windicss-preprocess` as of v3 still uses a custom parser built with regular expressions. Using regular expression is not the right tool to parse and preprocess a complex markup like Svelte. As a result, it preprocesses statements in the wrong places (see issue [#43](https://github.com/windicss/svelte-windicss-preprocess/issues/43), [#44](https://github.com/windicss/svelte-windicss-preprocess/issues/44) and [#46](https://github.com/windicss/svelte-windicss-preprocess/issues/46)). It was [decided by the contributors](https://github.com/windicss/svelte-windicss-preprocess/issues/50#issuecomment-793449097) to forgo the use of Svelte parser and continue with regular expressions.

Until the `svelte-windicss-preprocess` stabilize their regular expressions, I'll maintain this package as an alternate solution that is, for now, more robust and reliable.

---

## Installation

```sh
npm install --save-dev svelte-windicss-preprocess-exp
```

## Configuration

### Svelte

```js
// svelte.config.js
module.exports = {
	preprocess: require("svelte-windicss-preprocess-exp").preprocess(),
};
```

with Typescript

```js
// svelte.config.js
module.exports = {
	preprocess: require("svelte-sequential-preprocessor")([
		require("svelte-preprocess").typescript(),
		require("svelte-windicss-preprocess-exp").preprocess(),
	]),
};
```
