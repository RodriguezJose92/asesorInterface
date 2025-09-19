"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChatHeader } from "./chat-header"
import { WelcomeMessage } from "./welcome-message"
import { AutoSlider } from "./auto-slider"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { SurveyOverlay } from "./survey-overlay"
import type { Message } from "@/lib/types"
import { Dispatch, SetStateAction } from "react"

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  onMinimize: () => void
  messages: Message[]
  inputValue: string
  onInputChange: (value: string) => void
  onSendMessage: () => void
  onMultimediaClick?: (productName: string) => void
  onProductSelect?: (product: any, action: 'add_to_cart' | 'multimedia') => void
  isTyping?: boolean
  showSurvey: boolean
  onStartSurvey: () => void
  onResumeChat: () => void
  onCloseChat: () => void
  // 🎯 PROPS LIMPIAS para transcripción
  currentAgentMessageId?: string | null
  currentUserTranscript?: string
  showUserTranscript?: boolean
  // Props para el mensaje de bienvenida
  StatusWelcolmeMessage: boolean,
  setterStatusWelcomeMessage: Dispatch<SetStateAction<boolean>>,
}

export function ChatModal({
  isOpen,
  onClose,
  onMinimize,
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  onMultimediaClick,
  onProductSelect,
  isTyping,
  showSurvey,
  onStartSurvey,
  onResumeChat,
  onCloseChat,
  // 🎯 PROPS LIMPIAS
  currentAgentMessageId,
  currentUserTranscript,
  showUserTranscript,
  StatusWelcolmeMessage,
  setterStatusWelcomeMessage,
}: ChatModalProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        {/* <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onMinimize} /> */}

        {/* Chat Container */}
        <Card
          className={cn(
            "relative w-full max-w-md h-[100dvh] grid grid-rows-[auto_1fr] p-[0px]",
            "bg-white/80 backdrop-blur-xl",
            "shadow-2xl overflow-hidden",
            "animate-in zoom-in-95 duration-300",
            "md:max-w-lg lg:max-w-xl xl:max-w-2xl",
          )}
        >
          {/* Chat Header */}
          <div className="grid-row-span-1 relative z-[50]">
            <ChatHeader onClose={onClose} onMinimize={onMinimize} />
          </div>

          {/* Chat Content */}
          <div className="grid-row-span-1 grid grid-rows-[1fr_auto_auto] overflow-hidden min-h-0">

            {/*chat messages"*/}
            <div className="row-span-1 overflow-auto min-h-0">
              <ChatMessages
                messages={messages}
                onMultimediaClick={onMultimediaClick}
                onProductSelect={onProductSelect}
                isTyping={isTyping}
                currentAgentMessageId={currentAgentMessageId}
                // 🎯 PROPS LIMPIAS - Solo lo necesario
                currentUserTranscript={currentUserTranscript}
                showUserTranscript={showUserTranscript}
              />
            </div>


            {/* Chat Input */}
            <div className="column-span-1">
              <ChatInput value={inputValue} onChange={onInputChange} onSend={onSendMessage} />
            </div>
          </div>

          {/* Survey Overlay */}
          {showSurvey && (
            <SurveyOverlay onStartSurvey={onStartSurvey} onResumeChat={onResumeChat} onCloseChat={onCloseChat} />
          )}
        </Card>
      </div>
      <WelcomeMessage status={StatusWelcolmeMessage} setter={setterStatusWelcomeMessage} />
    </>
  )
}
