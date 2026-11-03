# F Rahman Enterprises

A responsive industrial product catalogue with Google Sheets updates and WhatsApp enquiries. Designed for GitHub Pages, including repository subdirectory URLs. No runtime packages or paid services required.

## Preview and deploy
1. Install Node.js 22 or newer. Run `npm run dev` and open http://127.0.0.1:4173.
2. Push this repository to GitHub with default branch `main` (or change the workflow's branch).
3. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
4. The included workflow tests, builds and deploys `dist/`. Its deployment output supplies your URL.

Only deploy `dist/`. Original docs and cleaned workbooks are excluded from the Pages artifact, but would still be visible in a **public source repository**. Keep the source repository private if preserving the confidential stock workbook; use a separate public repository containing only `dist/` if your GitHub plan requires public repos for Pages.

## Connect Google Sheets
1. Download/import `outputs/catalogue/products-clean.xlsx` into Google Sheets, or import the UTF-8 `products-clean.csv`. The **Products** tab has one header row and one product per row.
2. Review `review_notes`, especially repeated model codes and missing specifications. Keep IDs stable; never deduplicate on model alone. Rows missing descriptions start with `published=FALSE`.
3. For CSV imports choose comma separation and disable automatic conversion of text to numbers/dates to protect model identifiers. In Sheets format `id`, `model`, `description` as plain text. Keep `stock_qty` numeric, and `published` / `featured` as TRUE/FALSE.
4. Choose **File → Share → Publish to web**. Select **Products only**, choose **Comma-separated values (.csv)**, enable automatic republishing, then publish. Do not publish private inventory sheets.
5. Paste the resulting `https://docs.google.com/spreadsheets/d/e/.../pub?gid=...&single=true&output=csv` URL into `googleSheetsCsvUrl` in `config.js`. Commit and push this configuration once.
6. Future product edits need no code deployment. Reload the website after Sheets has republished; Google's cache can delay updates. If Sheets fails, the site announces it is displaying a saved catalogue.

Only `id`, `name`, `category`, `published` are required by the loader; retain all provided headers for the complete experience. New rows need unique IDs (for example FRE-NEW-0001). Set `published=TRUE` to display, FALSE to hide. An intentionally empty published sheet displays zero products, not fallback products. Invalid schemas/duplicate IDs trigger the fallback. `image_url` accepts a direct public HTTPS image URL; leave blank to show a locally sourced matching family image when available, otherwise a request-photo prompt. Uploaded Google Drive sharing pages are not direct image URLs.

### Product columns
| Column | Meaning |
| --- | --- |
| id | Unique stable reference, independent of model |
| name | Full searchable name |
| category, subcategory | Product grouping and family |
| brand, model | Verified brand/model; blank if unavailable |
| description | Specification copied and lightly normalized from source |
| stock_qty | Historical source balance, blank if uncertain; not shown on website |
| stock_status | Customer-facing availability wording; initially Confirm availability |
| unit | piece, or roll for pipe products; confirm pack/unit before ordering |
| image_url | Direct HTTPS product image; matching sourced images also have local copies |
| featured | TRUE to sort first |
| published | TRUE to show publicly |
| updated_at | Source sales update date, when present; not migration date |
| source_sheet, source_row, review_notes | Owner's migration trace and correction notes; not used by the website |

The published CSV is public, including columns the UI does not show. Remove provenance/review columns from a separate public Products tab if desired. Never add purchase costs, supplier rates, margins or customer information to that tab.

## WhatsApp and pricing
The Facebook document supplies +880 1715-603598, configured as `8801715603598`. Confirm this number is WhatsApp-enabled before launch; change `whatsappNumber` if necessary. Standard wa.me click-to-chat needs no API credentials. No message is sent automatically: the customer reviews and sends it in WhatsApp. The list includes product references, quantities and a delivery-location prompt. The list is saved only in that browser.

Prices are excluded from the website, public CSV, clean workbook and bundled catalogue. Keep all pricing in a separate private workbook. Our team quotes privately through WhatsApp.

## Data migration
`outputs/catalogue/cleaning-report.json` lists source counts and excluded headings/totals/unidentified rows. All 701 identifiable products are retained without automatic merging. The original workbook is unchanged. The cleaner reads raw XML to preserve model numbers that Excel incorrectly marked as dates. Obvious spelling is normalized, missing values stay blank, duplicate model codes are flagged, costs are excluded, and ambiguous orphan rows are explicitly listed for source review.

The website uses real product imagery from the supplied Facebook clipping and manufacturer catalogues. Family images are labelled because sizes and configurations vary. Local copies prevent expired Facebook URLs from breaking existing catalogue images. Unmatched or broken images show a text request-photo prompt; generated illustrations are never substituted. Source URLs and matching notes are in `outputs/catalogue/photo-sourcing-report.json`; 561 of 689 published records currently have sourced images, with 128 still requiring matching photos. Use image_url for exact model photos. It does not claim manufacturer authorization, certifications, real-time stock or unverified service guarantees.

## Development
`npm test` runs focused logic tests. `npm run build` creates the public `dist/`. No install step is needed. Private source documents and local agent setup are excluded from this repository.

## Performance and installation
Product image_url values remain in the public Google Sheet. Matching sourced images use optimized local WebP copies; changed URLs load your own hosted image directly. Images are lazy-loaded and decoded asynchronously, with dimensions to reserve space. The initial saved catalogue displays immediately while Sheets refreshes in the background. Original unoptimized JPG/PNG product files are excluded from the build. Fonts are bundled locally. After authorized source photo regeneration run `python scripts/optimize-assets.py`.

The site includes a PWA manifest and service worker for GitHub Pages HTTPS hosting. Supported browsers can install it from their browser menu or the Install app button when offered. iPhone users can use Share → Add to Home Screen. Offline browsing uses the saved catalogue and cached/previously visited product images; live stock updates and WhatsApp need a connection. Updates activate after existing tabs close and the app reopens. Local development keeps offline caching off to avoid stale edits; add `?pwa` to explicitly preview it locally. Device installation and deployed-site performance still need testing after publication.

Mobile uses bottom navigation and a category bottom sheet, with no category scroller. The only continuous motion is a transform-based brand marquee that pauses offscreen, while the page is hidden, on hover/focus, via its pause button, and for reduced-motion users.
