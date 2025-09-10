import { ProductInfo } from "@/lib/types"

function cleanJsonString(input: string): ProductInfo[] | null {

    const cleaned = input.replace(/^```json\s*|\s*```$/g, "");
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Error al parsear JSON:", e);
        return null;
    };

};