import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to proxy session token requests to avoid CORS issues
 * Proxies requests from frontend to local backend service
 */
export async function GET(request: NextRequest) {
    try {
        console.log('🔄 Proxying session token request to localhost:5052');

        // Make request to your local backend service
        const response = await fetch('http://localhost:5052/session', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Add any headers your backend expects
            },
        });

        if (!response.ok) {
            console.error(`❌ Backend responded with status: ${response.status}`);
            return NextResponse.json(
                { 
                    error: 'Failed to fetch session token',
                    status: response.status,
                    statusText: response.statusText
                },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('✅ Successfully retrieved session token from backend');

        // Return the response with proper CORS headers
        return NextResponse.json(data, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });

    } catch (error) {
        console.error('❌ Error proxying session request:', error);
        
        return NextResponse.json(
            { 
                error: 'Failed to connect to backend service',
                message: error instanceof Error ? error.message : 'Unknown error',
                details: 'Make sure your backend service is running on localhost:5052'
            },
            { status: 500 }
        );
    }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
