export default function Home() {
  const identityRegistryUrl = process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_URL || 'http://localhost:3004';
  const trustedIssuersUrl = process.env.NEXT_PUBLIC_TRUSTED_ISSUERS_URL || 'http://localhost:3005';
  const rwaTokensUrl = process.env.NEXT_PUBLIC_RWA_TOKENS_URL || 'http://localhost:3006';

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
              RWA
            </h1>
            <p className="mt-2 text-3xl font-semibold text-purple-400 sm:text-4xl">
              Real World Assets
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-gray-300 sm:text-2xl">
              Tokenización de activos del mundo real en blockchain. Conecta activos tradicionales con las finanzas digitales
              mediante verificación de identidad segura, emisores confiables e infraestructura de tokens conforme a normativas.
            </p>
          </div>

          {/* Info Cards */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

              {/* Identity Registry Card */}
              <a
                href={identityRegistryUrl}
                className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-8 transition-all hover:border-blue-500 hover:bg-slate-750"
              >
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Registro de Identidades</h3>
                  <p className="mt-2 text-base text-gray-400 sm:text-lg">
                    Gestiona identidades verificadas y reclamaciones de cumplimiento para participantes en el ecosistema de activos tokenizados.
                  </p>
                  <div className="mt-4 flex items-center text-base font-medium text-blue-400 sm:text-lg">
                    Acceder al Registro
                    <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </a>

              {/* Trusted Issuers Card */}
              <a
                href={trustedIssuersUrl}
                className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-8 transition-all hover:border-emerald-500 hover:bg-slate-750"
              >
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Emisores Confiables</h3>
                  <p className="mt-2 text-base text-gray-400 sm:text-lg">
                    Registro de emisores autorizados de reclamaciones que pueden verificar y certificar las credenciales y el cumplimiento de los participantes.
                  </p>
                  <div className="mt-4 flex items-center text-base font-medium text-emerald-400 sm:text-lg">
                    Ver Emisores
                    <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </a>

              {/* RWA Tokens Card */}
              <a
                href={rwaTokensUrl}
                className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-8 transition-all hover:border-purple-500 hover:bg-slate-750 sm:col-span-2 lg:col-span-1"
              >
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Tokens RWA</h3>
                  <p className="mt-2 text-base text-gray-400 sm:text-lg">
                    Crea y gestiona activos del mundo real tokenizados con cumplimiento normativo y restricciones de transferencia integradas.
                  </p>
                  <div className="mt-4 flex items-center text-base font-medium text-purple-400 sm:text-lg">
                    Gestionar Tokens
                    <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </a>

            </div>
          </div>

          {/* Bottom Info */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">¿Qué son los Activos del Mundo Real?</h2>
              <p className="mt-4 text-lg text-gray-300 sm:text-xl">
                Los Activos del Mundo Real (RWA) representan la tokenización de activos tangibles e intangibles del mundo
                financiero tradicional en redes blockchain. Desde bienes raíces y materias primas hasta bonos y propiedad intelectual,
                los RWA desbloquean liquidez, propiedad fraccionada y comercio global 24/7 para activos previamente ilíquidos.
              </p>
              <p className="mt-4 text-lg text-gray-300 sm:text-xl">
                Nuestra plataforma proporciona la infraestructura esencial para la tokenización de RWA conforme a normativas: gestión de identidad verificada,
                emisión de reclamaciones confiables y estándares de tokens conformes a normativas que garantizan que solo los participantes elegibles puedan
                acceder y comerciar con activos tokenizados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
