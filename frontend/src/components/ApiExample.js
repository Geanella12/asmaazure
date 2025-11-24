import React, { useState, useEffect } from 'react';

const ApiExample = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para hacer peticiones a tu API
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Aquí puedes cambiar la URL por la de tu API real
      const response = await fetch('http://localhost:3001/api/usuarios');
      
      if (!response.ok) {
        throw new Error('Error al cargar los datos');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar datos cuando el componente se monta
    fetchData();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Ejemplo de Conexión con Backend</h2>
      
      <button 
        onClick={fetchData} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Cargando...' : 'Cargar Datos'}
      </button>

      {error && (
        <div style={{ 
          color: 'red', 
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '5px'
        }}>
          Error: {error}
        </div>
      )}

      {data && (
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '5px'
        }}>
          <h3>Datos recibidos:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ApiExample;
