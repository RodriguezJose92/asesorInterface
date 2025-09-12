/**
 * Mock Session Service for development
 * Provides a fallback when the backend session endpoint is not available
 */
class MockSessionService {
    private static instance: MockSessionService;

    static getInstance(): MockSessionService {
        if (!MockSessionService.instance) {
            MockSessionService.instance = new MockSessionService();
        }
        return MockSessionService.instance;
    }

    /**
     * Generates a mock session token for development
     * In production, this should never be used
     */
    async getSessionToken(): Promise<string> {
        console.log("🔄 Using mock session token for development");
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return a mock token
        // Note: This won't work with actual OpenAI API, but prevents connection errors
        return "mock-token-for-development-" + Date.now();
    }

    validateToken(token: string): boolean {
        return typeof token === 'string' && token.length > 0 && token.trim() !== '';
    }
}

export default MockSessionService.getInstance();
