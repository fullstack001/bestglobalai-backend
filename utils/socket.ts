import { Server } from "socket.io";
import { saveMessage } from "../controllers/chatController";

const setupSocket = (io: Server) => {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("join_room", (room) => {
            socket.join(room);
            console.log(`User joined room: ${room}`);
        });

        socket.on("send_message", async (data) => {
            console.log("Message received:", data);
            io.to(data.room).emit("receive_message", data);
            await saveMessage(data);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
};

export default setupSocket;
