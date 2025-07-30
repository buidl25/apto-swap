import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * API client configuration
 */
export interface ApiClientConfig {
  readonly baseURL: string;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
}

/**
 * API client for interacting with the backend
 */
export class ApiClient {
  private readonly client: AxiosInstance;

  /**
   * Creates a new API client instance
   * @param config - API client configuration
   */
  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });
  }

  /**
   * Performs a GET request
   * @param url - Endpoint URL
   * @param config - Additional request configuration
   * @returns Promise with response
   */
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Performs a POST request
   * @param url - Endpoint URL
   * @param data - Data to send
   * @param config - Additional request configuration
   * @returns Promise with response
   */
  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Performs a PUT request
   * @param url - Endpoint URL
   * @param data - Data to send
   * @param config - Additional request configuration
   * @returns Promise with response
   */
  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Performs a DELETE request
   * @param url - Endpoint URL
   * @param config - Additional request configuration
   * @returns Promise with response
   */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete<T>(url, config);
    return response.data;
  }
}

/**
 * Creates an API client instance with default settings
 * @param baseURL - Base API URL
 * @returns API client instance
 */
export const createApiClient = (baseURL: string): ApiClient => {
  return new ApiClient({ baseURL });
};
