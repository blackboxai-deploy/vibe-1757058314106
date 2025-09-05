export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'moderator' | 'participant';
  approvalStatus: 'pending' | 'approved' | 'denied';
  joinedAt?: Date;
  permissions: Permission[];
}

export interface Permission {
  action: string;
  resource: string;
  granted: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  token: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AdminSession {
  userId: string;
  role: string;
  permissions: Permission[];
  expiresAt: Date;
}