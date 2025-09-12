"use client"

import { useState, useEffect, useRef } from "react"
import { ChatButton } from "./chat-button"
import { ChatModal } from "./chat-modal"
import { RealtimeStatus } from "./realtime-status"
import type { Message, ProductInfo, CarouselInfo } from "@/lib/types"
import { dataFake } from "@/utils/dataFake"
import { MultimediaStore } from "@/utils/stores/zustandStore"
import RealtimeService from "./services/RealtimeService"

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showSurvey, setShowSurvey] = useState(false)
  
  // Estados para realtime
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const currentAgentMessageIdRef = useRef<string | null>(null)

  // 🎯 Estados para transcripción del usuario EN TIEMPO REAL
  const [currentUserTranscript, setCurrentUserTranscript] = useState<string>("")
  const [showUserTranscript, setShowUserTranscript] = useState<boolean>(false)
  const userTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentTranscriptRef = useRef<string>("") // Para evitar closures obsoletos
  
  // 👋 NUEVO: Flag para filtrar comando de saludo interno
  const isGreetingCommandRef = useRef<boolean>(false)

  // 🙏 NUEVO: Funciones para filtrar JSON de la transcripción
  const filterJsonFromTranscript = (text: string): string => {
    try {
      // Eliminar cualquier JSON completo del texto
      let filtered = text.replace(/\{[\s\S]*?\}/g, '')
      
      // Eliminar palabras específicas relacionadas con JSON
      filtered = filtered.replace(/JsonData/gi, '')
      filtered = filtered.replace(/ProductsCollection/gi, '')
      filtered = filtered.replace(/TextMessage/gi, '')
      
      // Limpiar espacios extras
      filtered = filtered.replace(/\s+/g, ' ').trim()
      
      console.log("🧹 Filtered transcript:", { original: text, filtered })
      return filtered
    } catch (error) {
      console.warn("⚠️ Error filtering JSON:", error)
      return text
    }
  }

  const processJsonForMetadata = (text: string) => {
    try {
      // Buscar JSON en el texto
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        console.log("📦 Found JSON in transcript:", jsonMatch[0])
        
        try {
          const metadata = JSON.parse(jsonMatch[0])
          if (metadata.JsonData?.products) {
            console.log("🎯 Processing products from transcript JSON:", metadata)
            
            const productMessage: Message = {
              id: Date.now().toString(),
              content: metadata.TextMessage || "Aquí tienes algunos productos:",
              isUser: false,
              timestamp: new Date(),
              type: "product",
              product: metadata.JsonData.products
            }
            
            setMessages(prev => [...prev, productMessage])
          }
        } catch (parseError) {
          console.warn("Could not parse JSON from transcript:", parseError)
        }
      }
    } catch (error) {
      console.warn("Error processing JSON for metadata:", error)
    }
  }

  useEffect(() => {
    if (isOpen && !isRealtimeConnected) {
      initializeRealtimeConnection()
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (userTimeoutRef.current) {
        clearTimeout(userTimeoutRef.current)
      }
    }
  }, [])

  const initializeRealtimeConnection = async () => {
    try {
      console.log("🔄 Connecting to Realtime API...")
      
      await RealtimeService.connect({
        onConnected: () => {
          console.log("✅ Connected to Realtime API")
          setIsRealtimeConnected(true)
          
          // 👋 NUEVO: Saludo automático del agente al conectarse
          setTimeout(() => {
            console.log("👋 Triggering agent greeting")
            
            // 🎆 ESTRATEGIA: Enviar comando interno para saludo
            if (RealtimeService.getSession()) {
              try {
                console.log("🎙️ Sending greeting command to agent")
                // Marcar que estamos enviando comando de saludo
                isGreetingCommandRef.current = true
                // Usar comando más simple que definitivamente funcione
                RealtimeService.sendMessage("Hola")
              } catch (error) {
                console.warn("⚠️ Could not trigger agent greeting:", error)
              }
            }
          }, 2000) // Delay de 2 segundos para conexión estable
        },
        
        onDisconnected: () => {
          console.log("🔌 Disconnected from Realtime API")
          setIsRealtimeConnected(false)
        },
        
        onError: (error) => {
          console.error("❌ Realtime API Error:", error)
          setIsRealtimeConnected(false)
        },
        
        onMessage: (message) => {
          console.log("📨 Received message:", message)
        },
        
        // 🎯 TRANSCRIPCIÓN DEL USUARIO - EN TIEMPO REAL CON DEBUG Y FILTRO DE SALUDO
        onUserTranscription: (transcript: string, isComplete: boolean) => {
          console.log(`📝 User: ${isComplete ? 'COMPLETE' : 'TYPING'} - "${transcript}"`) 
          console.log("🔍 Current states:", {
            currentUserTranscript,
            showUserTranscript,
            transcriptLength: transcript.length,
            isGreetingCommand: isGreetingCommandRef.current
          })
          
          // 👋 FILTRAR: No mostrar el PRIMER comando de saludo interno
          if (isGreetingCommandRef.current) {
            console.log("🙈 Filtering greeting command - not showing in chat")
            isGreetingCommandRef.current = false // Reset flag después del primer filtro
            return // No procesar este mensaje
          }
          
          if (isComplete) {
            console.log("✅ Finalizing complete user message")
            
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              content: transcript,
              isUser: true,
              timestamp: new Date(),
              type: "text",
            }
            
            // 💥 CRÍTICO: Si el agente está streaming, insertar ANTES del agente
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1]
              
              // Si el último mensaje es del agente (streaming), insertar usuario ANTES
              if (lastMessage && !lastMessage.isUser && currentAgentMessageIdRef.current) {
                console.log("🎯 INSERTING user message BEFORE streaming agent")
                // Insertar antes del último mensaje (agente)
                const beforeLast = prev.slice(0, -1)
                return [...beforeLast, userMessage, lastMessage]
              } else {
                // Agregar normalmente al final
                return [...prev, userMessage]
              }
            })
            
            // Limpiar transcripción temporal
            setCurrentUserTranscript("")
            setShowUserTranscript(false)
            
            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current)
              userTimeoutRef.current = null
            }
          } else {
            console.log("🎆 Setting live transcription:", transcript)
            // Transcripción parcial - mostrar en tiempo real
            setCurrentUserTranscript(transcript)
            setShowUserTranscript(true)
            currentTranscriptRef.current = transcript // Actualizar ref
            
            console.log("🔄 Updated states to:", {
              newTranscript: transcript,
              showFlag: true
            })
            
            // Timeout para auto-finalizar
            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current)
            }
            
            userTimeoutRef.current = setTimeout(() => {
              console.log("⏰ Timeout triggered - finalizing message")
              const finalTranscript = currentTranscriptRef.current.trim()
              if (finalTranscript) {
                const userMessage: Message = {
                  id: `user-${Date.now()}`,
                  content: finalTranscript,
                  isUser: true,
                  timestamp: new Date(),
                  type: "text",
                }
                
                setMessages(prev => [...prev, userMessage])
                setCurrentUserTranscript("")
                setShowUserTranscript(false)
                currentTranscriptRef.current = ""
              }
            }, 2000)
          }
        },
        
        // 🎯 AGENTE EMPIEZA - INSERTAR USUARIO ANTES DEL AGENTE CON FILTRO JSON
        onAgentTranscriptionDelta: (messageId: string, delta: string) => {
          console.log("🤖 Agent delta (raw):", delta)
          
          // 🚀 PRIMERA VEZ: Insertar mensaje del usuario ANTES del agente
          if (currentAgentMessageIdRef.current !== messageId && showUserTranscript && currentUserTranscript.trim()) {
            console.log("🎯 Agent starting - inserting user message BEFORE agent")
            
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              content: currentUserTranscript.trim(),
              isUser: true,
              timestamp: new Date(),
              type: "text",
            }
            
            // 💥 INSERTAR USUARIO Y LUEGO CREAR AGENTE EN EL ORDEN CORRECTO
            setMessages(prev => {
              // Agregar mensaje de usuario
              const withUser = [...prev, userMessage]
              
              // 🙏 FILTRAR JSON del delta antes de crear mensaje del agente
              const filteredDelta = filterJsonFromTranscript(delta)
              console.log("🎆 Filtered delta:", filteredDelta)
              
              // Luego agregar mensaje del agente (solo texto limpio)
              const agentMessage: Message = {
                id: messageId,
                content: filteredDelta,
                isUser: false,
                timestamp: new Date(),
                type: "text",
              }
              
              return [...withUser, agentMessage]
            })
            
            // Marcar que ya se creó el agente
            currentAgentMessageIdRef.current = messageId
            
            setCurrentUserTranscript("")
            setShowUserTranscript(false)
            currentTranscriptRef.current = ""
            
            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current)
              userTimeoutRef.current = null
            }
            
            setIsTyping(false)
          } else if (currentAgentMessageIdRef.current === messageId) {
            // 🙏 FILTRAR JSON del delta antes de actualizar
            const filteredDelta = filterJsonFromTranscript(delta) 
            console.log("🎆 Updating with filtered delta:", filteredDelta)
            
            // Actualizar contenido del agente existente (solo texto limpio)
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, content: filteredDelta }
                : msg
            ))
          } else if (currentAgentMessageIdRef.current !== messageId) {
            // 🙏 FILTRAR JSON antes de crear nuevo mensaje
            const filteredDelta = filterJsonFromTranscript(delta)
            
            // Crear nuevo mensaje del agente (sin usuario pendiente)
            console.log("🆕 Creating new agent message with filtered content:", filteredDelta)
            currentAgentMessageIdRef.current = messageId
            
            const agentMessage: Message = {
              id: messageId,
              content: filteredDelta,
              isUser: false,
              timestamp: new Date(),
              type: "text",
            }
            
            setMessages(prev => [...prev, agentMessage])
            setIsTyping(false)
          }
          
          // 📦 PROCESAR JSON para metadata (sin mostrarlo en transcripción)
          processJsonForMetadata(delta)
        },
        
        onAgentTranscriptionComplete: (messageId: string, fullTranscript: string) => {
          console.log("🤖 Agent complete (raw):", fullTranscript)
          
          // 🙏 FILTRAR JSON del transcript completo
          const filteredTranscript = filterJsonFromTranscript(fullTranscript)
          console.log("🎆 Agent complete (filtered):", filteredTranscript)
          
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: filteredTranscript }
              : msg
          ))
          
          // 📦 PROCESAR JSON final para metadata
          processJsonForMetadata(fullTranscript)
          
          currentAgentMessageIdRef.current = null
        },
        
        onMetadata: (metadata) => {
          console.log("📦 Products:", metadata)
          
          // Finalizar mensaje de usuario antes de productos
          if (showUserTranscript && currentUserTranscript.trim()) {
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              content: currentUserTranscript.trim(),
              isUser: true,
              timestamp: new Date(),
              type: "text",
            }
            
            setMessages(prev => [...prev, userMessage])
            setCurrentUserTranscript("")
            setShowUserTranscript(false)
            
            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current)
              userTimeoutRef.current = null
            }
          }
          
          if (metadata.JsonData?.products) {
            const productMessage: Message = {
              id: Date.now().toString(),
              content: metadata.TextMessage || "Aquí tienes algunos productos:",
              isUser: false,
              timestamp: new Date(),
              type: "product",
              product: metadata.JsonData.products
            }
            
            setMessages(prev => [...prev, productMessage])
          }
        }
      })
      
    } catch (error) {
      console.error("❌ Failed to initialize Realtime connection:", error)
    }
  }

  /** ESTO ES SOLO PARA LA PRUEBA  */
  const detectProductMention = (text: string): ProductInfo[] | null => {
    const lowerText = text.toLowerCase()

    if (lowerText.includes("nevera") || lowerText.includes("refrigerador") || lowerText.includes("frigorífico")) {
      return dataFake
    }

    return null
  };

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
    }

    const carouselMessage: Message = {
      id: Date.now().toString(),
      content: "",
      isUser: false,
      timestamp: new Date(),
      type: "multimedia",
      carousel: carouselInfo,
    }

    MultimediaStore.getState().setMultimediaStatus(true)
    setMessages((prev) => [...prev, carouselMessage])
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
      type: "text",
    }

    setMessages((prev) => [...prev, newMessage])

    const userInput = inputValue
    setInputValue("")

    setIsTyping(true)

    setTimeout(() => {
      const productInfo = detectProductMention(userInput)

      if (productInfo) {
        const productMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "",
          isUser: false,
          timestamp: new Date(),
          type: "product",
          product: productInfo && productInfo.length > 0 ? productInfo : null
        }
        setMessages((prev) => [...prev, productMessage])
        setIsTyping(false)

      } else {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "Perfecto, te ayudo a encontrar lo que necesitas. ¿Podrías ser más específico sobre el producto que buscas?",
          isUser: false,
          timestamp: new Date(),
          type: "text",
        }
        setMessages((prev) => [...prev, aiResponse])
        setIsTyping(false)
      }
    }, 2000)
  };

  const handleClose = () => {
    setShowSurvey(true)
  };

  const handleMinimize = () => {
    setIsOpen(false)
  };

  const handleStartSurvey = () => {
    setShowSurvey(false)
    setIsOpen(false)
  };

  const handleResumeChat = () => {
    setShowSurvey(false)
  }

  const handleCloseChat = async () => {
    setShowSurvey(false)
    setIsOpen(false)
    
    // Limpiar timeouts
    if (userTimeoutRef.current) {
      clearTimeout(userTimeoutRef.current)
      userTimeoutRef.current = null
    }
    
    // Desconectar realtime
    if (isRealtimeConnected) {
      try {
        await RealtimeService.disconnect()
        setIsRealtimeConnected(false)
      } catch (error) {
        console.error("❌ Error disconnecting from Realtime API:", error)
      }
    }
    
    // Limpiar estados
    setMessages([])
    setInputValue("")
    setCurrentUserTranscript("")
    setShowUserTranscript(false)
    currentAgentMessageIdRef.current = null
    currentTranscriptRef.current = ""
    isGreetingCommandRef.current = false // Limpiar flag de saludo
  }

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
        isTyping={isTyping}
        currentAgentMessageId={currentAgentMessageIdRef.current}
        showSurvey={showSurvey}
        onStartSurvey={handleStartSurvey}
        onResumeChat={handleResumeChat}
        onCloseChat={handleCloseChat}
        // 🎯 TRANSCRIPCIÓN EN TIEMPO REAL DEL USUARIO
        currentUserTranscript={currentUserTranscript}
        showUserTranscript={showUserTranscript}
      />
      <RealtimeStatus />
    </>
  )
}
