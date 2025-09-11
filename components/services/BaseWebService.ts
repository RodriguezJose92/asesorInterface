import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { BackendResponse, BackendErrorResponse } from '../../types/type';

class BaseWebServices {

    protected api: AxiosInstance;
    private baseURL: string;

    constructor(baseURL: string, headers: Record<string, string> = {}) {
        this.baseURL = baseURL;
        this.api = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        });

        this.setupInterceptors();
    };

    private setupInterceptors(): void {
        this.api.interceptors.request.use(
            async (config) => {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    config.headers['Authorization'] = `${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        this.api.interceptors.response.use(
            (response: AxiosResponse) => response,
            (error: AxiosError) => {
                if (error.response?.status === 401) {
                    localStorage.remove('accessToken'); // Clear the access token on unauthorized response
                }
                return Promise.reject(error);
            }
        );
    };

    private buildURL(url: string): string {
        return url.startsWith('/') ? `${this.baseURL}${url}` : `${this.baseURL}/${url}`;
    };

    protected async get<T>(url: string, params?: Record<string, any>): Promise<BackendResponse<T>> {
        const fullURL = this.buildURL(url);
        try {
            const response: AxiosResponse<BackendResponse<T>> = await this.api.get(fullURL, { params });
            return response.data;
        } catch (error: any) {
            this.handleError(error);
        }
    };

    protected async post<T>(url: string, data?: any): Promise<BackendResponse<T>> {
        const fullURL = this.buildURL(url);
        console.log(fullURL)
        try {
            const response: AxiosResponse<BackendResponse<T>> = await this.api.post(fullURL, data);
            return response.data;
        } catch (error: any) {
            this.handleError(error);
        }
    };

    protected async put<T>(url: string, data?: any): Promise<BackendResponse<T>> {
        const fullURL = this.buildURL(url);
        try {
            const response: AxiosResponse<BackendResponse<T>> = await this.api.put(fullURL, data);
            return response.data;
        } catch (error: any) {
            this.handleError(error);
        }
    };

    protected async delete<T>(url: string): Promise<BackendResponse<T>> {
        const fullURL = this.buildURL(url);
        try {
            const response: AxiosResponse<BackendResponse<T>> = await this.api.delete(fullURL);
            return response.data;
        } catch (error: any) {
            this.handleError(error);
        }
    };

    private handleError(error: any): never {
        if (error.response && error.response.data) {
            const errorData: BackendErrorResponse = error.response.data;
            console.error('API Error:', {
                statusCode: errorData.statusCode,
                message: errorData.message,
                developmentMessage: errorData.developmentMessage,
            });
            throw errorData;
        }
        throw {
            statusCode: 500,
            status: 'error',
            message: 'An unexpected error occurred',
            developmentMessage: error.message || 'Network error',
        } as BackendErrorResponse;
    };

};

export default BaseWebServices;