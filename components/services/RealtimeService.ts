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
        // 🆕 NUEVOS CALLBACKS PARA TRANSCRIPCIÓN
        onUserTranscription?: (transcript: string, isComplete: boolean) => void;
        onAgentTranscriptionDelta?: (messageId: string, delta: string) => void;
        onAgentTranscriptionComplete?: (messageId: string, fullTranscript: string) => void;
        onMetadata?: (metadata: any) => void;
    } = {};

    // 🆕 Para tracking de transcripciones del agente
    private agentTranscriptBuffer: { [key: string]: string } = {};
    
    // 🆕 Para evitar duplicados rápidos
    private lastDeltaTime: number = 0;
    private deltaThrottle: number = 100; // 100ms entre deltas
    private deltaAccumulator: { [key: string]: string } = {}; // Acumular deltas
    
    // 🚀 NUEVO: Buffer para manejar orden correcto de mensajes
    private pendingUserTranscription: string | null = null;
    private pendingAgentMessages: Array<{
        messageId: string;
        content: string;
        isComplete: boolean;
        timestamp: number;
    }> = [];
    private isWaitingForUserTranscription: boolean = false;
    private userSpeechTimeout: NodeJS.Timeout | null = null;

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
        instructions: `# Role & Objective
You are a knowledgeable voice assistant for a home appliances product catalog.
Your goal is to help customers find the perfect appliances by providing personalized recommendations through natural conversation.
Success means delivering both engaging spoken responses AND structured product data for visual display.

# CRITICAL: AUTOMATIC GREETING
When someone says "Hola" or greets you, ALWAYS respond with:
"¡Hola! Soy tu asistente de electrodomésticos. ¿En qué puedo ayudarte hoy?"
This should be spoken naturally and enthusiastically.

# Personality & Tone
## Personality
- Expert, helpful, and enthusiastic appliance consultant
- Knowledgeable but approachable
- Solution-focused and customer-oriented

## Tone
- Warm, confident, and conversational
- Never pushy or overly promotional
- Professional but friendly

## Length
- 1-2 sentences per audio response
- Keep spoken responses concise and natural

## Pacing
- Speak at a comfortable, clear pace
- Do not rush but maintain energy
- Pause naturally between key points

## Language
- Conversation will be primarily in Spanish
- If user speaks another language, respond in that language
- Keep technical terms simple and accessible

## Variety
- Vary your response openings and confirmations
- Do not repeat the same phrases in consecutive responses
- Use synonyms and alternate sentence structures
- Avoid robotic or repetitive language patterns

# Reference Pronunciations
When voicing these terms, use the respective pronunciations:
- Pronounce "WiFi" as "wai-fai"
- Pronounce "SmartWash" as "smart-wash"
- Pronounce "kg" as "kilogramos"
- Pronounce "cu.ft" as "pies cúbicos"

# Context
## Available Products
- SmartWash Pro 500 Front Load Washer: Ultra-efficient 5.0 cu.ft. front load washing machine with AI-powered wash cycles, steam cleaning, and WiFi connectivity. Features 15 customizable programs, Energy Star certification, vibration reduction technology, stainless steel drum, self-cleaning cycle, smart diagnostics, automatic detergent dispensing, and sanitize cycle. Perfect for large families with 10-year motor warranty.

# Instructions & Rules
## CRITICAL DUAL OUTPUT REQUIREMENT
- ALWAYS provide TWO distinct outputs for every product recommendation:
  1. SPOKEN RESPONSE: Natural, conversational audio (what user hears)
  2. METADATA: Structured JSON data (what app displays visually)
- These outputs must COMPLEMENT each other but be DIFFERENT
- Audio should be engaging and personal
- Metadata should be comprehensive and structured

## Audio Response Guidelines
- Sound natural and conversational
- Focus on benefits and personal relevance
- Use enthusiasm appropriate to the recommendation
- Keep technical details minimal in speech

## Products list Format (CRITICAL FORMAT REQUIRED)
When recommending products, you MUST structure your response using this EXACT format:

**SPOKEN:** [Your natural conversational response - this is what will be heard]
**METADATA:** [JSON structure - this will NOT be spoken]

Example:
**SPOKEN:** ¡Perfecto! Te recomiendo la SmartWash Pro 500, es ideal para familias grandes y tiene tecnología inteligente.
**METADATA:** {
    "JsonData": {
        "jsonType": "ProductsCollection",
        "products": [
            {
                "sku": "SWP500-FL",
                "name": "SmartWash Pro 500 Front Load Washer",
                "brand": "SmartWash",
                "profilePic": "https://example.com/images",
                "description": "Ultra-efficient 5.0 cu.ft. front load washing machine",
                "price": 899,
                "rate": 4.8,
                "discount": 0,
                "images": ["https://example.com/image1.jpg"],
                "Link3D": "https://example.com/3d",
                "LinkAR": "https://example.com/ar",
                "LinkVideo": "https://example.com/video",
                "TechnicalSheet": "https://example.com/specs",
                "FAQS": [
                    {
                        "question": "¿Qué garantía tiene?",
                        "answer": "10 años en motor"
                    }
                ]
            }
        ]
    }
}

CRITICAL: Only the content after **SPOKEN:** will be heard by the user. NEVER speak JSON, JsonData, ProductsCollection, or any metadata terms.

## Metadata Requirements
- Include ALL fields even if values are null
- Maintain proper JSON structure
- TextMessage should differ from spoken response
- Support multiple products in array
- Ensure numeric fields are actual numbers, not strings

## Example Interaction
User: "Necesito una lavadora"
Audio Response: "¡Perfecto! Te recomiendo la SmartWash Pro 500, es ideal para familias grandes y tiene tecnología inteligente que facilita todo."
Metadata: [Structured JSON with complete product details]

## Conversation Guidelines
- Ask clarifying questions when needed
- Understand customer needs before recommending
- Explain why a product fits their requirements
- Offer alternatives when appropriate
- Handle objections professionally

## Unclear Audio Handling
- Only respond to clear audio input
- IF audio is unclear, background noise, or unintelligible:
  * Ask for clarification politely
  * Use phrases like: "Disculpa, no pude escucharte bien. ¿Podrías repetir?"
  * Do NOT make assumptions about unclear input
- Wait for clear confirmation before proceeding

## Product Information Accuracy
- Base recommendations on provided product specifications
- Do not invent features or specifications
- IF unsure about details, focus on confirmed features
- Always highlight key benefits relevant to customer needs

## Error Handling
- IF no suitable products match request: Politely explain limitations
- IF technical issues occur: Apologize and offer alternative assistance
- IF customer seems frustrated: Acknowledge concerns and redirect positively

# Safety & Escalation
- Stay focused on appliance recommendations
- Do not provide advice outside product expertise
- IF customer has technical support needs: Acknowledge and suggest contacting technical support
- Maintain professional boundaries throughout interaction`,
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
        // 🆕 NUEVOS CALLBACKS PARA TRANSCRIPCIÓN
        onUserTranscription?: (transcript: string, isComplete: boolean) => void;
        onAgentTranscriptionDelta?: (messageId: string, delta: string) => void;
        onAgentTranscriptionComplete?: (messageId: string, fullTranscript: string) => void;
        onMetadata?: (metadata: any) => void;
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
            console.log("🤖 Agent created:", agent);

            // Create new session with agent
            this.session = new RealtimeSession(agent);
            console.log("📋 Session created:", this.session);

            // Set up event listeners before connecting
            this.setupEventListeners();

            // Connect to OpenAI Realtime API
            console.log("🔄 Connecting to OpenAI Realtime API...");
            
            try {
                await this.session.connect({
                    apiKey: apiKey,
                });
                
                // 🆕 HABILITAR TRANSCRIPCIÓN DE AUDIO
                console.log("🎤 Enabling audio transcription...");
                
                // 🔍 DEBUG: Ver qué métodos están disponibles
                console.log("🔍 Available session methods:", Object.getOwnPropertyNames(this.session));
                console.log("🔍 Session prototype methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(this.session)));
                
                if (typeof (this.session as any).inputAudioTranscriptionEnable === 'function') {
                    await (this.session as any).inputAudioTranscriptionEnable();
                    console.log("✅ Audio transcription enabled");
                } else {
                    console.warn("⚠️ inputAudioTranscriptionEnable method not found");
                }
                
                console.log("✅ Successfully connected to OpenAI Realtime API");
            } catch (connectError) {
                console.error("🚫 Connection error details:", connectError);
                throw new Error(`Connection failed: ${connectError.message}`);
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
            // 🆕 Limpiar buffer de transcripciones
            this.agentTranscriptBuffer = {};
            this.deltaAccumulator = {};
            this.lastDeltaTime = 0;

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
            this.agentTranscriptBuffer = {};
            this.deltaAccumulator = {};
            this.lastDeltaTime = 0;
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
            
            this.session.sendMessage(message);


            
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
            
            // Manejar eventos del transport si existe
            if (session.transport && typeof session.transport.on === 'function') {
                session.transport.on('*', (event: any) => {
                    if(event.type=='session.created')
                    {
                        console.log("✅ Transport session created:", event);
                        this.isConnected = true;
                        this.isConnecting = false;
                        
                        // Trigger connected callback
                        if (this.connectionCallbacks.onConnected) {
                            this.connectionCallbacks.onConnected();
                        }
                    } 
                    // 🆕 CAPTURAR EVENTOS DE TRANSCRIPCIÓN EN EL TRANSPORT
                    else if (event.type === 'conversation.item.input_audio_transcription.delta') {
                        console.log("📝 USER TRANSCRIPTION DELTA (TRANSPORT):", event);
                        if (this.connectionCallbacks.onUserTranscription) {
                            this.connectionCallbacks.onUserTranscription(event.delta, false);
                        }
                    }
                    else if (event.type === 'conversation.item.input_audio_transcription.completed') {
                        console.log("📝 USER TRANSCRIPTION COMPLETED (TRANSPORT):", event);
                        if (this.connectionCallbacks.onUserTranscription) {
                            this.connectionCallbacks.onUserTranscription(event.transcript, true);
                        }
                    }
                    else if (event.type === 'response.output_audio_transcript.delta') {
                        console.log("🤖 AGENT TRANSCRIPT DELTA (TRANSPORT):", event.delta);
                        
                        const responseId = event.response_id || 'default';
                        
                        // 🆕 ACUMULAR DELTAS PARA ENVIAR EN LOTES
                        if (!this.deltaAccumulator[responseId]) {
                            this.deltaAccumulator[responseId] = '';
                        }
                        this.deltaAccumulator[responseId] += event.delta;
                        
                        // Buffer para el transcript completo
                        if (!this.agentTranscriptBuffer[responseId]) {
                            this.agentTranscriptBuffer[responseId] = '';
                        }
                        this.agentTranscriptBuffer[responseId] += event.delta;
                        
                        // 🆕 ENVIAR DELTAS ACUMULADOS CON THROTTLE
                        const now = Date.now();
                        if (now - this.lastDeltaTime >= this.deltaThrottle) {
                            this.lastDeltaTime = now;
                            
                            if (this.connectionCallbacks.onAgentTranscriptionDelta) {
                                // 🆕 ENVIAR TODO EL TEXTO ACUMULADO HASTA AHORA
                                this.connectionCallbacks.onAgentTranscriptionDelta(responseId, this.agentTranscriptBuffer[responseId]);
                            }
                            
                            // NO limpiar acumulador, solo resetear para el próximo lote
                            this.deltaAccumulator[responseId] = '';
                        }
                    }
                    else if (event.type === 'response.output_audio_transcript.done') {
                        console.log("🤖 AGENT TRANSCRIPT DONE (TRANSPORT):", event);
                        
                        const responseId = event.response_id || 'default';
                        const fullTranscript = event.transcript || this.agentTranscriptBuffer[responseId] || '';
                        
                        // 🆕 ENVIAR ÚLTIMOS DELTAS ACUMULADOS ANTES DE COMPLETAR
                        if (this.deltaAccumulator[responseId] && this.connectionCallbacks.onAgentTranscriptionDelta) {
                            // Enviar el texto completo final
                            this.connectionCallbacks.onAgentTranscriptionDelta(responseId, this.agentTranscriptBuffer[responseId]);
                        }
                        
                        if (this.connectionCallbacks.onAgentTranscriptionComplete) {
                            this.connectionCallbacks.onAgentTranscriptionComplete(responseId, fullTranscript);
                        }
                        
                        // Limpiar buffers
                        delete this.agentTranscriptBuffer[responseId];
                        delete this.deltaAccumulator[responseId];
                    }
                    else 
                    {
                        console.log("Transport session event:", event.type);
                    }
                });

                
            }
            
            if (typeof session.addListener === 'function') {
                // 🔍 USAR LOS EVENTOS REALES QUE ESTÁN LLEGANDO
                console.log("🔍 Setting up REAL transcription events...");
                
                // 🎤 EVENTOS DEL USUARIO (REALES)
                session.addListener('input_audio_buffer.speech_started', (event: any) => {
                    console.log("🎤 USER STARTED SPEAKING (REAL):", event);
                });
                
                session.addListener('input_audio_buffer.speech_stopped', (event: any) => {
                    console.log("🎤 USER STOPPED SPEAKING (REAL):", event);
                });
                
                session.addListener('input_audio_buffer.committed', (event: any) => {
                    console.log("🎤 AUDIO BUFFER COMMITTED (REAL):", event);
                });
                
                // 📝 TRANSCRIPCIÓN DEL USUARIO EN TIEMPO REAL (CORRECTO)
                session.addListener('conversation.item.input_audio_transcription.delta', (event: any) => {
                    console.log("📝 USER TRANSCRIPTION DELTA (REAL):", event);
                    if (this.connectionCallbacks.onUserTranscription) {
                        this.connectionCallbacks.onUserTranscription(event.delta, false);
                    }
                });
                
                session.addListener('conversation.item.input_audio_transcription.completed', (event: any) => {
                    console.log("📝 USER TRANSCRIPTION COMPLETED (REAL):", event);
                    if (this.connectionCallbacks.onUserTranscription) {
                        this.connectionCallbacks.onUserTranscription(event.transcript, true);
                    }
                });
                
                // 🤖 EVENTOS DEL AGENTE (REALES)
                session.addListener('response.created', (event: any) => {
                    console.log("🤖 RESPONSE CREATED (REAL):", event);
                });
                
                session.addListener('response.output_item.added', (event: any) => {
                    console.log("🤖 OUTPUT ITEM ADDED (REAL):", event);
                });
                
                session.addListener('response.content_part.added', (event: any) => {
                    console.log("🤖 CONTENT PART ADDED (REAL):", event);
                });
                
                // 🤖 TRANSCRIPCIÓN DEL AGENTE EN TIEMPO REAL (CORRECTO)
                session.addListener('response.output_audio_transcript.delta', (event: any) => {
                    console.log("🤖 AGENT TRANSCRIPT DELTA (REAL):", event);
                    
                    const responseId = event.response_id || 'default';
                    
                    if (!this.agentTranscriptBuffer[responseId]) {
                        this.agentTranscriptBuffer[responseId] = '';
                    }
                    this.agentTranscriptBuffer[responseId] += event.delta;
                    
                    if (this.connectionCallbacks.onAgentTranscriptionDelta) {
                        this.connectionCallbacks.onAgentTranscriptionDelta(responseId, event.delta);
                    }
                });
                
                session.addListener('response.output_audio_transcript.done', (event: any) => {
                    console.log("🤖 AGENT TRANSCRIPT DONE (REAL):", event);
                    
                    const responseId = event.response_id || 'default';
                    const fullTranscript = event.transcript || this.agentTranscriptBuffer[responseId] || '';
                    
                    if (this.connectionCallbacks.onAgentTranscriptionComplete) {
                        this.connectionCallbacks.onAgentTranscriptionComplete(responseId, fullTranscript);
                    }
                    
                    delete this.agentTranscriptBuffer[responseId];
                });
                
                session.addListener('response.done', (event: any) => {
                    console.log("🤖 RESPONSE DONE (REAL):", event);
                });
                
                // Metadata/productos (mejorado para capturar JSON)
                session.addListener('conversation.item.completed', (event: any) => {
                    console.log("✅ CONVERSATION ITEM COMPLETED:", event);
                    
                    // Buscar metadata en la respuesta
                    if (event.item && event.item.content) {
                        try {
                            const content = Array.isArray(event.item.content) ? event.item.content[0] : event.item.content;
                            if (content && content.text) {
                                // Intentar parsear JSON metadata
                                const text = content.text;
                                if (text.includes('JsonData') || text.includes('TextMessage')) {
                                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                                    if (jsonMatch) {
                                        try {
                                            const metadata = JSON.parse(jsonMatch[0]);
                                            if (this.connectionCallbacks.onMetadata) {
                                                this.connectionCallbacks.onMetadata(metadata);
                                            }
                                        } catch (parseError) {
                                            console.warn("Could not parse metadata JSON:", parseError);
                                        }
                                    }
                                }
                            }
                        } catch (error) {
                            console.warn("Error processing metadata:", error);
                        }
                    }

                    // También triggear el callback general (mantener compatibilidad)
                    if (this.connectionCallbacks.onMessage) {
                        this.connectionCallbacks.onMessage(event);
                    }
                });
                
                // Evento de sesión creada
                session.addListener('session.created', (event: any) => {
                    console.log("✅ Session created successfully:", event);
                });
                
                // Eventos básicos para compatibilidad
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

                session.addListener('response', (response: any) => {
                    console.log("🎯 Received response:", response);
                    if (this.connectionCallbacks.onMessage) {
                        this.connectionCallbacks.onMessage(response);
                    }
                });

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

                // 🆕 NUEVOS EVENTOS PARA TRANSCRIPCIÓN

                // Transcripción del usuario completada
                session.addListener('conversation.item.input_audio_transcription.completed', (event: any) => {
                    console.log("📝 User transcription:", event.transcript);
                    if (this.connectionCallbacks.onUserTranscription) {
                        this.connectionCallbacks.onUserTranscription(event.transcript, true);
                    }
                });

                // Transcripción del agente en tiempo real (streaming)
                session.addListener('response.audio_transcript.delta', (event: any) => {
                    console.log("🤖 Agent transcript delta:", event.delta);
                    
                    const responseId = event.response_id || 'default';
                    
                    // Acumular el delta en el buffer
                    if (!this.agentTranscriptBuffer[responseId]) {
                        this.agentTranscriptBuffer[responseId] = '';
                    }
                    this.agentTranscriptBuffer[responseId] += event.delta;
                    
                    // Trigger callback con el delta
                    if (this.connectionCallbacks.onAgentTranscriptionDelta) {
                        this.connectionCallbacks.onAgentTranscriptionDelta(responseId, event.delta);
                    }
                });

                // Transcripción del agente completada
                session.addListener('response.audio_transcript.done', (event: any) => {
                    console.log("🤖 Agent transcript completed:", event.transcript);
                    
                    const responseId = event.response_id || 'default';
                    const fullTranscript = event.transcript || this.agentTranscriptBuffer[responseId] || '';
                    
                    if (this.connectionCallbacks.onAgentTranscriptionComplete) {
                        this.connectionCallbacks.onAgentTranscriptionComplete(responseId, fullTranscript);
                    }
                    
                    // Limpiar el buffer
                    delete this.agentTranscriptBuffer[responseId];
                });

                // Metadata/productos (mejorado para capturar JSON)
                session.addListener('conversation.item.completed', (event: any) => {
                    console.log("✅ Conversation item completed:", event);
                    
                    // Buscar metadata en la respuesta
                    if (event.item && event.item.content) {
                        try {
                            const content = Array.isArray(event.item.content) ? event.item.content[0] : event.item.content;
                            if (content && content.text) {
                                // Intentar parsear JSON metadata
                                const text = content.text;
                                if (text.includes('JsonData') || text.includes('TextMessage')) {
                                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                                    if (jsonMatch) {
                                        try {
                                            const metadata = JSON.parse(jsonMatch[0]);
                                            if (this.connectionCallbacks.onMetadata) {
                                                this.connectionCallbacks.onMetadata(metadata);
                                            }
                                        } catch (parseError) {
                                            console.warn("Could not parse metadata JSON:", parseError);
                                        }
                                    }
                                }
                            }
                        } catch (error) {
                            console.warn("Error processing metadata:", error);
                        }
                    }

                    // También triggear el callback general (mantener compatibilidad)
                    if (this.connectionCallbacks.onMessage) {
                        this.connectionCallbacks.onMessage(event);
                    }
                });

                console.log("📝 Event listeners setup completed WITH TRANSCRIPTION");
            } else if (typeof session.on === 'function') {
                // Evento de sesión creada
                session.on('session.created', (event: any) => {
                    console.log("✅ Session created successfully:", event);
                });

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

                // 🆕 EVENTOS DE TRANSCRIPCIÓN CON 'on' method
                session.on('conversation.item.input_audio_transcription.completed', (event: any) => {
                    console.log("📝 User transcription:", event.transcript);
                    if (this.connectionCallbacks.onUserTranscription) {
                        this.connectionCallbacks.onUserTranscription(event.transcript, true);
                    }
                });

                session.on('response.audio_transcript.delta', (event: any) => {
                    console.log("🤖 Agent transcript delta:", event.delta);
                    const responseId = event.response_id || 'default';
                    
                    if (!this.agentTranscriptBuffer[responseId]) {
                        this.agentTranscriptBuffer[responseId] = '';
                    }
                    this.agentTranscriptBuffer[responseId] += event.delta;
                    
                    if (this.connectionCallbacks.onAgentTranscriptionDelta) {
                        this.connectionCallbacks.onAgentTranscriptionDelta(responseId, event.delta);
                    }
                });

                session.on('response.audio_transcript.done', (event: any) => {
                    console.log("🤖 Agent transcript completed:", event.transcript);
                    const responseId = event.response_id || 'default';
                    const fullTranscript = event.transcript || this.agentTranscriptBuffer[responseId] || '';
                    
                    if (this.connectionCallbacks.onAgentTranscriptionComplete) {
                        this.connectionCallbacks.onAgentTranscriptionComplete(responseId, fullTranscript);
                    }
                    
                    delete this.agentTranscriptBuffer[responseId];
                });

                console.log("📝 Event listeners setup with 'on' method WITH TRANSCRIPTION");
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
