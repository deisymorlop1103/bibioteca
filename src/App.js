import React, { useState, useEffect } from 'react';
// 1. Imports de Firebase SDK
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Book, 
  Heart, 
  Plus, 
  Trash2, 
  Edit2, 
  LogOut, 
  Save, 
  X, 
  ArrowRight,
  Library,
  BookOpen,
  AlertTriangle 
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE 
// NOTA: Esta configuración está duplicada aquí y en firebase.js.
// Para un código más limpio, considera usar solo firebase.js para la inicialización
const firebaseConfig = {
  apiKey: "AIzaSyDOXDeqj91LMzH05pQEsYUB5w-Fm0r0Y74",
  authDomain: "mibibliotecaapp-c5222.firebaseapp.com",
  projectId: "mibibliotecaapp-c5222",
  storageBucket: "mibibliotecaapp-c5222.firebasestorage.app",
  messagingSenderId: "4212262774",
  appId: "1:4212262774:web:dca93353247e1e52d01c57",
  measurementId: "G-8KMN7VM311"
};

// 2. Inicialización de FIREBASE
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); //se activa analitics
const auth = getAuth(app);
const db = getFirestore(app);

// --- COMPONENTES UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button' }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
  };
  return (
    <button 
      type={type}
      onClick={onClick} 
      className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
    {children}
  </span>
);

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [view, setView] = useState('collection'); // 'collection' o 'wishlist'
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  
  // ESTADOS PARA LA CONFIRMACIÓN DE ELIMINACIÓN
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    genre: '',
    notes: ''
  });

  // 1. Inicialización de Autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    if (!auth.currentUser) {
        // Opcional: Iniciar sesión anónima automáticamente
        // signInAnonymously(auth).catch(console.error);
    }

    return () => unsubscribe();
  }, []);

  // 2. Carga de Datos (Libros)
  useEffect(() => {
    if (!user) return;

    // Ruta limpia para tu base de datos: users/{uid}/books
    const booksRef = collection(db, 'users', user.uid, 'books');
    
    // Consulta simple
    const q = query(booksRef); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const booksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Ordenamiento básico en cliente por fecha
      booksData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBooks(booksData);
    }, (error) => {
      console.error("Error fetching books:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // --- MANEJADORES DE ACCIÓN ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (bookToEdit = null) => {
    if (bookToEdit) {
      setEditingBook(bookToEdit);
      setFormData({
        title: bookToEdit.title,
        author: bookToEdit.author,
        genre: bookToEdit.genre,
        notes: bookToEdit.notes || ''
      });
    } else {
      setEditingBook(null);
      setFormData({ title: '', author: '', genre: '', notes: '' });
    }
    setShowModal(true);
  };
  
  // NUEVA FUNCIÓN: Abrir modal de confirmación
  const openDeleteConfirm = (bookId) => {
    setBookToDelete(bookId);
    setShowDeleteConfirm(true);
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Referencia a la colección de libros del usuario
    const booksRef = collection(db, 'users', user.uid, 'books');
    
    try {
      if (editingBook) {
        // Editar existente
        await updateDoc(doc(booksRef, editingBook.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        // Crear nuevo (el estado depende de la vista actual)
        await addDoc(booksRef, {
          ...formData,
          status: view, // 'collection' o 'wishlist'
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving book:", error);
      // Usar console.error en lugar de alert()
      console.error("Error al guardar. Intenta nuevamente.");
    }
  };

  // FUNCIÓN MODIFICADA: Ahora se llama después de la confirmación
  const handleDelete = async () => {
    if (!bookToDelete || !user) {
      setShowDeleteConfirm(false);
      return;
    }
    
    try {
      const bookRef = doc(db, 'users', user.uid, 'books', bookToDelete);
      await deleteDoc(bookRef);
      // Cerrar el modal después de la eliminación exitosa
      setShowDeleteConfirm(false);
      setBookToDelete(null);
    } catch (error) {
      console.error("Error deleting:", error);
      setShowDeleteConfirm(false);
      setBookToDelete(null);
      // Usar console.error en lugar de alert()
      console.error("Error al eliminar. Intenta nuevamente.");
    }
  };

  const handleMoveToCollection = async (book) => {
    try {
      const bookRef = doc(db, 'users', user.uid, 'books', book.id);
      await updateDoc(bookRef, {
        status: 'collection',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error moving book:", error);
    }
  };

  // Filtrar libros según la vista actual
  const currentBooks = books.filter(book => book.status === view);

  // --- COMPONENTE MODAL DE CONFIRMACIÓN ---
  const DeleteConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmar Eliminación</h3>
          <p className="text-gray-600 mb-6">
            ¿Estás seguro de que quieres eliminar este libro de forma permanente?
          </p>
          <div className="flex justify-center gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- RENDERIZADO ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Vista Login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto bg-blue-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-6">
            <Library className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Mi Biblioteca</h1>
          <p className="text-gray-500 mb-8">
            Gestiona tu colección de libros y tu lista de deseos en un solo lugar.
          </p>
          <Button onClick={() => signInAnonymously(auth)} className="w-full py-3">
            Ingresar como Invitado
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            Nota: Al ser tu primera vez, asegúrate de tener habilitado "Auth Anónimo" en la consola de Firebase o usa Email/Google si lo configuraste.
          </p>
        </Card>
      </div>
    );
  }

  // Vista Principal (Dashboard)
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="text-blue-600 w-6 h-6" />
            <h1 className="font-bold text-xl hidden sm:block">BiblioManager</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 hidden sm:block">
              Usuario: <span className="font-mono text-xs">{user.uid.slice(0,6)}...</span>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="text-gray-500 hover:text-red-500 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header y Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => setView('collection')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                view === 'collection' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Library className="w-4 h-4" />
              Mi Colección
            </button>
            <button
              onClick={() => setView('wishlist')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                view === 'wishlist' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Heart className="w-4 h-4" />
              Lista de Deseos
            </button>
          </div>

          <Button onClick={() => openModal()} variant={view === 'collection' ? 'primary' : 'success'}>
            <Plus className="w-4 h-4" />
            {view === 'collection' ? 'Nuevo Libro' : 'Agregar Deseo'}
          </Button>
        </div>

        {/* Resumen */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {view === 'collection' ? 'Mis Libros' : 'Lista de Deseos'}
          </h2>
          <p className="text-gray-500 text-sm">
            Tienes {currentBooks.length} {currentBooks.length === 1 ? 'item' : 'items'} en esta lista.
          </p>
        </div>


        {/* Grid de Libros */}
        {currentBooks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Book className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No hay libros aquí</h3>
            <p className="text-gray-500 mb-4">¡Comienza agregando uno a tu lista!</p>
            <Button onClick={() => openModal()} variant="outline">
              Agregar ahora
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentBooks.map(book => (
              <Card key={book.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <Badge color={view === 'collection' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                      {book.genre || 'General'}
                    </Badge>
                    {view === 'wishlist' && (
                      <button 
                        onClick={() => handleMoveToCollection(book)}
                        className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors"
                        title="Mover a Mi Colección"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-2">{book.title}</h3>
                  <p className="text-gray-600 mb-4 font-medium">{book.author}</p>
                  
                  {book.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 italic mb-4">
                      "{book.notes}"
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
                  <button 
                    onClick={() => openModal(book)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded-full transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    // CAMBIO A LA FUNCIÓN PERSONALIZADA
                    onClick={() => openDeleteConfirm(book.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-full transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Modal Formulario*/}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBook ? 'Editar Libro' : (view === 'collection' ? 'Nuevo Libro' : 'Nuevo Deseo')}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveBook} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ej. Cien Años de Soledad"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Autor</label>
                  <input
                    type="text"
                    name="author"
                    required
                    value={formData.author}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ej. Gabriel García Márquez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                  <input
                    type="text"
                    name="genre"
                    value={formData.genre}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ej. Realismo Mágico"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas Personales</label>
                <textarea
                  name="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="¿Qué te pareció? o ¿Por qué quieres leerlo?"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant={view === 'collection' ? 'primary' : 'success'}>
                  <Save className="w-4 h-4" />
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Renderizar Modal de Confirmación de Eliminación */}
      {showDeleteConfirm && <DeleteConfirmationModal />}
      
    </div>
  );
}