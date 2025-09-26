import { EventTypes, EventPriority } from './EventTypes';

/**
 * Generic Event Interface
 * 
 * Defines the structure of an event with generic payload support.
 * T represents the type of the payload data.
 * 
 * @template T - The type of the event payload
 */
export interface IEvent<T = any> {
    /**
     * Unique identifier for this event instance
     */
    readonly id: string;

    /**
     * Type of event from EventTypes enum
     */
    readonly type: EventTypes;

    /**
     * Generic payload data
     */
    readonly payload: T;

    /**
     * Timestamp when the event was created
     */
    readonly timestamp: number;

    /**
     * Priority level for event processing
     */
    readonly priority: EventPriority;

    /**
     * Source component or service that emitted the event
     */
    readonly source?: string;

    /**
     * Additional metadata
     */
    readonly metadata?: Record<string, any>;
}

/**
 * Event Handler Function Interface
 * 
 * Defines the signature for event handler functions.
 * 
 * @template T - The type of the event payload
 */
export interface IEventHandler<T = any> {
    /**
     * Handler function that processes the event
     * @param event - The event object containing payload and metadata
     */
    (event: IEvent<T>): void | Promise<void>;
}

/**
 * Event Subscription Interface
 * 
 * Represents an active subscription to an event type.
 */
export interface IEventSubscription {
    /**
     * Unique subscription identifier
     */
    readonly id: string;

    /**
     * Event type this subscription is listening for
     */
    readonly eventType: EventTypes;

    /**
     * Handler function for this subscription
     */
    readonly handler: IEventHandler;

    /**
     * Priority of this subscription (higher = processed first)
     */
    readonly priority: EventPriority;

    /**
     * Whether this is a one-time subscription
     */
    readonly once: boolean;

    /**
     * Source component that created this subscription
     */
    readonly source?: string;

    /**
     * Unsubscribe function
     */
    unsubscribe(): void;
}

/**
 * Event Bus Interface
 * 
 * Defines the contract for the event bus service.
 */
export interface IEventBus {
    /**
     * Subscribe to an event type
     * 
     * @template T - Type of the event payload
     * @param eventType - Type of event to listen for
     * @param handler - Function to handle the event
     * @param options - Additional subscription options
     * @returns Subscription object with unsubscribe method
     */
    subscribe<T = any>(
        eventType: EventTypes,
        handler: IEventHandler<T>,
        options?: ISubscriptionOptions
    ): IEventSubscription;

    /**
     * Subscribe to an event type for one-time handling
     * 
     * @template T - Type of the event payload
     * @param eventType - Type of event to listen for
     * @param handler - Function to handle the event
     * @param options - Additional subscription options
     * @returns Subscription object
     */
    once<T = any>(
        eventType: EventTypes,
        handler: IEventHandler<T>,
        options?: ISubscriptionOptions
    ): IEventSubscription;

    /**
     * Emit an event
     * 
     * @template T - Type of the event payload
     * @param eventType - Type of event to emit
     * @param payload - Data to include with the event
     * @param options - Additional emission options
     */
    emit<T = any>(
        eventType: EventTypes,
        payload: T,
        options?: IEmissionOptions
    ): void;

    /**
     * Emit an event asynchronously
     * 
     * @template T - Type of the event payload
     * @param eventType - Type of event to emit
     * @param payload - Data to include with the event
     * @param options - Additional emission options
     * @returns Promise that resolves when all handlers complete
     */
    emitAsync<T = any>(
        eventType: EventTypes,
        payload: T,
        options?: IEmissionOptions
    ): Promise<void>;

    /**
     * Unsubscribe from an event type
     * 
     * @param subscriptionId - ID of the subscription to remove
     */
    unsubscribe(subscriptionId: string): boolean;

    /**
     * Remove all subscriptions for a specific event type
     * 
     * @param eventType - Event type to clear
     */
    unsubscribeAll(eventType: EventTypes): void;

    /**
     * Clear all subscriptions
     */
    clear(): void;

    /**
     * Get all active subscriptions
     */
    getSubscriptions(): IEventSubscription[];

    /**
     * Get subscriptions for a specific event type
     */
    getSubscriptions(eventType: EventTypes): IEventSubscription[];
}

/**
 * Subscription Options Interface
 */
export interface ISubscriptionOptions {
    /**
     * Priority level for this subscription
     */
    priority?: EventPriority;

    /**
     * Source identifier for debugging
     */
    source?: string;

    /**
     * Whether this subscription should only fire once
     */
    once?: boolean;
}

/**
 * Emission Options Interface
 */
export interface IEmissionOptions {
    /**
     * Priority level for this event
     */
    priority?: EventPriority;

    /**
     * Source identifier for debugging
     */
    source?: string;

    /**
     * Additional metadata to include
     */
    metadata?: Record<string, any>;

    /**
     * Delay emission by specified milliseconds
     */
    delay?: number;
}

/**
 * Event Bus Configuration Interface
 */
export interface IEventBusConfig {
    /**
     * Enable debug logging
     */
    debug?: boolean;

    /**
     * Maximum number of subscriptions per event type
     */
    maxSubscriptionsPerEvent?: number;

    /**
     * Enable event history tracking
     */
    enableHistory?: boolean;

    /**
     * Maximum number of events to keep in history
     */
    maxHistorySize?: number;
}