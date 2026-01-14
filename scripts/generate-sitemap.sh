#!/bin/bash
# Sitemap Generator for bristolemergencyplumber.co.uk
# Automatically generates sitemap.xml based on existing HTML files

SITE_URL="https://bristolemergencyplumber.co.uk"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SITEMAP_FILE="$ROOT_DIR/sitemap.xml"
TODAY=$(date +%Y-%m-%d)

# Start sitemap
cat > "$SITEMAP_FILE" << 'HEADER'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
HEADER

# Function to add URL entry
add_url() {
    local path="$1"
    local priority="$2"
    local changefreq="$3"

    # Get file modification date
    local file="$ROOT_DIR$path"
    if [[ "$path" == */ ]]; then
        file="$ROOT_DIR${path}index.html"
    fi

    if [[ -f "$file" ]]; then
        local lastmod=$(date -r "$file" +%Y-%m-%d 2>/dev/null || echo "$TODAY")
    else
        local lastmod="$TODAY"
    fi

    cat >> "$SITEMAP_FILE" << EOF
    <url>
        <loc>${SITE_URL}${path}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>
EOF
}

# Homepage - highest priority
add_url "/" "1.0" "weekly"

# Main service pages - high priority
for file in "$ROOT_DIR"/*-bristol.html; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        add_url "/$filename" "0.9" "monthly"
    fi
done

# Section index pages - high priority
add_url "/services/" "0.8" "monthly"
add_url "/locations/" "0.8" "monthly"

# Contact page - high priority
if [[ -f "$ROOT_DIR/contact.html" ]]; then
    add_url "/contact.html" "0.8" "monthly"
fi

# About page
if [[ -f "$ROOT_DIR/about.html" ]]; then
    add_url "/about.html" "0.7" "monthly"
fi

# Location pages - medium priority
for file in "$ROOT_DIR"/locations/*.html; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        if [[ "$filename" != "index.html" ]]; then
            add_url "/locations/$filename" "0.7" "monthly"
        fi
    fi
done

# Service pages (excluding index)
for file in "$ROOT_DIR"/services/*.html; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        if [[ "$filename" != "index.html" ]]; then
            add_url "/services/$filename" "0.7" "monthly"
        fi
    fi
done

# Legal/policy pages - lower priority
for page in privacy-policy.html terms.html cookie-policy.html accessibility.html; do
    if [[ -f "$ROOT_DIR/$page" ]]; then
        add_url "/$page" "0.3" "yearly"
    fi
done

# Close sitemap
echo "</urlset>" >> "$SITEMAP_FILE"

echo "Sitemap generated: $SITEMAP_FILE"
echo "Total URLs: $(grep -c '<url>' "$SITEMAP_FILE")"
