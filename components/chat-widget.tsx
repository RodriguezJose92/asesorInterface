"use client"

import { useState } from "react"
import { ChatButton } from "./chat-button"
import { ChatModal } from "./chat-modal"
import type { Message, ProductInfo, CarouselInfo } from "@/lib/types"
import { dataFake } from "@/utils/dataFake"
import { MultimediaStore } from "@/utils/stores/zustandStore"

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false) // Added isTyping state for typing indicator
  const [showSurvey, setShowSurvey] = useState(false)

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

    /** Message Structure */
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
        setIsTyping(false) // Hide typing indicator when showing product

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
        setIsTyping(false) // Hide typing indicator after AI response
      }
    }, 2000) // Increased delay to 2 seconds to show typing animation longer
  };

  const handleClose = () => {
    setShowSurvey(true)
  };

  const handleMinimize = () => {
    setIsOpen(false)
  };

  // Aquí se podría abrir un formulario de encuesta
  const handleStartSurvey = () => {

    setShowSurvey(false)
    setIsOpen(false)
  };

  const handleResumeChat = () => {
    setShowSurvey(false)
  }

  const handleCloseChat = () => {
    setShowSurvey(false)
    setIsOpen(false)
    // Limpiar el chat si es necesario
    setMessages([])
    setInputValue("")
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
        showSurvey={showSurvey}
        onStartSurvey={handleStartSurvey}
        onResumeChat={handleResumeChat}
        onCloseChat={handleCloseChat}
      />
    </>
  )
}
