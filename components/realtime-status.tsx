"use client"

import { useRealtime, RealtimeMessage } from "@/hooks/useRealtime"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Mic, Volume2 } from "lucide-react"

export function RealtimeStatus() {
  const {
    isConnected,
    isConnecting,
    connectionError,
    messages,
    audioData,
    clearMessages,
    clearAudio,
    stopRealtime
  } = useRealtime()

  if (!isConnected && !isConnecting && !connectionError) {
    return null
  }

  return (
    <Card className="fixed top-4 right-4 w-80 max-h-96 p-4 bg-white/95 backdrop-blur-sm shadow-lg z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mic className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
          <span className="font-medium text-sm">
            {isConnecting ? 'Connecting...' : isConnected ? 'Realtime Active' : 'Disconnected'}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={stopRealtime}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {connectionError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          Error: {connectionError}
        </div>
      )}

      {/* Audio indicator */}
      {audioData.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-sm text-blue-600">
          <Volume2 className="w-4 h-4" />
          <span>{audioData.length} audio chunks received</span>
          <Button
            size="sm"
            variant="outline"
            onClick={clearAudio}
            className="h-6 px-2 text-xs"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Messages ({messages.length})</span>
            <Button
              size="sm"
              variant="outline"
              onClick={clearMessages}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-2">
            {messages.slice(-5).map((message: RealtimeMessage) => (
              <div
                key={message.id}
                className={`p-2 rounded text-xs ${
                  message.type === 'text' ? 'bg-blue-50 border-l-2 border-blue-400' :
                  message.type === 'response' ? 'bg-green-50 border-l-2 border-green-400' :
                  message.type === 'error' ? 'bg-red-50 border-l-2 border-red-400' :
                  'bg-gray-50 border-l-2 border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${
                    message.type === 'text' ? 'text-blue-600' :
                    message.type === 'response' ? 'text-green-600' :
                    message.type === 'error' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {message.type.toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-gray-700">
                  {typeof message.content === 'string' 
                    ? message.content 
                    : JSON.stringify(message.content).substring(0, 100) + '...'
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {messages.length === 0 && isConnected && (
        <div className="text-center text-sm text-gray-500 py-4">
          Realtime session active. Start speaking or typing!
        </div>
      )}
    </Card>
  )
}
