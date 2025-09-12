import { RealtimeSession, RealtimeAgent } from '@openai/agents-realtime';
import SessionService from './SessionService';
import productsCatalog from '../../utils/products-catalog.json';

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
        // Generar instrucciones dinámicamente desde el catálogo JSON
        const generateProductInstructions = () => {
            let instructions = `# Context - Complete Product Knowledge Base\n`;

            // Agrupar productos por categoría
            const categories: { [key: string]: any[] } = {};
            productsCatalog.products.forEach((product: any) => {
                if (!categories[product.category]) {
                    categories[product.category] = [];
                }
                categories[product.category].push(product);
            });

            // Generar secciones por categoría
            Object.keys(categories).forEach(category => {
                const categoryName = category.toUpperCase();
                instructions += `\n## ${categoryName}\n`;

                categories[category].forEach((product: any, index: number) => {
                    const finalPrice = product.price * (1 - product.discount / 100);
                    instructions += `\n### ${index + 1}. ${product.sku} - ${product.name}\n`;
                    instructions += `- **Price**: $${product.price} (${product.discount}% discount = $${finalPrice.toFixed(2)} final price)\n`;
                    instructions += `- **Rating**: ${product.rate}/5 stars\n`;
                    instructions += `- **Capacity**: ${product.capacity}\n`;
                    instructions += `- **Type**: ${product.type}\n`;
                    instructions += `- **Brand**: ${product.brand}\n`;
                    instructions += `- **Key Features**: ${product.features.join(', ')}\n`;
                    instructions += `- **Description**: ${product.description}\n`;

                    if (product.FAQS && product.FAQS.length > 0) {
                        instructions += `- **Common Questions**:\n`;
                        product.FAQS.forEach((faq: any) => {
                            instructions += `  * ${faq.question} → ${faq.answer}\n`;
                        });
                    }
                    instructions += `\n`;
                });
            });

            // Agregar matriz de decisión
            instructions += `\n## DECISION MATRIX - Use This to Choose Products\n`;
            instructions += `**Available SKUs**: ${productsCatalog.products.map((p: any) => p.sku).join(', ')}\n`;
            instructions += `**By Budget**: \n`;

            const sortedByPrice = [...productsCatalog.products].sort((a: any, b: any) => a.price - b.price);
            sortedByPrice.forEach((product: any) => {
                const finalPrice = product.price * (1 - product.discount / 100);
                instructions += `- $${finalPrice.toFixed(2)}: ${product.sku} (${product.name})\n`;
            });

            instructions += `\n**By Category**: \n`;
            Object.keys(categories).forEach(category => {
                const skus = categories[category].map((p: any) => p.sku).join(', ');
                instructions += `- ${category}: ${skus}\n`;
            });

            return instructions;
        };

        return new RealtimeAgent({
            name: "VoiceAssistant",
            tools: [
                {
                    type: "function",
                    name: "send_product_metadata",
                    description: "Send product recommendations based on customer needs. Provide SKUs of products that best match the customer's requirements.",
                    strict: false,
                    needsApproval: async () => false,
                    parameters: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            product_skus: {
                                type: "array",
                                description: "Array of product SKUs that best match the customer's needs (maximum 5 products)",
                                items: {
                                    type: "string",
                                    description: "Product SKU from the available catalog"
                                },
                                maxItems: 5
                            },
                            reasoning: {
                                type: "string",
                                description: "Brief explanation of why these products were selected for the customer"
                            }
                        },
                        required: ["product_skus"]
                    },
                    invoke: async (args: any) => {
                        console.log("🛠️ Tool send_product_metadata invoked with:", args);
                        console.log("🛠️ Args type:", typeof args);
                        console.log("🛠️ Args keys:", Object.keys(args || {}));

                        // 🔍 EXTRAER ARGUMENTOS DEL CONTEXTO
                        let toolArgs = args;

                        // Si recibimos un RunContext, extraer los argumentos del último function_call
                        if (args && args.context && args.context.history) {
                            console.log("🔍 Detected RunContext, extracting arguments from history");
                            const history = args.context.history;
                            const lastFunctionCall = history.reverse().find((item: any) =>
                                item.type === 'function_call' && item.name === 'send_product_metadata'
                            );

                            if (lastFunctionCall && lastFunctionCall.arguments) {
                                console.log("🔍 Found function call arguments:", lastFunctionCall.arguments);
                                try {
                                    toolArgs = JSON.parse(lastFunctionCall.arguments);
                                    console.log("🔍 Parsed tool arguments:", toolArgs);
                                } catch (parseError) {
                                    console.error("🔍 Error parsing function call arguments:", parseError);
                                }
                            }
                        }

                        console.log("🛠️ Final tool args:", toolArgs);
                        console.log("🛠️ product_skus value:", toolArgs?.product_skus);
                        console.log("🛠️ product_skus type:", typeof toolArgs?.product_skus);
                        console.log("🛠️ product_skus is array:", Array.isArray(toolArgs?.product_skus));

                        // Obtener la instancia del servicio para acceder a los callbacks
                        const serviceInstance = RealtimeService.getInstance();

                        // Función para buscar productos por SKU
                        const findProductsBySku = (skus: string[]) => {
                            const foundProducts = [];
                            for (const sku of skus) {
                                const product = productsCatalog.products.find(p => p.sku === sku);
                                if (product) {
                                    foundProducts.push(product);
                                } else {
                                    console.warn(`🛠️ Product with SKU ${sku} not found in catalog`);
                                }
                            }
                            return foundProducts;
                        };

                        let products = [];
                        let reasoning = "";

                        // Verificar si tenemos SKUs en los argumentos
                        if (toolArgs && toolArgs.product_skus && Array.isArray(toolArgs.product_skus) && toolArgs.product_skus.length > 0) {
                            console.log("🛠️ Processing SKUs:", toolArgs.product_skus);
                            products = findProductsBySku(toolArgs.product_skus);
                            reasoning = toolArgs.reasoning || "Productos seleccionados basados en tus necesidades";
                            console.log(`🛠️ Found ${products.length} products from ${toolArgs.product_skus.length} SKUs`);
                        } else {
                            // ❌ NO FALLBACK: El agente DEBE enviar SKUs
                            console.error("🛠️ ERROR: No SKUs provided by agent. Tool requires product_skus array.");
                            console.error("🛠️ Agent must call tool with: {\"product_skus\": [\"SKU1\", \"SKU2\"], \"reasoning\": \"explanation\"}");

                            return {
                                success: false,
                                message: "Error: No product SKUs provided. Agent must specify which products to recommend."
                            };
                        }

                        console.log("🛠️ Final products to send:", products.map(p => ({ sku: p.sku, name: p.name })));

                        // Formatear los datos para que coincidan con lo que espera el componente
                        const formattedMetadata = {
                            JsonData: {
                                jsonType: "ProductsCollection",
                                products: products
                            },
                            TextMessage: reasoning
                        };

                        console.log("🛠️ Sending formatted metadata:", {
                            jsonType: formattedMetadata.JsonData.jsonType,
                            productsCount: formattedMetadata.JsonData.products.length,
                            textMessage: formattedMetadata.TextMessage
                        });

                        // Enviar la metadata a través del callback usando el método público
                        serviceInstance.triggerMetadataCallback(formattedMetadata);

                        return {
                            success: true,
                            message: `Product metadata sent successfully for ${products.length} products`
                        };
                    }
                }
            ],
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

${generateProductInstructions()}

# Instructions & Rules
## CRITICAL DUAL OUTPUT REQUIREMENT
- ALWAYS provide TWO distinct outputs for every product recommendation:
  1. SPOKEN RESPONSE: Natural, conversational audio (what user hears)
  2. PRODUCT METADATA: Use the send_product_metadata tool to send structured data to the UI
- These outputs must COMPLEMENT each other but be DIFFERENT
- Audio should be engaging and personal
- Metadata should be comprehensive and structured

## Audio Response Guidelines
- Sound natural and conversational
- Focus on benefits and personal relevance
- Use enthusiasm appropriate to the recommendation
- Keep technical details minimal in speech

## 🚨 CRITICAL: Product Recommendation Process
**YOU MUST ALWAYS call the send_product_metadata tool when recommending ANY product. This is MANDATORY.**

### REQUIRED WORKFLOW (NO EXCEPTIONS):
1. **Listen to customer needs** - Understand what they're looking for
2. **Choose 1-5 SKUs** - Select from the available catalog above
3. **Speak your recommendation** - Give natural audio response
4. **IMMEDIATELY call the tool** - Use send_product_metadata with the exact SKUs

### 🛠️ TOOL USAGE RULES:
- **ALWAYS call send_product_metadata after recommending products**
- **Use EXACT SKUs from the catalog above**
- **Maximum 5 products per call**
- **Include reasoning for your selection**
- **Tool format: {"product_skus": ["SKU1", "SKU2"], "reasoning": "why you chose these"}**

## 📋 EXACT EXAMPLES (FOLLOW THESE PATTERNS):

### Example 1: Single Washer
User: "Necesito una lavadora para mi apartamento pequeño"
**Step 1 - Speak:** "¡Perfecto! Te recomiendo la EcoWash 200, es compacta y perfecta para apartamentos."
**Step 2 - Call Tool:** send_product_metadata({"product_skus": ["ECO200-FL"], "reasoning": "Lavadora compacta ideal para apartamentos pequeños"})

### Example 2: Multiple Washers
User: "Quiero una lavadora pero no sé cuál elegir"
**Step 1 - Speak:** "Te muestro las mejores opciones de lavadoras según diferentes necesidades."
**Step 2 - Call Tool:** send_product_metadata({"product_skus": ["SWP500-FL", "SWP300-TL", "ECO200-FL"], "reasoning": "Variedad de lavadoras para diferentes necesidades y presupuestos"})

### Example 3: Refrigerator
User: "Necesito un refrigerador grande"
**Step 1 - Speak:** "Excelente, te recomiendo el CoolMax Pro 800, tiene gran capacidad y dispensador."
**Step 2 - Call Tool:** send_product_metadata({"product_skus": ["RF800-SS"], "reasoning": "Refrigerador grande con características premium"})

### 🚨 MANDATORY RULES:
- **NEVER recommend products without calling the tool**
- **ONLY use these exact SKUs: ECO200-FL, SWP300-TL, SWP500-FL, RF600-WH, RF800-SS**
- **Tool call is REQUIRED after every product recommendation**
- **Format must be exact: {"product_skus": ["SKU"], "reasoning": "explanation"}**

## 🛒 PRODUCT SELECTION RESPONSES
When you receive internal messages about product selection (like "El usuario agregó al carrito la SmartWash Pro 500"), respond with SHORT, enthusiastic confirmations:

### Examples:
- "¡Excelente elección! La SmartWash Pro 500 es perfecta para ti. Aquí puedes ver más información multimedia."
- "¡Genial! La EcoWash 200 es ideal. Te va a encantar su eficiencia."
- "¡Buena decisión! El CoolMax Pro 800 tiene gran capacidad. Disfruta explorando sus características."

### Rules for Selection Responses:
- Keep responses SHORT (1-2 sentences maximum)
- Be enthusiastic and positive
- Mention the product name
- Reference multimedia/more information when appropriate
- DO NOT call the product tool again for selection confirmations
- Sound natural and conversational

### If Missing Product Details:
If you don't have complete product information, use these defaults:
- sku: Generate based on product name (e.g., "SWP500-FL")
- profilePic: "https://example.com/images/[product-name].jpg"
- images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
- Link3D: "https://example.com/3d/[product-name]"
- LinkAR: "https://example.com/ar/[product-name]"
- LinkVideo: "https://example.com/video/[product-name]"
- TechnicalSheet: "https://example.com/specs/[product-name].pdf"
- price: Reasonable estimate based on product type
- rate: 4.5 (default good rating)
- discount: 0 or reasonable percentage

## COMPLETE Example Tool Call
When recommending the SmartWash Pro 500, call:
send_product_metadata({
    "jsonType": "ProductsCollection",
    "products": [
        {
            "sku": "SWP500-FL",
            "name": "SmartWash Pro 500 Front Load Washer",
            "brand": "SmartWash",
            "profilePic": "https://example.com/images/smartwash-pro-500.jpg",
            "description": "Ultra-efficient 5.0 cu.ft. front load washing machine with AI-powered wash cycles",
            "price": 899,
            "rate": 4.8,
            "discount": 0,
            "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
            "Link3D": "https://example.com/3d/smartwash-pro-500",
            "LinkAR": "https://example.com/ar/smartwash-pro-500",
            "LinkVideo": "https://example.com/video/smartwash-pro-500",
            "TechnicalSheet": "https://example.com/specs/smartwash-pro-500.pdf",
            "FAQS": [
                {
                    "question": "¿Qué garantía tiene?",
                    "answer": "10 años en motor y 2 años en partes"
                },
                {
                    "question": "¿Consume mucha energía?",
                    "answer": "No, tiene certificación Energy Star para máxima eficiencia"
                }
            ]
        }
    ]
})

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
- Maintain professional boundaries throughout interaction

# IMPORTANT REMINDERS
- NEVER include JSON data in your spoken responses
- NEVER mention "metadata", "JsonData", "ProductsCollection" in speech
- ALWAYS use the send_product_metadata tool for product data
- Keep spoken responses natural and conversational
- The tool will handle sending structured data to the UI automatically

# 🚨 CRITICAL FINAL REMINDER 🚨
EVERY TIME you recommend a product, you MUST:
1. Speak naturally about the product
2. Call send_product_metadata tool with complete data
3. NEVER skip the tool call - it's required for the UI to show product cards

If you recommend a product but don't call the tool, the user won't see the product information visually, which breaks the experience.

ALWAYS CALL THE TOOL WHEN RECOMMENDING PRODUCTS!`,
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
            }

            catch (connectError) {
                console.error("🚫 Connection error details:", connectError);
                throw new Error(`Connection failed: ${connectError instanceof Error ? connectError.message : String(connectError)}`);
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
     * Interrupts the agent if it's currently speaking
     */
    interrupt(): void {
        if (!this.session || !this.isConnected) {
            console.warn("⚠️ Cannot interrupt: Not connected to Realtime API");
            return;
        }

        try {
            console.log("🛑 Interrupting agent...");
            this.session.interrupt();
            console.log("✅ Agent interrupted successfully");
        } catch (error) {
            console.error("❌ Error interrupting agent:", error);
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

            // 🛑 INTERRUPT AGENT BEFORE SENDING NEW MESSAGE
            this.interrupt();

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
                    if (event.type == 'session.created') {
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
                    else {
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

                // 🛠️ EVENTOS DE TOOL CALLS
                session.addListener('response.function_call_arguments.delta', (event: any) => {
                    console.log("🛠️ TOOL CALL ARGUMENTS DELTA:", event);
                });

                session.addListener('response.function_call_arguments.done', (event: any) => {
                    console.log("🛠️ TOOL CALL ARGUMENTS DONE:", event);
                });

                session.addListener('response.output_item.added', (event: any) => {
                    console.log("🛠️ OUTPUT ITEM ADDED:", event);

                    // Verificar si es una llamada a función
                    if (event.item && event.item.type === 'function_call') {
                        console.log("🛠️ Function call detected:", event.item);

                        // Si es el tool send_product_metadata, procesarlo
                        if (event.item.name === 'send_product_metadata') {
                            console.log("🛠️ send_product_metadata tool call detected");
                        }
                    }
                });

                // 🛠️ LISTENER ESPECÍFICO PARA TOOL CALLS COMPLETADOS
                session.addListener('conversation.item.created', (event: any) => {
                    console.log("🛠️ CONVERSATION ITEM CREATED:", event);

                    if (event.item && event.item.type === 'function_call') {
                        console.log("🛠️ Function call item created:", event.item);
                        console.log("🛠️ Function call name:", event.item.name);
                        console.log("🛠️ Function call arguments (raw):", event.item.arguments);
                        console.log("🛠️ Arguments type:", typeof event.item.arguments);

                        if (event.item.name === 'send_product_metadata' && event.item.arguments) {
                            try {
                                let args;
                                if (typeof event.item.arguments === 'string') {
                                    console.log("🛠️ Parsing string arguments:", event.item.arguments);
                                    args = JSON.parse(event.item.arguments);
                                } else {
                                    console.log("🛠️ Using object arguments directly");
                                    args = event.item.arguments;
                                }

                                console.log("🛠️ Parsed args:", args);
                                console.log("🛠️ Args keys:", Object.keys(args || {}));

                                // Formatear los datos correctamente
                                const formattedMetadata = {
                                    JsonData: {
                                        jsonType: args.jsonType || "ProductsCollection",
                                        products: args.products || []
                                    },
                                    TextMessage: "Aquí tienes algunos productos que podrían interesarte:"
                                };

                                console.log("🛠️ Sending formatted metadata from event listener:", formattedMetadata);

                                // Ejecutar el callback de metadata directamente
                                if (this.connectionCallbacks.onMetadata) {
                                    this.connectionCallbacks.onMetadata(formattedMetadata);
                                }
                            } catch (error) {
                                console.error("🛠️ Error processing tool arguments:", error);
                                console.error("🛠️ Raw arguments that failed:", event.item.arguments);
                            }
                        }
                    }
                });

                // Conversation item completed (sin parsing de metadata)
                session.addListener('conversation.item.completed', (event: any) => {
                    console.log("✅ CONVERSATION ITEM COMPLETED:", event);

                    // Solo triggear el callback general (mantener compatibilidad)
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

                // Conversation item completed (sin parsing de metadata)
                session.addListener('conversation.item.completed', (event: any) => {
                    console.log("✅ Conversation item completed:", event);

                    // Solo triggear el callback general (mantener compatibilidad)
                    if (this.connectionCallbacks.onMessage) {
                        this.connectionCallbacks.onMessage(event);
                    }
                });

                console.log("📝 Event listeners setup completed WITH TRANSCRIPTION");
            }

            else if (typeof session.on === 'function') {
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

                // 🛠️ TOOL EVENTS CON 'on' METHOD
                session.on('conversation.item.created', (event: any) => {
                    console.log("🛠️ CONVERSATION ITEM CREATED (ON):", event);

                    if (event.item && event.item.type === 'function_call') {
                        console.log("🛠️ Function call item created (ON):", event.item);
                        console.log("🛠️ Function call name (ON):", event.item.name);
                        console.log("🛠️ Function call arguments (ON, raw):", event.item.arguments);

                        if (event.item.name === 'send_product_metadata' && event.item.arguments) {
                            try {
                                let args;
                                if (typeof event.item.arguments === 'string') {
                                    console.log("🛠️ Parsing string arguments (ON):", event.item.arguments);
                                    args = JSON.parse(event.item.arguments);
                                } else {
                                    console.log("🛠️ Using object arguments directly (ON)");
                                    args = event.item.arguments;
                                }

                                console.log("🛠️ Parsed args (ON):", args);

                                // Formatear los datos correctamente
                                const formattedMetadata = {
                                    JsonData: {
                                        jsonType: args.jsonType || "ProductsCollection",
                                        products: args.products || []
                                    },
                                    TextMessage: "Aquí tienes algunos productos que podrían interesarte:"
                                };

                                console.log("🛠️ Sending formatted metadata from ON event listener:", formattedMetadata);

                                // Ejecutar el callback de metadata directamente
                                if (this.connectionCallbacks.onMetadata) {
                                    this.connectionCallbacks.onMetadata(formattedMetadata);
                                }
                            } catch (error) {
                                console.error("🛠️ Error processing tool arguments (ON):", error);
                                console.error("🛠️ Raw arguments that failed (ON):", event.item.arguments);
                            }
                        }
                    }
                });

                console.log("📝 Event listeners setup with 'on' method WITH TRANSCRIPTION AND TOOLS");
            }

            else {
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

    /**
     * Triggers the metadata callback (used by tools)
     * @param metadata - The metadata to send
     */
    triggerMetadataCallback(metadata: any): void {
        if (this.connectionCallbacks.onMetadata) {
            this.connectionCallbacks.onMetadata(metadata);
        }
    }

    /**
     * Static method to interrupt the agent from anywhere in the app
     */
    static interrupt(): void {
        const instance = RealtimeService.getInstance();
        instance.interrupt();
    }
}

export default RealtimeService.getInstance();
