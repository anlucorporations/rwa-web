# Landing Page Integration Guide

## Overview
Se han creado nuevos componentes profesionales para una landing page del Trusted Issuers Registry. Esta guía explica cómo integrarlos en tu aplicación.

## Componentes Creados

### 1. **Header** (`components/Header.tsx`)
- Navegación sticky con logo
- Botones de conexión de wallet
- Menú responsive para móviles
- Dark mode completo
- Muestra cuenta conectada con direcciones acortadas

### 2. **HeroSection** (`components/HeroSection.tsx`)
- Headline compelente con gradiente
- Estadísticas clave (100% Decentralized, Verifiable, etc.)
- Call-to-action buttons
- Animaciones de parallax al scroll
- Visual cards con efecto 3D

### 3. **FeaturesSection** (`components/FeaturesSection.tsx`)
- 6 feature cards con iconos
- Hover effects y transiciones suaves
- Animaciones de entrada escalonadas
- CTA adicional en sección inferior

### 4. **IssuersShowcase** (`components/IssuersShowcase.tsx`)
- Estadísticas en tiempo real
- Cards de issuers destacados
- Stats integrados desde el blockchain

### 5. **Footer** (`components/Footer.tsx`)
- Links organizados por categoría
- Social media links
- Información de copyright
- System status links

### 6. **LandingPage** (`app/landing-page.tsx`)
- Composición de todos los componentes
- Integración con Web3/MetaMask
- Carga de datos del blockchain

## Instalación de Dependencias

### Dependencias Faltantes
Los componentes utilizan **lucide-react** para iconos. Necesitas instalarla:

```bash
npm install lucide-react
```

### Verificar shadcn/ui
Asegúrate de tener instalado **Button** de shadcn/ui:

```bash
npx shadcn-ui@latest add button
```

Si no tienes shadcn/ui configurado:
```bash
npx shadcn-ui@latest init
```

## Integración en tu app

### Opción 1: Usa la Landing Page como página principal

**Reemplaza `app/page.tsx`:**
```tsx
'use client';

import LandingPage from './landing-page';

export default function Home() {
  return <LandingPage />;
}
```

### Opción 2: Mantén dos rutas (landing + dashboard)

**app/page.tsx** - Landing page
```tsx
'use client';
import LandingPage from './landing-page';
export default function Home() {
  return <LandingPage />;
}
```

**app/dashboard/page.tsx** - Dashboard con funcionalidad (tu página actual)
```tsx
'use client';
// Tu código actual del page.tsx
```

Luego en `Header.tsx`, apunta el botón "Go to Dashboard" a `/dashboard`:
```tsx
<Link href="/dashboard" className="...">
  Go to Dashboard
</Link>
```

### Opción 3: Landing + Componentes en la página actual

Si quieres mantener todo en una página, puedes separar el contenido:

```tsx
// app/page.tsx
'use client';

import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import Footer from '@/components/Footer';
import YourCurrentDashboard from '@/components/YourCurrentDashboard';

export default function Home() {
  // Tu lógica actual...

  return (
    <div>
      <Header {...props} />
      <HeroSection {...props} />
      <FeaturesSection />

      {/* Si está conectado, mostrar dashboard */}
      {isConnected ? (
        <YourCurrentDashboard />
      ) : null}

      <Footer />
    </div>
  );
}
```

## Características Implementadas

### ✅ Dark Mode
- Todos los componentes soportan dark mode
- Usa CSS variables automáticamente
- Transiciones suaves entre modos

### ✅ Responsive Design
- Mobile-first approach
- Tested en breakpoints: sm, md, lg
- Menu mobile con hamburger

### ✅ Animaciones
- Parallax scroll en hero
- Fade-in staggered en features
- Hover effects en cards
- Smooth transitions

### ✅ TypeScript
- Tipos completos en interfaces
- Props bien documentadas
- Sin `any` types

### ✅ Integración Web3
- MetaMask connection
- Wallet status display
- Network switching
- Account management

## Personalización

### Cambiar Colores
Los colores se basan en Tailwind. Edita en `tailwind.config.ts`:
```ts
extend: {
  colors: {
    primary: 'from-blue-600 to-indigo-600',
    // ...
  }
}
```

### Cambiar Textos
Busca en los componentes y reemplaza strings:
```tsx
// En Header.tsx
<span>Trusted Registry</span> // ← Cambiar aquí
```

### Agregar Links Reales
En `Footer.tsx` y `Header.tsx`, actualiza los `href`:
```tsx
<a href="https://docs.example.com"> // ← Cambiar URL
  Documentation
</a>
```

### Estadísticas Dinámicas
En `IssuersShowcase.tsx`, los stats pueden ser dinámicos:
```tsx
<IssuersShowcase
  stats={{
    totalIssuers: data.count, // ← De tu API
    activeIssuers: data.active,
    verifiedClaims: data.claims,
    networkUptime: data.uptime,
  }}
/>
```

## Troubleshooting

### Error: Cannot find module 'lucide-react'
```bash
npm install lucide-react
npm run build
```

### Error: Cannot find module '@/components/ui/button'
```bash
npx shadcn-ui@latest add button
```

### Dark mode no funciona
Verifica que en `app/layout.tsx` tengas:
```tsx
<html lang="en" className={isDark ? 'dark' : ''}>
  // ...
</html>
```

### Animaciones lentas
Si el scroll parallax es lento, puedes desactivarlo en `HeroSection.tsx`:
```tsx
// Comenta esta línea:
// style={{ transform: `translateY(${scrollY * 0.3}px)`, }}
```

## Estructura de Archivos Creada

```
components/
├── Header.tsx              # Navegación principal
├── HeroSection.tsx         # Sección hero con CTA
├── FeaturesSection.tsx     # Grid de features
├── IssuersShowcase.tsx     # Stats y issuers
├── Footer.tsx              # Footer con links
├── IssuerRequestsList.tsx  # Existente
└── RequestDetailModal.tsx  # Existente

app/
├── landing-page.tsx        # Composición completa
├── page.tsx                # Tu página actual (actualizar)
├── layout.tsx              # Existente
└── api/                    # Existente
```

## Next Steps

1. ✅ Instala `lucide-react`
2. ✅ Verifica `shadcn/ui` y button
3. ✅ Elige tu estrategia de integración (opción 1, 2 o 3)
4. ✅ Personaliza textos, colores y links
5. ✅ Run `npm run build` para verificar
6. ✅ Test en modo light y dark

## Support

Todas las decisiones de diseño están documentadas:
- **Aesthetic**: Luxury/tech-forward refinado
- **Typography**: Moderna y clara
- **Motion**: Sutiles pero impactantes
- **Layout**: Asimetría controlada

Si necesitas cambios, contáctame con especificaciones y ajustaré!
