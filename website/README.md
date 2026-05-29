# EthioSwap Marketing Website

A single-file premium marketing website for EthioSwap — Ethiopia's P2P ETH trading platform.

---

## 📁 Files

```
website/
├── index.html        # Main website (all CSS & JS embedded)
├── ethioswap.apk     # ← Place your APK file here (see below)
└── README.md         # This file
```

---

## 🚀 Hosting on Static Platforms

The website is a single `index.html` file with no build steps required.
Just upload the folder and it works instantly.

### Option 1: Netlify (Recommended — Free)

1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop the entire `website/` folder into the browser
3. Netlify will give you a live URL like `https://ethioswap.netlify.app`
4. Optionally connect a custom domain in **Site Settings → Domain Management**

### Option 2: Vercel (Free)

1. Install Vercel CLI: `npm i -g vercel`
2. Open a terminal in the `website/` folder
3. Run: `vercel`
4. Follow the prompts — your site will be live in seconds

Or via the web:
1. Push the `website/` folder to a GitHub repository
2. Import it at [https://vercel.com/new](https://vercel.com/new)
3. Set **Root Directory** to `website/` and deploy

### Option 3: GitHub Pages (Free)

1. Create a new GitHub repository (e.g. `ethioswap-website`)
2. Push the contents of `website/` to the `main` branch (or `docs/` folder)
3. Go to **Settings → Pages**
4. Set source to **Deploy from branch → main → / (root)**
5. Your site will be live at `https://yourusername.github.io/ethioswap-website`

### Option 4: Any Web Server / VPS

Simply upload `index.html` (and `ethioswap.apk`) to any folder served by nginx, Apache, or any static server.

---

## 📦 Replacing the APK Download Link

**Current placeholder:** `./ethioswap.apk`

### To use a local APK file:
1. Copy your `ethioswap.apk` build output into the `website/` folder
2. Make sure it's named `ethioswap.apk` (or update the link in `index.html`)
3. Deploy — the download button will serve it directly

### To use a remote APK URL (CDN, Google Drive, etc.):
1. Open `index.html` in any text editor
2. Find all occurrences of `./ethioswap.apk` (there are 2 — hero button + download section button)
3. Replace both with your full URL, e.g.:
   ```
   https://cdn.ethioswap.app/releases/ethioswap-v1.0.apk
   ```

> **Tip:** For large APK files, host on a CDN (e.g. Cloudflare R2, AWS S3, Firebase Storage)
> rather than the same static host. This avoids slow download speeds.

---

## 🌐 Replacing the Web App URL

**Current placeholder:** `https://ethioswap.app`

1. Open `index.html` in a text editor
2. Search for `https://ethioswap.app`
3. Replace all occurrences with your actual deployed web app URL, e.g.:
   ```
   https://your-app.convex.app
   ```
   or your custom domain once configured.

---

## 🎨 Customizing the Design

All CSS variables are defined at the top of `index.html` inside `:root {}`:

```css
:root {
  --bg:         #0A0C12;      /* Page background */
  --surface:    #0F121E;      /* Card/surface background */
  --gold:       #D4AF37;      /* Primary gold accent */
  --gold-light: #F0C040;      /* Lighter gold for gradients */
  --text:       #F0F4FF;      /* Primary text color */
  --muted:      #8899AA;      /* Secondary/muted text */
}
```

Change any of these to retheme the entire site.

---

## 📱 QR Code

The download section has a QR code placeholder. To add a real QR code:

1. Generate a QR code pointing to your APK download URL using:
   - [https://qr.io](https://qr.io)
   - [https://www.qrcode-monkey.com](https://www.qrcode-monkey.com)
2. Save it as `qr.png` in the `website/` folder
3. In `index.html`, replace the `.qr-placeholder` div with:
   ```html
   <img src="./qr.png" alt="Scan to download EthioSwap APK" width="120" height="120" style="margin: 28px auto 0; border-radius: 12px;" />
   ```

---

## ✅ Pre-Launch Checklist

- [ ] Replace `./ethioswap.apk` with real APK file or remote URL
- [ ] Replace `https://ethioswap.app` with final web app URL
- [ ] Add real QR code image
- [ ] Update social media links in footer
- [ ] Add Google Analytics or Plausible tracking (optional)
- [ ] Configure custom domain on host
- [ ] Test on mobile and desktop browsers

---

*© 2025 EthioSwap. Made with ❤️ in Ethiopia.*
