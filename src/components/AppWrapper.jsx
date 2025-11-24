import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from './LoginPage';
import GameSystemCheckout from './GameSystemCheckout';

export default function AppWrapper() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <LoginPage />;
  }

  return <GameSystemCheckout />;
}
