import { useState, useCallback, useRef, useEffect } from 'react';
import RealtimeService from '@/components/services/RealtimeService';

/**
 * Custom hook for managing OpenAI Realtime functionality
 * Simplified and robust implementation
 */
export interface UseRealtimeReturn {
    // Connection state
    isConnected: boolean;
    isConnecting: boolean;
    connectionError: string | null;
    
    // Actions
    startRealtime: () => Promise<void>;
    stopRealtime: () => Promise<void>;
    sendMessage: (message: string) => Promise<void>;
    
    // Message handling
    messages: RealtimeMessage[];
    clearMessages: () => void;
    
    // Audio handling
    audioData: ArrayBuffer[];
    clearAudio: () => void;
    
    // Product metadata handling
    productMetadata: any | null;
    clearMetadata: () => void;
}

export interface RealtimeMessage {
    id: string;
    content: any;
    timestamp: Date;
    type: 'text' | 'audio' | 'response' | 'error';
}

export function useRealtime(): UseRealtimeReturn {
    // State management
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [messages, setMessages] = useState<RealtimeMessage[]>([]);
    const [audioData, setAudioData] = useState<ArrayBuffer[]>([]);
    const [productMetadata, setProductMetadata] = useState<any | null>(null);
    
    // Refs for cleanup
    const mountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            RealtimeService.disconnect().catch(console.error);
        };
    }, []);

    /**
     * Starts the realtime connection
     */
    const startRealtime = useCallback(async (): Promise<void> => {
        if (isConnecting || isConnected) {
            console.log("⚠️ Realtime already starting or connected");
            return;
        }

        try {
            setIsConnecting(true);
            setConnectionError(null);

            await RealtimeService.connect({
                onConnected: () => {
                    if (!mountedRef.current) return;
                    console.log("🎤 Realtime connection established");
                    setIsConnected(true);
                    setIsConnecting(false);
                    setConnectionError(null);
                },
                
                onDisconnected: () => {
                    if (!mountedRef.current) return;
                    console.log("🔌 Realtime connection closed");
                    setIsConnected(false);
                    setIsConnecting(false);
                },
                
                onError: (error: Error) => {
                    if (!mountedRef.current) return;
                    console.error("❌ Realtime connection error:", error);
                    setConnectionError(error.message);
                    setIsConnected(false);
                    setIsConnecting(false);
                },
                
                onMessage: (message: any) => {
                    if (!mountedRef.current) return;
                    console.log("📨 Received realtime message:", message);
                    
                    const newMessage: RealtimeMessage = {
                        id: Date.now().toString() + Math.random(),
                        content: message,
                        timestamp: new Date(),
                        type: 'response'
                    };
                    
                    setMessages(prev => [...prev, newMessage]);
                },

                onMetadata: (metadata: any) => {
                    if (!mountedRef.current) return;
                    console.log("🛠️ Received product metadata:", metadata);
                    setProductMetadata(metadata);
                }
            });

        } catch (error) {
            if (!mountedRef.current) return;
            
            const errorMessage = error instanceof Error ? error.message : 'Failed to start realtime';
            console.error("❌ Error starting realtime:", errorMessage);
            
            setConnectionError(errorMessage);
            setIsConnected(false);
            setIsConnecting(false);
        }
    }, [isConnecting, isConnected]);

    /**
     * Stops the realtime connection
     */
    const stopRealtime = useCallback(async (): Promise<void> => {
        try {
            setIsConnecting(false);
            await RealtimeService.disconnect();
            
            if (mountedRef.current) {
                setIsConnected(false);
                setConnectionError(null);
            }
            
        } catch (error) {
            console.error("❌ Error stopping realtime:", error);
            if (mountedRef.current) {
                setConnectionError(error instanceof Error ? error.message : 'Failed to stop realtime');
            }
        }
    }, []);

    /**
     * Sends a message through realtime
     */
    const sendMessage = useCallback(async (message: string): Promise<void> => {
        if (!isConnected) {
            throw new Error("Not connected to realtime. Start realtime first.");
        }

        try {
            // Add user message to the list
            const userMessage: RealtimeMessage = {
                id: Date.now().toString() + Math.random(),
                content: message,
                timestamp: new Date(),
                type: 'text'
            };
            
            setMessages(prev => [...prev, userMessage]);
            
            // Send to OpenAI
            await RealtimeService.sendMessage(message);
            
        } catch (error) {
            console.error("❌ Error sending realtime message:", error);
            
            // Add error message
            const errorMessage: RealtimeMessage = {
                id: Date.now().toString() + Math.random(),
                content: error instanceof Error ? error.message : 'Failed to send message',
                timestamp: new Date(),
                type: 'error'
            };
            
            setMessages(prev => [...prev, errorMessage]);
            throw error;
        }
    }, [isConnected]);

    /**
     * Clears all messages
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    /**
     * Clears all audio data
     */
    const clearAudio = useCallback(() => {
        setAudioData([]);
    }, []);

    /**
     * Clears product metadata
     */
    const clearMetadata = useCallback(() => {
        setProductMetadata(null);
    }, []);

    return {
        // State
        isConnected,
        isConnecting,
        connectionError,
        messages,
        audioData,
        productMetadata,
        
        // Actions
        startRealtime,
        stopRealtime,
        sendMessage,
        clearMessages,
        clearAudio,
        clearMetadata,
    };
}
