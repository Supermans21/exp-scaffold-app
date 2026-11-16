# Design System — oman-gege QR Studio

Visual system built with **Hallmark (Dose)**, **Impeccable**, and **Frontend Design** principles across two surface modes: **Persuade** (public routes on Vercel) and **Operate** (embedded Shopify Admin).

## Palette Tokens (OKLCH)
- `--color-paper`: `oklch(97.6% 0.011 88)` — warm daylight stock ground
- `--color-paper-2`: `oklch(96.5% 0.02 160)` — pale green-tinted well
- `--color-paper-3`: `oklch(93% 0.036 160)` — active compartment / control well
- `--color-ink`: `oklch(21% 0.025 170)` — deep green-black primary ink
- `--color-ink-2`: `oklch(31% 0.02 170)` — secondary body ink
- `--color-muted`: `oklch(49% 0.024 165)` — secondary labels and field outlines
- `--color-rule`: `oklch(86.5% 0.022 140)` — hairline borders
- `--color-accent`: `oklch(50% 0.13 160)` — primary chromatic green action signal
- `--color-accent-deep`: `oklch(42% 0.11 162)` — moulded button rim / active press
- `--color-accent-ink`: `oklch(99% 0.006 160)` — crisp white-green text on accent
- `--color-focus`: `oklch(45% 0.14 160)` — instant 2px focus ring
- Translucent label compartments: `--p-wed`, `--p-thu`, `--p-fri`

## Typography
- **Display** (`--font-display`): `Schibsted Grotesk` 700, `-0.03em` tracking, `text-wrap: balance`
- **Body & UI** (`--font-body`): `Instrument Sans` 400 and 500, sentence-case labels without tracked uppercase
- **Data / Mono Labels** (`--font-outlier`): `DM Mono` 400 and 500 (`tabular-nums`) for store domains, QR handles, discount codes, and scan counts only
- Weights capped at 3 (`400`, `500`, `700`)

## Surfaces, States & Floor Rules
- All colors and font stacks read exclusively from `:root` tokens
- Single radius hierarchy (`10px` controls, `14px` cards, `999px` badges)
- Tactile Dose paper sticker cards with dashed tear-off divider and zero nested card-in-card chrome
- Crisp authored inline SVGs (`aria-hidden="true"`); zero emoji icons, zero `transition: all`, instant `:focus-visible`, and full `prefers-reduced-motion: reduce` support
