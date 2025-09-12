"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Mic, MicOff, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useRealtime } from "@/hooks/useRealtime"
import { toast } from "sonner"
import microphone from "@/utils/call/Microphone"


interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
};

export function ChatInput({ value, onChange, onSend }: ChatInputProps) {
  // Local state for UI
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);

  // Realtime hook for OpenAI integration
  const {
    isConnected: isRealtimeConnected,
    isConnecting: isRealtimeConnecting,
    connectionError,
    startRealtime,
    stopRealtime,
    sendMessage: sendRealtimeMessage,
    messages: realtimeMessages,
    clearMessages: clearRealtimeMessages,
    audioData
  } = useRealtime();

  const verifyStatusMic = () => {
    const micStatus = microphone.statusMic
    alert(!micStatus)
    microphone.handlerStatusdMic(!micStatus)
  }

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      toast.error(`Realtime Error: ${connectionError}`);
      setIsRealtimeActive(false);
    }
  }, [connectionError]);

  // Handle realtime messages
  useEffect(() => {
    if (realtimeMessages.length > 0) {
      const latestMessage = realtimeMessages[realtimeMessages.length - 1];

      if (latestMessage.type === 'response') {
        toast.success("🤖 AI Response received");
      } else if (latestMessage.type === 'error') {
        toast.error(`Error: ${latestMessage.content}`);
      }
    }
  }, [realtimeMessages]);

  // Handle audio data
  useEffect(() => {
    if (audioData.length > 0) {
      toast.success(`🔊 Audio received: ${audioData.length} chunks`);
    }
  }, [audioData]);


  /**
   * Handles starting/stopping the realtime session
   */
  const handleRealtimeToggle = async () => {
    try {
      if (!isRealtimeConnected && !isRealtimeConnecting) {
        // Start realtime session
        toast.info("🔄 Starting OpenAI Realtime session...");
        await startRealtime();
        setIsRealtimeActive(true);
        toast.success("🎤 Realtime session active");
      } else if (isRealtimeConnected) {
        // Stop realtime session
        toast.info("🔄 Stopping realtime session...");
        await stopRealtime();
        setIsRealtimeActive(false);
        clearRealtimeMessages();
        toast.success("🔌 Realtime session ended");
      }
    } catch (error) {
      console.error("Error managing realtime session:", error);
      toast.error("Failed to manage realtime session");
      setIsRealtimeActive(false);
    }
  };

  /**
   * Sends a message through realtime when connected
   */
  const handleRealtimeMessage = async () => {
    if (!value.trim()) {
      toast.warning("Please enter a message first");
      return;
    }

    if (!isRealtimeConnected) {
      toast.error("Not connected to realtime. Start session first.");
      return;
    }

    try {
      await sendRealtimeMessage(value);
      onChange(""); // Clear input after sending
      toast.success("📤 Message sent via realtime");
    } catch (error) {
      console.error("Error sending realtime message:", error);
      toast.error("Failed to send message via realtime");
    }
  };

  /**
   * Enhanced send function that can use realtime or regular chat
   */
  const handleEnhancedSend = () => {
    if (isRealtimeConnected && value.trim()) {
      handleRealtimeMessage();
    } else {
      onSend();
    }
  };

  const hasText = value.trim().length > 0;
  const isLoading = isRealtimeConnecting;
  const [showRealtimeIndicator, setShowRealtimeIndicator] = useState<boolean>(false)

  return (
    <div className="px-[10px] py-[2px] rounded-[10px] shadow-[0_0_3px_#c41230] w-[95%] mx-auto mb-[10px]">
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`${showRealtimeIndicator ? "Realtime Active - Type or speak..." : "Escribe tu pregunta"}`}
            className="bg-[transparent] border-[transparent] text-gray-800 placeholder:text-gray-500 inputUser focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-0 w-[90%]"
            onKeyPress={(e) => e.key === "Enter" && handleEnhancedSend()}
          />
          <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 w-[max-content] overflow-auto ${hasText ? '' : 'w-[0px]'}`}>
            <Button
              onClick={handleEnhancedSend}
              size="icon"
              className={`h-8 w-8 rounded-full ${hasText ? "flex" : "hidden"} ${isRealtimeConnected ? "bg-green-600 hover:bg-green-700" : "bg-[#c41230] hover:bg-[#c41230]"
                }`}
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {!hasText && (
          <>
            <Button
              size="icon"
              variant="outline"
              disabled={isLoading}
              className={`h-8 w-8 transition-all duration-200 rounded-full border-[#c41230] text-[#c41230] hover:bg-[transparent] 
              ${showRealtimeIndicator ? "bg-green-100 border-green-500 text-green-600" : "bg-[transparent] border-[1px]"}
              ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={verifyStatusMic}
              title={isRealtimeConnected ? "Stop Realtime Session" : "Start Realtime Session"}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : showRealtimeIndicator ? (
                <MicOff className={`w-4 h-4`} />
              ) : (
                <Mic className={`w-4 h-4`} />
              )}
            </Button>
            <Button
              size="sm"
              disabled={isLoading}
              className={`transition-all duration-200 rounded-full text-white px-[12px]
              ${showRealtimeIndicator ? "h-8 w-[auto] bg-green-600 hover:bg-green-700" : "h-8 w-8 bg-[#c41230] hover:bg-[#c41230]"}
              ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleRealtimeToggle}
              title={isRealtimeConnected ? "End Realtime Session" : "Start Realtime Session"}
            >
              <div className={`flex items-center gap-1`}>
                <div className="flex gap-0.5 items-center justify-center">
                  <div className={`w-[2px] h-3 bg-white rounded ${showRealtimeIndicator ? "animate-pulse" : ""}`}></div>
                  <div className={`w-[2px] h-2 bg-white rounded ${showRealtimeIndicator ? "animate-pulse delay-75" : ""}`}></div>
                  <div className={`w-[2px] h-4 bg-white rounded ${showRealtimeIndicator ? "animate-pulse delay-150" : ""}`}></div>
                  <div className={`w-[2px] h-2 bg-white rounded ${showRealtimeIndicator ? "animate-pulse delay-75" : ""}`}></div>
                </div>
                <span className={`text-xs font-medium  ${showRealtimeIndicator ? "flex " : "hidden"}`}>
                  {isRealtimeConnected ? "End" : "Starting..."}
                </span>
              </div>
            </Button>
          </>
        )}
      </div>

      {/* Realtime Status Indicator */}
      {showRealtimeIndicator && (
        <div className="mt-2 text-xs text-center">
          <span className={`px-2 py-1 rounded-full text-white ${isRealtimeConnected ? "bg-green-500" : "bg-yellow-500"
            }`}>
            {isRealtimeConnected ? "🎤 Realtime Active" : "🔄 Connecting..."}
          </span>
        </div>
      )}

      {/* Messages count indicator */}
      {realtimeMessages.length > 0 && (
        <div className="mt-1 text-xs text-gray-500 text-center">
          {realtimeMessages.length} realtime message{realtimeMessages.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
