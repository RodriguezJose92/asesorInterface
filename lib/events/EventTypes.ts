/**
 * Event Types Enumeration
 * 
 * Defines all available event types in the system for type-safe event handling.
 * Add new event types here to maintain centralized event management.
 * 
 * @author Your Event Bus System
 * @version 1.0.0
 */
export enum EventTypes {
    /**
     * Event to show 3D visualization or content
     * Payload should contain 3D-related data
     */
    SHOW_3D = 'SHOW_3D',

    /**
     * Event to show multimedia content (video, audio, images)
     * Payload should contain multimedia-related data
     */
    SHOW_MULTIMEDIA = 'SHOW_MULTIMEDIA',

    /**
     * Event to hide 3D content
     * Can be used to toggle off 3D visualization
     */
    HIDE_3D = 'HIDE_3D',

    /**
     * Event to hide multimedia content
     * Can be used to close multimedia displays
     */
    HIDE_MULTIMEDIA = 'HIDE_MULTIMEDIA',

    /**
     * Generic UI update event
     * For general UI state changes
     */
    UI_UPDATE = 'UI_UPDATE',

    /**
     * User interaction event
     * For tracking user actions
     */
    USER_INTERACTION = 'USER_INTERACTION'
}

/**
 * Type helper to get all possible event type values
 */
export type EventTypeValues = `${EventTypes}`;

/**
 * Event priority levels for handling order
 */
export enum EventPriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    CRITICAL = 3
}