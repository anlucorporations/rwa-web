#!/bin/bash

# Trusted Issuers Registry - Landing Page Setup Script
# Ejecuta este script para instalar la landing page en 30 segundos

echo "🎨 Setting up Trusted Issuers Registry Landing Page..."
echo ""

# Opción por defecto: Landing Pura (Opción A)
echo "Copiar landing-page.tsx a page.tsx..."
cp app/landing-page.tsx app/page.tsx

echo "✅ Landing page instalada!"
echo ""
echo "Próximo paso:"
echo "  npm run dev"
echo ""
echo "Abre: http://localhost:3000"
echo ""
echo "¡Disfruta tu landing page profesional! 🚀"
