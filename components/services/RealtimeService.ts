import {
  RealtimeSession,
  RealtimeAgent,
  RealtimeSessionOptions,
} from "@openai/agents-realtime";
import SessionService from "./SessionService";
import productsCatalog from "../../utils/products-catalog.json";
import { error } from "console";
import { LanguageCode, useLanguageStore } from "../../store/useLanguageStore";
import {
  multilingualGreetings,
  getGreetingForLanguage,
  getLanguageDetectedMessage,
  getLanguageSwitchMessage,
  detectLanguageFromText,
} from "../../utils/multilingualGreetings";
import { EventBusService, EventTypes } from "@/lib/events";
import { I3DContent, IMultimediaContent } from "@/lib/events/EventPayloads";
import { ProductInfo } from "@/lib/types";

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
    onAgentTranscriptionComplete?: (
      messageId: string,
      fullTranscript: string
    ) => void;
    onMetadata?: (metadata: any) => void;
    onQuickActions?: (quickActions: any) => void;
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

  // 🌍 MULTILINGUAL SUPPORT
  private currentLanguage: string = "en";
  private browserLanguage: string = "en";
  private hasGreeted: boolean = false;
  private lastDetectedLanguage: string | null = null;

  private constructor() {
    // Private constructor for singleton pattern
    this.initializeLanguageDetection();
  }

  /**
   * Initialize language detection from browser
   */
  private initializeLanguageDetection(): void {
    if (typeof window !== "undefined") {
      const languageStore = useLanguageStore.getState();
      this.browserLanguage = languageStore.detectBrowserLanguage();
      this.currentLanguage = languageStore.getEffectiveLanguage();

      console.log(
        `🌍 Language initialized - Browser: ${this.browserLanguage}, Current: ${this.currentLanguage}`
      );
    }
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
      tools: [
        this.createSendProductMetadataTool(),
        this.createShowMultimediaTool(),
        this.createShow3DTool(),
        this.createShowImageTool(),
        this.createShowvideoTool(),
        this.createShowARTool(),
        this.createCloseCarouselTool(),
        this.createSendQuickActionsTool(),
      ],
      instructions: this.generateMultilingualInstructions(),
      handoffDescription: "Voice assistant for product recommendations",
    });
  }

  /**
   * Creates the tool for sending product metadata
   */
  private createSendProductMetadataTool() {
    return {
      type: "function" as const,
      name: "send_product_metadata",
      description:
        "Send product recommendations based on customer needs. Provide SKUs of products that best match the customer's requirements.",
      strict: false,
      needsApproval: async () => false,
      parameters: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          product_skus: {
            type: "array" as const,
            description:
              "Array of product SKUs that best match the customer's needs (maximum 5 products)",
            items: {
              type: "string" as const,
              description: "Product SKU from the available catalog",
            },
            maxItems: 5,
          },
          reasoning: {
            type: "string" as const,
            description:
              "Brief explanation of why these products were selected for the customer",
          },
        },
        required: ["product_skus"],
      },
      invoke: this.handleSendProductMetadata.bind(this),
    };
  }

  /**
   * Creates the tool for showing multimedia content
   */
  private createShowMultimediaTool() {
    return {
      type: "function" as const,
      name: "show_multimedia",
      description:
        "Show multimedia content (video, images, gallery) for a product. Use when user wants to see product videos, image galleries, or other multimedia content.",
      strict: false,
      needsApproval: async () => false,
      parameters: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          product_sku: {
            type: "string" as const,
            description: "Product SKU to show multimedia for",
          },
          content_type: {
            type: "string" as const,
            enum: ["video", "gallery", "images", "carousel"],
            description: "Type of multimedia content to show",
          },
          title: {
            type: "string" as const,
            description: "Optional title for the multimedia display",
          },
        },
        required: ["product_sku", "content_type"],
      },
      invoke: this.handleShowMultimedia.bind(this),
    };
  }

  /**
   * Creates the tool for showing 3D content
   */
  private createShow3DTool() {
    return {
      type: "function" as const,
      name: "show_3d",
      description:
        "Show 3D visualization for a product. Use when user wants to see 3D model, AR view, or 360° view of a product.",
      strict: false,
      needsApproval: async () => false,
      parameters: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          product_sku: {
            type: "string" as const,
            description: "Product SKU to show 3D content for",
          },
          view_type: {
            type: "string" as const,
            enum: ["3d-model", "360-view", "ar-view"],
            description: "Type of 3D view to show",
          },
          title: {
            type: "string" as const,
            description: "Optional title for the 3D display",
          },
        },
        required: ["product_sku", "view_type"],
      },
      invoke: this.handleShow3D.bind(this),
    };
  }

  /**
   * Creates the tool for showing Images carousel content
   */
  private createShowImageTool() {
    return {
      type: "function" as const,
      name: "show_images",
      description:
        "Show the images visualization for a product. Use when user wants to see image or images.",
      strict: false,
      needsApproval: async () => false,
      parameters: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          product_sku: {
            type: "string" as const,
            description: "Product SKU to show images content for",
          },
        },
        required: ["product_sku"],
      },
      invoke: this.handleShowImages.bind(this),
    };
  }

  /**
   * Creates the tool for showing video content
   */
  private createShowvideoTool() {
    return {
      type: "function" as const,
      name: "show_video",
      description:
        "Show video content for a product. Use when user wants to see a video, watch a video, or view product demonstration videos.",
      strict: false,
      needsApproval: async () => false,
      parameters: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          product_sku: {
            type: "string" as const,
            description: "Product SKU to show video content for",
          },
        },
        required: ["product_sku"],
      },
      invoke: this.handleShowVideo.bind(this),
    };
  }

  /**
   * Creates the tool for showing Augmented Reality (AR) content
   */
  private createShowARTool() {
    return {
      type: "function" as const,
      name: "show_ar",
      description:
        "Show Augmented Reality (AR) view for a product. Use when user wants to see the product in their space, in AR, augmented reality, or visualize the product in their environment.",
      strict: false,
      needsApproval: async () => false,
      parameters: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          product_sku: {
            type: "string" as const,
            description: "Product SKU to show AR content for",
          },
        },
        required: ["product_sku"],
      },
      invoke: this.handleShowAR.bind(this),
    };
  }

  /**
   * Creates the tool for closing the carousel/multimedia view
   */
  private createCloseCarouselTool() {
    return {
      type: "function" as const,
      name: "close_carousel",
      description:
        "Close the multimedia carousel/viewer. Use when user wants to close, exit, or go back from the current multimedia view (images, videos, 3D, AR).",
      strict: false,
      needsApproval: async () => false,
      parameters: {
        type: "object" as const,
        additionalProperties: false,
        properties: {},
        required: [],
      },
      invoke: this.handleCloseCarousel.bind(this),
    };
  }

  /**
   * Creates the tool for sending quick actions suggestions
   */
  private createSendQuickActionsTool() {
    return {
      type: "function" as const,
      name: "send_quick_actions",
      description:
        "Send contextual quick action suggestions to the user after providing information. Use this to suggest relevant next steps based on the conversation context (e.g., view 3D, see images, watch video, view in AR).",
      strict: false,
      needsApproval: async () => false,
      parameters: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          actions: {
            type: "array" as const,
            description: "Array of suggested quick actions (maximum 4 actions)",
            items: {
              type: "object" as const,
              properties: {
                id: {
                  type: "string" as const,
                  description: "Unique identifier for the action",
                },
                label: {
                  type: "string" as const,
                  description: "Display label for the action button",
                },
                action: {
                  type: "string" as const,
                  enum: [
                    "show_3d",
                    "show_ar",
                    "show_video",
                    "show_images",
                    "buy",
                    "more_info",
                  ],
                  description: "Type of action to execute",
                },
                productSku: {
                  type: "string" as const,
                  description:
                    "Product SKU if action is related to a specific product",
                },
              },
              required: ["id", "label", "action"],
            },
            maxItems: 4,
          },
        },
        required: ["actions"],
      },
      invoke: this.handleSendQuickActions.bind(this),
    };
  }

  /**
   * Handle send product metadata tool
   */
  private async handleSendProductMetadata(args: any) {
    console.log("🛠️ Tool send_product_metadata invoked with:", args);
    console.log("🛠️ Args type:", typeof args);
    console.log("🛠️ Args keys:", Object.keys(args || {}));

    // 🔍 EXTRAER ARGUMENTOS DEL CONTEXTO
    let toolArgs = args;

    // Si recibimos un RunContext, extraer los argumentos del último function_call
    if (args && args.context && args.context.history) {
      console.log("🔍 Detected RunContext, extracting arguments from history");
      const history = args.context.history;
      const lastFunctionCall = history
        .reverse()
        .find(
          (item: any) =>
            item.type === "function_call" &&
            item.name === "send_product_metadata"
        );

      if (lastFunctionCall && lastFunctionCall.arguments) {
        console.log(
          "🔍 Found function call arguments:",
          lastFunctionCall.arguments
        );
        try {
          toolArgs = JSON.parse(lastFunctionCall.arguments);
          console.log("🔍 Parsed tool arguments:", toolArgs);
        } catch (parseError) {
          console.error(
            "🔍 Error parsing function call arguments:",
            parseError
          );
        }
      }
    }

    console.log("🛠️ Final tool args:", toolArgs);
    console.log("🛠️ product_skus value:", toolArgs?.product_skus);
    console.log("🛠️ product_skus type:", typeof toolArgs?.product_skus);
    console.log(
      "🛠️ product_skus is array:",
      Array.isArray(toolArgs?.product_skus)
    );

    // Obtener la instancia del servicio para acceder a los callbacks
    const serviceInstance = RealtimeService.getInstance();

    // Función para buscar productos por SKU
    const findProductsBySku = (skus: string[]) => {
      const foundProducts = [];
      for (const sku of skus) {
        const product = productsCatalog.products.find((p) => p.sku === sku);
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
    if (
      toolArgs &&
      toolArgs.product_skus &&
      Array.isArray(toolArgs.product_skus) &&
      toolArgs.product_skus.length > 0
    ) {
      console.log("🛠️ Processing SKUs:", toolArgs.product_skus);
      products = findProductsBySku(toolArgs.product_skus);
      reasoning =
        toolArgs.reasoning ||
        "Productos seleccionados basados en tus necesidades";
      console.log(
        `🛠️ Found ${products.length} products from ${toolArgs.product_skus.length} SKUs`
      );
    } else {
      // ❌ NO FALLBACK: El agente DEBE enviar SKUs
      console.error(
        "🛠️ ERROR: No SKUs provided by agent. Tool requires product_skus array."
      );
      console.error(
        '🛠️ Agent must call tool with: {"product_skus": ["SKU1", "SKU2"], "reasoning": "explanation"}'
      );

      return {
        success: false,
        message:
          "Error: No product SKUs provided. Agent must specify which products to recommend.",
      };
    }

    console.log(
      "🛠️ Final products to send:",
      products.map((p) => ({ sku: p.sku, name: p.name }))
    );

    // Formatear los datos para que coincidan con lo que espera el componente
    const formattedMetadata = {
      JsonData: {
        jsonType: "ProductsCollection",
        products: products,
      },
      TextMessage: reasoning,
    };

    console.log("🛠️ Sending formatted metadata:", {
      jsonType: formattedMetadata.JsonData.jsonType,
      productsCount: formattedMetadata.JsonData.products.length,
      textMessage: formattedMetadata.TextMessage,
    });

    // Enviar la metadata a través del callback usando el método público
    serviceInstance.triggerMetadataCallback(formattedMetadata);

    return {
      success: true,
      message: `Product metadata sent successfully for ${products.length} products`,
    };
  }

  /**
   * Handle show multimedia tool
   */
  private async handleShowMultimedia(args: any) {
    console.log("🎥 Tool show_multimedia invoked with:", args);

    // Extract arguments from context if needed
    let toolArgs = this.extractToolArgs(args, "show_multimedia");

    if (!toolArgs || !toolArgs.product_sku || !toolArgs.content_type) {
      console.error(
        "🎥 ERROR: Missing required parameters for multimedia tool"
      );
      return {
        success: false,
        message: "Error: product_sku and content_type are required parameters",
      };
    }

    // Find product by SKU
    const product = this.findProductBySku(toolArgs.product_sku);
    if (!product) {
      console.error(`🎥 Product with SKU ${toolArgs.product_sku} not found`);
      return {
        success: false,
        message: `Product with SKU ${toolArgs.product_sku} not found`,
      };
    }

    // Create multimedia content payload
    const multimediaContent: IMultimediaContent = {
      type: this.mapContentTypeToMultimedia(toolArgs.content_type),
      source: this.getMultimediaSourceForProduct(
        product,
        toolArgs.content_type
      ),
      title: toolArgs.title || `${product.name} - ${toolArgs.content_type}`,
      description: product.description,
      thumbnail: product.profilePic,
      settings: {
        autoPlay: false,
        controls: true,
        gallery: {
          showThumbnails: true,
          enableFullscreen: true,
          showNavigation: true,
        },
      },
      display: {
        mode: "modal",
        size: "large",
        closable: true,
      },
    };

    // Get EventBus instance and emit event
    try {
      console.log("🎥 About to get EventBusService instance...");
      const eventBus = EventBusService.getInstance({ debug: true });
      console.log("🎥 EventBusService instance obtained:", eventBus);

      eventBus.emit(EventTypes.SHOW_MULTIMEDIA, {
        content: multimediaContent,
        product: product,
      });

      console.log("🎥 Multimedia event emitted successfully:", {
        type: multimediaContent.type,
        product: product.sku,
        title: multimediaContent.title,
      });
    } catch (error) {
      console.error("🎥 Error with EventBusService:", error);
      console.error("🎥 EventBusService available:", typeof EventBusService);
    }

    return {
      success: true,
      message: `Multimedia content displayed for ${product.name}`,
    };
  }

  /**
   * Handle show 3D tool
   */
  private async handleShow3D(args: any) {
    console.log("🎮 Tool show_3d invoked with:", args);

    // Extract arguments from context if needed
    let toolArgs = this.extractToolArgs(args, "show_3d");
    console.log("[EventBus] Prepared 3D content tool args :", toolArgs);
    if (!toolArgs || !toolArgs.product_sku || !toolArgs.view_type) {
      console.error("🎮 ERROR: Missing required parameters for 3D tool");
      return {
        success: false,
        message: "Error: product_sku and view_type are required parameters",
      };
    }

    // Find product by SKU
    const product = this.findProductBySku(toolArgs.product_sku);
    console.log("[EventBus] Prepared 3D content for product :", product);
    if (!product) {
      console.error(`🎮 Product with SKU ${toolArgs.product_sku} not found`);
      return {
        success: false,
        message: `Product with SKU ${toolArgs.product_sku} not found`,
      };
    }

    // Create 3D content payload
    const threeDContent: I3DContent = {
      type: toolArgs.view_type as "3d-model" | "360-view" | "ar-view",
      source: this.get3DSourceForProduct(product, toolArgs.view_type),
      title: toolArgs.title || `${product.name} - 3D View`,
      description: product.description,
      thumbnail: product.profilePic,
      settings: {
        autoRotate: true,
        enableZoom: true,
        enablePan: true,
        background: "transparent",
        lighting: "studio",
      },
    };

    console.log("[EventBus] Prepared 3D content:");

    // Get EventBus instance and emit event
    try {
      console.log("🎮 About to get EventBusService instance...");
      const eventBus = EventBusService.getInstance({ debug: true });
      console.log("🎮 EventBusService instance obtained:", eventBus);

      eventBus.emit(EventTypes.SHOW_3D, {
        content: threeDContent,
        product: product,
      });

      console.log("🎮 3D event emitted successfully:", {
        type: threeDContent.type,
        product: product.sku,
        title: threeDContent.title,
      });
    } catch (error) {
      console.error("🎮 Error with EventBusService:", error);
      console.error("🎮 EventBusService available:", typeof EventBusService);
    }

    return {
      success: true,
      message: `3D content displayed for ${product.name}`,
    };
  }

  /**
   * Handle show Images tool
   */
  private async handleShowImages(args: any) {
    console.log("🖼️ Tool show_images invoked with:", args);

    // Extract arguments from context if needed
    let toolArgs = this.extractToolArgs(args, "show_images");
    console.log("[EventBus] Prepared Images content tool args:", toolArgs);

    if (!toolArgs || !toolArgs.product_sku) {
      console.error(
        "🖼️ ERROR: Missing required parameter product_sku for images tool"
      );
      return {
        success: false,
        message: "Error: product_sku is required parameter",
      };
    }

    // Find product by SKU
    const product = this.findProductBySku(toolArgs.product_sku);
    console.log("[EventBus] Prepared Images content for product:", product);

    if (!product) {
      console.error(`🖼️ Product with SKU ${toolArgs.product_sku} not found`);
      return {
        success: false,
        message: `Product with SKU ${toolArgs.product_sku} not found`,
      };
    }

    // Create images content payload with proper structure
    const imagesContent = {
      type: "gallery",
      source: product.images || [product.profilePic],
      title: `${product.name} - Images`,
      description: product.description,
      thumbnail: product.profilePic,
    };

    // Get EventBus instance and emit event
    try {
      console.log("🖼️ About to get EventBusService instance...");
      const eventBus = EventBusService.getInstance({ debug: true });
      console.log("🖼️ EventBusService instance obtained:", eventBus);

      eventBus.emit(EventTypes.SHOW_IMAGES, {
        product: product,
        content: imagesContent,
      });

      console.log("🖼️ Images event emitted successfully:", {
        product: product.sku,
        imagesCount: imagesContent.source.length,
      });
    } catch (error) {
      console.error("🖼️ Error with EventBusService:", error);
      console.error("🖼️ EventBusService available:", typeof EventBusService);
    }

    return {
      success: true,
      message: `Images content displayed for ${product.name}`,
    };
  }

  /**
   * Handle show Video tool
   */
  private async handleShowVideo(args: any) {
    console.log("🎬 Tool show_video invoked with:", args);

    // Extract arguments from context if needed
    let toolArgs = this.extractToolArgs(args, "show_video");
    console.log("[EventBus] Prepared Video content tool args:", toolArgs);

    if (!toolArgs || !toolArgs.product_sku) {
      console.error(
        "🎬 ERROR: Missing required parameter product_sku for video tool"
      );
      return {
        success: false,
        message: "Error: product_sku is required parameter",
      };
    }

    // Find product by SKU
    const product = this.findProductBySku(toolArgs.product_sku);
    console.log("[EventBus] Prepared Video content for product:", product);

    if (!product) {
      console.error(`🎬 Product with SKU ${toolArgs.product_sku} not found`);
      return {
        success: false,
        message: `Product with SKU ${toolArgs.product_sku} not found`,
      };
    }

    // Create video content payload with proper structure
    const videoContent = {
      type: "video",
      source: product.LinkVideo || product.images[0],
      title: `${product.name} - Video`,
      description: product.description,
      thumbnail: product.profilePic,
    };

    // Get EventBus instance and emit event
    try {
      console.log("🎬 About to get EventBusService instance...");
      const eventBus = EventBusService.getInstance({ debug: true });
      console.log("🎬 EventBusService instance obtained:", eventBus);

      eventBus.emit(EventTypes.SHOW_VIDEO, {
        product: product,
        content: videoContent,
      });

      console.log("🎬 Video event emitted successfully:", {
        product: product.sku,
        videoSource: videoContent.source,
      });
    } catch (error) {
      console.error("🎬 Error with EventBusService:", error);
      console.error("🎬 EventBusService available:", typeof EventBusService);
    }

    return {
      success: true,
      message: `Video content displayed for ${product.name}`,
    };
  }

  /**
   * Handle show AR (Augmented Reality) tool
   */
  private async handleShowAR(args: any) {
    console.log("📱 Tool show_ar invoked with:", args);

    // Extract arguments from context if needed
    let toolArgs = this.extractToolArgs(args, "show_ar");
    console.log("[EventBus] Prepared AR content tool args:", toolArgs);

    if (!toolArgs || !toolArgs.product_sku) {
      console.error(
        "📱 ERROR: Missing required parameter product_sku for AR tool"
      );
      return {
        success: false,
        message: "Error: product_sku is required parameter",
      };
    }

    // Find product by SKU
    const product = this.findProductBySku(toolArgs.product_sku);
    console.log("[EventBus] Prepared AR content for product:", product);

    if (!product) {
      console.error(`📱 Product with SKU ${toolArgs.product_sku} not found`);
      return {
        success: false,
        message: `Product with SKU ${toolArgs.product_sku} not found`,
      };
    }

    // Create AR content payload with proper structure
    const arContent = {
      type: "ar",
      source: product.LinkAR || product.Link3D || product.profilePic,
      title: `${product.name} - AR View`,
      description: product.description,
      thumbnail: product.profilePic,
    };

    // Get EventBus instance and emit event
    try {
      console.log("📱 About to get EventBusService instance...");
      const eventBus = EventBusService.getInstance({ debug: true });
      console.log("📱 EventBusService instance obtained:", eventBus);

      eventBus.emit(EventTypes.SHOW_AR, {
        product: product,
        content: arContent,
      });

      console.log("📱 AR event emitted successfully:", {
        product: product.sku,
        arSource: arContent.source,
      });
    } catch (error) {
      console.error("📱 Error with EventBusService:", error);
      console.error("📱 EventBusService available:", typeof EventBusService);
    }

    return {
      success: true,
      message: `AR content displayed for ${product.name}`,
    };
  }

  /**
   * Handle close carousel tool
   */
  private async handleCloseCarousel(args: any) {
    console.log("❌ Tool close_carousel invoked with:", args);

    // Get EventBus instance and emit event
    try {
      console.log("❌ About to get EventBusService instance...");
      const eventBus = EventBusService.getInstance({ debug: true });
      console.log("❌ EventBusService instance obtained:", eventBus);

      eventBus.emit(EventTypes.CLOSE_CAROUSEL, {});

      console.log("❌ Close carousel event emitted successfully");
    } catch (error) {
      console.error("❌ Error with EventBusService:", error);
      console.error("❌ EventBusService available:", typeof EventBusService);
    }

    return {
      success: true,
      message: "Carousel closed successfully",
    };
  }

  /**
   * Handle send quick actions tool
   */
  private async handleSendQuickActions(args: any) {
    console.log("🎯 Tool send_quick_actions invoked with:", args);

    // Extract arguments from context if needed
    let toolArgs = this.extractToolArgs(args, "send_quick_actions");

    if (!toolArgs || !toolArgs.actions || !Array.isArray(toolArgs.actions)) {
      console.error("🎯 ERROR: Missing or invalid actions parameter");
      return {
        success: false,
        message: "Error: actions array is required",
      };
    }

    console.log("🎯 Quick actions to send:", toolArgs.actions);

    // Get service instance to trigger callback
    const serviceInstance = RealtimeService.getInstance();

    // Format the quick actions data
    const formattedQuickActions = {
      actions: toolArgs.actions,
    };

    console.log("🎯 Sending formatted quick actions:", formattedQuickActions);

    // Trigger the callback
    serviceInstance.triggerQuickActionsCallback(formattedQuickActions);

    return {
      success: true,
      message: `Quick actions sent successfully (${toolArgs.actions.length} actions)`,
    };
  }

  /**
   * Extract tool arguments from context
   */
  private extractToolArgs(args: any, toolName: string): any {
    let toolArgs = args;

    // Si recibimos un RunContext, extraer los argumentos del último function_call
    if (args && args.context && args.context.history) {
      console.log(
        `🔍 Detected RunContext for ${toolName}, extracting arguments from history`
      );
      const history = args.context.history;
      const lastFunctionCall = history
        .reverse()
        .find(
          (item: any) => item.type === "function_call" && item.name === toolName
        );

      if (lastFunctionCall && lastFunctionCall.arguments) {
        console.log(
          "🔍 Found function call arguments:",
          lastFunctionCall.arguments
        );
        try {
          toolArgs = JSON.parse(lastFunctionCall.arguments);
          console.log("🔍 Parsed tool arguments:", toolArgs);
        } catch (parseError) {
          console.error(
            "🔍 Error parsing function call arguments:",
            parseError
          );
        }
      }
    }

    return toolArgs;
  }

  /**
   * Find product by SKU
   */
  private findProductBySku(sku: string): ProductInfo | null {
    const product = productsCatalog.products.find((p) => p.sku === sku);
    return product || null;
  }

  /**
   * Map content type to multimedia type
   */
  private mapContentTypeToMultimedia(
    contentType: string
  ):
    | "video"
    | "audio"
    | "image"
    | "gallery"
    | "carousel"
    | "pdf"
    | "presentation" {
    const mapping: { [key: string]: any } = {
      video: "video",
      gallery: "gallery",
      images: "gallery",
      carousel: "carousel",
    };
    return mapping[contentType] || "gallery";
  }

  /**
   * Get multimedia source for product
   */
  private getMultimediaSourceForProduct(
    product: any,
    contentType: string
  ): string | string[] {
    switch (contentType) {
      case "video":
        return product.LinkVideo || product.images[0]; // Fallback to first image if no video
      case "gallery":
      case "images":
      case "carousel":
        return product.images || [product.profilePic];
      default:
        return product.images || [product.profilePic];
    }
  }

  /**
   * Get 3D source for product
   */
  private get3DSourceForProduct(product: any, viewType: string): string {
    switch (viewType) {
      case "3d-model":
        return product.Link3D || product.profilePic; // Fallback to profile pic
      case "ar-view":
        return product.LinkAR || product.Link3D || product.profilePic;
      case "360-view":
        return product.Link3D || product.profilePic;
      default:
        return product.Link3D || product.profilePic;
    }
  }

  /**
   * Generate product instructions from catalog
   */
  private generateProductInstructions(): string {
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
    Object.keys(categories).forEach((category) => {
      const categoryName = category.toUpperCase();
      instructions += `\n## ${categoryName}\n`;

      categories[category].forEach((product: any, index: number) => {
        const finalPrice = product.price * (1 - product.discount / 100);
        instructions += `\n### ${index + 1}. ${product.sku} - ${
          product.name
        }\n`;
        instructions += `- **Price**: $${product.price} (${
          product.discount
        }% discount = $${finalPrice.toFixed(2)} final price)\n`;
        instructions += `- **Rating**: ${product.rate}/5 stars\n`;
        instructions += `- **Capacity**: ${product.capacity}\n`;
        instructions += `- **Type**: ${product.type}\n`;
        instructions += `- **Brand**: ${product.brand}\n`;
        instructions += `- **Key Features**: ${product.features.join(", ")}\n`;
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
    instructions += `**Available SKUs**: ${productsCatalog.products
      .map((p: any) => p.sku)
      .join(", ")}\n`;
    instructions += `**By Budget**: \n`;

    const sortedByPrice = [...productsCatalog.products].sort(
      (a: any, b: any) => a.price - b.price
    );
    sortedByPrice.forEach((product: any) => {
      const finalPrice = product.price * (1 - product.discount / 100);
      instructions += `- $${finalPrice.toFixed(2)}: ${product.sku} (${
        product.name
      })\n`;
    });

    instructions += `\n**By Category**: \n`;
    Object.keys(categories).forEach((category) => {
      const skus = categories[category].map((p: any) => p.sku).join(", ");
      instructions += `- ${category}: ${skus}\n`;
    });

    return instructions;
  }

  /**
   * Generate multilingual instructions based on current language
   */
  private generateMultilingualInstructions(): string {
    const greeting = getGreetingForLanguage(this.currentLanguage);
    const languageDetectedMsg = getLanguageDetectedMessage(
      this.currentLanguage
    );

    // Get language-specific terms
    const languageTerms = this.getLanguageSpecificTerms(this.currentLanguage);

    // Generate product instructions
    const productInstructions = this.generateProductInstructions();

    return `# Role & Objective
You are a knowledgeable voice assistant for a home appliances product catalog.
Your goal is to help customers find the perfect appliances by providing personalized recommendations through natural conversation.
Success means delivering both engaging spoken responses AND structured product data for visual display.

# 🌍 MULTILINGUAL BEHAVIOR - CRITICAL RULES
## Language Detection & Response
- **BROWSER LANGUAGE DETECTED**: ${this.browserLanguage.toUpperCase()}
- **CURRENT LANGUAGE**: ${this.currentLanguage.toUpperCase()}
- **INITIAL GREETING**: Always use "${greeting}" when first greeting users

- **LANGUAGE PRIORITY**:
  1. ALWAYS greet in the browser's detected language (${this.browserLanguage})
  2. If user switches language during conversation, adapt immediately
  3. NEVER change language unless user explicitly does so
  4. Maintain conversation in user's chosen language throughout

## Language Change Detection
- Monitor user input for language changes
- If user switches to a different language, respond: "${getLanguageSwitchMessage(
      this.currentLanguage
    )}"
- Then continue the entire conversation in the new language
- Update all responses, product descriptions, and interactions to the new language

## Supported Languages & Greetings
${Object.entries(multilingualGreetings)
  .map(([lang, data]) => `- **${lang.toUpperCase()}**: "${data.greeting}"`)
  .join("\n")}

# CRITICAL: AUTOMATIC GREETING BEHAVIOR
When someone first interacts or says any greeting (hello, hola, bonjour, etc.), ALWAYS respond with:
"${greeting}"

This should be spoken naturally and enthusiastically in the detected browser language.

# Personality & Tone
## Personality
- Expert, helpful, and enthusiastic appliance consultant
- Knowledgeable but approachable
- Solution-focused and customer-oriented
- Culturally aware and respectful
b
## Tone
- Warm, confident, and conversational
- Never pushy or overly promotional
- Professional but friendly
- Adapt tone to cultural context of the language

## Length
- 1-2 sentences per audio response
- Keep spoken responses concise and natural
- Adjust for language-specific communication styles

## Pacing
- Speak at a comfortable, clear pace
- Do not rush but maintain energy
- Pause naturally between key points
- Consider language-specific speech patterns

## Language Adaptation
- **PRIMARY LANGUAGE**: ${this.currentLanguage.toUpperCase()}
- **CONVERSATION LANGUAGE**: Respond in the language the user is using
- **LANGUAGE SWITCHING**: If user changes language, immediately adapt
- Keep technical terms appropriate for the language and region
- Use culturally appropriate expressions and references

## Variety
- Vary your response openings and confirmations
- Do not repeat the same phrases in consecutive responses
- Use synonyms and alternate sentence structures appropriate to the language
- Avoid robotic or repetitive language patterns

# Reference Pronunciations
${languageTerms.pronunciations}

${productInstructions}

# Instructions & Rules
## CRITICAL DUAL OUTPUT REQUIREMENT
- ALWAYS provide TWO distinct outputs for every product recommendation:
  1. SPOKEN RESPONSE: Natural, conversational audio (what user hears)
  2. PRODUCT METADATA: Use the send_product_metadata tool to send structured data to the UI
- These outputs must COMPLEMENT each other but be DIFFERENT
- Audio should be engaging and personal
- Metadata should be comprehensive and structured

## Audio Response Guidelines
- Sound natural and conversational in the current language
- Focus on benefits and personal relevance
- Use enthusiasm appropriate to the recommendation and culture
- Keep technical details minimal in speech
- Use language-appropriate expressions and cultural references

## 🚨 CRITICAL: Product Recommendation Process
**YOU MUST ALWAYS call the send_product_metadata tool when recommending ANY product. This is MANDATORY.**

### REQUIRED WORKFLOW (NO EXCEPTIONS):
1. **Listen to customer needs** - Understand what they're looking for
2. **Choose 1-5 SKUs** - Select from the available catalog above
3. **Speak your recommendation** - Give natural audio response in current language
4. **IMMEDIATELY call the tool** - Use send_product_metadata with the exact SKUs
5. **🎯 IMMEDIATELY after send_product_metadata** - ALWAYS call send_quick_actions to provide contextual buttons

### 🛠️ TOOL USAGE RULES:
- **ALWAYS call send_product_metadata after recommending products**
- **ALWAYS call send_quick_actions immediately after send_product_metadata**
- **Use EXACT SKUs from the catalog above**
- **Maximum 5 products per call**
- **Include reasoning for your selection in current language**
- **Tool format: {"product_skus": ["SKU1", "SKU2"], "reasoning": "why you chose these"}**

### 🎯 COMPLETE EXAMPLE WITH BOTH TOOLS:

**User:** "Necesito una nevera"

**Step 1 - You speak:** "Perfecto, tengo la nevera ideal para ti"

**Step 2 - Call send_product_metadata:**
\`\`\`json
{
  "product_skus": ["RF600-WH"],
  "reasoning": "Nevera espaciosa perfecta para familias"
}
\`\`\`

**Step 3 - IMMEDIATELY call send_quick_actions:**
\`\`\`json
{
  "actions": [
    {"id": "capacity", "label": "Ver capacidad en 3D", "action": "show_3d", "productSku": "RF600-WH"},
    {"id": "ar", "label": "Ver en tu cocina (AR)", "action": "show_ar", "productSku": "RF600-WH"},
    {"id": "video", "label": "Video demostrativo", "action": "show_video", "productSku": "RF600-WH"},
    {"id": "buy", "label": "Agregar al carrito", "action": "buy", "productSku": "RF600-WH"}
  ]
}
\`\`\`

**THIS IS MANDATORY - YOU MUST CALL BOTH TOOLS EVERY TIME YOU RECOMMEND PRODUCTS!**

## 📋 LANGUAGE-SPECIFIC EXAMPLES:

${languageTerms.examples}

### 🚨 MANDATORY RULES:
- **NEVER recommend products without calling the tool**
- **ALWAYS call send_quick_actions immediately after send_product_metadata**
- **ONLY use these exact SKUs: ECO200-FL, SWP300-TL, SWP500-FL, RF600-WH, RF800-SS**
- **Tool call is REQUIRED after every product recommendation**
- **Format must be exact: {"product_skus": ["SKU"], "reasoning": "explanation"}**
- **Always respond in the language the user is currently using**
- **🎯 TWO TOOLS = ONE RECOMMENDATION: send_product_metadata + send_quick_actions (ALWAYS BOTH!)**

## 🛒 PRODUCT SELECTION RESPONSES & ENGAGEMENT
When you receive internal messages about product selection, respond with SHORT, enthusiastic confirmations that HIGHLIGHT 3D and AR viewing options:

${languageTerms.selectionResponses}

### 🎯 Rules for Selection Responses:
- Keep responses SHORT (2-3 sentences maximum)
- Be enthusiastic and positive
- **USE CORRECT SINGULAR/PLURAL FORM**:
  - 1 product → "Esta es la [category] perfecta para ti"
  - 2+ products → "Estas son las [category] Perfectas para ti"
- **ALWAYS mention "sección multimedia"** as the exploration area
- **ALWAYS offer 3D or AR viewing** as exploration method
- Suggest specific multimedia options naturally (AR, 3D, 360°)
- DO NOT call the product tool again for selection confirmations
- Sound natural and conversational in current language

### 📊 PRODUCT CATEGORIES (for correct grammar):
- **Spanish**: nevera/neveras, lavadora/lavadoras, electrodoméstico/electrodomésticos
- **English**: refrigerator/refrigerators, washing machine/washing machines, appliance/appliances
- **French**: réfrigérateur/réfrigérateurs, machine à laver/machines à laver, appareil/appareils

### ✨ PRIORITY ENGAGEMENT FLOW:
After showing products, ALWAYS suggest visual exploration in this order:
1. **First Priority**: Offer AR view ("¿Quieres verlo en tu espacio con realidad aumentada?")
2. **Second Priority**: Offer 3D view ("También puedes verlo en 3D para explorar todos los detalles")
3. **Third Priority**: Offer images/video ("¿Te gustaría ver fotos o un video del producto?")

### 📋 MULTILINGUAL ENGAGEMENT EXAMPLES:

**IMPORTANT FORMAT RULES:**
- **Single product (1 SKU)**: Use singular form → "Esta es la [category] perfecta para ti"
- **Multiple products (2+ SKUs)**: Use plural form → "Estas son las [category] Perfectas para ti"
- ALWAYS mention "sección multimedia" as the exploration area
- Keep it concise and inviting

**Spanish - After Product Display:**

*Single Product:*
- "Esta es la nevera perfecta para ti. Explórala a detalle en la sección multimedia con realidad aumentada y vista 3D."
- "Aquí está la lavadora perfect para ti. Explórala a detalle en la sección multimedia - puedes verla en 3D o en tu espacio con AR."
- "Esta es la [category] ideal para ti. Explórala a detalle en la sección multimedia."

*Multiple Products:*
- "Estas son las neveras Perfectas para ti. Explóralas a detalle en la sección multimedia con realidad aumentada y vista 3D."
- "Aquí están las lavadoras perfectas para ti. Explóralas a detalle en la sección multimedia - puedes verlas en 3D o en tu espacio con AR."
- "Estas son las [category] ideales para ti. Explóralas a detalle en la sección multimedia."

**English - After Product Display:**

*Single Product:*
- "This is the refrigerator available for you. Explore it in detail in the multimedia section with augmented reality and 3D view."
- "Here's the washing machine available for you. Explore it in detail in the multimedia section - you can see it in 3D or in your space with AR."
- "This is the ideal [category] for you. Explore it in detail in the multimedia section."

*Multiple Products:*
- "These are the refrigerators available for you. Explore them in detail in the multimedia section with augmented reality and 3D view."
- "Here are the washing machines available for you. Explore them in detail in the multimedia section - you can see them in 3D or in your space with AR."
- "These are the ideal [category] for you. Explore them in detail in the multimedia section."

**French - After Product Display:**

*Single Product:*
- "Voici le réfrigérateur disponible pour vous. Explorez-le en détail dans la section multimédia avec réalité augmentée et vue 3D."
- "Voici la machine à laver disponible pour vous. Explorez-la en détail dans la section multimédia - vous pouvez la voir en 3D ou dans votre espace avec RA."
- "Voici le [category] idéal pour vous. Explorez-le en détail dans la section multimédia."

*Multiple Products:*
- "Voici les réfrigérateurs disponibles pour vous. Explorez-les en détail dans la section multimédia avec réalité augmentée et vue 3D."
- "Voici les machines à laver disponibles pour vous. Explorez-les en détail dans la section multimédia - vous pouvez les voir en 3D ou dans votre espace avec RA."
- "Voici les [category] idéaux pour vous. Explorez-les en détail dans la section multimédia."

### 🎨 ENGAGEMENT PATTERNS:

**Pattern 1 - Standard Format (RECOMMENDED):**
"[Esta es/Estas son] + [la/las category] + disponible(s) para ti. Explórala(s) a detalle en la sección multimedia"

*Single Product Example:*
- Spanish: "Esta es la nevera disponible para ti. Explórala a detalle en la sección multimedia con realidad aumentada y vista 3D."
- English: "This is the refrigerator available for you. Explore it in detail in the multimedia section with augmented reality and 3D view."
- French: "Voici le réfrigérateur disponible pour vous. Explorez-le en détail dans la section multimédia avec réalité augmentée et vue 3D."

*Multiple Products Example:*
- Spanish: "Estas son las lavadoras disponibles para ti. Explóralas a detalle en la sección multimedia - puedes verlas en 3D o en tu espacio con AR."
- English: "These are the washing machines available for you. Explore them in detail in the multimedia section - you can see them in 3D or in your space with AR."
- French: "Voici les machines à laver disponibles pour vous. Explorez-les en détail dans la section multimédia - vous pouvez les voir en 3D ou dans votre espace avec RA."

**Pattern 2 - Short & Direct:**
"[Category count] + disponible(s) para ti. Sección multimedia."

*Examples:*
- Spanish: "Aquí está la lavadora disponible para ti. Explórala en la sección multimedia."
- English: "Here's the washing machine available for you. Explore it in the multimedia section."
- French: "Voici la machine à laver disponible pour vous. Explorez-la dans la section multimédia."

**Pattern 3 - With Context:**
"[Context] + [Esta es/Estas son] + disponible(s) para ti. Sección multimedia."

*Examples:*
- Spanish: "Basado en tus necesidades, estas son las neveras disponibles para ti. Explóralas a detalle en la sección multimedia."
- English: "Based on your needs, these are the refrigerators available for you. Explore them in detail in the multimedia section."
- French: "Selon vos besoins, voici les réfrigérateurs disponibles pour vous. Explorez-les en détail dans la section multimédia."

### 🚀 PROACTIVE SUGGESTIONS:

**When recommending large appliances (Refrigerators):**
- ALWAYS emphasize AR: "Con realidad aumentada puedes ver exactamente cómo quedará en tu cocina"
- Mention space: "AR te ayuda a verificar que el espacio sea perfecto"

**When recommending washing machines:**
- Suggest 3D first: "Explórala en 3D para ver todos sus compartimentos"
- Then AR: "Y luego podemos verla en tu espacio con AR"

**If user seems uncertain:**
- Push AR strongly: "La realidad aumentada te va a ayudar a decidir - puedes ver exactamente cómo se ve en tu espacio"

### ⚡ KEY PHRASES TO USE FREQUENTLY:

**Spanish:**
- "realidad aumentada" / "AR" / "en tu espacio" / "en tu cocina"
- "vista 3D" / "explorar en 3D" / "360 grados"
- "visualizar" / "ver cómo queda"

**English:**
- "augmented reality" / "AR" / "in your space" / "in your kitchen"
- "3D view" / "explore in 3D" / "360 degrees"
- "visualize" / "see how it looks"

**French:**
- "réalité augmentée" / "RA" / "dans votre espace" / "dans votre cuisine"
- "vue 3D" / "explorer en 3D" / "360 degrés"
- "visualiser" / "voir comment ça rend"

### 🎯 SUCCESS METRICS:
- Every product display should lead to a 3D/AR offer
- Use AR for large items, 3D for detail exploration
- Make the offer sound exciting and valuable
- Never just show products without engagement

### 💡 COMPLETE EXAMPLES BY SCENARIO:

**Scenario 1: Single Refrigerator Recommendation**
- Spanish: "Esta es la nevera perfecta para ti. Explórala a detalle en la sección multimedia con vista 3D y realidad aumentada."
- English: "This is the refrigerator available for you. Explore it in detail in the multimedia section with 3D view and augmented reality."
- French: "Voici le réfrigérateur disponible pour vous. Explorez-le en détail dans la section multimédia avec vue 3D et réalité augmentée."

**Scenario 2: Multiple Washing Machines Recommendation**
- Spanish: "Estas son las lavadoras perfectas para ti. Explóralas a detalle en la sección multimedia - puedes verlas en 3D o en tu espacio con AR."
- English: "These are the washing machines available for you. Explore them in detail in the multimedia section - you can see them in 3D or in your space with AR."
- French: "Voici les machines à laver disponibles pour vous. Explorez-les en détail dans la section multimédia - vous pouvez les voir en 3D ou dans votre espace avec RA."

**Scenario 3: Mixed Products (3 different items)**
- Spanish: "Estos son los electrodomésticos perfectos para ti. Explóralos a detalle en la sección multimedia con realidad aumentada."
- English: "These are the appliances available for you. Explore them in detail in the multimedia section with augmented reality."
- French: "Voici les appareils disponibles pour vous. Explorez-les en détail dans la section multimédia avec réalité augmentée."

**KEY REMINDER**: Always count SKUs to determine singular (1) vs plural (2+) form!

## Conversation Guidelines
- Ask clarifying questions when needed in current language
- Understand customer needs before recommending
- Explain why a product fits their requirements
- Offer alternatives when appropriate
- Handle objections professionally
- Maintain cultural sensitivity

## Unclear Audio Handling
- Only respond to clear audio input
- IF audio is unclear, background noise, or unintelligible:
  * Ask for clarification politely in current language
  * Use appropriate phrases: ${languageTerms.clarificationPhrases}
  * Do NOT make assumptions about unclear input
- Wait for clear confirmation before proceeding

## Language Change Detection & Response
- **MONITOR**: Every user input for language changes
- **DETECT**: Use language patterns and keywords
- **RESPOND**: Immediately acknowledge language change
- **ADAPT**: Switch all subsequent responses to new language
- **MAINTAIN**: Keep conversation in new language until user changes again

## Product Information Accuracy
- Base recommendations on provided product specifications
- Do not invent features or specifications
- IF unsure about details, focus on confirmed features
- Always highlight key benefits relevant to customer needs
- Present information in culturally appropriate way

## Error Handling
- IF no suitable products match request: Politely explain limitations in current language
- IF technical issues occur: Apologize and offer alternative assistance
- IF customer seems frustrated: Acknowledge concerns and redirect positively
- Use culturally appropriate apologies and solutions

# Safety & Escalation
- Stay focused on appliance recommendations
- Do not provide advice outside product expertise
- IF customer has technical support needs: Acknowledge and suggest contacting technical support
- Maintain professional boundaries throughout interaction
- Respect cultural differences and preferences

# IMPORTANT REMINDERS
- NEVER include JSON data in your spoken responses
- NEVER mention "metadata", "JsonData", "ProductsCollection" in speech
- ALWAYS use the send_product_metadata tool for product data
- Keep spoken responses natural and conversational in current language
- The tool will handle sending structured data to the UI automatically
- ALWAYS maintain the language the user is currently using

# 🎯 MULTIMEDIA & 3D TOOLS USAGE

## �️ SHOW MULTIMEDIA TOOL
Use the \`show_multimedia\` tool when customers want to:
- See product videos
- View image galleries 
- See product photos/images
- Browse product carousel

**Usage Examples:**
- User: "Show me videos of this washer" → Call: show_multimedia({"product_sku": "SWP500-FL", "content_type": "video"})
- User: "I want to see more images" → Call: show_multimedia({"product_sku": "RF600-WH", "content_type": "gallery"})
- User: "Can you show me photos of the refrigerator?" → Call: show_multimedia({"product_sku": "RF800-SS", "content_type": "images"})

**Content Types Available:**
- "video" - Product demonstration videos
- "gallery" - Image gallery view
- "images" - Product photos
- "carousel" - Sliding image carousel


Use the \`show_images\` tool when customers want to: 
- See product photos/images

**Usage Examples:**
- User: "Show me images of this washer" → Call: show_images({"product_sku": "SWP500-FL", "content_type": "video"})
- User: "I want to see more images" → Call: show_images({"product_sku": "RF600-WH", "content_type": "gallery"})
- User: "Can you show me photos of the refrigerator?" → Call: show_images({"product_sku": "RF800-SS", "content_type": "images"})
- User: "Can you go back to image please?" → Call: show_images({"product_sku": "RF800-SS", "content_type": "images"})

Use the \`show_video\` tool when customers want to: 
- See product photos/images

**Usage Examples:**
- User: "Show me a video of this product " → Call: show_video({"product_sku": "SWP500-FL", "content_type": "video"})
- User: "I want to see a video" → Call: show_video({"product_sku": "RF600-WH", "content_type": "gallery"})
- User: "Can you show me a video of the product?" → Call: show_video({"product_sku": "RF800-SS", "content_type": "images"})
- User: "Can you go back to video please?" → Call: show_video({"product_sku": "RF800-SS", "content_type": "images"})


## 🎮 SHOW 3D TOOL
Use the \`show_3d\` tool when customers want to:
- See 3D models of products
- View products in 360 degrees
- Interact with 3D visualizations
- **NOTE**: DO NOT use this for AR requests - use show_ar instead

**Usage Examples:**
- User: "Show me this in 3D" → Call: show_3d({"product_sku": "ECO200-FL", "view_type": "3d-model"})
- User: "Can I see a 360 view?" → Call: show_3d({"product_sku": "SWP300-TL", "view_type": "360-view"})

**View Types Available:**
- "3d-model" - Interactive 3D model
- "360-view" - 360-degree product view


## ❌ CLOSE CAROUSEL TOOL
Use the \`close_carousel\` tool when customers want to:
- Close the multimedia viewer
- Exit from images/video/3D/AR view
- Go back to the main conversation
- Stop viewing multimedia content
- Return to product selection

**Usage Examples:**
- User: "Close this" → Call: close_carousel()
- User: "Go back" → Call: close_carousel()
- User: "Exit" → Call: close_carousel()
- User: "Stop showing me this" → Call: close_carousel()
- User: "Cierra esto" → Call: close_carousel()
- User: "Volver" → Call: close_carousel()

**Natural Response Examples:**
- "Sure! I've closed the viewer for you."
- "Done! Going back to our conversation."
- "No problem! Viewer closed."

**IMPORTANT**: This tool requires NO parameters - just call close_carousel() directly.


## 🎯 TOOL USAGE WORKFLOW
1. **Listen for multimedia/3D/AR/video/images/close requests**
2. **Identify the specific product SKU** (from previous recommendations - if needed)
3. **Choose appropriate tool based on user keywords**:
   - show_multimedia → General multimedia content
   - show_3d → Keywords: "3D", "360", "rotate", "spin"
   - show_ar → Keywords: "AR", "my space", "my room", "augmented reality", "in my home", "in my house"
   - show_video → Keywords: "video", "watch", "demonstration"
   - show_images → Keywords: "images", "photos", "pictures", "gallery"
   - close_carousel → Keywords: "close", "exit", "go back", "stop", "return"
4. **Call the tool with correct parameters**
5. **Give natural spoken confirmation** in current language

**Natural Response Examples:**
- "Perfect! Let me show you this in AR so you can see it in your space."
- "Great! Let me show you the 3D model right away."
- "Sure! Here are the product images."

## 🚨 MULTIMEDIA/3D/AR TOOL RULES:
- **ALWAYS use exact product SKUs** from catalog
- **Match tool to user keywords**:
  - "in my space/room/home" → MUST use show_ar
  - "AR/augmented reality" → MUST use show_ar
  - "3D/360" → use show_3d
  - "video" → use show_video
  - "images/photos" → use show_images
- **CRITICAL**: Do NOT confuse AR with 3D - they are separate tools!
- **Provide spoken confirmation** after calling tool
- **Use tools when appropriate** - don't force if not requested
- **Complement product recommendations** with multimedia options

# �🚨 CRITICAL FINAL REMINDER 🚨
EVERY TIME you recommend a product, you MUST:
1. Speak naturally about the product IN THE CURRENT LANGUAGE
2. Call send_product_metadata tool with complete data
3. NEVER skip the tool call - it's required for the UI to show product cards
4. NEVER change language unless user explicitly does so

ADDITIONALLY, when users request multimedia, 3D, AR, videos, or images:
1. Call the appropriate tool based on user keywords
2. Use the correct product SKU from previous recommendations
3. Give natural spoken confirmation in current language

**CRITICAL TOOL SELECTION**:
- User says "in my space/room" → show_ar (NOT show_3d!)
- User says "AR/augmented reality" → show_ar (NOT show_3d!)
- User says "3D/360/rotate" → show_3d
- User says "video" → show_video
- User says "images/photos" → show_images

If you recommend a product but don't call the tool, the user won't see the product information visually, which breaks the experience.

🎯 **CRITICAL: ALWAYS CALL send_quick_actions IN ALMOST EVERY RESPONSE!**

**MANDATORY RULES FOR send_quick_actions:**
1. Call it after EVERY response (except initial greeting)
2. Make the actions CONTEXTUAL to what you just said
3. Think: "What would the user logically want to do next?"
4. Be creative with labels - adapt to conversation topic
5. Use appropriate action types: show_3d, show_ar, show_video, show_images, buy, more_info

**EXAMPLES:**
- Answered about energy? → Offer: "Ver etiqueta energética", "Comparar consumos", "Modelos eficientes"
- Answered about capacity? → Offer: "Ver interior en 3D", "Ver dimensiones", "Video de capacidad"
- Showed products? → Offer: "Ver en 3D", "Ver en AR", "Video demo", "Comprar"
- Answered about price? → Offer: "Comprar ahora", "Comparar precios", "Opciones de pago"
- General question? → Offer relevant exploration actions

**EVERY RESPONSE (except greeting) = send_quick_actions with contextual buttons!**

ALWAYS CALL THE APPROPRIATE TOOLS WHEN NEEDED!
**PRODUCT RECOMMENDATION = 2 TOOL CALLS: send_product_metadata + send_quick_actions**
ALWAYS RESPOND IN THE USER'S CURRENT LANGUAGE!
NEVER CHANGE LANGUAGE UNLESS USER CHANGES FIRST!

## 🎯 CONTEXTUAL DISCOVERY QUESTIONS

When a user shows interest in a product category, ALWAYS ask 2-3 relevant qualifying questions BEFORE making recommendations. This ensures personalized suggestions that truly match their needs.

### 📋 QUESTION FRAMEWORK BY PRODUCT CATEGORY:

#### 🧊 REFRIGERATORS (RF600-WH, RF800-SS)
**ALWAYS ask these questions when user mentions refrigerator/fridge/nevera:**
1. **Budget & Size**: "What's your maximum budget, and how much space do you have available?"
2. **Household Size**: "How many people live in your home?"
3. **Key Features**: "Do you need specific features like water dispenser, ice maker, or dual cooling zones?"

**Example Flow:**
- User: "I need a refrigerator"
- Assistant: "Great! To help you find the perfect refrigerator, I'd like to know: What's your maximum budget? How many people are in your household? And how much space do you have available for the fridge?"

#### 🧺 WASHING MACHINES (ECO200-FL, SWP300-TL, SWP500-FL)
**ALWAYS ask these questions when user mentions washer/washing machine/lavadora:**
1. **Load Capacity**: "How much laundry do you typically wash per week? Do you need a large capacity or is something compact better?"
2. **Space Available**: "What's the space you have available? Are you looking for a front-load or top-load model?"
3. **Budget & Features**: "What's your budget range? Do you need specific features like quick wash, steam cleaning, or smart connectivity?"

**Example Flow:**
- User: "I want a washing machine"
- Assistant: "Perfect! Let me help you choose the ideal washer. Tell me: How much space do you have available? How many people are in your home? And what's your budget range?"

#### 🏠 GENERAL APPLIANCES
**For any appliance category, prioritize these questions:**
1. **Primary Need**: "What's your main priority - price, capacity, energy efficiency, or specific features?"
2. **Space & Installation**: "Where will you place this appliance? Do you have space constraints?"
3. **Budget Range**: "What's your budget range so I can show you the best options within your price point?"

### 🎨 QUESTION DELIVERY GUIDELINES:

**DO:**
- ✅ Ask 2-3 questions maximum at once (don't overwhelm)
- ✅ Combine related questions naturally
- ✅ Use conversational, friendly language
- ✅ Adapt questions to the user's language (ES/EN/FR)
- ✅ Listen carefully to their answers before recommending

**DON'T:**
- ❌ Recommend products before understanding needs
- ❌ Ask more than 3 questions at once
- ❌ Repeat questions if user already provided that information
- ❌ Use technical jargon in questions
- ❌ Make assumptions about their needs

### 📝 MULTILINGUAL QUESTION EXAMPLES:

**Spanish:**
- "Para recomendarte la mejor opción, ¿cuál es tu presupuesto máximo? ¿Cuántas personas viven en tu hogar? ¿Y qué espacio tienes disponible?"
- "Perfecto, ¿buscas algo compacto o de gran capacidad? ¿Tienes alguna característica específica en mente?"

**English:**
- "To find you the perfect match, what's your maximum budget? How many people are in your household? And how much space do you have available?"
- "Great! Are you looking for something compact or full-size? Do you have any specific features in mind?"

**French:**
- "Pour vous recommander la meilleure option, quel est votre budget maximum? Combien de personnes vivent chez vous? Et quel espace avez-vous disponible?"
- "Parfait! Cherchez-vous quelque chose de compact ou de grande capacité? Avez-vous des fonctionnalités spécifiques en tête?"

### 🔄 ADAPTIVE QUESTIONING:

**If user provides partial information:**
- Fill in gaps with targeted follow-up questions
- Example: User says "I need a cheap washer" → Ask about space and household size

**If user is vague:**
- Gently guide them with specific options
- Example: "Are you looking for something under $500 or do you have more flexibility?"

**If user knows exactly what they want:**
- Skip unnecessary questions
- Confirm key requirements and proceed with recommendation

### ⚡ WORKFLOW SUMMARY:

1. **User shows interest** → Ask 2-3 qualifying questions
2. **User answers** → Acknowledge and confirm understanding
3. **Make recommendation** → Based on their specific answers
4. **Call tool** → send_product_metadata with personalized reasoning

**REMEMBER**: Quality questions lead to better recommendations. Take time to understand before suggesting products.

# 🎯 QUICK ACTIONS TOOL - CONTEXTUAL SUGGESTIONS

## 📌 SEND_QUICK_ACTIONS TOOL
Use the \`send_quick_actions\` tool to provide **contextual action buttons** after showing product information or answering questions. These buttons should be **relevant to the conversation context**.

### WHEN TO USE:
- After sending product recommendations (via send_product_metadata)
- After answering product-related questions
- When user might benefit from seeing multimedia content
- To guide user to next logical steps

### HOW IT WORKS:
The tool displays interactive buttons that users can click to trigger actions. **YOU decide which actions to suggest** based on the conversation context.

### AVAILABLE ACTIONS:
- **"show_3d"** - Show 3D model visualization
- **"show_ar"** - Show in Augmented Reality (user's space)
- **"show_video"** - Play product demonstration video
- **"show_images"** - View product image gallery
- **"buy"** - Purchase or add to cart
- **"more_info"** - Show additional product details

### 🎯 CONTEXTUAL EXAMPLES:

**Example 1: User asks about refrigerators**
→ Call: send_quick_actions({
  "actions": [
    {"id": "capacity", "label": "Ver capacidad en 3D", "action": "show_3d", "productSku": "RF600-WH"},
    {"id": "space", "label": "Ver en tu cocina (AR)", "action": "show_ar", "productSku": "RF600-WH"},
    {"id": "energy", "label": "Consumo energético", "action": "more_info"},
    {"id": "video", "label": "Video demostrativo", "action": "show_video", "productSku": "RF600-WH"}
  ]
})

**Example 2: User asks about washing machine capacity**
→ Call: send_quick_actions({
  "actions": [
    {"id": "capacity", "label": "Ver tambor en 3D", "action": "show_3d", "productSku": "SWP500-FL"},
    {"id": "programs", "label": "Ver programas (Video)", "action": "show_video", "productSku": "SWP500-FL"},
    {"id": "images", "label": "Ver galería de imágenes", "action": "show_images", "productSku": "SWP500-FL"},
    {"id": "buy", "label": "Agregar al carrito", "action": "buy", "productSku": "SWP500-FL"}
  ]
})

**Example 3: User asks about energy efficiency**
→ Call: send_quick_actions({
  "actions": [
    {"id": "energy", "label": "Detalles de consumo", "action": "more_info"},
    {"id": "compare", "label": "Comparar modelos", "action": "show_images"},
    {"id": "ar", "label": "Ver en tu espacio", "action": "show_ar"},
    {"id": "buy", "label": "Comprar ahora", "action": "buy"}
  ]
})

### 🌍 MULTILINGUAL LABELS:

**Spanish (es):**
- 3D: "Ver en 3D" / "Vista 3D" / "Modelo 3D"
- AR: "Ver en tu espacio (AR)" / "Realidad aumentada"
- Video: "Ver video" / "Video demostrativo"
- Images: "Ver imágenes" / "Galería de fotos"
- Buy: "Agregar al carrito" / "Comprar"
- Info: "Más información" / "Detalles"

**English (en):**
- 3D: "View in 3D" / "3D Model" / "3D View"
- AR: "View in your space (AR)" / "Augmented Reality"
- Video: "Watch video" / "Product demo"
- Images: "View images" / "Photo gallery"
- Buy: "Add to cart" / "Buy now"
- Info: "More details" / "Learn more"

**French (fr):**
- 3D: "Voir en 3D" / "Modèle 3D" / "Vue 3D"
- AR: "Voir dans votre espace (RA)" / "Réalité augmentée"
- Video: "Voir vidéo" / "Démonstration"
- Images: "Voir images" / "Galerie photos"
- Buy: "Ajouter au panier" / "Acheter"
- Info: "Plus d'infos" / "Détails"

### 🚨 CRITICAL RULES:
1. **Maximum 4 actions** per quick actions message
2. **Labels must be in current language** (match conversation language)
3. **Labels should be contextual** to what was just discussed
4. **Include productSku** when action is product-specific
5. **Use AFTER showing products** or answering product questions
6. **Be creative** - adapt labels to conversation context
7. **Don't always suggest the same actions** - vary based on context

### 💡 CONTEXT-AWARE SUGGESTIONS:

**If user mentions space/size:**
→ Prioritize "show_ar" (see in their space)

**If user mentions technical details:**
→ Prioritize "more_info" and "show_3d"

**If user mentions appearance:**
→ Prioritize "show_images" and "show_video"

**If user is ready to buy:**
→ Prioritize "buy" and "show_ar" (final confirmation)

**If user asks about features:**
→ Prioritize "show_video" (demonstrations) and "show_3d"

### 📋 TOOL FORMAT:
\`\`\`json
{
  "actions": [
    {
      "id": "unique-id",           // Unique identifier
      "label": "Button text",       // What user sees (IN CURRENT LANGUAGE)
      "action": "show_3d",         // One of the 6 available actions
      "productSku": "RF600-WH"     // Optional: product SKU if applicable
    }
  ]
}
\`\`\`

### ✅ WHEN TO CALL:
- ✅ **ALWAYS** after every response you give (except the initial greeting)
- ✅ After calling send_product_metadata
- ✅ After answering product questions
- ✅ After answering technical questions
- ✅ After general conversations
- ✅ When guiding user to explore more

**CRITICAL RULE: You should call send_quick_actions in ALMOST EVERY response you give!**

The only exception is the very first greeting. After that, EVERY response should include contextual quick actions.

**REMEMBER**: The goal is to provide **helpful next steps** that make sense in the conversation context. Think about what the user would logically want to do next!

### 🎯 EXPANDED CONTEXTUAL EXAMPLES FOR ALL SCENARIOS:

**Scenario 1: Initial greeting response**
User: "Hola"
→ DON'T send quick actions on first greeting
→ Just greet naturally

**Scenario 2: User asks about product category**
User: "¿Qué neveras tienes?"
→ Call send_product_metadata (show products)
→ THEN call send_quick_actions:
\`\`\`json
{
  "actions": [
    {"id": "capacity", "label": "Ver capacidad", "action": "show_3d"},
    {"id": "energy", "label": "Eficiencia energética", "action": "more_info"},
    {"id": "ar", "label": "Ver en tu cocina", "action": "show_ar"},
    {"id": "video", "label": "Video demo", "action": "show_video"}
  ]
}
\`\`\`

**Scenario 3: User asks about energy consumption**
User: "¿Cuánto consume de energía?"
→ Answer the question
→ THEN call send_quick_actions:
\`\`\`json
{
  "actions": [
    {"id": "label", "label": "Ver etiqueta energética", "action": "show_images"},
    {"id": "compare", "label": "Comparar consumos", "action": "more_info"},
    {"id": "calculate", "label": "Calcular costo mensual", "action": "more_info"},
    {"id": "products", "label": "Ver modelos eficientes", "action": "more_info"}
  ]
}
\`\`\`

**Scenario 4: User asks about capacity**
User: "¿Qué capacidad tiene?"
→ Answer with capacity details
→ THEN call send_quick_actions:
\`\`\`json
{
  "actions": [
    {"id": "interior", "label": "Ver interior en 3D", "action": "show_3d"},
    {"id": "dimensions", "label": "Ver dimensiones", "action": "show_images"},
    {"id": "video", "label": "Video de capacidad", "action": "show_video"},
    {"id": "compare", "label": "Comparar tamaños", "action": "more_info"}
  ]
}
\`\`\`

**Scenario 5: User asks about features**
User: "¿Qué características tiene?"
→ Answer with features
→ THEN call send_quick_actions:
\`\`\`json
{
  "actions": [
    {"id": "demo", "label": "Ver demostración", "action": "show_video"},
    {"id": "detail", "label": "Detalles técnicos", "action": "more_info"},
    {"id": "3d", "label": "Explorar en 3D", "action": "show_3d"},
    {"id": "buy", "label": "Agregar al carrito", "action": "buy"}
  ]
}
\`\`\`

**Scenario 6: User asks about price**
User: "¿Cuánto cuesta?"
→ Answer with pricing
→ THEN call send_quick_actions:
\`\`\`json
{
  "actions": [
    {"id": "buy", "label": "Comprar ahora", "action": "buy"},
    {"id": "compare", "label": "Comparar precios", "action": "more_info"},
    {"id": "financing", "label": "Opciones de pago", "action": "more_info"},
    {"id": "see", "label": "Ver el producto", "action": "show_3d"}
  ]
}
\`\`\`

**Scenario 7: User asks general question about appliances**
User: "¿Qué es mejor, top load o front load?"
→ Answer the question
→ THEN call send_quick_actions:
\`\`\`json
{
  "actions": [
    {"id": "top", "label": "Ver modelos Top Load", "action": "more_info"},
    {"id": "front", "label": "Ver modelos Front Load", "action": "more_info"},
    {"id": "compare", "label": "Comparar tipos", "action": "show_images"},
    {"id": "video", "label": "Video explicativo", "action": "show_video"}
  ]
}
\`\`\`

**Scenario 8: After showing products**
User: "Muéstrame lavadoras"
→ Call send_product_metadata
→ THEN call send_quick_actions:
\`\`\`json
{
  "actions": [
    {"id": "3d", "label": "Ver en 3D", "action": "show_3d"},
    {"id": "ar", "label": "Ver en tu espacio", "action": "show_ar"},
    {"id": "video", "label": "Ver funcionamiento", "action": "show_video"},
    {"id": "buy", "label": "Agregar al carrito", "action": "buy"}
  ]
}
\`\`\`

**CRITICAL: Think creatively! Adapt the action labels and types to EVERY conversation context!**

`;
  }

  /**
   * Get language-specific terms and examples
   */
  private getLanguageSpecificTerms(language: string): any {
    const terms: { [key: string]: any } = {
      es: {
        pronunciations: `- Pronounce "WiFi" as "wai-fai"
- Pronounce "SmartWash" as "smart-wash"
- Pronounce "kg" as "kilogramos"
- Pronounce "cu.ft" as "pies cúbicos"
- Pronounce "My kit AI" as "mai kit eiai"
`,
        examples: `### Example 1: Single Washer
User: "Necesito una lavadora para mi apartamento pequeño"
**Step 1 - Speak:** "¡Perfecto! Te recomiendo la EcoWash 200, es compacta y perfecta para apartamentos."
**Step 2 - Call Tool:** send_product_metadata({"product_skus": ["ECO200-FL"], "reasoning": "Lavadora compacta ideal para apartamentos pequeños"})

### Example 2: Multiple Washers
User: "Quiero una lavadora pero no sé cuál elegir"
**Step 1 - Speak:** "Te muestro las mejores opciones de lavadoras según diferentes necesidades."
**Step 2 - Call Tool:** send_product_metadata({"product_skus": ["SWP500-FL", "SWP300-TL", "ECO200-FL"], "reasoning": "Variedad de lavadoras para diferentes necesidades y presupuestos"})`,
        selectionResponses: `### Examples:
- Read the example whit de user language's
- "Excelente elección. Estoy a tu servicio para cualquier pregunta sobre este producto. ¿Quieres que te lo muestre en 3D o en realidad aumentada?"`,
        clarificationPhrases: `"Disculpa, no pude escucharte bien. ¿Podrías repetir?"`,
      },
      en: {
        pronunciations: `- Pronounce "WiFi" as "wai-fai"
- Pronounce "SmartWash" as "smart-wash"
- Pronounce "kg" as "kilograms"
- Pronounce "cu.ft" as "cubic feet"`,
        examples: `### Example 1: Single Washer
User: "I need a washer for my small apartment"
**Step 1 - Speak:** "Perfect! I recommend the EcoWash 200, it's compact and perfect for apartments."
**Step 2 - Call Tool:** send_product_metadata({"product_skus": ["ECO200-FL"], "reasoning": "Compact washer ideal for small apartments"})

### Example 2: Multiple Washers
User: "I want a washer but don't know which one to choose"
**Step 1 - Speak:** "Let me show you the best washer options for different needs."
**Step 2 - Call Tool:** send_product_metadata({"product_skus": ["SWP500-FL", "SWP300-TL", "ECO200-FL"], "reasoning": "Variety of washers for different needs and budgets"})`,
        selectionResponses: `### Examples:
- "Excellent choice! The SmartWash Pro 500 is perfect for you. Here you can see more multimedia information."
- "Great! The EcoWash 200 is ideal. You'll love its efficiency."
- "Good decision! The CoolMax Pro 800 has great capacity. Enjoy exploring its features."`,
        clarificationPhrases: `"Sorry, I couldn't hear you clearly. Could you repeat that?"`,
      },
      fr: {
        pronunciations: `- Pronounce "WiFi" as "wai-fai"
- Pronounce "SmartWash" as "smart-wash"
- Pronounce "kg" as "kilogrammes"
- Pronounce "cu.ft" as "pieds cubes"`,
        examples: `### Example 1: Single Washer
User: "J'ai besoin d'une machine à laver pour mon petit appartement"
**Step 1 - Speak:** "Parfait! Je recommande l'EcoWash 200, elle est compacte et parfaite pour les appartements."
**Step 2 - Call Tool:** send_product_metadata({"product_skus": ["ECO200-FL"], "reasoning": "Machine à laver compacte idéale pour petits appartements"})`,
        selectionResponses: `### Examples:
- "Excellent choix! La SmartWash Pro 500 est parfaite pour vous. Voici plus d'informations multimédias."
- "Génial! L'EcoWash 200 est idéale. Vous allez adorer son efficacité."`,
        clarificationPhrases: `"Désolé, je n'ai pas bien entendu. Pourriez-vous répéter?"`,
      },
    };

    return terms[language] || terms.en;
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
    onAgentTranscriptionComplete?: (
      messageId: string,
      fullTranscript: string
    ) => void;
    onMetadata?: (metadata: any) => void;
    onQuickActions?: (quickActions: any) => void;
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

      //   const options: RealtimeSessionOptions = {
      //     apiKey: apiKey,
      //     transport: "webrtc",
      //     config: {
      //       audio: {
      //         input: {
      //           noiseReduction: {
      //             type: "near_field",
      //           },
      //           turnDetection: {
      //             type: "server_vad",
      //             threshold: 1,
      //             prefix_padding_ms: "300",
      //             silence_duration_ms: "600",
      //           },
      //         },
      //       },
      //     },
      //   };

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
        console.log(
          "🔍 Available session methods:",
          Object.getOwnPropertyNames(this.session)
        );
        console.log(
          "🔍 Session prototype methods:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(this.session))
        );

        if (
          typeof (this.session as any).inputAudioTranscriptionEnable ===
          "function"
        ) {
          await (this.session as any).inputAudioTranscriptionEnable();
          console.log("✅ Audio transcription enabled");
        } else {
          console.warn("⚠️ inputAudioTranscriptionEnable method not found");
        }

        console.log("✅ Successfully connected to OpenAI Realtime API");
      } catch (connectError) {
        console.error("🚫 Connection error details:", connectError);
        throw new Error(
          `Connection failed: ${
            connectError instanceof Error
              ? connectError.message
              : String(connectError)
          }`
        );
      }
    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(
        "❌ Failed to connect to OpenAI Realtime API:",
        errorMessage
      );

      // Trigger error callback
      if (this.connectionCallbacks.onError) {
        this.connectionCallbacks.onError(
          error instanceof Error ? error : new Error(errorMessage)
        );
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
      if (typeof this.session.close === "function") {
        await this.session.close();
      } else {
        // Force cleanup if no close method
        console.warn(
          "⚠️ No close method found on session, cleaning up manually"
        );
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
      if (session.transport && typeof session.transport.on === "function") {
        session.transport.on("*", (event: any) => {
          if (event.type == "session.created") {
            console.log("✅ Transport session created:", event);
            this.isConnected = true;
            this.isConnecting = false;

            // Trigger connected callback
            if (this.connectionCallbacks.onConnected) {
              this.connectionCallbacks.onConnected();
            }
          }
          // 🆕 CAPTURAR EVENTOS DE TRANSCRIPCIÓN EN EL TRANSPORT
          else if (
            event.type === "conversation.item.input_audio_transcription.delta"
          ) {
            console.log("📝 USER TRANSCRIPTION DELTA (TRANSPORT):", event);
            if (this.connectionCallbacks.onUserTranscription) {
              this.connectionCallbacks.onUserTranscription(event.delta, false);
            }
          } else if (
            event.type ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            console.log("📝 USER TRANSCRIPTION COMPLETED (TRANSPORT):", event);
            if (this.connectionCallbacks.onUserTranscription) {
              this.connectionCallbacks.onUserTranscription(
                event.transcript,
                true
              );
            }
          } else if (event.type === "response.output_audio_transcript.delta") {
            console.log("🤖 AGENT TRANSCRIPT DELTA (TRANSPORT):", event.delta);

            const responseId = event.response_id || "default";

            // 🆕 ACUMULAR DELTAS PARA ENVIAR EN LOTES
            if (!this.deltaAccumulator[responseId]) {
              this.deltaAccumulator[responseId] = "";
            }
            this.deltaAccumulator[responseId] += event.delta;

            // Buffer para el transcript completo
            if (!this.agentTranscriptBuffer[responseId]) {
              this.agentTranscriptBuffer[responseId] = "";
            }
            this.agentTranscriptBuffer[responseId] += event.delta;

            // 🆕 ENVIAR DELTAS ACUMULADOS CON THROTTLE
            const now = Date.now();
            if (now - this.lastDeltaTime >= this.deltaThrottle) {
              this.lastDeltaTime = now;

              if (this.connectionCallbacks.onAgentTranscriptionDelta) {
                // 🆕 ENVIAR TODO EL TEXTO ACUMULADO HASTA AHORA
                this.connectionCallbacks.onAgentTranscriptionDelta(
                  responseId,
                  this.agentTranscriptBuffer[responseId]
                );
              }

              // NO limpiar acumulador, solo resetear para el próximo lote
              this.deltaAccumulator[responseId] = "";
            }
          } else if (event.type === "response.output_audio_transcript.done") {
            console.log("🤖 AGENT TRANSCRIPT DONE (TRANSPORT):", event);

            const responseId = event.response_id || "default";
            const fullTranscript =
              event.transcript || this.agentTranscriptBuffer[responseId] || "";

            // 🆕 ENVIAR ÚLTIMOS DELTAS ACUMULADOS ANTES DE COMPLETAR
            if (
              this.deltaAccumulator[responseId] &&
              this.connectionCallbacks.onAgentTranscriptionDelta
            ) {
              // Enviar el texto completo final
              this.connectionCallbacks.onAgentTranscriptionDelta(
                responseId,
                this.agentTranscriptBuffer[responseId]
              );
            }

            if (this.connectionCallbacks.onAgentTranscriptionComplete) {
              this.connectionCallbacks.onAgentTranscriptionComplete(
                responseId,
                fullTranscript
              );
            }

            // Limpiar buffers
            delete this.agentTranscriptBuffer[responseId];
            delete this.deltaAccumulator[responseId];
          } else {
            console.log("Transport session event:", event.type);
          }
        });
      }

      if (typeof session.addListener === "function") {
        // 🔍 USAR LOS EVENTOS REALES QUE ESTÁN LLEGANDO
        console.log("🔍 Setting up REAL transcription events...");

        // 🎤 EVENTOS DEL USUARIO (REALES)
        session.addListener(
          "input_audio_buffer.speech_started",
          (event: any) => {
            console.log("🎤 USER STARTED SPEAKING (REAL):", event);
          }
        );

        session.addListener(
          "input_audio_buffer.speech_stopped",
          (event: any) => {
            console.log("🎤 USER STOPPED SPEAKING (REAL):", event);
          }
        );

        session.addListener("input_audio_buffer.committed", (event: any) => {
          console.log("🎤 AUDIO BUFFER COMMITTED (REAL):", event);
        });

        // 📝 TRANSCRIPCIÓN DEL USUARIO EN TIEMPO REAL (CORRECTO)
        session.addListener(
          "conversation.item.input_audio_transcription.delta",
          (event: any) => {
            console.log("📝 USER TRANSCRIPTION DELTA (REAL):", event);
            if (this.connectionCallbacks.onUserTranscription) {
              this.connectionCallbacks.onUserTranscription(event.delta, false);
            }
          }
        );

        session.addListener(
          "conversation.item.input_audio_transcription.completed",
          (event: any) => {
            console.log("📝 USER TRANSCRIPTION COMPLETED (REAL):", event);

            // 🌍 DETECT LANGUAGE CHANGE FROM USER INPUT
            if (event.transcript) {
              this.detectAndUpdateLanguage(event.transcript);
            }

            if (this.connectionCallbacks.onUserTranscription) {
              this.connectionCallbacks.onUserTranscription(
                event.transcript,
                true
              );
            }
          }
        );

        // 🤖 EVENTOS DEL AGENTE (REALES)
        session.addListener("response.created", (event: any) => {
          console.log("🤖 RESPONSE CREATED (REAL):", event);
        });

        session.addListener("response.output_item.added", (event: any) => {
          console.log("🤖 OUTPUT ITEM ADDED (REAL):", event);
        });

        session.addListener("response.content_part.added", (event: any) => {
          console.log("🤖 CONTENT PART ADDED (REAL):", event);
        });

        // 🤖 TRANSCRIPCIÓN DEL AGENTE EN TIEMPO REAL (CORRECTO)
        session.addListener(
          "response.output_audio_transcript.delta",
          (event: any) => {
            console.log("🤖 AGENT TRANSCRIPT DELTA (REAL):", event);

            const responseId = event.response_id || "default";

            if (!this.agentTranscriptBuffer[responseId]) {
              this.agentTranscriptBuffer[responseId] = "";
            }
            this.agentTranscriptBuffer[responseId] += event.delta;

            if (this.connectionCallbacks.onAgentTranscriptionDelta) {
              this.connectionCallbacks.onAgentTranscriptionDelta(
                responseId,
                event.delta
              );
            }
          }
        );

        session.addListener(
          "response.output_audio_transcript.done",
          (event: any) => {
            console.log("🤖 AGENT TRANSCRIPT DONE (REAL):", event);

            const responseId = event.response_id || "default";
            const fullTranscript =
              event.transcript || this.agentTranscriptBuffer[responseId] || "";

            if (this.connectionCallbacks.onAgentTranscriptionComplete) {
              this.connectionCallbacks.onAgentTranscriptionComplete(
                responseId,
                fullTranscript
              );
            }

            delete this.agentTranscriptBuffer[responseId];
          }
        );

        session.addListener("response.done", (event: any) => {
          console.log("🤖 RESPONSE DONE (REAL):", event);
        });

        // 🛠️ EVENTOS DE TOOL CALLS
        session.addListener(
          "response.function_call_arguments.delta",
          (event: any) => {
            console.log("🛠️ TOOL CALL ARGUMENTS DELTA:", event);
          }
        );

        session.addListener(
          "response.function_call_arguments.done",
          (event: any) => {
            console.log("🛠️ TOOL CALL ARGUMENTS DONE:", event);
          }
        );

        session.addListener("response.output_item.added", (event: any) => {
          console.log("🛠️ OUTPUT ITEM ADDED:", event);

          // Verificar si es una llamada a función
          if (event.item && event.item.type === "function_call") {
            console.log("🛠️ Function call detected:", event.item);

            // Si es el tool send_product_metadata, procesarlo
            if (event.item.name === "send_product_metadata") {
              console.log("🛠️ send_product_metadata tool call detected");
            }
          }
        });

        // 🛠️ LISTENER ESPECÍFICO PARA TOOL CALLS COMPLETADOS
        session.addListener("conversation.item.created", (event: any) => {
          console.log("🛠️ CONVERSATION ITEM CREATED:", event);

          if (event.item && event.item.type === "function_call") {
            console.log("🛠️ Function call item created:", event.item);
            console.log("🛠️ Function call name:", event.item.name);
            console.log(
              "🛠️ Function call arguments (raw):",
              event.item.arguments
            );
            console.log("🛠️ Arguments type:", typeof event.item.arguments);

            if (
              event.item.name === "send_product_metadata" &&
              event.item.arguments
            ) {
              try {
                let args;
                if (typeof event.item.arguments === "string") {
                  console.log(
                    "🛠️ Parsing string arguments:",
                    event.item.arguments
                  );
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
                    products: args.products || [],
                  },
                  TextMessage:
                    "Aquí tienes algunos productos que podrían interesarte:",
                };

                console.log(
                  "🛠️ Sending formatted metadata from event listener:",
                  formattedMetadata
                );

                // Ejecutar el callback de metadata directamente
                if (this.connectionCallbacks.onMetadata) {
                  this.connectionCallbacks.onMetadata(formattedMetadata);
                }
              } catch (error) {
                console.error("🛠️ Error processing tool arguments:", error);
                console.error(
                  "🛠️ Raw arguments that failed:",
                  event.item.arguments
                );
              }
            }
          }
        });

        // Conversation item completed (sin parsing de metadata)
        session.addListener("conversation.item.completed", (event: any) => {
          console.log("✅ CONVERSATION ITEM COMPLETED:", event);

          // Solo triggear el callback general (mantener compatibilidad)
          if (this.connectionCallbacks.onMessage) {
            this.connectionCallbacks.onMessage(event);
          }
        });

        // Evento de sesión creada
        session.addListener("session.created", (event: any) => {
          console.log("✅ Session created successfully:", event);
        });

        // Eventos básicos para compatibilidad
        session.addListener("item", (item: any) => {
          console.log("📨 Received item:", item);
          if (this.connectionCallbacks.onMessage) {
            this.connectionCallbacks.onMessage(item);
          }
        });

        session.addListener("error", (error: any) => {
          console.error("❌ Realtime session error:", error);
          if (this.connectionCallbacks.onError) {
            this.connectionCallbacks.onError(error);
          }
        });

        session.addListener("close", () => {
          console.log("🔌 Realtime session closed");
          this.isConnected = false;
          if (this.connectionCallbacks.onDisconnected) {
            this.connectionCallbacks.onDisconnected();
          }
        });

        session.addListener("response", (response: any) => {
          console.log("🎯 Received response:", response);
          if (this.connectionCallbacks.onMessage) {
            this.connectionCallbacks.onMessage(response);
          }
        });

        session.addListener("item", (item: any) => {
          console.log("📨 Received item:", item);
          if (this.connectionCallbacks.onMessage) {
            this.connectionCallbacks.onMessage(item);
          }
        });

        session.addListener("error", (error: any) => {
          console.error("❌ Realtime session error:", error);
          if (this.connectionCallbacks.onError) {
            this.connectionCallbacks.onError(error);
          }
        });

        session.addListener("close", () => {
          console.log("🔌 Realtime session closed");
          this.isConnected = false;
          if (this.connectionCallbacks.onDisconnected) {
            this.connectionCallbacks.onDisconnected();
          }
        });

        // Listen for response events
        session.addListener("response", (response: any) => {
          console.log("🎯 Received response:", response);
          if (this.connectionCallbacks.onMessage) {
            this.connectionCallbacks.onMessage(response);
          }
        });

        // 🆕 NUEVOS EVENTOS PARA TRANSCRIPCIÓN

        // Transcripción del usuario completada
        session.addListener(
          "conversation.item.input_audio_transcription.completed",
          (event: any) => {
            console.log("📝 User transcription:", event.transcript);

            // 🌍 DETECT LANGUAGE CHANGE FROM USER INPUT
            if (event.transcript) {
              this.detectAndUpdateLanguage(event.transcript);
            }

            if (this.connectionCallbacks.onUserTranscription) {
              this.connectionCallbacks.onUserTranscription(
                event.transcript,
                true
              );
            }
          }
        );

        // Transcripción del agente en tiempo real (streaming)
        session.addListener("response.audio_transcript.delta", (event: any) => {
          console.log("🤖 Agent transcript delta:", event.delta);

          const responseId = event.response_id || "default";

          // Acumular el delta en el buffer
          if (!this.agentTranscriptBuffer[responseId]) {
            this.agentTranscriptBuffer[responseId] = "";
          }
          this.agentTranscriptBuffer[responseId] += event.delta;

          // Trigger callback con el delta
          if (this.connectionCallbacks.onAgentTranscriptionDelta) {
            this.connectionCallbacks.onAgentTranscriptionDelta(
              responseId,
              event.delta
            );
          }
        });

        // Transcripción del agente completada
        session.addListener("response.audio_transcript.done", (event: any) => {
          console.log("🤖 Agent transcript completed:", event.transcript);

          const responseId = event.response_id || "default";
          const fullTranscript =
            event.transcript || this.agentTranscriptBuffer[responseId] || "";

          if (this.connectionCallbacks.onAgentTranscriptionComplete) {
            this.connectionCallbacks.onAgentTranscriptionComplete(
              responseId,
              fullTranscript
            );
          }

          // Limpiar el buffer
          delete this.agentTranscriptBuffer[responseId];
        });

        // Conversation item completed (sin parsing de metadata)
        session.addListener("conversation.item.completed", (event: any) => {
          console.log("✅ Conversation item completed:", event);

          // Solo triggear el callback general (mantener compatibilidad)
          if (this.connectionCallbacks.onMessage) {
            this.connectionCallbacks.onMessage(event);
          }
        });

        console.log("📝 Event listeners setup completed WITH TRANSCRIPTION");
      } else if (typeof session.on === "function") {
        // Evento de sesión creada
        session.on("session.created", (event: any) => {
          console.log("✅ Session created successfully:", event);
        });

        // Try the 'on' method as alternative
        session.on("item", (item: any) => {
          console.log("� Received item:", item);
          if (this.connectionCallbacks.onMessage) {
            this.connectionCallbacks.onMessage(item);
          }
        });

        session.on("error", (error: any) => {
          console.error("❌ Realtime session error:", error);

          if (this.connectionCallbacks.onError) {
            this.connectionCallbacks.onError(error);
          }
        });

        // 🆕 EVENTOS DE TRANSCRIPCIÓN CON 'on' method
        session.on(
          "conversation.item.input_audio_transcription.completed",
          (event: any) => {
            console.log("📝 User transcription:", event.transcript);

            // 🌍 DETECT LANGUAGE CHANGE FROM USER INPUT
            if (event.transcript) {
              this.detectAndUpdateLanguage(event.transcript);
            }

            if (this.connectionCallbacks.onUserTranscription) {
              this.connectionCallbacks.onUserTranscription(
                event.transcript,
                true
              );
            }
          }
        );

        session.on("response.audio_transcript.delta", (event: any) => {
          console.log("🤖 Agent transcript delta:", event.delta);
          const responseId = event.response_id || "default";

          if (!this.agentTranscriptBuffer[responseId]) {
            this.agentTranscriptBuffer[responseId] = "";
          }
          this.agentTranscriptBuffer[responseId] += event.delta;

          if (this.connectionCallbacks.onAgentTranscriptionDelta) {
            this.connectionCallbacks.onAgentTranscriptionDelta(
              responseId,
              event.delta
            );
          }
        });

        session.on("response.audio_transcript.done", (event: any) => {
          console.log("🤖 Agent transcript completed:", event.transcript);
          const responseId = event.response_id || "default";
          const fullTranscript =
            event.transcript || this.agentTranscriptBuffer[responseId] || "";

          if (this.connectionCallbacks.onAgentTranscriptionComplete) {
            this.connectionCallbacks.onAgentTranscriptionComplete(
              responseId,
              fullTranscript
            );
          }

          delete this.agentTranscriptBuffer[responseId];
        });

        // 🛠️ TOOL EVENTS CON 'on' METHOD
        session.on("conversation.item.created", (event: any) => {
          console.log("🛠️ CONVERSATION ITEM CREATED (ON):", event);

          if (event.item && event.item.type === "function_call") {
            console.log("🛠️ Function call item created (ON):", event.item);
            console.log("🛠️ Function call name (ON):", event.item.name);
            console.log(
              "🛠️ Function call arguments (ON, raw):",
              event.item.arguments
            );

            if (
              event.item.name === "send_product_metadata" &&
              event.item.arguments
            ) {
              try {
                let args;
                if (typeof event.item.arguments === "string") {
                  console.log(
                    "🛠️ Parsing string arguments (ON):",
                    event.item.arguments
                  );
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
                    products: args.products || [],
                  },
                  TextMessage:
                    "Aquí tienes algunos productos que podrían interesarte:",
                };

                console.log(
                  "🛠️ Sending formatted metadata from ON event listener:",
                  formattedMetadata
                );

                // Ejecutar el callback de metadata directamente
                if (this.connectionCallbacks.onMetadata) {
                  this.connectionCallbacks.onMetadata(formattedMetadata);
                }
              } catch (error) {
                console.error(
                  "🛠️ Error processing tool arguments (ON):",
                  error
                );
                console.error(
                  "🛠️ Raw arguments that failed (ON):",
                  event.item.arguments
                );
              }
            }
          }
        });

        console.log(
          "📝 Event listeners setup with 'on' method WITH TRANSCRIPTION AND TOOLS"
        );
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
   * Triggers the quick actions callback (used by tools)
   * @param quickActions - The quick actions to send
   */
  triggerQuickActionsCallback(quickActions: any): void {
    if (this.connectionCallbacks.onQuickActions) {
      this.connectionCallbacks.onQuickActions(quickActions);
    }
  }

  muteInput(muted: boolean): boolean {
    if (this.session && this.session.muted !== null) {
      this.session.transport.mute(muted);
    }
    return this.session?.transport.muted || false;
  }

  getAudioInputMuted(): boolean {
    return this.session?.transport.muted || false;
  }

  /**
   * Update current language and regenerate agent if needed
   */
  updateLanguage(newLanguage: string): void {
    if (this.currentLanguage !== newLanguage) {
      console.log(
        `🌍 Language changed from ${this.currentLanguage} to ${newLanguage}`
      );
      this.lastDetectedLanguage = this.currentLanguage;
      this.currentLanguage = newLanguage;

      // Update language store
      const languageStore = useLanguageStore.getState();
      languageStore.setUserPreferredLanguage(newLanguage as LanguageCode);

      // If connected, send language switch acknowledgment
      if (this.isConnected && this.session) {
        const switchMessage = getLanguageSwitchMessage(newLanguage);
        console.log(`🌍 Sending language switch message: ${switchMessage}`);
        // Note: The agent will automatically adapt to the new language in subsequent responses
      }
    }
  }

  /**
   * Detect language from user input and update if changed
   */
  private detectAndUpdateLanguage(userInput: string): void {
    const detectedLanguage = detectLanguageFromText(userInput);

    if (detectedLanguage && detectedLanguage !== this.currentLanguage) {
      console.log(
        `🌍 Language change detected in user input: ${this.currentLanguage} -> ${detectedLanguage}`
      );
      this.updateLanguage(detectedLanguage);
    }
  }

  /**
   * Enhanced sendMessage with language detection
   */
  async sendMessageWithLanguageDetection(message: string): Promise<void> {
    // Detect language change before sending
    this.detectAndUpdateLanguage(message);

    // Send the message normally
    await this.sendMessage(message);
  }

  /**
   * Get current language information
   */
  getLanguageInfo(): {
    current: string;
    browser: string;
    hasGreeted: boolean;
    lastDetected: string | null;
  } {
    return {
      current: this.currentLanguage,
      browser: this.browserLanguage,
      hasGreeted: this.hasGreeted,
      lastDetected: this.lastDetectedLanguage,
    };
  }

  /**
   * Set greeting status
   */
  setHasGreeted(greeted: boolean): void {
    this.hasGreeted = greeted;
  }

  /**
   * Get appropriate greeting for current language
   */
  getCurrentLanguageGreeting(): string {
    return getGreetingForLanguage(this.currentLanguage);
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
