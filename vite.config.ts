import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: "/svelte-address-distribution/",
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
    },
  },
})
