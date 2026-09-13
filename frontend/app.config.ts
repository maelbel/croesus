// Nuxt UI theme config. Not auto-discovered outside a full Nuxt app — imported
// explicitly by vite.config.ts and passed into the @nuxt/ui vite plugin.
//
// z-index policy: every Nuxt UI component that teleports to <body> (tooltip,
// dropdown-menu, select, modal, slideover...) ships with *no* z-index of its
// own — it relies on plain DOM-order stacking to land above in-page content,
// which breaks the moment anything in the page (this app's sticky header,
// but just as easily some future `relative`/`sticky` element) has an
// explicit z-index or is later in the DOM. Rather than annotate every
// individual usage with a `:ui="{ content: 'z-NN' }"` override — easy to
// get right once and then forget on the next new usage — every such
// component gets a z-index here, once, covering all current and future
// usages automatically:
//   - z-10: the app's own sticky header/sidebar (see App.vue) — just above
//     ordinary page content.
//   - z-20: page-level overlays (modal, slideover).
//   - z-30: transient popover-style content (tooltip, dropdown-menu,
//     select) — sits above z-20 so one of these still works correctly when
//     opened from inside a modal/slideover (e.g. a dropdown menu inside an
//     open slideover).
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
        content: 'z-30',
      },
    },
    tooltip: {
      slots: {
        content: 'z-30',
      },
    },
    dropdownMenu: {
      slots: {
        content: 'z-30',
      },
    },
    modal: {
      slots: {
        overlay: 'z-20',
        content: 'z-20',
      },
    },
    slideover: {
      slots: {
        overlay: 'z-20',
        content: 'z-20',
      },
    },
  },
}
