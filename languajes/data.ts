interface dataLanguaheProps {
    welcome: {
        es: string[]
        en: string[]
    },
    chatMessage: {
        es: string[]
        en: string[]
    },
    inputMessage: {
        es: string[]
        en: string[]
    },
    survey: {
        es: string[]
        en: string[]
    },
    realSurvey: {
        es: string[]
        en: string[]
    }
}

export const dataLanguage: dataLanguaheProps = {
    welcome: {
        es: [
            "Mi Kit AI",
            "Tu asistente Ai kitchenAid",
            "Bienvenido",
            "Encuentra la solución perfecta para tu cocina"

        ],
        en: [
            "My Kit AI",
            "Your AI Kitchen Assitant",
            "Tu asistente Ai kitchenAid",
            "Welcome.",
            "¡Get ready to find your perfect kitchen solution!"
        ]
    },
    chatMessage: {
        es: [
            "My Kit-Ai funciona con inteligencia artificial y puede cometer errores. Nunca comparta información personal sensible ",
            "Ver Aviso de Privacidad y Términos de Uso"
        ],
        en: [
            "My Kit-Ai uses artificial intelligence and may make mistakes. Never share sensitive personal information.",
            "See Privacy Notice and Terms of Use."
        ]
    },
    inputMessage: {
        es: [
            "Escuchando, listo para ayudar",
            "Preguntame lo que quieras"
        ],
        en: [
            "Listening, ready to help",
            "Ask me anything."
        ]
    },
    survey: {
        es: [
            "Antes de salir, ayúdanos a mejorar la experiencia de chat respondiendo esta breve encuesta.",
            "Empezar la encuesta",
            "Reanudar el chat",
            "Cerrar el chat"
        ],
        en: [
            "Before you leave, help us improve the chat experience by answering this short survey.",
            "Start the survey",
            "Resume chat",
            "Close chat"
        ]
    },
    realSurvey: {
        es: [
            "Encuesta rápida",
            "¿Recibiste las respuestas o la ayuda que necesitabas para resolver tu problema?",
            "¿Por qué te sentiste así?",
            "(opcional)",
            "Selecciona todas las opciones que correspondan:",
            "Buena comunicación",
            "Problema resuelto",
            "Tono amable",
            "Guía útil",
            "Atención rápida",
            "¿Quieres compartir algún otro detalle adicional? (opcional)",
            "Escribe tus comentarios...",
            "Enviar comentarios"
        ],
        en: [
            "Quick survey",
            "Did you get the answers or help you needed to resolve your issue?",
            "Why did you feel that way?",
            "(optional)",
            "Select all options that apply:",
            "Good communication",
            "Problem solved",
            "Friendly tone",
            "Helpful guide",
            "Fast response",
            "Would you like to share any additional details? (optional)",
            "Write your comments...",
            "Submit feedback"
        ]
    }
}