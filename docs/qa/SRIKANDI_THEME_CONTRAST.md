# Srikandi Theme Contrast Verification

Date: 26 November 2026  
Preset: `srikandi`  
Source: `src/styles/presets/srikandi.css`  
Executable check: `node scripts/verify-theme-contrast.mjs`

## Method

The checker reads the actual OKLCH tokens from the light and dark Srikandi CSS blocks, converts them to sRGB using the OKLCH-to-linear-sRGB transform with chroma reduction for out-of-gamut colors, computes WCAG relative luminance, and calculates the contrast ratio.

Configured thresholds:
- Text and text-like foreground pairs: **4.5:1**.
- Component boundaries, focus indicators and chart data marks: **3:1**.

The test covers 28 token pairs per mode (56 checks in total). This is a token-level contrast check; it does not replace inspection of every rendered component, text size, hover/disabled state, chart label, image, or real-device screenshot.

## Result

**56 / 56 token-pair checks pass.**

| Check group | Light minimum | Dark minimum | Required |
|---|---:|---:|---:|
| Body text | 16.71:1 | 15.41:1 | 4.5:1 |
| Card text | 17.46:1 | 14.63:1 | 4.5:1 |
| Popover text | 17.46:1 | 14.02:1 | 4.5:1 |
| Primary action text | 5.18:1 | 5.11:1 | 4.5:1 |
| Muted text | 4.91:1 | 6.69:1 | 4.5:1 |
| Sidebar text | 8.54:1 | 14.08:1 | 4.5:1 |
| Sidebar primary text | 7.46:1 | 5.08:1 | 4.5:1 |
| Main border against background | 3.48:1 | 3.90:1 | 3:1 |
| Input boundary against background | 3.48:1 | 3.90:1 | 3:1 |
| Sidebar border | 3.44:1 | 4.00:1 | 3:1 |
| Chart marks (five series, background/card) | 3.14:1 | 3.76:1 | 3:1 |

Other checked pairs include secondary and accent text, destructive color, sidebar accent and focus, main focus ring, and all five chart series against both page and card backgrounds.

## Reproduction

Run locally or in CI from the repository root:

```bash
node scripts/verify-theme-contrast.mjs
```

The script exits with a non-zero status if a required token is missing, its color syntax cannot be parsed, or any checked pair falls below its threshold. The command is also included at the beginning of `npm test`.

## Acceptance still outstanding

Token contrast is only one part of accessibility. Browser-based verification remains required for keyboard navigation, focus visibility, touch interaction, menu dismissal, actual rendered component pairings, and screenshots at desktop, tablet and mobile sizes.
