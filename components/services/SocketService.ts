import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";

class SocketService {

    private static instance: SocketService;
    private socket: Socket | null = null;
    private readonly socketUrl: string = "https://mudi.asesoria.mudi.com.co/"; // Replace with your server URL
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 10;
    private readonly reconnectDelay = 2000; // 2 seconds

    // Store provider, origin, and token for reconnection
    private storedProvider: string | null = null;
    private storedOrigin: string = "";
    private storedToken: string | null = Cookies.get("socket_token") || null; // Retrieve from cookies
    public userSub: any;

    public roomConnected: string = "defaultRoom";
    private constructor() { }

    static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    };

    connect(token: string | null, provider: string | null, origin: string, roomId?: string): void {
        if (!this.socket) {
            // Use token from cookies if no token is passed
            this.storedToken = token || Cookies.get("socket_token") || null;
            this.storedProvider = provider;
            this.storedOrigin = origin;

            this.socket = io(this.socketUrl, {
                path: "/ws/",
                auth: {
                    token: this.storedToken, // Token from cookies if available
                    provider,
                    origin,
                    roomId: roomId || Cookies.get("roomId") || null,
                    companyId: new URLSearchParams(location.search).get('companyId'),
                    productId: new URLSearchParams(location.search).get('sku')
                },
                transports: ["websocket"],
                reconnection: false,
            });

            this.initializeListeners();
        }
    };

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log("🔌 Socket disconnected.");
            this.reconnectAttempts = 0;
        }
    };

    emit(event: string, data: any): void {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    };

    on(event: string, callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    };

    off(event: string, callback?: (data: any) => void): void {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback);
            } else {
                this.socket.removeAllListeners(event);
            }
        }
    };

    private initializeListeners(): void {
        if (this.socket) {
            this.socket.on("connect", () => {
                console.log("✅ Connected to socket server:", this.socket?.id);
                this.reconnectAttempts = 0;
                this.userSub = Cookies.get("UserSub") || null;

            });

            this.socket.on("joined_room", (data: {
                roomId: string;
            }) => {
                this.roomConnected = data.roomId
                console.log("🔄 Joined To Room", this.roomConnected);
            });


            // Listen for token updates
            this.socket.on("UpdateToken", (data: {
                usersub: any; token: string
            }) => {

                console.log("🔄 Received Updated Token:", data);
                this.userSub = data.usersub
                Cookies.set("UserSub", data.usersub, { expires: 7 });
                if (data.token) {
                    this.storedToken = data.token;


                    console.log(this.userSub)
                    // Store token in cookies for persistence
                    Cookies.set("socket_token", data.token, { expires: 7 });

                }
            });

            this.socket.on("disconnect", (reason) => {
                console.log("⚠️ Disconnected from socket server:", reason);
                this.attemptReconnect();
            });

            this.socket.on("connect_error", (error) => {
                console.log("❌ Connection error:", error);
                this.attemptReconnect();
            });
        }
    };

    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(
                `🔁 Reconnect attempt ${this.reconnectAttempts} in ${this.reconnectDelay / 1000} seconds...`
            );
            setTimeout(() => {
                this.connect(this.storedToken, this.storedProvider, this.storedOrigin);
            }, this.reconnectDelay);
        } else {
            console.log("🚫 Maximum reconnection attempts reached. Stopping reconnection.");
        }
    };

};

export default SocketService.getInstance();
