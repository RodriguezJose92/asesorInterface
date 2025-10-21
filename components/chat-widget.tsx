"use client";

import { useState, useEffect, useRef } from "react";
import { ChatButton } from "./chat-button";
import { ChatModal } from "./chat-modal";
import { RealtimeStatus } from "./realtime-status";
import type { Message, CarouselInfo, QuickAction } from "@/lib/types";
import { MultimediaStore } from "@/utils/stores/zustandStore";
import RealtimeService from "./services/RealtimeService";
import { useLanguageStore } from "@/store/useLanguageStore";

export let initCallAsesorAi: any = null;

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [statusWelcomeMessage, setStatusWelcomeMessage] =
    useState<boolean>(true);

  // Estados para realtime
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const currentAgentMessageIdRef = useRef<string | null>(null);

  // 🎯 Estados para transcripción del usuario EN TIEMPO REAL
  const [currentUserTranscript, setCurrentUserTranscript] =
    useState<string>("");
  const [showUserTranscript, setShowUserTranscript] = useState<boolean>(false);
  const userTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef<string>(""); // Para evitar closures obsoletos
  const isGreetingCommandRef = useRef<boolean>(false);

  const filterJsonFromTranscript = (text: string): string => {
    try {
      let filtered = text.replace(/\{[\s\S]*?\}/g, "");

      filtered = filtered.replace(/JsonData/gi, "");
      filtered = filtered.replace(/ProductsCollection/gi, "");
      filtered = filtered.replace(/TextMessage/gi, "");

      filtered = filtered.replace(/\s+/g, " ").trim();

      console.log("🧹 Filtered transcript:", { original: text, filtered });
      return filtered;
    } catch (error) {
      console.warn("⚠️ Error filtering JSON:", error);
      return text;
    }
  };

  const processJsonForMetadata = (text: string) => {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log("📦 Found JSON in transcript:", jsonMatch[0]);

        try {
          const metadata = JSON.parse(jsonMatch[0]);
          if (metadata.JsonData?.products) {
            console.log(
              "🎯 Processing products from transcript JSON:",
              metadata
            );

            const productMessage: Message = {
              id: Date.now().toString(),
              content: metadata.TextMessage || "Aquí tienes algunos productos:",
              isUser: false,
              timestamp: new Date(),
              type: "product",
              product: metadata.JsonData.products,
            };

            setMessages((prev) => [...prev, productMessage]);
          }
        } catch (parseError) {
          console.warn("Could not parse JSON from transcript:", parseError);
        }
      }
    } catch (error) {
      console.warn("Error processing JSON for metadata:", error);
    }
  };

  useEffect(() => {
    if (isOpen && !isRealtimeConnected) {
      // initializeRealtimeConnection();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (userTimeoutRef.current) {
        clearTimeout(userTimeoutRef.current);
      }
    };
  }, []);

  const initializeRealtimeConnection = async () => {
    try {
      console.log("🔄 Connecting to Realtime API...");

      await RealtimeService.connect({
        onConnected: () => {
          console.log("✅ Connected to Realtime API");
          setIsRealtimeConnected(true);

          setTimeout(() => {
            console.log("👋 Triggering agent greeting");

            if (RealtimeService.getSession()) {
              try {
                console.log("🎙️ Sending greeting command to agent");
                isGreetingCommandRef.current = true;
                // Se mutea
                RealtimeService.muteInput(true);
                // Mandamos mensaje de bienvenidas
                RealtimeService.sendMessage("Hello");
                // Estatus de bienvenido
                setStatusWelcomeMessage(false);
                setTimeout(() => {
                  RealtimeService.muteInput(false);
                }, 8000);
              } catch (error) {
                console.warn("⚠️ Could not trigger agent greeting:", error);
              }
            }
          }, 1000);
        },

        onDisconnected: () => {
          console.log("🔌 Disconnected from Realtime API");
          setIsRealtimeConnected(false);
        },

        onError: (error) => {
          console.error("❌ Realtime API Error:", error);
          setIsRealtimeConnected(false);
        },

        onMessage: (message) => {
          console.log("📨 Received message:", message);
        },

        onUserTranscription: (transcript: string, isComplete: boolean) => {
          console.log(
            `📝 User: ${isComplete ? "COMPLETE" : "TYPING"} - "${transcript}"`
          );
          console.log("🔍 Current states:", {
            currentUserTranscript,
            showUserTranscript,
            transcriptLength: transcript.length,
            isGreetingCommand: isGreetingCommandRef.current,
          });

          if (isGreetingCommandRef.current) {
            console.log("🙈 Filtering greeting command - not showing in chat");
            isGreetingCommandRef.current = false; // Reset flag después del primer filtro
            return;
          }

          if (isComplete) {
            console.log("✅ Finalizing complete user message");

            const userMessage: Message = {
              id: `user-${Date.now()}`,
              content: transcript,
              isUser: true,
              timestamp: new Date(),
              type: "text",
            };

            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];

              if (
                lastMessage &&
                !lastMessage.isUser &&
                currentAgentMessageIdRef.current
              ) {
                const beforeLast = prev.slice(0, -1);
                return [...beforeLast, userMessage, lastMessage];
              } else {
                return [...prev, userMessage];
              }
            });

            setCurrentUserTranscript("");
            setShowUserTranscript(false);

            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current);
              userTimeoutRef.current = null;
            }
          } else {
            console.log("🎆 Setting live transcription:", transcript);
            setCurrentUserTranscript(transcript);
            setShowUserTranscript(true);
            currentTranscriptRef.current = transcript;

            console.log("🔄 Updated states to:", {
              newTranscript: transcript,
              showFlag: true,
            });

            // Timeout para auto-finalizar
            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current);
            }

            userTimeoutRef.current = setTimeout(() => {
              console.log("⏰ Timeout triggered - finalizing message");
              const finalTranscript = currentTranscriptRef.current.trim();
              if (finalTranscript) {
                const userMessage: Message = {
                  id: `user-${Date.now()}`,
                  content: finalTranscript,
                  isUser: true,
                  timestamp: new Date(),
                  type: "text",
                };

                setMessages((prev) => [...prev, userMessage]);
                setCurrentUserTranscript("");
                setShowUserTranscript(false);
                currentTranscriptRef.current = "";
              }
            }, 2000);
          }
        },

        onAgentTranscriptionDelta: (messageId: string, delta: string) => {
          console.log("🤖 Agent delta (raw):", delta);

          if (
            currentAgentMessageIdRef.current !== messageId &&
            showUserTranscript &&
            currentUserTranscript.trim()
          ) {
            console.log(
              "🎯 Agent starting - inserting user message BEFORE agent"
            );

            const userMessage: Message = {
              id: `user-${Date.now()}`,
              content: currentUserTranscript.trim(),
              isUser: true,
              timestamp: new Date(),
              type: "text",
            };

            setMessages((prev) => {
              const withUser = [...prev, userMessage];

              const filteredDelta = filterJsonFromTranscript(delta);
              console.log("🎆 Filtered delta:", filteredDelta);

              const agentMessage: Message = {
                id: messageId,
                content: filteredDelta,
                isUser: false,
                timestamp: new Date(),
                type: "text",
              };

              return [...withUser, agentMessage];
            });

            currentAgentMessageIdRef.current = messageId;

            setCurrentUserTranscript("");
            setShowUserTranscript(false);
            currentTranscriptRef.current = "";

            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current);
              userTimeoutRef.current = null;
            }

            setIsTyping(false);
          } else if (currentAgentMessageIdRef.current === messageId) {
            const filteredDelta = filterJsonFromTranscript(delta);
            console.log("🎆 Updating with filtered delta:", filteredDelta);

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, content: filteredDelta } : msg
              )
            );
          } else if (currentAgentMessageIdRef.current !== messageId) {
            const filteredDelta = filterJsonFromTranscript(delta);

            currentAgentMessageIdRef.current = messageId;

            const agentMessage: Message = {
              id: messageId,
              content: filteredDelta,
              isUser: false,
              timestamp: new Date(),
              type: "text",
            };

            setMessages((prev) => [...prev, agentMessage]);
            setIsTyping(false);
          }

          // 📦 PROCESAR JSON para metadata (sin mostrarlo en transcripción)
          processJsonForMetadata(delta);
        },

        onAgentTranscriptionComplete: (
          messageId: string,
          fullTranscript: string
        ) => {
          console.log("🤖 Agent complete (raw):", fullTranscript);

          // 🙏 FILTRAR JSON del transcript completo
          const filteredTranscript = filterJsonFromTranscript(fullTranscript);
          console.log("🎆 Agent complete (filtered):", filteredTranscript);

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: filteredTranscript }
                : msg
            )
          );

          // 📦 PROCESAR JSON final para metadata
          processJsonForMetadata(fullTranscript);
          currentAgentMessageIdRef.current = null;
        },

        onMetadata: (metadata) => {
          console.log("📦 Products:", metadata);

          // Finalizar mensaje de usuario antes de productos
          if (showUserTranscript && currentUserTranscript.trim()) {
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              content: currentUserTranscript.trim(),
              isUser: true,
              timestamp: new Date(),
              type: "text",
            };

            setMessages((prev) => [...prev, userMessage]);
            setCurrentUserTranscript("");
            setShowUserTranscript(false);

            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current);
              userTimeoutRef.current = null;
            }
          }

          if (metadata.JsonData?.products) {
            const productMessage: Message = {
              id: Date.now().toString(),
              content: metadata.TextMessage || "Aquí tienes algunos productos:",
              isUser: false,
              timestamp: new Date(),
              type: "product",
              product: metadata.JsonData.products,
            };

            setMessages((prev) => [...prev, productMessage]);
          }
        },

        onQuickActions: (quickActionsData) => {
          console.log("🎯 Quick Actions received:", quickActionsData);

          if (quickActionsData.actions && quickActionsData.actions.length > 0) {
            const quickActionsMessage: Message = {
              id: `quick-${Date.now()}`,
              content: "",
              isUser: false,
              timestamp: new Date(),
              type: "quick_actions",
              quickActions: quickActionsData.actions,
            };

            setMessages((prev) => [...prev, quickActionsMessage]);
          }
        },
      });
    } catch (error) {
      console.error("❌ Failed to initialize Realtime connection:", error);
    }
  };

  initCallAsesorAi = initializeRealtimeConnection;

  /** Aqui falta enlaazar las propiedas que recibo del back */
  const handleMultimediaClick = (productName: string) => {
    const carouselInfo: CarouselInfo = {
      images: [
        "https://whirlpoolco.vtexassets.com/arquivos/ids/156345-800-auto?v=638253280514130000&width=800&height=auto&aspect=true",
        "https://whirlpoolco.vtexassets.com/arquivos/ids/156346-800-auto?v=638253280514130000&width=800&height=auto&aspect=true",
        "https://whirlpoolco.vtexassets.com/arquivos/ids/156347-800-auto?v=638253280514130000&width=800&height=auto&aspect=true",
        "https://whirlpoolco.vtexassets.com/arquivos/ids/156348-800-auto?v=638253280514130000&width=800&height=auto&aspect=true",
      ],
      productName: productName,
    };

    const carouselMessage: Message = {
      id: Date.now().toString(),
      content: "",
      isUser: false,
      timestamp: new Date(),
      type: "multimedia",
      carousel: carouselInfo,
    };

    MultimediaStore.getState().setMultimediaStatus(true);
    setMessages((prev) => [...prev, carouselMessage]);
  };

  /**
   * 🎯 NUEVA FUNCIÓN: Manejar selección de productos
   */
  const handleProductSelect = async (
    product: any,
    action: "add_to_cart" | "multimedia"
  ) => {
    if (!isRealtimeConnected || !RealtimeService.getSession()) {
      console.warn("⚠️ No realtime connection available for product selection");
      return;
    }

    try {
      // Crear mensaje interno para el agente
      const actionText =
        action === "add_to_cart"
          ? "agregó al carrito"
          : "quiere ver multimedia de";
      const internalMessage = `El usuario ${actionText} la ${product.name} (${product.sku})`;

      console.log("🛒 Sending product selection to agent:", internalMessage);

      // Enviar mensaje interno al agente (no se muestra en el chat como mensaje de usuario)
      await RealtimeService.sendMessage(internalMessage);
    } catch (error) {
      console.error("❌ Error sending product selection to agent:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, newMessage]);

    const userInput = inputValue;
    setInputValue("");

    if (isRealtimeConnected && RealtimeService.getSession()) {
      try {
        console.log("📤 Sending message to realtime agent:", userInput);
        await RealtimeService.sendMessage(userInput);
        setIsTyping(true);
      } catch (error) {
        console.error("❌ Error sending message to realtime:", error);

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.",
          isUser: false,
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsTyping(false);
      }
    } else {
      const noConnectionMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "No hay conexión activa. Por favor espera a que se establezca la conexión.",
        isUser: false,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, noConnectionMessage]);
      setIsTyping(false);
    }
  };

  const handleClose = () => {
    setShowSurvey(true);
  };

  const handleMinimize = () => {
    setIsOpen(false);
  };

  const handleStartSurvey = () => {
    setShowSurvey(false);
    setIsOpen(false);
  };

  const handleResumeChat = () => {
    setShowSurvey(false);
  };

  const handleCloseChat = async () => {
    setShowSurvey(false);
    setIsOpen(false);

    // Limpiar timeouts
    if (userTimeoutRef.current) {
      clearTimeout(userTimeoutRef.current);
      userTimeoutRef.current = null;
    }

    // Desconectar realtime
    if (isRealtimeConnected) {
      try {
        await RealtimeService.disconnect();
        setIsRealtimeConnected(false);
      } catch (error) {
        console.error("❌ Error disconnecting from Realtime API:", error);
      }
    }

    // Limpiar estados
    setMessages([]);
    setInputValue("");
    setCurrentUserTranscript("");
    setShowUserTranscript(false);
    currentAgentMessageIdRef.current = null;
    currentTranscriptRef.current = "";
    isGreetingCommandRef.current = false; // Limpiar flag de saludo
  };

  return (
    <>
      <ChatButton onClick={() => setIsOpen(true)} isOpen={isOpen} />
      <ChatModal
        isOpen={isOpen}
        onClose={handleClose}
        onMinimize={handleMinimize}
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={handleSendMessage}
        onMultimediaClick={handleMultimediaClick}
        onProductSelect={handleProductSelect}
        isTyping={isTyping}
        currentAgentMessageId={currentAgentMessageIdRef.current}
        showSurvey={showSurvey}
        onStartSurvey={handleStartSurvey}
        onResumeChat={handleResumeChat}
        onCloseChat={handleCloseChat}
        currentUserTranscript={currentUserTranscript}
        showUserTranscript={showUserTranscript}
        setterStatusWelcomeMessage={setStatusWelcomeMessage}
        StatusWelcolmeMessage={statusWelcomeMessage}
      />
      <RealtimeStatus />
    </>
  );
}
