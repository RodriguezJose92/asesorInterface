/**
 * EventBus System - Main Export File
 * 
 * Central export point for the entire EventBus system.
 * Import from here to access all EventBus functionality.
 * 
 * @example
 * ```typescript
 * import { 
 *   EventBusService, 
 *   EventTypes, 
 *   useEventBus,
 *   Show3DPayload 
 * } from '@/lib/events';
 * ```
 */

// Core EventBus exports
export { EventBusService } from './EventBusService';
export { EventTypes, EventPriority } from './EventTypes';

// Interface and type exports
export type {
    IEvent,
    IEventHandler,
    IEventSubscription,
    IEventBus,
    ISubscriptionOptions,
    IEmissionOptions,
    IEventBusConfig
} from './EventInterfaces';

// Payload type exports
export type {
    I3DContent,
    IMultimediaContent,
    IUIUpdatePayload,
    IUserInteractionPayload,
    Show3DPayload,
    ShowMultimediaPayload,
    Hide3DPayload,
    HideMultimediaPayload,
    EventPayloadMap
} from './EventPayloads';

// React hook exports (re-export from hooks directory)
export { 
    useEventBus, 
    useEventSubscription, 
    useEventEmitter,
    useEventBusDebug 
} from '../../hooks/useEventBus';

// Example components (optional - remove if not needed in production)
export {
    EventBusBasicExample,
    EventBusSubscriptionExample,
    EventBusAdvancedExample,
    ChatWithEventBusExample,
    EventBusConfigExample
} from './EventBusExamples';