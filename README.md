# Bristol Emergency Plumber

Professional emergency plumbing services website for Bristol, UK.

## Overview

This is a static HTML/CSS website optimised for local SEO and designed to be hosted on Cloudflare Pages.

## Structure

```
/
├── index.html                    # Homepage (1000+ words)
├── emergency-plumber-bristol.html
├── 24-hour-plumber-bristol.html
├── boiler-repair-bristol.html
├── blocked-drains-bristol.html
├── about.html
├── contact.html
├── privacy-policy.html
├── terms.html
├── cookie-policy.html
├── accessibility.html
├── services/
│   └── index.html               # Services index page
├── locations/
│   └── index.html               # Locations index page
├── assets/
│   └── css/
│       └── style.css
├── images/
├── sitemap.xml
├── robots.txt
└── README.md
```

## Technical Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom styles, responsive design
- **No JavaScript frameworks** - Pure HTML/CSS for performance
- **No build process required** - Static files ready to deploy

## SEO Features

- Unique meta titles and descriptions per page
- Canonical URLs on all pages
- JSON-LD structured data (LocalBusiness, Service, FAQ)
- XML sitemap
- Robots.txt
- Internal linking structure

## Deployment

### Cloudflare Pages

1. Connect repository to Cloudflare Pages
2. Build command: (none required)
3. Output directory: `/`
4. Deploy

### Custom Domain

Configure DNS:
- A record: Point to Cloudflare Pages
- Or CNAME: Point to your Cloudflare Pages subdomain

## Local Development

Simply open `index.html` in a browser. No server required.

For live reload during development:
```bash
npx serve .
```

## Lead capture setup

This site uses Cloudflare Pages Functions + D1 to store lead submissions from the hero CTA form.

### Required bindings (Cloudflare Pages)

- **D1 database binding**: `DB`
- **Environment variables**:
  - `GETADDRESS_API_KEY` (getAddress.io API key)
  - `TURNSTILE_SITE_KEY` (Cloudflare Turnstile site key)
  - `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile secret key)
- **Wrangler Pages output directory**: `pages_build_output_dir = "."` (already set in `wrangler.toml`).

### D1 migrations

Run the migration in `migrations/0001_create_leads.sql` when provisioning the D1 database.

### Pages Functions endpoints

- `GET /api/address/suggest?postcode=BS1+1AA`
- `GET /api/address/get?id=...`
- `POST /api/leads`
- `GET /api/lead-config` (exposes `TURNSTILE_SITE_KEY` to the client)

## Content Guidelines

- UK English spelling
- Bristol-focused content
- Emergency-intent language
- Local trust signals
- No duplicate content across pages

## License

Proprietary - All rights reserved.
