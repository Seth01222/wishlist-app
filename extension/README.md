# My Wishlist — Quick Add (browser extension)

A toolbar button that adds the product on the current page to your wishlist,
pulling the **title, price, and image automatically** from the page you're
looking at.

## Why this works when URL-pasting doesn't

Sites like Amazon block servers that try to scrape them (see the app's
`/api/fetch-url`). This extension runs in **your own browser**, on your home
connection, after the page has fully loaded — so it sees the real price and
image just like you do, and there's no bot detection to beat.

## Install (Chrome / Edge / Brave — unpacked)

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Click the extension's **Details → Extension options** and enter your app URL
   (e.g. `https://your-app.vercel.app`), then **Save**.
5. Pin the button to your toolbar.

> **Safari:** use Xcode's “Convert Web Extension” on this folder, or just use
> the bookmarklet (see the app's **Quick Add** page) — no install needed.

## Use

1. Open any product page and make sure you're **logged into the wishlist app**
   in the same browser.
2. Click the toolbar button. A tab opens with the item pre-filled — pick a list
   and confirm.

## Batch mode (Amazon cart / wishlist pages)

If you click the toolbar button on your **Amazon cart** (`/gp/cart/view.html`)
or an **Amazon wish list** (`/hz/wishlist/ls/...`), it automatically switches
modes: instead of extracting one product, `extract-batch.js` walks every line
item on the page and grabs all of them at once. A tab opens on a review
screen where you can edit each item's name/price/quantity, bulk-assign a
list to a whole selection (or create a new list on the spot) instead of
confirming one item at a time, then import everything together.

This only recognizes Amazon's cart/wishlist markup today — other sites'
carts would need their own row selectors added to `extract-batch.js` (and a
matching URL pattern in `background.js`'s `BATCH_PAGE_PATTERNS`). Unlike the
single-product extractor, there's no universal standard for "everything in
this cart," so Amazon changing their markup is the most likely thing to break
this — check `extract-batch.js` first if batch mode stops finding items.

## Publishing to the Chrome Web Store (optional)

Zip this folder and upload it at the
[Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
(one-time $5 registration). Until then, "Load unpacked" works fine for personal
use.

## Keeping it in sync

`extract.js` is the canonical product extractor. The app's **Quick Add** page
generates a bookmarklet from the same logic — if you improve one, update the
other.

`extract-batch.js` is extension-only — there's no bookmarklet equivalent,
since a cart's worth of items doesn't fit in a `javascript:` URL the way one
product does. Batch mode only works through this extension.
