import express from "express";
import cors from "cors";
import productRouter from "./routes/product";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());

app.use(express.json());

app.use("/api/products", productRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
