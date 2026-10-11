# Johan’s portfolio

A two-page portfolio built with React, TypeScript, Vite, Motion, and CSS. The Gen X Soft Club palette combines washed teal and aqua, steel blue and twilight, sage, jade and pale olive, chalky white, silver, warm beige and tan, and deep slate and faded denim accents. Opaque ice-and-seafoam gradients on the Spotify window, chrome navigation, and soft green collection panels carry these colors across both pages. Vercel hosts both the frontend and the Spotify API function at `/api/now-playing`. No paid animation tools, database, or Pinterest API are required.

## Run locally

Install Node.js 22.12+ (Node 22 LTS recommended), then:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Both `/` and `/board/` are real build entry points. Vercel rewrites `/board` and `/board/` to the board entry, so direct links, keyboard navigation, and refreshes work. The Vite development server also serves the Spotify endpoint locally.

```sh
npm run build       # Type checking and production build
npm test            # Spotify backend behavior tests
npx playwright install chromium
npm run test:e2e    # Desktop and mobile browser tests
npm run preview    # Static build preview (no API; use npm run dev for Spotify)
```

## Navigation and interactions

- Right / Down / D / S: move to the board.
- Left / Up / A / W: move home.
- Links and the floating navigation control also switch pages.
- Shortcuts do not intercept typing, modifier combinations, or focused controls. Held keys do not repeat transitions.
- The second page embeds the Retro futuristic fashion Pinterest board using Pinterest's own layout and interactions. A direct board link remains available if the widget is blocked or unavailable.
- Drag the listening window by its title bar on desktop; it sits in the document flow on mobile. The minus button minimizes it.
- Reduced-motion settings disable continuous animation and simplify transitions.

Neuropol by Ray Larabie is hosted locally in `public/fonts/neuropol.otf` for headings, the wordmark, and primary navigation. Body text uses DM Sans and utility labels use IBM Plex Mono. The original Neuropol release comes from [Typodermic’s CC0 public-domain collection](https://typodermicfonts.com/public-domain/); its supplied notice is included alongside the font.

## Personalize the content

Edit `src/content.ts` for your name, introduction, YouTube influences, GitHub URL, optional email, and Pinterest board URL.

## Current obsessions

The home page replaces the sample workbench with music, fashion, and motor influences. Add entries to the `obsessions` array in `src/content.ts`:

```ts
{ title: 'Your video title', url: 'https://www.youtube.com/watch?v=VIDEO_ID', category: 'Music', note: 'What keeps me coming back to it.' }
```

Replace `VIDEO_ID` with the actual video ID, or use a YouTube share, Shorts, live, or embed URL. `category` is `Music`, `Fashion`, or `Motors`; `note` is optional. Entries appear in the order listed. If the collection is empty, a placeholder appears until you add your picks.

Videos use responsive, lazily loaded YouTube embeds in privacy-enhanced mode, with native playback controls, fullscreen, and a direct YouTube link. No API key is needed. Videos do not autoplay. If a creator disables embedding or restricts playback, the direct link remains available. See [YouTube’s embedding instructions](https://support.google.com/youtube/answer/171780).

## Pinterest board

The second page uses Pinterest's official board widget for `https://www.pinterest.com/DJDAIMY0/retro-futuristic-fashion/`. Save pins to that public board in Pinterest; Pinterest supplies the embedded preview (up to 50 pins). The preview shows this specific board, rather than every saved item across your account. A sage-and-silver panel with Neuropol typography, a chalk-white inset, and responsive spacing integrates the official widget with the site; Pinterest still controls its native pin layout and interactions.

To switch boards, update `profile.pinterest` in `src/content.ts` with the full public board URL (resolve `pin.it` share links first), and update the board title in `src/Board.tsx`. No Pinterest app, API credentials, or visitor login is required to request the widget. Pinterest controls the preview's contents and refresh timing.

The widget script loads only when the board page is visited and is reused on return visits. Its DOM is managed separately from React. If Pinterest is unavailable or blocked, visitors can still use the direct board links. The old placeholder gallery, filters, and image dialog have been replaced by Pinterest's own layout.

Colors and typography live in `src/styles.css`; Neuropol is hosted locally, while body and utility fonts load from Google Fonts with system fallbacks. Earlier starter art remains in `public/art/` but is no longer used by the home page.

The supplied `ascii-art.txt` and `ascii-art (1).txt` are rendered as selectable, copyable text by `src/AsciiBackdrop.tsx`, with responsive scaling that preserves their spacing. The larger left illustration anchors the lower-left background; both illustrations stay fixed behind the home and Pinterest pages without resetting on navigation. Spotify floats over the opening screen and can be dragged by its header or minimized. The quote appears as a small single line beneath the fixed page selector, with the introduction below the fold. Arrow keys, WASD, and both page-selector buttons cycle between the two pages in either direction.

## Connect Spotify

Only the portfolio owner authorizes Spotify. Visitors do not log in, and they cannot control your playback. This integration displays track metadata, artwork, and approximate elapsed time. The equalizer is decorative, not a measured audio spectrum. Without configuration, the window says live listening is coming soon.

### 1. Register an app and authorize locally

Create an app at the [Spotify developer dashboard](https://developer.spotify.com/dashboard). Add this exact redirect URI:

```text
http://127.0.0.1:8888/callback
```

Spotify permits HTTP for this explicit loopback address. Do not substitute `localhost`. Your Premium account satisfies Spotify’s current development-mode owner requirement. Use your own app-owner account when authorizing, and check the dashboard’s allowlist if Spotify reports an access error.

Copy `.env.spotify.example` to `.env.spotify`, then enter your Spotify app’s client ID and client secret locally. Never commit or send these credentials in chat.

```sh
npm run spotify:connect
```

Open the printed authorization URL. The helper validates OAuth state, exchanges the code, and saves all three credentials in the ignored `.env.spotify` file. It never prints your secret or refresh token. Run the helper on the computer whose browser you use for the callback.

### 2. Try Spotify locally

Restart `npm run dev` after authorizing. It reads server-only credentials from `.env.spotify` and serves `/api/now-playing` on the same local origin. There is no separate backend server to start and no frontend environment variable to configure.

Play a track on Spotify; the window should update within about 20 seconds. Paused, idle, unsupported media, upstream errors, and expired authorization are handled without fabricating a listening history. If credentials are missing, the endpoint returns an explicit unconfigured state.

### 3. Add Spotify credentials to Vercel

In your Vercel project, open **Settings → Environment Variables** and add the values from your local `.env.spotify`:

| Variable | Purpose |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | Spotify app identifier |
| `SPOTIFY_CLIENT_SECRET` | Spotify app secret |
| `SPOTIFY_REFRESH_TOKEN` | Authorization for your listening status |

Select **Production** and, if you want live Spotify on previews, **Preview**. Redeploy after changing these variables. They are server-only: **never prefix them with `VITE_`**. `.gitignore` and `.vercelignore` exclude local credential files from commits and CLI uploads.

The frontend defaults to `/api/now-playing`; `VITE_SPOTIFY_ENDPOINT` is only an optional public override used by browser tests. Remove any old override pointing to Cloudflare. The backend caches public metadata for 15 seconds, shares concurrent requests, reuses access tokens, and respects Spotify rate-limit backoff. Errors and unconfigured responses are not cached. Reconnect and update Vercel's variables if Spotify authorization is revoked.

## Deploy to Vercel

The repository includes `vercel.json` with the Vite framework preset, `npm ci`, `npm run build`, `dist` output, board routing, and the Spotify function configuration. Node.js is pinned to 22.x. A personal portfolio can use Vercel's Hobby plan within its usage limits; this project does not require paid services or storage.

### Connect the GitHub repository

1. Push the reviewed changes to GitHub.
2. In Vercel, choose **Add New → Project** and import `jkou1/jkou1.github.io`. The repository can keep its current name.
3. Use the repository root and the **Vite** preset. The committed configuration supplies the build settings.
4. Add the three Spotify variables above, or deploy first and connect Spotify later.
5. Deploy. Vercel supplies a `*.vercel.app` address; future pushes to the production branch deploy automatically, and other branches can get preview deployments.

Alternatively, with the [Vercel CLI](https://vercel.com/docs/cli):

```sh
npx vercel login
npx vercel link
npx vercel              # Preview deployment
npx vercel --prod       # Production deployment
```

A Vercel account/project connection is needed before publishing. Local builds and tests do not publish anything.

### Finish the hosting migration

The GitHub Pages deployment workflow, Jekyll configuration, and `.nojekyll` file have been removed. The remaining GitHub workflow only checks tests and builds; deployment is handled by Vercel's Git integration. The Cloudflare Worker configuration and Wrangler dependency have also been removed, since Spotify now runs on Vercel.

After verifying the Vercel deployment, unpublish the old Pages site under **GitHub repository Settings → Pages** if it is live. This repository change does not alter the existing remote Pages setting. GitHub owns `jkou1.github.io`, so that hostname cannot be attached to Vercel; use the Vercel hostname or a custom domain. If you have a custom domain, add it to the Vercel project and follow its DNS instructions after the new deployment works.

## References

- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel cache-control headers](https://vercel.com/docs/caching/cache-control-headers)
- [Spotify authorization code flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [Spotify redirect URI rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
- [Spotify development mode](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
- [Motion shared layout animations](https://motion.dev/docs/react-layout-animations)
- [Pinterest board widgets](https://developers.pinterest.com/docs/web-features/widgets/)
