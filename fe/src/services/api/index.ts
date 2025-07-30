import { createApiClient, ApiClient } from './apiClient';
import { getApiConfig } from '../../config/api.config';

/**
 * Глобальный экземпляр API клиента
 */
export const apiClient: ApiClient = createApiClient(getApiConfig().baseUrl);

/**
 * Экспортируем все из apiClient для удобства использования
 */
export * from './apiClient';
