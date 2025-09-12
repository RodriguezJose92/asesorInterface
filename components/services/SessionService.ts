import { BackendResponse } from "@/types/type";
import BaseWebServices from "./BaseWebService";

/**
 * SessionService - Handles session token generation for OpenAI Realtime API
 * Follows Single Responsibility Principle - only handles session management
 */
class SessionService extends BaseWebServices {
    private static instance: SessionService;
    private baseUrl: string;

    constructor() {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://mudi.voiceia.mudi.com.co/RT";
        super(baseUrl);
        this.baseUrl = baseUrl;
    }

    /**
     * Singleton pattern implementation
     * Ensures only one instance of SessionService exists
     */
    static getInstance(): SessionService {
        if (!SessionService.instance) {
            SessionService.instance = new SessionService();
        }
        return SessionService.instance;
    }

    /**
     * Retrieves a new session token from the backend
     * @returns Promise with the session token response
     * @throws Error if the request fails or token is not received
     */
    async getSessionToken(): Promise<string> {
        try {
            console.log("🔄 Requesting new session token...");

            const response = await this.get<BackendResponse<{ value: string }>>("/session");
            console.log("🔑 Session token response:", response.value);
            if (!response?.value) {
                throw new Error("Invalid response format: missing token value");
            }

            console.log("✅ Session token retrieved successfully");
            return response.value;

        } catch (error) {
            console.error("❌ Error retrieving session token:", error);
            throw new Error(
                error instanceof Error
                    ? `Failed to get session token: ${error.message}`
                    : "Failed to get session token: Unknown error"
            );
        }
    }

    /**
     * Validates if a token is still valid (basic format check)
     * @param token - The token to validate
     * @returns boolean indicating if token appears valid
     */
    validateToken(token: string): boolean {
        return typeof token === 'string' && token.length > 0 && token.trim() !== '';
    }
}

export default SessionService.getInstance();
