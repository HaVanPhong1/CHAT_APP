import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import { AuthContext } from './context/AuthContext';
import './index.css';

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
