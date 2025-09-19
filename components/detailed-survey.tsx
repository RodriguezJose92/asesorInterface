"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { X, ThumbsUp, ThumbsDown } from "lucide-react"
import { useLanguageStore } from "@/store/useLanguageStore"
import { dataLanguage } from "@/languajes/data"

interface DetailedSurveyProps {
  onClose: () => void
  onComplete: () => void
}

export function DetailedSurvey({ onClose, onComplete }: DetailedSurveyProps) {
  const [satisfaction, setSatisfaction] = useState<"yes" | "no" | null>(null)
  const [reasons, setReasons] = useState<string[]>([])
  const [comments, setComments] = useState("")
  const { languageCurrent } = useLanguageStore()

  const reasonOptions = [

    languageCurrent && dataLanguage.realSurvey[languageCurrent][5],
    languageCurrent && dataLanguage.realSurvey[languageCurrent][6],
    languageCurrent && dataLanguage.realSurvey[languageCurrent][7],
    languageCurrent && dataLanguage.realSurvey[languageCurrent][8],
    languageCurrent && dataLanguage.realSurvey[languageCurrent][9],

  ]

  const toggleReason = (reason: string) => {
    setReasons((prev) => (prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]))
  }

  const handleSubmit = () => {
    // Aquí se enviarían los datos de la encuesta
    console.log("[v0] Survey data:", { satisfaction, reasons, comments })
    onComplete()
  }

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-200 p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">
            {
              languageCurrent && dataLanguage.realSurvey[languageCurrent][0]
            }
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Question 1 */}
          <div>
            <h4 className="font-medium text-gray-900 text-sm mb-4 leading-relaxed">
              {
                languageCurrent && dataLanguage.realSurvey[languageCurrent][1]
              }
            </h4>
            <div className="flex gap-3 justify-center">
              <Button
                variant={satisfaction === "yes" ? "default" : "outline"}
                size="lg"
                onClick={() => setSatisfaction("yes")}
                className={`w-16 h-16 p-0 ${satisfaction === "yes" ? "bg-[#c41230] " : "border-[#c41230]"
                  }`}
              >
                <ThumbsUp className="w-6 h-6" />
              </Button>
              <Button
                variant={satisfaction === "no" ? "default" : "outline"}
                size="lg"
                onClick={() => setSatisfaction("no")}
                className={`w-16 h-16 p-0 ${satisfaction === "no" ? "bg-[#c41230] " : "border-[#c41230]"
                  }`}
              >
                <ThumbsDown className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Question 2 */}
          <div>
            <h4 className="font-medium text-gray-900 text-sm mb-2">
              {
                languageCurrent && dataLanguage.realSurvey[languageCurrent][2]
              }
              <span className="text-gray-500 font-normal">
                {
                  languageCurrent && dataLanguage.realSurvey[languageCurrent][3]
                }
              </span>
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              {
                languageCurrent && dataLanguage.realSurvey[languageCurrent][4]
              }
            </p>
            <div className="flex flex-wrap gap-2">
              {reasonOptions.map((reason) => (
                <Button
                  key={reason}
                  variant={reasons.includes(reason) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleReason(reason)}
                  className={`text-xs h-8 ${reasons.includes(reason)
                    ? "bg-[#c41230] text-white"
                    : "border-[#c41230] text-[#c41230]"
                    }`}
                >
                  {reason}
                </Button>
              ))}
            </div>
          </div>

          {/* Question 3 */}
          <div>
            <h4 className="font-medium text-gray-900 text-sm mb-2">
              {
                languageCurrent && dataLanguage.realSurvey[languageCurrent][10]
              }
              {" "}
              <span className="text-gray-500 font-normal">
                {
                  languageCurrent && dataLanguage.realSurvey[languageCurrent][3]
                }
              </span>
            </h4>
            <div className="relative">
              <Textarea
                placeholder={
                  languageCurrent && dataLanguage.realSurvey[languageCurrent][11]
                }
                value={comments}
                onChange={(e) => setComments(e.target.value.slice(0, 250))}
                className="min-h-[100px] text-sm resize-none border-[#c41230]"
                maxLength={250}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">{comments.length}/250</div>
            </div>
          </div>

          {/* Submit Button */}
          <Button onClick={handleSubmit} className="w-full bg-[#c41230] text-white h-11 mt-6">
            {
              languageCurrent && dataLanguage.realSurvey[languageCurrent][12]
            }
          </Button>
        </div>
      </Card>
    </div>
  )
}
