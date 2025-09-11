import { RealtimeSession, RealtimeAgent } from '@openai/agents-realtime';
import SessionService from './SessionService';

/**
 * RealtimeService - Manages OpenAI Realtime API connections
 * Follows Open/Closed Principle - extensible for new features without modification
 * Follows Dependency Inversion - depends on abstractions (SessionService)
 */
class RealtimeService {
    private static instance: RealtimeService;
    private session: RealtimeSession<any> | null = null;
    private isConnecting: boolean = false;
    private isConnected: boolean = false;
    private connectionCallbacks: {
        onConnected?: () => void;
        onDisconnected?: () => void;
        onError?: (error: Error) => void;
        onMessage?: (message: any) => void;
    } = {};

    private constructor() {
        // Private constructor for singleton pattern
    }

    /**
     * Singleton pattern implementation
     */
    static getInstance(): RealtimeService {
        if (!RealtimeService.instance) {
            RealtimeService.instance = new RealtimeService();
        }
        return RealtimeService.instance;
    }

    /**
     * Creates a basic RealtimeAgent configuration
     */
    private createAgent(): RealtimeAgent<any> {
        return new RealtimeAgent({
            name: "VoiceAssistant",
            instructions: "You are a helpful voice assistant for a product catalog. Speak naturally and be concise.",
            handoffDescription: "Voice assistant for product recommendations"
        });
    }

    /**
     * Establishes connection to OpenAI Realtime API
     * @param callbacks - Event callbacks for connection lifecycle
     * @returns Promise that resolves when connection is established
     */
    async connect(callbacks?: {
        onConnected?: () => void;
        onDisconnected?: () => void;
        onError?: (error: Error) => void;
        onMessage?: (message: any) => void;
    }): Promise<void> {
        if (this.isConnecting) {
            throw new Error("Connection already in progress");
        }

        if (this.isConnected) {
            console.log("⚠️ Already connected to Realtime API");
            return;
        }

        try {
            this.isConnecting = true;
            this.connectionCallbacks = callbacks || {};

            console.log("🔄 Initializing OpenAI Realtime session...");

            // Get fresh token from session service
            const apiKey = await SessionService.getSessionToken();

            if (!SessionService.validateToken(apiKey)) {
                throw new Error("Invalid API key received from session service");
            }

            // Create agent first
            const agent = this.createAgent();

            // Create new session with proper configuration INCLUDING options
            this.session = new RealtimeSession(agent, {
                apiKey: apiKey,
                transport: 'websocket',
                model: 'gpt-4o-realtime-preview-2024-10-01'
            });

            // Set up event listeners BEFORE connecting
            this.setupEventListeners();

            // Connect to OpenAI Realtime API
            console.log("🔄 Connecting to OpenAI Realtime API...");
            await this.session.connect({
                apiKey: apiKey,
            });

            this.isConnected = true;
            this.isConnecting = false;

            console.log("✅ Successfully connected to OpenAI Realtime API");
            
            // Trigger connected callback
            if (this.connectionCallbacks.onConnected) {
                this.connectionCallbacks.onConnected();
            }

        } catch (error) {
            this.isConnecting = false;
            this.isConnected = false;
            
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            console.error("❌ Failed to connect to OpenAI Realtime API:", errorMessage);
            
            // Trigger error callback
            if (this.connectionCallbacks.onError) {
                this.connectionCallbacks.onError(error instanceof Error ? error : new Error(errorMessage));
            }
            
            throw error;
        }
    }

    /**
     * Disconnects from OpenAI Realtime API
     */
    async disconnect(): Promise<void> {
        if (!this.session || !this.isConnected) {
            console.log("⚠️ No active session to disconnect");
            return;
        }

        try {
            console.log("🔄 Disconnecting from OpenAI Realtime API...");
            
            // Close the session using the close method
            if (typeof this.session.close === 'function') {
                await this.session.close();
            } else {
                // Force cleanup if no close method
                console.warn("⚠️ No close method found on session, cleaning up manually");
            }
            
            this.session = null;
            this.isConnected = false;
            this.isConnecting = false;

            console.log("✅ Successfully disconnected from OpenAI Realtime API");
            
            // Trigger disconnected callback
            if (this.connectionCallbacks.onDisconnected) {
                this.connectionCallbacks.onDisconnected();
            }

        } catch (error) {
            console.error("❌ Error during disconnection:", error);
            // Force cleanup even if disconnect fails
            this.session = null;
            this.isConnected = false;
            this.isConnecting = false;
            throw error;
        }
    }

    /**
     * Sends a text message through the realtime session
     * @param message - The message to send
     */
    async sendMessage(message: string): Promise<void> {
        if (!this.session || !this.isConnected) {
            throw new Error("Not connected to Realtime API. Call connect() first.");
        }

        try {
            console.log("📤 Sending message:", message);
            
            // Use the correct method for sending text input
            if (typeof (this.session as any).text === 'function') {
                await (this.session as any).text(message);
            } else if (typeof (this.session as any).userInput === 'function') {
                await (this.session as any).userInput(message);
            } else {
                console.warn("⚠️ No text input method found on session");
                // Try to trigger a response instead
                if (typeof (this.session as any).response === 'function') {
                    await (this.session as any).response();
                }
            }
            
        } catch (error) {
            console.error("❌ Error sending message:", error);
            throw error;
        }
    }

    /**
     * Sets up event listeners for the realtime session
     * @private
     */
    private setupEventListeners(): void {
        if (!this.session) return;

        try {
            // Use type assertion to work with the session events
            const session = this.session as any;
            
            if (typeof session.addListener === 'function') {
                session.addListener('item', (item: any) => {
                    console.log("📨 Received item:", item);
                    if (this.connectionCallbacks.onMessage) {
                        this.connectionCallbacks.onMessage(item);
                    }
                });

                session.addListener('error', (error: any) => {
                    console.error("❌ Realtime session error:", error);
                    if (this.connectionCallbacks.onError) {
                        this.connectionCallbacks.onError(error);
                    }
                });

                session.addListener('close', () => {
                    console.log("🔌 Realtime session closed");
                    this.isConnected = false;
                    if (this.connectionCallbacks.onDisconnected) {
                        this.connectionCallbacks.onDisconnected();
                    }
                });

                // Listen for response events
                session.addListener('response', (response: any) => {
                    console.log("🎯 Received response:", response);
                    if (this.connectionCallbacks.onMessage) {
                        this.connectionCallbacks.onMessage(response);
                    }
                });

                console.log("📝 Event listeners setup completed");
            } else if (typeof session.on === 'function') {
                // Try the 'on' method as alternative
                session.on('item', (item: any) => {
                    console.log("� Received item:", item);
                    if (this.connectionCallbacks.onMessage) {
                        this.connectionCallbacks.onMessage(item);
                    }
                });

                session.on('error', (error: any) => {
                    console.error("❌ Realtime session error:", error);
                    if (this.connectionCallbacks.onError) {
                        this.connectionCallbacks.onError(error);
                    }
                });

                console.log("📝 Event listeners setup with 'on' method");
            } else {
                console.log("📝 Event listeners setup - no compatible method found");
            }
        } catch (error) {
            console.error("❌ Error setting up event listeners:", error);
        }
    }

    /**
     * Gets the current connection status
     */
    getConnectionStatus(): {
        isConnected: boolean;
        isConnecting: boolean;
        hasSession: boolean;
    } {
        return {
            isConnected: this.isConnected,
            isConnecting: this.isConnecting,
            hasSession: this.session !== null,
        };
    }

    /**
     * Gets the current session instance (for advanced usage)
     * @returns The current RealtimeSession or null
     */
    getSession(): RealtimeSession<any> | null {
        return this.session;
    }
}

export default RealtimeService.getInstance();
