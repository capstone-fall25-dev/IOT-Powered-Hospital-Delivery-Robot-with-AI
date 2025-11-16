// src/signalr/taskHub.js

import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";

const TASK_HUB_URL = `${API_CONFIG.API_BASE}/hubs/task`;

class TaskHubConnection {
    connection = null;

    start(onTaskCreated, onTaskUpdated) {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(TASK_HUB_URL, { withCredentials: true })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // Sự kiện từ server
        this.connection.on("TaskCreated", (task) => {
            console.log("📡 REALTIME TASK CREATED:", task);
            onTaskCreated(task);
        });

        this.connection.on("TaskUpdated", (task) => {
            console.log("📡 REALTIME TASK UPDATED:", task);
            onTaskUpdated(task);
        });

        // start connection
        this.connection
            .start()
            .then(() => console.log("🔌 Connected to TaskHub"))
            .catch(err => console.error("❌ SignalR Error:", err));
    }

    stop() {
        if (this.connection)
            this.connection.stop();
    }
}

export default new TaskHubConnection();
