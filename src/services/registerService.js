const REGISTER_URL = 'http://localhost:8080/api/registro';

export async function sendRegisterData({ userData, termsAccepted, photoFile, lane }) {
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

  const response = await fetch(REGISTER_URL, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();

  // Validar respuesta según estructura de docs
  if (!data.success) {
    throw new Error(data?.error || 'No fue posible registrar el participante');
  }

  return data;
}
