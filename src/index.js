import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Importa tu componente principal

// Este es el punto de entrada principal que monta tu aplicación.

// Asegúrate de que el contenedor 'root' exista en public/index.html
const rootElement = document.getElementById('root');

if (rootElement) {
  // Crea el 'root' de React 18
  const root = ReactDOM.createRoot(rootElement);

  // Renderiza el componente App dentro del contenedor
  root.render(
    <React.StrictMode>
      {/* El componente App es tu aplicación de inventario */}
      <App />
    </React.StrictMode>
  );
} else {
  console.error("No se encontró el elemento con ID 'root'. Asegúrate de que public/index.html esté correcto.");
}