#!/bin/bash
# Generate PDF from the user guide Markdown source
# Requires: pandoc (brew install pandoc) and weasyprint (brew install weasyprint)

set -e

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "Error: pandoc is not installed"
    echo "Install with: brew install pandoc"
    exit 1
fi

# Check if weasyprint is installed
if ! command -v weasyprint &> /dev/null; then
    echo "Error: weasyprint is not installed"
    echo "Install with: brew install weasyprint"
    exit 1
fi

cd "$(dirname "$0")"

echo "Generating user-guide.pdf from user-guide.md..."

# Convert Markdown to HTML first, then HTML to PDF
# This avoids requiring pdflatex/LaTeX
pandoc user-guide.md \
  --output=user-guide.html \
  --from=markdown \
  --to=html \
  --standalone \
  --toc \
  --toc-depth=2 \
  --css=user-guide.css \
  --metadata title="GWH Accounting User Guide"

# Convert HTML to PDF using weasyprint
weasyprint user-guide.html user-guide.pdf

# Clean up intermediate HTML file
rm user-guide.html

echo "✓ PDF generated successfully: user-guide.pdf"
echo ""
echo "To open the PDF:"
echo "  open user-guide.pdf  (macOS)"
echo "  xdg-open user-guide.pdf  (Linux)"
