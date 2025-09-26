/**
 * EventBus Usage Examples
 * 
 * This file demonstrates how to use the EventBus system in your React components.
 * Copy these examples into your own components and modify as needed.
 */

import React, { useEffect, useState } from 'react';
import { useEventBus, useEventSubscription } from '../../hooks/useEventBus';
import { EventTypes } from './EventTypes';
import { 
    Show3DPayload, 
    ShowMultimediaPayload, 
    Hide3DPayload, 
    HideMultimediaPayload 
} from './EventPayloads';

/**
 * Example 1: Basic EventBus Usage
 * Shows how to emit and listen for events
 */
export function EventBusBasicExample() {
    const { emit, subscribe } = useEventBus();
    const [lastEvent, setLastEvent] = useState<string>('');

    // Subscribe to events when component mounts
    useEffect(() => {
        const subscription = subscribe(EventTypes.SHOW_3D, (event) => {
            const payload = event.payload as Show3DPayload;
            setLastEvent(`Received SHOW_3D: ${payload.title || payload.source}`);
            console.log('🎯 3D Event received:', payload);
        });

        // Cleanup subscription on unmount
        return () => subscription.unsubscribe();
    }, [subscribe]);

    const handleShow3D = () => {
        const payload: Show3DPayload = {
            type: '3d-model',
            source: '/models/product.glb',
            title: 'Product 3D Model',
            description: 'Interactive 3D model of our latest product',
            settings: {
                autoRotate: true,
                enableZoom: true,
                enablePan: true,
                lighting: 'studio'
            }
        };

        emit(EventTypes.SHOW_3D, payload);
    };

    const handleShowMultimedia = () => {
        const payload: ShowMultimediaPayload = {
            type: 'video',
            source: '/videos/product-demo.mp4',
            title: 'Product Demo',
            settings: {
                autoPlay: true,
                controls: true,
                muted: false
            },
            display: {
                mode: 'modal',
                size: 'large',
                closable: true
            }
        };

        emit(EventTypes.SHOW_MULTIMEDIA, payload);
    };

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">EventBus Basic Example</h3>
            
            <div className="space-y-2 mb-4">
                <button 
                    onClick={handleShow3D}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Show 3D Model
                </button>
                
                <button 
                    onClick={handleShowMultimedia}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Show Video
                </button>
            </div>

            {lastEvent && (
                <p className="text-sm text-gray-600">Last Event: {lastEvent}</p>
            )}
        </div>
    );
}

/**
 * Example 2: Using useEventSubscription Hook
 * Simplified way to subscribe to events with automatic cleanup
 */
export function EventBusSubscriptionExample() {
    const { emit } = useEventBus();
    const [messages, setMessages] = useState<string[]>([]);

    // Simple subscription with automatic cleanup
    useEventSubscription(EventTypes.SHOW_MULTIMEDIA, (event) => {
        const payload = event.payload as ShowMultimediaPayload;
        const message = `📺 Multimedia shown: ${payload.title} (${payload.type})`;
        setMessages(prev => [...prev, message]);
    });

    useEventSubscription(EventTypes.HIDE_MULTIMEDIA, (event) => {
        const payload = event.payload as HideMultimediaPayload;
        const message = `❌ Multimedia hidden ${payload.animate ? 'with animation' : 'instantly'}`;
        setMessages(prev => [...prev, message]);
    });

    const showGallery = () => {
        const payload: ShowMultimediaPayload = {
            type: 'gallery',
            source: [
                '/images/product1.jpg',
                '/images/product2.jpg',
                '/images/product3.jpg'
            ],
            title: 'Product Gallery',
            settings: {
                gallery: {
                    showThumbnails: true,
                    enableFullscreen: true,
                    slideInterval: 3000,
                    showNavigation: true
                }
            }
        };

        emit(EventTypes.SHOW_MULTIMEDIA, payload);
    };

    const hideMultimedia = () => {
        const payload: HideMultimediaPayload = {
            animate: true,
            stopPlayback: true,
            onComplete: () => console.log('Hide animation completed!')
        };

        emit(EventTypes.HIDE_MULTIMEDIA, payload);
    };

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">EventBus Subscription Example</h3>
            
            <div className="space-y-2 mb-4">
                <button 
                    onClick={showGallery}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                    Show Gallery
                </button>
                
                <button 
                    onClick={hideMultimedia}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Hide Multimedia
                </button>
            </div>

            <div className="bg-gray-100 p-3 rounded">
                <h4 className="font-medium mb-2">Event Messages:</h4>
                {messages.length === 0 ? (
                    <p className="text-sm text-gray-500">No messages yet...</p>
                ) : (
                    <ul className="text-sm space-y-1">
                        {messages.map((msg, index) => (
                            <li key={index} className="text-gray-700">{msg}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

/**
 * Example 3: Advanced EventBus Usage
 * Shows priority handling, async events, and custom options
 */
export function EventBusAdvancedExample() {
    const { emit, emitAsync, subscribe } = useEventBus();
    const [status, setStatus] = useState<string>('Ready');

    useEffect(() => {
        // High priority subscription
        const highPrioritySubscription = subscribe(
            EventTypes.USER_INTERACTION, 
            (event) => {
                console.log('🔥 HIGH PRIORITY:', event);
                setStatus('High priority event processed');
            },
            { 
                priority: 2, // High priority
                source: 'advanced-example'
            }
        );

        // Normal priority subscription
        const normalSubscription = subscribe(
            EventTypes.USER_INTERACTION,
            (event) => {
                console.log('📝 Normal priority:', event);
                setStatus('Normal priority event processed');
            },
            { 
                priority: 1, // Normal priority
                source: 'advanced-example'
            }
        );

        return () => {
            highPrioritySubscription.unsubscribe();
            normalSubscription.unsubscribe();
        };
    }, [subscribe]);

    const handleUserInteraction = () => {
        emit(EventTypes.USER_INTERACTION, {
            type: 'click',
            target: 'advanced-example-button',
            data: {
                position: { x: 100, y: 200 },
                context: { section: 'demo' }
            }
        });
    };

    const handleAsyncEvent = async () => {
        setStatus('Processing async event...');
        
        try {
            await emitAsync(EventTypes.UI_UPDATE, {
                target: 'main-ui',
                action: 'update',
                data: { loading: true },
                animation: {
                    type: 'fade',
                    duration: 300,
                    easing: 'ease-in-out'
                }
            });
            
            setStatus('Async event completed successfully');
        } catch (error) {
            setStatus('Async event failed');
            console.error('Async event error:', error);
        }
    };

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">EventBus Advanced Example</h3>
            
            <div className="space-y-2 mb-4">
                <button 
                    onClick={handleUserInteraction}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                    Trigger User Interaction (Priority Demo)
                </button>
                
                <button 
                    onClick={handleAsyncEvent}
                    className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
                >
                    Trigger Async Event
                </button>
            </div>

            <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm"><strong>Status:</strong> {status}</p>
                <p className="text-xs text-gray-600 mt-1">
                    Check console for detailed event logs
                </p>
            </div>
        </div>
    );
}

/**
 * Example 4: EventBus in a Chat Component (Real-world usage)
 * Shows how to integrate EventBus with existing components
 */
export function ChatWithEventBusExample() {
    const { emit, subscribe } = useEventBus();
    const [isMultimediaVisible, setIsMultimediaVisible] = useState(false);

    useEffect(() => {
        // Listen for multimedia show/hide events
        const showSubscription = subscribe(EventTypes.SHOW_MULTIMEDIA, () => {
            setIsMultimediaVisible(true);
        });

        const hideSubscription = subscribe(EventTypes.HIDE_MULTIMEDIA, () => {
            setIsMultimediaVisible(false);
        });

        return () => {
            showSubscription.unsubscribe();
            hideSubscription.unsubscribe();
        };
    }, [subscribe]);

    const showProductVideo = () => {
        const payload: ShowMultimediaPayload = {
            type: 'video',
            source: '/videos/product-showcase.mp4',
            title: 'Product Showcase',
            description: 'Detailed showcase of product features',
            settings: {
                autoPlay: true,
                controls: true,
                loop: false
            },
            display: {
                mode: 'modal',
                size: 'large',
                overlay: true,
                closable: true
            },
            callbacks: {
                onLoad: () => console.log('Video loaded'),
                onError: (error) => console.error('Video error:', error),
                onEnd: () => emit(EventTypes.HIDE_MULTIMEDIA, { animate: true })
            }
        };

        emit(EventTypes.SHOW_MULTIMEDIA, payload);
    };

    return (
        <div className="p-4 border rounded-lg bg-white">
            <h3 className="text-lg font-semibold mb-4">Chat with EventBus Integration</h3>
            
            <div className="space-y-4">
                <div className="bg-gray-100 p-3 rounded">
                    <p className="text-sm mb-2"><strong>Assistant:</strong> I can show you our product in action!</p>
                    <button 
                        onClick={showProductVideo}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                        📺 Show Product Video
                    </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                    <span className="text-sm">
                        Multimedia Status: {isMultimediaVisible ? '✅ Visible' : '❌ Hidden'}
                    </span>
                    {isMultimediaVisible && (
                        <button 
                            onClick={() => emit(EventTypes.HIDE_MULTIMEDIA, { animate: true })}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Example 5: EventBus Configuration Demo
 */
export function EventBusConfigExample() {
    const { eventBus } = useEventBus();

    const enableDebugMode = () => {
        eventBus.updateConfig({ 
            debug: true,
            enableHistory: true,
            maxHistorySize: 50
        });
        console.log('🔧 Debug mode enabled!');
    };

    const clearAllEvents = () => {
        eventBus.clear();
        console.log('🗑️ All events cleared!');
    };

    const showEventStats = () => {
        const allSubscriptions = eventBus.getSubscriptions();
        const history = eventBus.getEventHistory();
        
        console.log('📊 EventBus Stats:');
        console.log(`- Total Subscriptions: ${allSubscriptions.length}`);
        console.log(`- Event History: ${history.length} events`);
        console.log('- Active Subscriptions:', allSubscriptions);
        console.log('- Recent Events:', history.slice(-5));
    };

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">EventBus Configuration</h3>
            
            <div className="space-y-2">
                <button 
                    onClick={enableDebugMode}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-2"
                >
                    Enable Debug Mode
                </button>
                
                <button 
                    onClick={showEventStats}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mr-2"
                >
                    Show Stats
                </button>
                
                <button 
                    onClick={clearAllEvents}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Clear All
                </button>
            </div>

            <p className="text-xs text-gray-600 mt-3">
                Open browser console to see debug output and stats
            </p>
        </div>
    );
}