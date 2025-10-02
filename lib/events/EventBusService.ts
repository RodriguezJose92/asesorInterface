import { 
    IEventBus, 
    IEvent, 
    IEventHandler, 
    IEventSubscription, 
    ISubscriptionOptions, 
    IEmissionOptions, 
    IEventBusConfig 
} from './EventInterfaces';
import { EventTypes, EventPriority } from './EventTypes';

/**
 * Event Bus Service
 * 
 * Centralized event management system with generic type support.
 * Implements the Observer pattern for decoupled communication between components.
 * 
 * Features:
 * - Generic payload support with TypeScript
 * - Priority-based event handling
 * - Async and sync event emission
 * - Subscription management
 * - Debug logging
 * - Event history (optional)
 * 
 * @implements {IEventBus}
 */
export class EventBusService implements IEventBus {
    private static instance: EventBusService | null = null;
    private subscriptions = new Map<EventTypes, IEventSubscription[]>();
    private eventHistory: IEvent[] = [];
    private subscriptionCounter = 0;
    private config: IEventBusConfig;

    /**
     * Private constructor for Singleton pattern
     */
    private constructor(config: IEventBusConfig = {}) {
        this.config = {
            debug: false,
            maxSubscriptionsPerEvent: 100,
            enableHistory: false,
            maxHistorySize: 1000,
            ...config
        };

        if (this.config.debug) {
            console.log('🚀 EventBus initialized with config:', this.config);
        }
    }

    /**
     * Get singleton instance of EventBus
     */
    public static getInstance(config?: IEventBusConfig): EventBusService {
        if (!EventBusService.instance) {
            EventBusService.instance = new EventBusService(config);
        }
        return EventBusService.instance;
    }

    /**
     * Generate unique ID for subscriptions and events
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Subscribe to an event type
     */
    public subscribe<T = any>(
        eventType: EventTypes,
        handler: IEventHandler<T>,
        options: ISubscriptionOptions = {}
    ): IEventSubscription {
        const subscription: IEventSubscription = {
            id: this.generateId(),
            eventType,
            handler: handler as IEventHandler,
            priority: options.priority ?? EventPriority.NORMAL,
            once: options.once ?? false,
            source: options.source,
            unsubscribe: () => this.unsubscribe(this.generateId())
        };

        // Initialize subscription array if it doesn't exist
        if (!this.subscriptions.has(eventType)) {
            this.subscriptions.set(eventType, []);
        }

        const eventSubscriptions = this.subscriptions.get(eventType)!;

        // Check max subscriptions limit
        if (eventSubscriptions.length >= this.config.maxSubscriptionsPerEvent!) {
            console.warn(`⚠️ Maximum subscriptions (${this.config.maxSubscriptionsPerEvent}) reached for event: ${eventType}`);
            return subscription;
        }

        // Insert subscription in priority order (higher priority first)
        let inserted = false;
        for (let i = 0; i < eventSubscriptions.length; i++) {
            if (subscription.priority > eventSubscriptions[i].priority) {
                eventSubscriptions.splice(i, 0, subscription);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            eventSubscriptions.push(subscription);
        }

        // Update unsubscribe function with correct ID
        (subscription as any).unsubscribe = () => this.unsubscribe(subscription.id);

        if (this.config.debug) {
            console.log(`📝 Subscribed to ${eventType} (ID: ${subscription.id}, Priority: ${subscription.priority}, Source: ${subscription.source || 'unknown'})`);
        }

        console.log(subscription)

        return subscription;
    }

    /**
     * Subscribe to an event type for one-time handling
     */
    public once<T = any>(
        eventType: EventTypes,
        handler: IEventHandler<T>,
        options: ISubscriptionOptions = {}
    ): IEventSubscription {
        return this.subscribe(eventType, handler, { ...options, once: true });
    }

    /**
     * Emit an event synchronously
     */
    public emit<T = any>(
        eventType: EventTypes,
        payload: T,
        options: IEmissionOptions = {}
    ): void {
        const event: IEvent<T> = {
            id: this.generateId(),
            type: eventType,
            payload,
            timestamp: Date.now(),
            priority: options.priority ?? EventPriority.NORMAL,
            source: options.source,
            metadata: options.metadata
        };

        if (this.config.debug) {
            console.log(`🚀 Emitting event ${eventType}:`, event);
        }

        // Add to history if enabled
        if (this.config.enableHistory) {
            this.eventHistory.push(event);
            if (this.eventHistory.length > this.config.maxHistorySize!) {
                this.eventHistory.shift();
            }
        }

        // Handle delayed emission
        if (options.delay && options.delay > 0) {
            setTimeout(() => this.processEvent(event), options.delay);
            return;
        }

        this.processEvent(event);
    }

    /**
     * Emit an event asynchronously
     */
    public async emitAsync<T = any>(
        eventType: EventTypes,
        payload: T,
        options: IEmissionOptions = {}
    ): Promise<void> {
        const event: IEvent<T> = {
            id: this.generateId(),
            type: eventType,
            payload,
            timestamp: Date.now(),
            priority: options.priority ?? EventPriority.NORMAL,
            source: options.source,
            metadata: options.metadata
        };

        if (this.config.debug) {
            console.log(`🚀 Emitting async event ${eventType}:`, event);
        }

        // Add to history if enabled
        if (this.config.enableHistory) {
            this.eventHistory.push(event);
            if (this.eventHistory.length > this.config.maxHistorySize!) {
                this.eventHistory.shift();
            }
        }

        // Handle delayed emission
        if (options.delay && options.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
        }

        await this.processEventAsync(event);
    }

    /**
     * Process event synchronously
     */
    private processEvent<T>(event: IEvent<T>): void {
        const subscriptions = this.subscriptions.get(event.type);
        if (!subscriptions || subscriptions.length === 0) {
            if (this.config.debug) {
                console.log(`📭 No subscriptions found for event: ${event.type}`);
            }
            return;
        }

        const subscriptionsToRemove: string[] = [];

        subscriptions.forEach(subscription => {
            try {
                subscription.handler(event);

                // Remove one-time subscriptions
                if (subscription.once) {
                    subscriptionsToRemove.push(subscription.id);
                }
            } catch (error) {
                console.error(`❌ Error in event handler for ${event.type}:`, error);
            }
        });

        // Clean up one-time subscriptions
        subscriptionsToRemove.forEach(id => this.unsubscribe(id));
    }

    /**
     * Process event asynchronously
     */
    private async processEventAsync<T>(event: IEvent<T>): Promise<void> {
        const subscriptions = this.subscriptions.get(event.type);
        if (!subscriptions || subscriptions.length === 0) {
            if (this.config.debug) {
                console.log(`📭 No subscriptions found for event: ${event.type}`);
            }
            return;
        }

        const subscriptionsToRemove: string[] = [];
        const promises: Promise<void>[] = [];

        subscriptions.forEach(subscription => {
            try {
                const result = subscription.handler(event);
                
                // Handle async handlers
                if (result instanceof Promise) {
                    promises.push(result);
                }

                // Remove one-time subscriptions
                if (subscription.once) {
                    subscriptionsToRemove.push(subscription.id);
                }
            } catch (error) {
                console.error(`❌ Error in event handler for ${event.type}:`, error);
            }
        });

        // Wait for all async handlers to complete
        if (promises.length > 0) {
            await Promise.all(promises);
        }

        // Clean up one-time subscriptions
        subscriptionsToRemove.forEach(id => this.unsubscribe(id));
    }

    /**
     * Unsubscribe from an event
     */
    public unsubscribe(subscriptionId: string): boolean {
        const eventTypes = Array.from(this.subscriptions.keys());
        
        for (const eventType of eventTypes) {
            const subscriptions = this.subscriptions.get(eventType);
            if (!subscriptions) continue;
            
            const index = subscriptions.findIndex((sub: IEventSubscription) => sub.id === subscriptionId);
            if (index !== -1) {
                subscriptions.splice(index, 1);
                
                if (this.config.debug) {
                    console.log(`🗑️ Unsubscribed from ${eventType} (ID: ${subscriptionId})`);
                }

                // Clean up empty arrays
                if (subscriptions.length === 0) {
                    this.subscriptions.delete(eventType);
                }

                return true;
            }
        }

        if (this.config.debug) {
            console.warn(`⚠️ Subscription not found: ${subscriptionId}`);
        }

        return false;
    }

    /**
     * Remove all subscriptions for a specific event type
     */
    public unsubscribeAll(eventType: EventTypes): void {
        const subscriptions = this.subscriptions.get(eventType);
        if (subscriptions) {
            const count = subscriptions.length;
            this.subscriptions.delete(eventType);
            
            if (this.config.debug) {
                console.log(`🗑️ Removed ${count} subscriptions for event: ${eventType}`);
            }
        }
    }

    /**
     * Clear all subscriptions
     */
    public clear(): void {
        const subscriptionArrays = Array.from(this.subscriptions.values());
        const totalSubscriptions = subscriptionArrays
            .reduce((total: number, subs: IEventSubscription[]) => total + subs.length, 0);
        
        this.subscriptions.clear();
        this.eventHistory = [];
        
        if (this.config.debug) {
            console.log(`🗑️ Cleared all ${totalSubscriptions} subscriptions and event history`);
        }
    }

    /**
     * Get subscriptions for a specific event type or all subscriptions
     */
    public getSubscriptions(eventType?: EventTypes): IEventSubscription[] {
        if (eventType) {
            return this.subscriptions.get(eventType) || [];
        }

        const allSubscriptions: IEventSubscription[] = [];
        const subscriptionArrays = Array.from(this.subscriptions.values());
        
        subscriptionArrays.forEach((subscriptions: IEventSubscription[]) => {
            allSubscriptions.push(...subscriptions);
        });

        return allSubscriptions;
    }

    /**
     * Get event history (if enabled)
     */
    public getEventHistory(): IEvent[] {
        return [...this.eventHistory];
    }

    /**
     * Get configuration
     */
    public getConfig(): IEventBusConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<IEventBusConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        if (this.config.debug) {
            console.log('🔧 EventBus configuration updated:', this.config);
        }
    }
}