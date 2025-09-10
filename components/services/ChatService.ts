import { GetChatMessages, GetMyChatsResponse, BackendResponse } from "../../types/type";
import BaseWebServices from "./BaseWebService";
import { EnvironmentStore } from "@/utils/stores/EnvironmentStore";

const { urlSocketConection } = EnvironmentStore();

class ChatService extends BaseWebServices {
    constructor() {
        super(`${urlSocketConection}/api`); // Replace with your actual API base URL
    };

    /**
     * Start a new chat.
     * If thread ID is not provided, this method will create a new chat.
     * @param sku - Product SKU.
     * @param companyId - Company ID.
     * @param userMessage - User's question.
     * @returns {Promise<{ threadId: string, message: string }>} - The created thread ID and response message.
     */

    async startChat(sku: string, companyId: number, userMessage: string, assistantId: string): Promise<BackendResponse<{ threadId: string; message: string }>> {
        const data: { sku: string; companyId: number; userMessage: string; userName: string } = { sku, companyId, userMessage, userName: "" };


        try {
            // Call the base POST method
            const response = await this.post<BackendResponse<{ threadId: string; message: string }>>("/chat" + assistantId || "", data);

            console.log(response);
            return response.data;
        } catch (error) {
            console.error("Error starting chat:", error);
            throw error;
        }
    };

    /**
     * Send a message to an existing thread.
     * @param threadId - The thread ID to send the message to.
     * @param message - The message content.
     * @returns {Promise<{ status: string; message: string }>} - Response from the server.
     */
    async sendMessageToThread(threadId: string, message: string): Promise<{ status: string; message: string }> {
        const data = { threadId, message };
        try {
            // Call the base POST method
            const response = await this.post<BackendResponse<{ status: string; message: string }>>("/response", data);

            // Return the unwrapped data from the response
            return response.data;
        } catch (error) {
            console.error("Error sending message to thread:", error);
            throw error;
        }
    };

    /**
     * Retrieve the user's chat list.
     * @returns {Promise<BackendResponse<GetMyChatsResponse>>} - List of chats formatted properly.
     */
    async getMyChats(): Promise<BackendResponse<GetMyChatsResponse>> {
        try {
            // 🔹 Fetch user chats from the API
            const response = await this.get<BackendResponse<GetMyChatsResponse>>("/chat/mine");

            return response.data;
        } catch (error) {
            console.error("❌ Error retrieving chats:", error);
            throw error;
        }
    };

    /**
     * Retrieve the user's chat list.
     * @returns {Promise<BackendResponse<GetChatMessages>>} - List of chats formatted properly.
     */
    async getChatMessages(chatId: string): Promise<BackendResponse<GetChatMessages>> {
        try {
            // 🔹 Fetch user chats from the API
            const response = await this.get<BackendResponse<GetChatMessages>>(`/chat/${chatId}/messages`);

            return response.data;
        } catch (error) {
            console.error("❌ Error retrieving chats:", error);
            throw error;
        }
    };

};

export default new ChatService();
