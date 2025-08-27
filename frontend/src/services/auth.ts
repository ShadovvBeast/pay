import { RegisterData, LoginData, AuthResponse, User } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2894';

class AuthService {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Registration failed');
    }

    return await response.json();
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Login failed');
    }

    return await response.json();
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include cookies
      });
    } catch (error) {
      // Ignore logout errors
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
        credentials: 'include', // Include cookies
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Include cookies
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update user');
    }

    const result = await response.json();
    return result.user;
  }
}

export const authService = new AuthService();