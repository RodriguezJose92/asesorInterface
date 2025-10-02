'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { EventBusService } from '../lib/events/EventBusService';
import { EventTypes, EventPriority } from '../lib/events/EventTypes';
import { 
    IEventHandler, 
    IEventSubscription, 
    ISubscriptionOptions, 
    IEmissionOptions 
} from '../lib/events/EventInterfaces';

/**
 * React Hook for EventBus Integration
 * 
 * Provides easy access to the EventBus system within React components.
 * Handles automatic cleanup of subscriptions when components unmount.
 * 
 * @returns EventBus interface for React components
 */
export function useEventBus() {
    const eventBus = useMemo(() => EventBusService.getInstance(), []);
    const subscriptionsRef = useRef<Set<string>>(new Set());

    /**
     * Subscribe to an event type with automatic cleanup
     */
    const subscribe = useCallback(<T = any>(
        eventType: EventTypes,
        handler: IEventHandler<T>,
        options: ISubscriptionOptions = {}
    ): IEventSubscription => {
        const subscription = eventBus.subscribe(eventType, handler, {
            ...options,
            source: options.source || 'useEventBus-hook'
        });

        // Track subscription for cleanup
        subscriptionsRef.current.add(subscription.id);

        // Override unsubscribe to remove from tracking
        const originalUnsubscribe = subscription.unsubscribe;
        (subscription as any).unsubscribe = () => {
            subscriptionsRef.current.delete(subscription.id);
            return originalUnsubscribe();
        };

        return subscription;
    }, [eventBus]);

    /**
     * Subscribe to an event type for one-time handling
     */
    const once = useCallback(<T = any>(
        eventType: EventTypes,
        handler: IEventHandler<T>,
        options: ISubscriptionOptions = {}
    ): IEventSubscription => {
        const subscription = eventBus.once(eventType, handler, {
            ...options,
            source: options.source || 'useEventBus-hook-once'
        });

        // Track subscription for cleanup (though it will auto-remove)
        subscriptionsRef.current.add(subscription.id);

        return subscription;
    }, [eventBus]);

    /**
     * Emit an event
     */
    const emit = useCallback(<T = any>(
        eventType: EventTypes,
        payload: T,
        options: IEmissionOptions = {}
    ): void => {
        eventBus.emit(eventType, payload, {
            ...options,
            source: options.source || 'useEventBus-hook'
        });
    }, [eventBus]);

    /**
     * Emit an event asynchronously
     */
    const emitAsync = useCallback(async <T = any>(
        eventType: EventTypes,
        payload: T,
        options: IEmissionOptions = {}
    ): Promise<void> => {
        return eventBus.emitAsync(eventType, payload, {
            ...options,
            source: options.source || 'useEventBus-hook'
        });
    }, [eventBus]);

    /**
     * Unsubscribe from a specific event
     */
    const unsubscribe = useCallback((subscriptionId: string): boolean => {
        subscriptionsRef.current.delete(subscriptionId);
        return eventBus.unsubscribe(subscriptionId);
    }, [eventBus]);

    /**
     * Get all active subscriptions from this hook
     */
    const getActiveSubscriptions = useCallback((): string[] => {
        return Array.from(subscriptionsRef.current);
    }, []);

    // Cleanup all subscriptions when component unmounts
    useEffect(() => {
        return () => {
            const subscriptionIds = Array.from(subscriptionsRef.current);
            subscriptionIds.forEach(id => {
                eventBus.unsubscribe(id);
            });
            subscriptionsRef.current.clear();
        };
    }, [eventBus]);

    return {
        subscribe,
        once,
        emit,
        emitAsync,
        unsubscribe,
        getActiveSubscriptions,
        // Direct access to EventBus for advanced usage
        eventBus
    };
}

/**
 * Hook for subscribing to a specific event type with automatic cleanup
 * 
 * @param eventType - Event type to subscribe to
 * @param handler - Event handler function
 * @param options - Subscription options
 * @param dependencies - Dependencies for re-subscribing (similar to useEffect)
 */
export function useEventSubscription<T = any>(
    eventType: EventTypes,
    handler: IEventHandler<T>,
    options: ISubscriptionOptions = {},
    dependencies: any[] = []
) {
    const { subscribe } = useEventBus();
    const subscriptionRef = useRef<IEventSubscription | null>(null);

    useEffect(() => {
        // Unsubscribe from previous subscription
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
        }

        // Create new subscription
        subscriptionRef.current = subscribe(eventType, handler, options);

        // Cleanup function
        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
        };
    }, [eventType, subscribe, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

    return subscriptionRef.current;
}

/**
 * Hook for creating event emitters with consistent options
 * 
 * @param defaultOptions - Default emission options
 */
export function useEventEmitter(defaultOptions: IEmissionOptions = {}) {
    const { emit, emitAsync } = useEventBus();

    const emitWithDefaults = useCallback(<T = any>(
        eventType: EventTypes,
        payload: T,
        options: IEmissionOptions = {}
    ): void => {
        emit(eventType, payload, { ...defaultOptions, ...options });
    }, [emit, defaultOptions]);

    const emitAsyncWithDefaults = useCallback(async <T = any>(
        eventType: EventTypes,
        payload: T,
        options: IEmissionOptions = {}
    ): Promise<void> => {
        return emitAsync(eventType, payload, { ...defaultOptions, ...options });
    }, [emitAsync, defaultOptions]);

    return {
        emit: emitWithDefaults,
        emitAsync: emitAsyncWithDefaults
    };
}

/**
 * Hook for debugging event subscriptions and emissions
 */
export function useEventBusDebug() {
    const { eventBus } = useEventBus();

    const logSubscriptions = useCallback((eventType?: EventTypes) => {
        const subscriptions = eventBus.getSubscriptions(eventType);
        console.log(`🔍 EventBus Subscriptions${eventType ? ` for ${eventType}` : ''}:`, subscriptions);
    }, [eventBus]);

    const logConfig = useCallback(() => {
        const config = eventBus.getConfig();
        console.log('🔍 EventBus Configuration:', config);
    }, [eventBus]);

    const logHistory = useCallback(() => {
        const history = eventBus.getEventHistory();
        console.log('🔍 EventBus History:', history);
    }, [eventBus]);

    return {
        logSubscriptions,
        logConfig,
        logHistory
    };
}