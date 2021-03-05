# svelte-windicss-preprocess

> A svelte preprocessor to compile [tailwindcss](https://github.com/tailwindlabs/tailwindcss) at build time based on [windicss](https://github.com/windicss/windicss) compiler.

## Experimental Parser

This is a fork of the [official preprocessor](https://github.com/windicss/svelte-windicss-preprocess/) to reuse the Svelte and WindiCSS parsers to add functionnality.

Feature compatibility:

```html
...
```

---

## Installation

```sh
npm install svelte-windicss-preprocess --save-dev
```

## Configuration

### Svelte

```js
// svelte.config.js
module.exports = {
	preprocess: require("svelte-windicss-preprocess").preprocess({
		// uncomment this, if you need a config file
		// config: 'tailwind.config.js',
		compile: false,
		prefix: "windi-",
		globalPreflight: true,
		globalUtility: true,
	}),
};
```

with Typescript

```js
// svelte.config.js
module.exports = {
	preprocess: require("svelte-sequential-preprocessor")([
		require("svelte-preprocess").typescript(),
		require("svelte-windicss-preprocess").preprocess({
			// uncomment this, if you need a config file
			// config: 'tailwind.config.js',
			compile: false,
			prefix: "windi-",
			globalPreflight: true,
			globalUtility: true,
		}),
	]),
};
```
