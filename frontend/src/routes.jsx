import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import { getToken } from './api/client';

function Protected({ children }){
  const token = getToken();
  if(!token){
    return <Navigate to="/login" replace />
  }
  return children;
}

export const router = createBrowserRouter([
  { path: '/', element: <Protected><Chat /></Protected> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function AppRouter(){
  return <RouterProvider router={router} />
}
