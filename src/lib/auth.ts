import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, AuthState } from '@/types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

export class AuthManager {
  private static instance: AuthManager;
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    token: null
  };

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  public async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  public generateToken(user: User): string {
    const payload = {
      userId: user.id,
      role: user.role,
      permissions: user.permissions
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  }

  public verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  public setAuthState(user: User, token: string): void {
    this.authState = {
      user,
      isAuthenticated: true,
      isAdmin: user.role === 'admin',
      token
    };
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
    }
  }

  public clearAuthState(): void {
    this.authState = {
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      token: null
    };

    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  }

  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  public isAdmin(): boolean {
    return this.authState.isAdmin;
  }

  public getCurrentUser(): User | null {
    return this.authState.user;
  }

  public hasPermission(action: string, resource: string): boolean {
    if (!this.authState.user) return false;
    if (this.authState.user.role === 'admin') return true;

    return this.authState.user.permissions.some(
      permission => 
        permission.action === action && 
        permission.resource === resource && 
        permission.granted
    );
  }

  public async initializeFromStorage(): Promise<void> {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');

    if (token && userData) {
      const tokenData = this.verifyToken(token);
      if (tokenData) {
        const user = JSON.parse(userData);
        this.setAuthState(user, token);
      } else {
        this.clearAuthState();
      }
    }
  }

  public async authenticate(email: string, password: string): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      const { user, token } = data;

      this.setAuthState(user, token);
      return user;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  public async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authState.token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthState();
    }
  }
}

// Utility functions for server-side use
export function createDefaultAdmin(): User {
  return {
    id: 'admin-default',
    name: 'Administrator',
    email: 'admin@example.com',
    role: 'admin',
    approvalStatus: 'approved',
    permissions: [
      { action: '*', resource: '*', granted: true }
    ]
  };
}

export function createGuestUser(name: string): User {
  return {
    id: `guest-${Date.now()}`,
    name,
    email: '',
    role: 'participant',
    approvalStatus: 'pending',
    permissions: [
      { action: 'join', resource: 'room', granted: false },
      { action: 'send', resource: 'message', granted: true },
      { action: 'share', resource: 'screen', granted: true }
    ]
  };
}

export function hasRoomPermission(user: User, action: string): boolean {
  if (user.role === 'admin') return true;
  if (user.approvalStatus !== 'approved') return false;
  
  return user.permissions.some(
    permission => 
      (permission.action === action || permission.action === '*') && 
      (permission.resource === 'room' || permission.resource === '*') && 
      permission.granted
  );
}