/**
 * Transforms a strict JSON string into a "jsony" format:
 * - Removes quotes from object keys
 * - Allows trailing commas
 * - Preserves string values in quotes
 * - Allows single quotes for strings (optional)
 * 
 * @param jsonLiteral The JSON string to transform
 * @returns The "jsony" formatted string
 */
export function jsonToJsony(jsonLiteral: string): string {
    // Remove quotes from object keys: "key": -> key:
    let jsony = jsonLiteral.replace(/"([a-zA-Z0-9_]+)"\s*:/g, '$1:');

    // Optionally, allow single quotes for string values (not strictly necessary, but common in "jsony")
    // jsony = jsony.replace(/"([^"]*)"/g, "'$1'");

    // Allow trailing commas (JSON.parse ignores them, but for display, we can just leave them)
    // No need to add, just don't remove them

    // Optionally, remove quotes around top-level property names (already handled above)

    // Return the transformed string
    return jsony;
}

/*
Example usage:

const jsonLiteral = `
{
    "jsonType": "ProductsCollection",
    "products": [
        {
            "sku": "AI-001",
            "name": "AI-Powered Chatbot",
            "brand": "TechAI",
            "profilePic": "ai_chatbot_profile.jpg",
            "description": "An intelligent chatbot that can handle customer inquiries and provide support 24/7.",
            "price": 49.99,
            "rate": 4.5,   
            "discount": 10,
            "images": ["ai_chatbot_1.jpg", "ai_chatbot_2.jpg", "ai_chatbot_3.jpg"],
            "Link3D": "http://example.com/3d/ai_chatbot",
            "LinkAR": "http://example.com/ar/ai_chatbot",
            "LinkVideo": "http://example.com/video/ai_chatbot",
            "TechnicalSheet": "http://example.com/techsheet/ai_chatbot.pdf",
            "FAQS": [
                {
                    "question": "What platforms does the chatbot support?",
                    "answer": "The chatbot supports web, mobile, and social media platforms."
                },
                {
                    "question": "Can the chatbot be customized?",
                    "answer": "Yes, the chatbot can be customized to fit your brand and specific needs."
                }
            ]
        }
    ]
}
`;

console.log(jsonToJsony(jsonLiteral));
*/