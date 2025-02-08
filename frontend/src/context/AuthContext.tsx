import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, User } from '../types';

interface AuthContextType {
  auth: AuthState;
  login: (userData: User & { token: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const storedAuth = localStorage.getItem('auth');
    return storedAuth ? JSON.parse(storedAuth) : { user: null, token: null };
  });
  useEffect(() => {
    console.log(auth,"auth")
    localStorage.setItem('auth', JSON.stringify(auth));
  }, [auth]);

  const login = (userData: User & { token: string }) => {
    console.log(userData, "login");
  const updatedAuth = {
    user: {
      _id: userData._id,
      name: userData.name,
      email: userData.email,
    },
    token: userData.token,
  };
  setAuth(updatedAuth);
  }
  const logout = () => {
    console.log("logout")
    setAuth({ user: null, token: null });
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}