# Start here

## 1. One-time setup on your computer
- Install **Node 20+**, **Git**, and **Claude Code**: `npm install -g @anthropic-ai/claude-code`.
- Optional, for client demos: install **cloudflared**. On a Mac that's `brew install cloudflared`; for other systems, see Cloudflare's download page.

## 2. Put this folder where the project will live
Unzip it, for example to `~/Projects/onaway`. It already contains:

- `CLAUDE.md`, which Claude Code reads automatically every session
- `docs/`, with the build context, locked decisions, brand guide, and the locked mocks with their images

Add your own files here:

- `docs/sections/`: one image per section (`01-hero.png` … `07-footer.png`), at 1512 wide
- `docs/brand/`: the logo and icon SVGs, if you have them yet. Until then the PNG wordmark in `docs/mocks/assets` stands in

## 3. Open Claude Code in the folder
```
cd ~/Projects/onaway
claude
```

## 4. Paste the first prompt

> Read CLAUDE.md and everything in docs/. Then do Step 0, the foundation, and stop for my review:
>
> 1. `git init` with a sensible .gitignore (node_modules, dist, .DS_Store, .env) and commit the docs as the first commit.
> 2. Scaffold the stack exactly as CLAUDE.md says: Vite multi-page, Tailwind v4 with every design token in `@theme`, Alpine.js, GSAP + ScrollTrigger, Lenis synced to ScrollTrigger, Handlebars partials for nav and footer, and self-hosted Instrument Sans (variable with wdth) and Overpass Mono in public/fonts. Download the fonts from their official OFL sources.
> 3. Build `tokens.html`, a token test page showing the five colours with their contrast notes, the full type scale at the real fonts and widths, the spacing scale as bars, and the 12/8/4 grid overlay toggled with G.
> 4. Set up the repo layout from docs/build-context.md §4, with empty section files 01–07 included into index.html.
> 5. Run the dev server, screenshot tokens.html at 1512, 1280 and 390, check it against the tokens, and commit on `main` as `foundation: stack + tokens`.
> 6. Tell me the URL to open and the tunnel command.
>
> Don't build any section yet.

## 5. Then, one section at a time

> Build Section 01, Hero (HF-01), on branch `section/01-hero`. Target: `docs/sections/01-hero.png`. Behaviour reference: `docs/mocks/hf01-flow.html` (serve it to watch the scrub). Follow the locked settings in docs/homepage-locked-decisions.md and every rule in CLAUDE.md. Responsive at 1512, 1280 and 390; reduced motion shows the end state. Check it with screenshots against the target, then tell me what's ready to review and what you weren't sure about. Don't merge until I sign off.

Repeat for 02–07, swapping the number, name, image and mock.

## 6. Showing the client
Run `npm run dev` in one terminal and `cloudflared tunnel --url http://localhost:5173` in another. Send the client the `trycloudflare.com` link. It stops working when you close the tunnel.

## 7. Design questions
Bring screenshots to a chat in the "Moving Co. — Brand Sprint" project. Record any decision made there in `docs/homepage-locked-decisions.md`, so Claude Code sees it.
