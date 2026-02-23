const REGISTER_URL = 'https://9.0.0.10:8080/api/registro';

export async function sendRegisterData({ userData, termsAccepted, photoFile, lane }) {
  console.log('📤 Enviando registro a:', REGISTER_URL);
  console.log('📋 Datos:', { 
    hasUserData: !!userData, 
    termsAccepted, 
    hasPhoto: !!photoFile, 
    photoName: photoFile?.name,
    photoSize: photoFile?.size,
    lane 
  });

  const formData = new FormData();
  
  // Campo userData como JSON string (opcional según docs)
  if (userData) {
    formData.append('userData', JSON.stringify(userData));
  }
  
  // Campo termsAccepted con valor 'true' o 'false'
  formData.append('termsAccepted', termsAccepted ? 'true' : 'false');

  // Campo "foto" (exactamente así, requerido según docs)
  if (photoFile) {
    formData.append('foto', photoFile);
  }

  // Agregar línea/carril al que pertenece el registro (opcional)
  if (lane) {
    formData.append('lane', lane);
  }

  try {
    console.log('🌐 Realizando fetch...');
    
    const response = await fetch(REGISTER_URL, {
      method: 'POST',
      body: formData
    });

    console.log('📡 Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    // Validar que la respuesta sea OK antes de parsear JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Respuesta de error del servidor:', errorText);
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Datos parseados:', data);

    // Validar respuesta según estructura de docs
    if (!data.success) {
      throw new Error(data?.error || 'No fue posible registrar el participante');
    }

    return data;

  } catch (error) {
    // Diagnóstico detallado del error
    console.error('❌ Error en sendRegisterData:', error);
    
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error('🔍 Causas posibles:');
      console.error('  1. El servidor NO está corriendo en', REGISTER_URL);
      console.error('  2. Certificado SSL autofirmado no confiable (normal en dev)');
      console.error('  3. CORS bloqueando la petición desde', window.location.origin);
      console.error('  4. Firewall/antivirus bloqueando conexión');
      console.error('');
      console.error('💡 Soluciones:');
      console.error('  - Verifica que el servidor backend esté corriendo');
      console.error('  - Abre primero en el navegador:', REGISTER_URL);
      console.error('  - Acepta el certificado SSL manualmente');
      console.error('  - Revisa la consola del servidor backend para errores');
      
      throw new Error(
        `No se pudo conectar al servidor en ${REGISTER_URL}. ` +
        `Verifica que el backend esté corriendo y que hayas aceptado el certificado SSL.`
      );
    }

    // Re-throw otros errores con contexto
    throw error;
  }
}
