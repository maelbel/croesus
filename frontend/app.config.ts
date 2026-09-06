// Nuxt UI theme config. Not auto-discovered outside a full Nuxt app — imported
// explicitly by vite.config.ts and passed into the @nuxt/ui vite plugin.
export default {
  ui: {
    colors: {
      primary: 'moss',
      neutral: 'olive',
      error: 'rust',
    },
    button: {
      slots: {
        base: 'cursor-pointer font-bold',
      },
      variants: {
        size: {
          xs: { base: 'px-2.5 py-1.5 text-xs gap-1.5' },
          sm: { base: 'px-3 py-1.5 text-sm gap-1.5' },
          md: { base: 'px-3.5 py-2 text-sm gap-2' },
          lg: { base: 'px-4 py-2.5 text-base gap-2' },
          xl: { base: 'px-5 py-3 text-base gap-2.5' },
        },
      },
    },
    select: {
      slots: {
        base: 'cursor-pointer',
        item: 'cursor-pointer',
      },
    },
  },
}
