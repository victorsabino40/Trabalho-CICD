import type { Request, Response } from "express";
import { ProductStatus } from "@prisma/client";
import prismaClient from "@/database";
import { sendResponse } from "@/@shared/helpers";

export default class ProductController {
  static async index(_: Request, response: Response) {
    const products = await prismaClient.product.findMany();
    return sendResponse({
      response,
      status_code: 200,
      message: "Products retrieved successfully",
      data: products,
    });
  }

  static async view(request: Request, response: Response) {
    const { id } = request.params;
    const product = await prismaClient.product.findUnique({
      where: { id: Number(id) },
    });

    if (!product) {
      return sendResponse({
        response,
        status_code: 404,
        message: "Product not found",
      });
    }

    return sendResponse({
      response,
      status_code: 200,
      message: "Product retrieved successfully",
      data: product,
    });
  }

  static async store(request: Request, response: Response) {
    const { name, price, quantity } = request.body;
    const status = ProductController.getProductStatus(quantity);

    try {
      const product = await prismaClient.product.create({
        data: { name, price, quantity, status },
      });

      return sendResponse({
        response,
        status_code: 201,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      return sendResponse({
        response,
        status_code: 500,
        message: "Error creating product",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  static async update(request: Request, response: Response) {
    const { id } = request.params;
    const { name, price, quantity } = request.body;

    const product = await prismaClient.product.findUnique({
      where: { id: Number(id) },
    });

    if (!product) {
      return sendResponse({
        response,
        status_code: 404,
        message: "Product not found",
      });
    }

    let data: any = {};
    if (name !== undefined) data.name = name;
    if (price !== undefined) data.price = price;
    if (quantity !== undefined) {
      data.quantity = quantity;
      data.status = ProductController.getProductStatus(quantity);
    }

    try {
      const product = await prismaClient.product.update({
        where: { id: Number(id) },
        data,
      });

      return sendResponse({
        response,
        status_code: 200,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      return sendResponse({
        response,
        status_code: 500,
        message: "Error updating product",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  static async destroy(request: Request, response: Response) {
    const { id } = request.params;

    const product = await prismaClient.product.findUnique({
      where: { id: Number(id) },
    });

    if (!product) {
      return sendResponse({
        response,
        status_code: 404,
        message: "Product not found",
      });
    }

    try {
      await prismaClient.product.delete({ where: { id: Number(id) } });

      return sendResponse({ response, status_code: 204 });
    } catch (error) {
      return sendResponse({
        response,
        status_code: 500,
        message: "Error deleting product",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private static getProductStatus(quantity: number): ProductStatus {
    return quantity > 10
      ? ProductStatus.IN_STOCK
      : quantity > 0
      ? ProductStatus.LOW_STOCK
      : ProductStatus.OUT_OF_STOCK;
  }
}
