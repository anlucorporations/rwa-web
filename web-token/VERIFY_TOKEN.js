// Script de Verificación Completa del Token
// Copia y pega esto en la consola del navegador (F12)

async function verifyToken() {
  try {
    console.log('🔍 INICIANDO VERIFICACIÓN COMPLETA...\n');
    
    // Setup
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const yourAddress = await signer.getAddress();
    
    const tokenAddress = '0xAD4e198623A5E2723e19E4D4a6ECF72B1D19FE4B';
    const aggregatorAddress = '0x5b73c5498c1e3b4dba84de0f1833c4a029d90519';
    const moduleToAdd = '0x90193c961a926261b756d1e5bb255e67ff9498a1';
    
    console.log('📍 DIRECCIONES:');
    console.log('  Token:', tokenAddress);
    console.log('  Aggregator:', aggregatorAddress);
    console.log('  Módulo a añadir:', moduleToAdd);
    console.log('  Tu wallet:', yourAddress);
    console.log('');
    
    // 1. Verificar bytecode del token
    console.log('1️⃣ VERIFICANDO BYTECODE DEL TOKEN...');
    const tokenCode = await provider.getCode(tokenAddress);
    console.log('  Longitud bytecode:', tokenCode.length);
    console.log('  Es un clone?', tokenCode.length < 500);
    
    if (tokenCode === '0x' || tokenCode.length < 10) {
      console.error('  ❌ Token no tiene código desplegado!');
      return;
    }
    console.log('  ✅ Token desplegado correctamente\n');
    
    // 2. Verificar funciones del token
    console.log('2️⃣ VERIFICANDO FUNCIONES DEL TOKEN...');
    const tokenABI = [
      "function compliance() view returns (address)",
      "function owner() view returns (address)",
      "function paused() view returns (bool)",
      "function addComplianceModule(address) external",
      "function addModuleThroughAggregator(address) external"
    ];
    const token = new ethers.Contract(tokenAddress, tokenABI, provider);
    
    try {
      const compliance = await token.compliance();
      console.log('  compliance():', compliance);
      console.log('  Tiene compliance?', compliance !== ethers.ZeroAddress);
    } catch (err) {
      console.error('  ❌ Error llamando compliance():', err.message);
    }
    
    try {
      const owner = await token.owner();
      console.log('  owner():', owner);
      console.log('  Eres el owner?', owner.toLowerCase() === yourAddress.toLowerCase());
    } catch (err) {
      console.error('  ❌ Error llamando owner():', err.message);
    }
    
    try {
      const paused = await token.paused();
      console.log('  paused():', paused);
    } catch (err) {
      console.error('  ❌ Error llamando paused():', err.message);
    }
    console.log('');
    
    // 3. Verificar aggregator
    console.log('3️⃣ VERIFICANDO AGGREGATOR...');
    const aggregatorCode = await provider.getCode(aggregatorAddress);
    console.log('  Bytecode length:', aggregatorCode.length);
    
    if (aggregatorCode === '0x' || aggregatorCode.length < 10) {
      console.error('  ❌ Aggregator NO está desplegado!');
      console.log('  El aggregator debe estar desplegado antes de usarlo.');
      return;
    }
    console.log('  ✅ Aggregator desplegado\n');
    
    const aggregatorABI = [
      "function getModules() view returns (address[])",
      "function owner() view returns (address)",
      "function isModuleBound(address) view returns (bool)"
    ];
    const aggregator = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
    
    try {
      const modules = await aggregator.getModules();
      console.log('  Módulos actuales:', modules);
      console.log('  Total módulos:', modules.length);
    } catch (err) {
      console.error('  ⚠️ No se pueden leer módulos:', err.message);
    }
    
    try {
      const aggOwner = await aggregator.owner();
      console.log('  Owner del aggregator:', aggOwner);
    } catch (err) {
      console.error('  ⚠️ No se puede leer owner:', err.message);
    }
    console.log('');
    
    // 4. Verificar módulo a añadir
    console.log('4️⃣ VERIFICANDO MÓDULO A AÑADIR...');
    const moduleCode = await provider.getCode(moduleToAdd);
    console.log('  Bytecode length:', moduleCode.length);
    
    if (moduleCode === '0x' || moduleCode.length < 10) {
      console.error('  ❌ El módulo NO está desplegado!');
      console.log('  Dirección:', moduleToAdd);
      return;
    }
    console.log('  ✅ Módulo desplegado\n');
    
    // 5. Simular la transacción
    console.log('5️⃣ SIMULANDO addModuleThroughAggregator...');
    const tokenWithSigner = token.connect(signer);
    
    try {
      // Intentar estimar gas
      const gasEstimate = await tokenWithSigner.addModuleThroughAggregator.estimateGas(moduleToAdd);
      console.log('  ✅ Gas estimado:', gasEstimate.toString());
      console.log('  ✅ La transacción debería funcionar!');
    } catch (err) {
      console.error('  ❌ Error al estimar gas:', err.message);
      console.log('  Código de error:', err.code);
      console.log('  Datos:', err.data);
      
      // Intentar con addComplianceModule en su lugar
      console.log('\n6️⃣ INTENTANDO addComplianceModule en su lugar...');
      try {
        const gasEstimate2 = await tokenWithSigner.addComplianceModule.estimateGas(aggregatorAddress);
        console.log('  ✅ Gas estimado para addComplianceModule:', gasEstimate2.toString());
        console.log('  💡 Solución: Usa addComplianceModule primero!');
      } catch (err2) {
        console.error('  ❌ También falla addComplianceModule:', err2.message);
      }
    }
    
    console.log('\n═══════════════════════════════════════════');
    console.log('✅ VERIFICACIÓN COMPLETA');
    console.log('═══════════════════════════════════════════');
    
  } catch (err) {
    console.error('❌ Error en verificación:', err);
  }
}

// Ejecutar
verifyToken();

