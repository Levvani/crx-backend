import { Controller, Get, Param, Res, NotFoundException } from "@nestjs/common";
import { InvoiceService } from "./invoice.service";
import { Response } from "express";
import { CarsService } from "../cars/cars.service";

@Controller("invoices")
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly carsService: CarsService,
  ) {}

  /**
   * Generate and download an invoice for a car
   * @param carId The ID of the car to generate an invoice for
   * @param res Express response object
   */
  @Get("generate/:carId")
  async generateInvoice(@Param("carId") carId: number, @Res() res: Response) {
    try {
      // Find the car by ID
      const car = await this.carsService.findOne(carId);
      if (!car) {
        throw new NotFoundException(`Car with ID ${carId} not found`);
      }

      // Generate the invoice
      const pdfBuffer = await this.invoiceService.generateInvoice(car);

      // Set response headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${carId}.pdf`,
      );

      // Send the PDF buffer
      return res.send(pdfBuffer);
    } catch (error) {
      throw error;
    }
  }
}
