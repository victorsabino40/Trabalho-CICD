import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaClient, ProductStatus } from "@prisma/client";
import ProductController from "../controllers/product-controller";

function createMockPrisma() {
  return {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
  } as unknown as PrismaClient;
}

describe("ProductController", () => {
  let prismaMock: PrismaClient;
  let controller: ProductController;
  let response: any;

  beforeEach(() => {
    prismaMock = createMockPrisma();
    controller = new ProductController(prismaMock);
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it("should return all products", async () => {
    const products = [
      {
        id: 1,
        name: "Product",
        price: 10,
        quantity: 5,
        status: ProductStatus.LOW_STOCK,
      },
    ];
    (prismaMock.product.findMany as any).mockResolvedValue(products);

    await controller.index({} as any, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: 200,
        message: "Products retrieved successfully",
        data: products,
      })
    );
  });

  it("should return a product by ID", async () => {
    const product = {
      id: 1,
      name: "Test",
      price: 50,
      quantity: 3,
      status: ProductStatus.LOW_STOCK,
    };
    (prismaMock.product.findUnique as any).mockResolvedValue(product);

    await controller.view({ params: { id: "1" } } as any, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: 200,
        message: "Product retrieved successfully",
        data: product,
      })
    );
  });

  it("should return 404 if product not found", async () => {
    (prismaMock.product.findUnique as any).mockResolvedValue(null);

    await controller.view({ params: { id: "99" } } as any, response);

    expect(response.status).toHaveBeenCalledWith(404);
  });

  it("should create a new product", async () => {
    const body = { name: "New Product", price: 20, quantity: 15 };
    const created = { id: 2, ...body, status: ProductStatus.IN_STOCK };
    (prismaMock.product.create as any).mockResolvedValue(created);

    await controller.store({ body } as any, response);

    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: 201,
        message: "Product created successfully",
        data: created,
      })
    );
  });

  it("should update an existing product", async () => {
    const product = {
      id: 1,
      name: "Old",
      price: 5,
      quantity: 2,
      status: ProductStatus.LOW_STOCK,
    };
    const updated = {
      ...product,
      name: "Updated",
      quantity: 20,
      status: ProductStatus.IN_STOCK,
    };

    (prismaMock.product.findUnique as any).mockResolvedValue(product);
    (prismaMock.product.update as any).mockResolvedValue(updated);

    await controller.update(
      { params: { id: "1" }, body: { name: "Updated", quantity: 20 } } as any,
      response
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: 200,
        message: "Product updated successfully",
        data: updated,
      })
    );
  });

  it("should return 404 if updating non-existent product", async () => {
    (prismaMock.product.findUnique as any).mockResolvedValue(null);

    await controller.update(
      { params: { id: "123" }, body: { name: "Test" } } as any,
      response
    );

    expect(response.status).toHaveBeenCalledWith(404);
  });

  it("should delete an existing product", async () => {
    const product = {
      id: 1,
      name: "Test",
      price: 10,
      quantity: 0,
      status: ProductStatus.OUT_OF_STOCK,
    };
    (prismaMock.product.findUnique as any).mockResolvedValue(product);
    (prismaMock.product.delete as any).mockResolvedValue(product);

    await controller.destroy({ params: { id: "1" } } as any, response);

    expect(response.status).toHaveBeenCalledWith(204);
  });

  it("should return 404 if deleting non-existent product", async () => {
    (prismaMock.product.findUnique as any).mockResolvedValue(null);

    await controller.destroy({ params: { id: "99" } } as any, response);

    expect(response.status).toHaveBeenCalledWith(404);
  });

  it("should return dashboard data", async () => {
    (prismaMock.$queryRaw as any)
      .mockResolvedValueOnce([{ count: 5 }]) // totalProducts
      .mockResolvedValueOnce([{ total: 100 }]) // totalItems
      .mockResolvedValueOnce([{ value: 2500 }]) // totalValue
      .mockResolvedValueOnce([{ count: 2 }]) // lowStock
      .mockResolvedValueOnce([{ count: 1 }]); // outOfStock

    await controller.dashboard({} as any, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: 200,
        message: "Dashboard data retrieved successfully",
        data: {
          totalProducts: 5,
          totalItems: 100,
          totalValue: 2500,
          lowStock: 2,
          outOfStock: 1,
        },
      })
    );
  });

  it("should handle error in dashboard", async () => {
    (prismaMock.$queryRaw as any).mockRejectedValue(new Error("DB error"));

    await controller.dashboard({} as any, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: 500,
        message: "Error fetching dashboard data",
        error: "DB error",
      })
    );
  });
});
