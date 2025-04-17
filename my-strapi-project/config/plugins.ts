import { config } from "process";

export default ({ env }) => ({
  settings: {
    cors: {
      origin: ["http://localhost:3000"],
      headers: "*",
    },
  },
  email: {
    config: {
      provider: "sendgrid",
      providerOptions: {
        apiKey: process.env.SENDGRID_API_KEY, // SỬA ĐÚNG: Lấy giá trị từ biến môi trường
      },
      settings: {
        defaultFrom: "nbichngoc3904@gmail.com",
        defaultReplyTo: "nbichngoc3904@gmail.com",
      },
    },
  },
});
