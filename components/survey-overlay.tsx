"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, ChevronDown } from "lucide-react"
import { DetailedSurvey } from "./detailed-survey"
import { dataLanguage } from "@/languajes/data";
import { useLanguageStore } from "@/store/useLanguageStore"

interface SurveyOverlayProps {
  onStartSurvey: () => void
  onResumeChat: () => void
  onCloseChat: () => void
}

export function SurveyOverlay({ onStartSurvey, onResumeChat, onCloseChat }: SurveyOverlayProps) {
  const [showDetailedSurvey, setShowDetailedSurvey] = useState(false)
  const { languageCurrent } = useLanguageStore()

  const handleStartSurvey = () => {
    setShowDetailedSurvey(true)
  }

  const handleSurveyComplete = () => {
    setShowDetailedSurvey(false)
    onCloseChat() // Close chat after survey completion
  }

  const handleSurveyClose = () => {
    setShowDetailedSurvey(false)
  }

  if (showDetailedSurvey) {
    return <DetailedSurvey onClose={handleSurveyClose} onComplete={handleSurveyComplete} />
  }

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">My Kit-Ai</h3>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
          <Button variant="ghost" size="icon" onClick={onCloseChat} className="h-6 w-6 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <p className="text-gray-700 text-sm leading-relaxed">
            {
              languageCurrent && dataLanguage.survey[languageCurrent][0]
            }
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button onClick={handleStartSurvey} className="w-full bg-[#c41230] text-white h-11">
            {
              languageCurrent && dataLanguage.survey[languageCurrent][1]
            }
          </Button>

          <Button
            variant="outline"
            onClick={onResumeChat}
            className="w-full border-[#c41230] text-[#c41230] h-11 bg-transparent"
          >
            {
              languageCurrent && dataLanguage.survey[languageCurrent][2]
            }
          </Button>

          <Button
            variant="outline"
            onClick={onCloseChat}
            className="w-full border-[#c41230] text-[#c41230] h-11 bg-transparent"
          >
            {
              languageCurrent && dataLanguage.survey[languageCurrent][3]
            }
          </Button>
        </div>
      </Card>
    </div>
  )
}
