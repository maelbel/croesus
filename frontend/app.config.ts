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
// Cursor policy: none of these components' interactive elements are native
// `<button>`/`<label>` tags with a browser-default pointer cursor — they're
// styled `<div>`/Reka-UI primitives, so every clickable one needs an
// explicit `cursor-pointer` here rather than relying on a per-usage class
// that's easy to add once and forget on the next usage.
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
        // Default content width is pinned to the trigger's width, which
        // clips/wraps any option label longer than the trigger — let it grow
        // to fit its widest option instead, never narrower than the trigger.
        content: 'z-30 w-auto min-w-(--reka-select-trigger-width)',
      },
    },
    checkbox: {
      slots: {
        base: 'cursor-pointer',
        label: 'cursor-pointer',
      },
    },
    radioGroup: {
      slots: {
        item: 'cursor-pointer',
      },
    },
    tabs: {
      slots: {
        trigger: 'cursor-pointer',
      },
    },
    navigationMenu: {
      slots: {
        link: 'cursor-pointer',
        childLink: 'cursor-pointer',
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
        // Default "group" padding (p-1) leaves a gap around the item list
        // before the hover background starts — drop it so items span the
        // content edge to edge.
        group: 'p-0',
        item: 'cursor-pointer',
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
    // Every list table (Accounts, Liabilities, Dashboard, account detail
    // history/holdings...) shares this look — Nuxt UI's own defaults
    // (px-4 py-3.5, text-sm text-highlighted/text-muted) are denser/lighter
    // than this app's existing table typography. Structural behavior
    // (divide-y row separators, the selectable-row hover) is left as
    // Nuxt UI's default rather than reimplemented.
    table: {
      slots: {
        th: 'px-3 py-2.5 text-xs font-semibold text-muted',
        td: 'px-3 py-3 text-[15px] text-default',
        // A row only gets the `selectable` data-attribute when the table is
        // given an `onSelect` handler, so this only affects tables that opt in.
        tbody: '[&>tr]:data-[selectable=true]:cursor-pointer',
      },
    },
  },
}
