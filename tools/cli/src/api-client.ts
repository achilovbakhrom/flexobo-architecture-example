/**
 * API Client for communicating with microservices
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.flexobo');
const TOKEN_FILE = path.join(CONFIG_DIR, 'token.json');

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private tokenData: TokenData | null = null;

  constructor(
    private baseUrl: string = 'http://localhost:3001',
    private adminUrl: string = 'http://localhost:3002'
  ) {
    this.client = axios.create({
      timeout: 10000,
    });

    // Load token from file
    this.loadToken();

    // Add request interceptor to attach token
    this.client.interceptors.request.use(
      (config) => {
        if (this.tokenData?.accessToken) {
          config.headers.Authorization = `Bearer ${this.tokenData.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && this.tokenData?.refreshToken) {
          // Try to refresh token
          try {
            await this.refreshToken();
            // Retry original request
            if (error.config) {
              return this.client.request(error.config);
            }
          } catch {
            // Refresh failed, clear token
            this.clearToken();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Login and store token
   */
  async login(email: string, password: string): Promise<void> {
    const response = await this.client.post(
      `${this.baseUrl}/api/v1/auth/login`,
      {
        email,
        password,
      }
    );

    const { accessToken, refreshToken, expiresIn } = response.data;
    const expiresAt = Date.now() + expiresIn * 1000;

    this.tokenData = { accessToken, refreshToken, expiresAt };
    this.saveToken();
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<void> {
    if (!this.tokenData?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post(
      `${this.baseUrl}/api/v1/auth/refresh`,
      {
        refreshToken: this.tokenData.refreshToken,
      }
    );

    const { accessToken, expiresIn } = response.data;
    const expiresAt = Date.now() + expiresIn * 1000;

    this.tokenData = { ...this.tokenData, accessToken, expiresAt };
    this.saveToken();
  }

  /**
   * Logout and clear token
   */
  logout(): void {
    this.clearToken();
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.tokenData?.accessToken;
  }

  /**
   * Get current token data
   */
  getTokenData(): TokenData | null {
    return this.tokenData;
  }

  /**
   * User management
   */
  async listUsers(params?: Record<string, string | number>): Promise<any> {
    const response = await this.client.get(
      `${this.adminUrl}/api/v1/admin/users`,
      {
        params,
      }
    );
    return response.data;
  }

  async getUser(id: string): Promise<any> {
    const response = await this.client.get(
      `${this.adminUrl}/api/v1/admin/users/${id}`
    );
    return response.data;
  }

  async createUser(data: any): Promise<any> {
    const response = await this.client.post(
      `${this.adminUrl}/api/v1/admin/users`,
      data
    );
    return response.data;
  }

  async updateUser(id: string, data: any): Promise<any> {
    const response = await this.client.put(
      `${this.adminUrl}/api/v1/admin/users/${id}`,
      data
    );
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`${this.adminUrl}/api/v1/admin/users/${id}`);
  }

  async updateUserRoles(id: string, roles: string[]): Promise<any> {
    const response = await this.client.put(
      `${this.adminUrl}/api/v1/admin/users/${id}/roles`,
      { roles }
    );
    return response.data;
  }

  /**
   * Order management
   */
  async listOrders(params?: Record<string, string | number>): Promise<any> {
    const response = await this.client.get(`${this.baseUrl}/api/v1/orders`, {
      params,
    });
    return response.data;
  }

  async getOrder(id: string): Promise<any> {
    const response = await this.client.get(
      `${this.baseUrl}/api/v1/orders/${id}`
    );
    return response.data;
  }

  async createOrder(data: any): Promise<any> {
    const response = await this.client.post(
      `${this.baseUrl}/api/v1/orders`,
      data
    );
    return response.data;
  }

  async cancelOrder(id: string): Promise<any> {
    const response = await this.client.post(
      `${this.baseUrl}/api/v1/orders/${id}/cancel`
    );
    return response.data;
  }

  /**
   * Cache management
   */
  async listCacheEntries(): Promise<any> {
    const response = await this.client.get(
      `${this.adminUrl}/api/v1/admin/cache`
    );
    return response.data;
  }

  async invalidateCache(key: string): Promise<void> {
    await this.client.delete(`${this.adminUrl}/api/v1/admin/cache/${key}`);
  }

  async invalidateAllCache(): Promise<void> {
    await this.client.delete(`${this.adminUrl}/api/v1/admin/cache`);
  }

  /**
   * Event management
   */
  async getEventStatistics(): Promise<any> {
    const response = await this.client.get(
      `${this.adminUrl}/api/v1/admin/metrics/events`
    );
    return response.data;
  }

  /**
   * Health checks
   */
  async getSystemMetrics(): Promise<any> {
    const response = await this.client.get(
      `${this.adminUrl}/api/v1/admin/metrics`
    );
    return response.data;
  }

  async getServiceHealth(): Promise<any> {
    const response = await this.client.get(
      `${this.adminUrl}/api/v1/admin/metrics/services`
    );
    return response.data;
  }

  /**
   * Audit logs
   */
  async listAuditLogs(params?: Record<string, string | number>): Promise<any> {
    const response = await this.client.get(
      `${this.adminUrl}/api/v1/admin/audit-logs`,
      {
        params,
      }
    );
    return response.data;
  }

  /**
   * Save token to file
   */
  private saveToken(): void {
    if (!this.tokenData) return;

    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(this.tokenData, null, 2));
    } catch (error) {
      console.warn('Failed to save token:', error);
    }
  }

  /**
   * Load token from file
   */
  private loadToken(): void {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const data = fs.readFileSync(TOKEN_FILE, 'utf-8');
        this.tokenData = JSON.parse(data);

        // Check if token is expired
        if (this.tokenData && this.tokenData.expiresAt < Date.now()) {
          this.clearToken();
        }
      }
    } catch (error) {
      console.warn('Failed to load token:', error);
    }
  }

  /**
   * Clear token from memory and file
   */
  private clearToken(): void {
    this.tokenData = null;
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        fs.unlinkSync(TOKEN_FILE);
      }
    } catch (error) {
      console.warn('Failed to delete token file:', error);
    }
  }
}

// Singleton instance
export const apiClient = new ApiClient();
