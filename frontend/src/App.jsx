import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [mensaje, setMensaje] = useState('Conectando con el backend...');

  useEffect(() => {
    // Hacemos una petición HTTP a nuestro backend en el puerto 4000
    axios.get('http://localhost:4000/api/test')
      .then(response => {
        setMensaje(response.data.mensaje);
      })
      .catch(error => {
        console.error('Error:', error);
        setMensaje('No se pudo conectar con el backend');
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Proyecto Alquiler - Fullstack</h1>
      <p>Estado de la conexión:</p>
      <div style={{ padding: '1rem', background: '#f4f4f4', borderRadius: '8px', display: 'inline-block' }}>
        <strong>{mensaje}</strong>
      </div>
    </div>
  );
}

export default App;