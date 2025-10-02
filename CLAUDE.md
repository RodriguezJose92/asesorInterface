# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 application built as a voice-powered product catalog assistant interface using OpenAI's Realtime API. It features a conversational AI chat widget with real-time audio transcription and multilingual support for recommending home appliances.

## Development Commands

- **Development**: `npm run dev` - Start development server on http://localhost:3000
- **Build**: `npm run build` - Build production version
- **Production**: `npm start` - Start production server
- **Lint**: `npm run lint` - Run ESLint checks

## Architecture & Key Components

### Core Technology Stack
- **Framework**: Next.js 14 with App Router
- **UI Components**: Radix UI + custom shadcn/ui components
- **Styling**: Tailwind CSS with CSS variables
- **State Management**: Zustand for store management
- **Real-time Communication**: OpenAI Realtime API via WebSockets
- **Audio Processing**: Browser Web Audio API for voice input/output

### Main Application Structure

**Entry Points:**
- `app/page.tsx` - Main landing page with ChatWidget
- `app/layout.tsx` - Root layout with fonts and Toaster setup

**Core Chat System:**
- `components/chat-widget.tsx` - Main chat interface controller
- `components/chat-modal.tsx` - Chat modal UI container
- `components/chat-messages.tsx` - Message rendering and display
- `components/chat-input.tsx` - Voice and text input handling

**Realtime Voice Service:**
- `components/services/RealtimeService.ts` - **Critical singleton service** managing OpenAI Realtime API connections, audio transcription, and multilingual support
- `components/services/SessionService.ts` - Token management for API authentication
- `hooks/useRealtime.ts` - React hook for realtime functionality

### Key Features & Implementation

**Voice Interaction System:**
- Real-time audio transcription for both user and agent
- Dual-output system: natural spoken responses + structured JSON product data
- Automatic language detection and multilingual support (ES/EN/FR)
- Product recommendation engine with SKU-based catalog system

**Product Catalog Integration:**
- `utils/products-catalog.json` - Product database with categories, specs, pricing
- `components/popup-product-card.tsx` - Interactive product display cards
- Dynamic product filtering and recommendation logic based on user needs

**State Management:**
- `store/useLanguageStore.ts` - Language preference and detection
- `store/useQuickOptionsStore.ts` - Quick action buttons state
- `utils/stores/zustandStore.ts` - Multimedia and general app state

### Critical Architecture Notes

**Realtime Service Singleton Pattern:**
The `RealtimeService` is the heart of the application - it must maintain a single instance across the app to manage WebSocket connections properly. It handles:
- Connection lifecycle management
- Audio transcription event processing
- Multilingual instruction generation
- Product metadata tool integration
- Language change detection and adaptation

**Dual Output System:**
Every product recommendation generates two distinct outputs:
1. **Audio Response**: Natural conversational speech in user's language
2. **Product Metadata**: Structured JSON data sent via `send_product_metadata` tool function

**Tool Integration Pattern:**
Product recommendations are handled through OpenAI function calling:
```typescript
// Agent calls this tool with specific SKUs
{
  "product_skus": ["ECO200-FL", "SWP500-FL"],
  "reasoning": "Compact washers perfect for small spaces"
}
```

## Important Development Guidelines

**Working with Realtime Service:**
- Always use `RealtimeService.getInstance()` - never create new instances
- Connection setup requires proper callback handling for transcription events
- Language switching updates agent instructions dynamically
- Audio transcription filtering removes JSON artifacts from speech display

**Message Flow Architecture:**
1. User speaks → Real-time transcription → Display as typing
2. Agent processes → Function call for products → Metadata sent to UI
3. Agent responds → Filtered speech transcription → Audio playback
4. Product cards rendered from metadata, not from speech content

**Multilingual Implementation:**
- Language detection happens at multiple levels (browser, user input, explicit switching)
- Agent instructions are regenerated per language change
- All UI text and responses adapt to current language context
- Product descriptions and reasoning adapt to cultural context

**Critical Dependencies:**
- `@openai/agents-realtime` - Core realtime functionality
- `socket.io-client` - WebSocket communication fallback
- `zustand` - State management across components
- All Radix UI components for consistent interactions

**File Organization Logic:**
- `/components/services/` - API integration and external service connections
- `/components/ui/` - Reusable shadcn/ui components
- `/utils/stores/` - Zustand store implementations
- `/languajes/` - Multilingual data and translations

## Backend Integration

The application requires a separate backend service running on port 5052 for ephemeral token generation:
- Endpoint: `http://localhost:5052/session`
- Returns OpenAI Realtime API client secrets
- See `docs/REALTIME_SYSTEM_DOCUMENTATION.md` for complete backend setup

**Environment Setup:**
Backend requires `OPENAI` API key environment variable with Realtime API access.

## Testing & Development

When working with the realtime system:
1. Ensure backend is running before testing voice features
2. Browser permissions required for microphone access
3. Test language switching with different input languages
4. Verify product metadata displays correctly alongside audio responses
5. Check WebSocket connection status via `RealtimeStatus` component

## State Management Patterns

The app uses a hybrid approach:
- **Zustand stores** for cross-component state (language, multimedia status)
- **Component state** for UI interactions and form data
- **RealtimeService callbacks** for real-time event handling
- **Ref patterns** for managing async transcription states

This architecture enables smooth real-time interactions while maintaining predictable state updates across the voice interface.