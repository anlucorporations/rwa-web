# ⚡ Quick Install - 2 Minutos

## Paso 1: Instalar Dependencias (30 segundos)
```bash
npm install lucide-react
npx shadcn-ui@latest add button
```

## Paso 2: Actualizar page.tsx (30 segundos)

Escoge una opción:

### ✅ OPCIÓN A: Landing Page (RECOMENDADA para MVP)
```bash
# Reemplaza tu page.tsx actual
rm app/page.tsx
cp app/landing-page.tsx app/page.tsx
```

### 🎯 OPCIÓN B: Landing + Dashboard Integrado
```bash
# Usa la página con ambos
cp app/page-new-design.tsx app/page.tsx
```

### 📂 OPCIÓN C: Landing + Dashboard Separado (Arquitectura escalable)
```bash
# Landing en /
cp app/landing-page.tsx app/page.tsx

# Dashboard en /dashboard (crear carpeta)
mkdir -p app/dashboard
# Copia tu código actual del page.tsx a:
# app/dashboard/page.tsx
```

## Paso 3: Build & Test (60 segundos)
```bash
npm run build
npm run dev
```

Abre http://localhost:3000 y disfruta! 🚀

---

## Checklist de Verificación

- [ ] `npm install lucide-react` completó sin errores
- [ ] `npx shadcn-ui@latest add button` completó sin errores
- [ ] Reemplazaste `app/page.tsx`
- [ ] `npm run build` completó sin errores
- [ ] `npm run dev` está corriendo
- [ ] Puedes ver el sitio en http://localhost:3000
- [ ] Probaste dark mode (ojo en la esquina superior derecha)
- [ ] Probaste "Connect Wallet" button
- [ ] Responsivo en móvil (F12 → device toggle)

---

## ¿Qué Ves?

### Si Elegiste Opción A o C (Landing Page)
```
┌──────────────────────────────┐
│ Header con nav y botones     │
├──────────────────────────────┤
│ Hero Section (grande)        │
│ "Trust Through Transparency" │
├──────────────────────────────┤
│ 6 Features (cards)           │
├──────────────────────────────┤
│ Issuers Showcase (stats)     │
├──────────────────────────────┤
│ Footer                       │
└──────────────────────────────┘
```

### Si Elegiste Opción B (Landing + Dashboard)
Same as above, pero:
- Sin wallet: Ve landing
- Con wallet: Ve dashboard con formularios
- Es issuer: Ve panel de solicitudes
- Es owner: Ve opción de agregar issuer

---

## Customization Rápido (Opcional)

### Cambiar "Trusted Registry" a tu nombre
```bash
# Busca y reemplaza en:
grep -r "Trusted Registry" components/
# Edita los archivos encontrados
```

### Cambiar colores primary
```bash
# En tailwind.config.ts
# De: from-blue-600 to-indigo-600
# A: from-[your-color] to-[your-color]
```

### Cambiar links de Footer
```bash
# En components/Footer.tsx
# Edita los valores de href
```

---

## Problemas Comunes

### ❌ "Cannot find module 'lucide-react'"
```bash
npm install lucide-react
npm run build
```

### ❌ "Cannot find module '@/components/ui/button'"
```bash
npx shadcn-ui@latest add button
```

### ❌ "Module not found: Can't resolve..."
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## ¿Necesitas Ayuda?

Lee estos archivos en orden:
1. **Este archivo** (quick install)
2. `DESIGN_SUMMARY.md` (visión general del diseño)
3. `INTEGRATION_GUIDE.md` (integración detallada)

---

## 🎯 Próximos Pasos

1. ✅ Instalar dependencias
2. ✅ Reemplazar page.tsx
3. ✅ Build & test
4. 🔄 Personalizar textos/colores
5. 📱 Test en móvil
6. 🚀 Deploy!

---

**Hecho! Tienes una landing page profesional en 2 minutos.** ⚡
