/**
 * Event Payload Types
 * 
 * Specific payload interfaces for different event types.
 * Each interface defines the structure of data that accompanies specific events.
 */

/**
 * 3D Content Display Configuration
 */
export interface I3DContent {
    /**
     * Type of 3D content
     */
    type: '3d-model' | '3d-scene' | '360-view' | 'ar-view' | 'vr-view';

    /**
     * URL or path to the 3D content
     */
    source: string;

    /**
     * Display title
     */
    title?: string;

    /**
     * Description of the 3D content
     */
    description?: string;

    /**
     * Thumbnail image URL
     */
    thumbnail?: string;

    /**
     * 3D model specific settings
     */
    settings?: {
        /**
         * Enable auto-rotation
         */
        autoRotate?: boolean;

        /**
         * Enable zoom controls
         */
        enableZoom?: boolean;

        /**
         * Enable pan controls
         */
        enablePan?: boolean;

        /**
         * Initial camera position
         */
        cameraPosition?: {
            x: number;
            y: number;
            z: number;
        };

        /**
         * Background color or environment
         */
        background?: string | 'transparent' | 'skybox';

        /**
         * Lighting configuration
         */
        lighting?: 'natural' | 'studio' | 'custom';

        /**
         * Animation settings
         */
        animations?: {
            autoPlay?: boolean;
            loop?: boolean;
            speed?: number;
        };
    };

    /**
     * Interaction callbacks
     */
    callbacks?: {
        onLoad?: () => void;
        onError?: (error: Error) => void;
        onClick?: (intersection: any) => void;
        onProgress?: (progress: number) => void;
    };
}

/**
 * Multimedia Content Configuration
 */
export interface IMultimediaContent {
    /**
     * Type of multimedia content
     */
    type: 'video' | 'audio' | 'image' | 'gallery' | 'carousel' | 'pdf' | 'presentation';

    /**
     * Content source(s)
     */
    source: string | string[];

    /**
     * Display title
     */
    title?: string;

    /**
     * Content description
     */
    description?: string;

    /**
     * Thumbnail or poster image
     */
    thumbnail?: string;

    /**
     * Media-specific settings
     */
    settings?: {
        /**
         * Auto-play media (video/audio)
         */
        autoPlay?: boolean;

        /**
         * Loop media playback
         */
        loop?: boolean;

        /**
         * Show media controls
         */
        controls?: boolean;

        /**
         * Mute audio initially
         */
        muted?: boolean;

        /**
         * Volume level (0-1)
         */
        volume?: number;

        /**
         * Playback speed
         */
        playbackRate?: number;

        /**
         * Image gallery settings
         */
        gallery?: {
            showThumbnails?: boolean;
            enableFullscreen?: boolean;
            slideInterval?: number;
            showNavigation?: boolean;
        };

        /**
         * Video quality settings
         */
        video?: {
            quality?: 'auto' | '144p' | '240p' | '360p' | '480p' | '720p' | '1080p';
            format?: 'mp4' | 'webm' | 'ogg' | 'hls';
        };
    };

    /**
     * Display options
     */
    display?: {
        /**
         * Display mode
         */
        mode?: 'inline' | 'modal' | 'fullscreen' | 'popup';

        /**
         * Display size
         */
        size?: 'small' | 'medium' | 'large' | 'fullscreen';

        /**
         * Display position
         */
        position?: 'center' | 'top' | 'bottom' | 'left' | 'right';

        /**
         * Enable close button
         */
        closable?: boolean;

        /**
         * Show overlay background
         */
        overlay?: boolean;
    };

    /**
     * Interaction callbacks
     */
    callbacks?: {
        onLoad?: () => void;
        onError?: (error: Error) => void;
        onPlay?: () => void;
        onPause?: () => void;
        onEnd?: () => void;
        onClose?: () => void;
        onNext?: () => void;
        onPrevious?: () => void;
    };
}

/**
 * UI Update Payload
 */
export interface IUIUpdatePayload {
    /**
     * Target component or element
     */
    target: string;

    /**
     * Type of update
     */
    action: 'show' | 'hide' | 'toggle' | 'update' | 'refresh' | 'focus' | 'blur';

    /**
     * Update data
     */
    data?: any;

    /**
     * Animation settings
     */
    animation?: {
        type?: 'fade' | 'slide' | 'scale' | 'bounce' | 'none';
        duration?: number;
        easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    };
}

/**
 * User Interaction Payload
 */
export interface IUserInteractionPayload {
    /**
     * Type of interaction
     */
    type: 'click' | 'hover' | 'focus' | 'scroll' | 'keypress' | 'touch' | 'voice' | 'gesture';

    /**
     * Target element or component
     */
    target: string;

    /**
     * Interaction data
     */
    data?: {
        /**
         * Mouse/touch position
         */
        position?: { x: number; y: number; };

        /**
         * Key pressed (for keypress events)
         */
        key?: string;

        /**
         * Voice command (for voice events)
         */
        command?: string;

        /**
         * Additional context data
         */
        context?: Record<string, any>;
    };

    /**
     * User information
     */
    user?: {
        id?: string;
        sessionId?: string;
        userAgent?: string;
    };
}

/**
 * Show 3D Event Payload
 */
export type Show3DPayload = I3DContent;

/**
 * Show Multimedia Event Payload
 */
export type ShowMultimediaPayload = IMultimediaContent;

/**
 * Hide 3D Event Payload
 */
export interface Hide3DPayload {
    /**
     * Whether to animate the hide transition
     */
    animate?: boolean;

    /**
     * Callback when hide is complete
     */
    onComplete?: () => void;
}

/**
 * Hide Multimedia Event Payload
 */
export interface HideMultimediaPayload {
    /**
     * Whether to animate the hide transition
     */
    animate?: boolean;

    /**
     * Stop media playback when hiding
     */
    stopPlayback?: boolean;

    /**
     * Callback when hide is complete
     */
    onComplete?: () => void;
}

/**
 * Type map for event payloads
 * Maps event types to their corresponding payload types
 */
export interface EventPayloadMap {
    SHOW_3D: Show3DPayload;
    SHOW_MULTIMEDIA: ShowMultimediaPayload;
    HIDE_3D: Hide3DPayload;
    HIDE_MULTIMEDIA: HideMultimediaPayload;
    UI_UPDATE: IUIUpdatePayload;
    USER_INTERACTION: IUserInteractionPayload;
}