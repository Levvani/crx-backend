import { Controller, Post, Param, Body, Res, NotFoundException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { Response } from 'express';
import { CarsService } from '../cars/cars.service';
import { GenerateInvoiceParamsDto } from './dto/generate-invoice-params.dto';
import { GenerateInvoiceBodyDto } from './dto/generate-invoice-body.dto';

@Controller('invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly carsService: CarsService,
  ) {}

  /**
   * Generate and download an invoice for a car
   * @param params The validated parameters containing carId
   * @param body The request body containing type and optional amount
   * @param res Express response object
   */
  @Post('generate/:carId')
  async generateInvoice(
    @Param() params: GenerateInvoiceParamsDto,
    @Body() body: GenerateInvoiceBodyDto,
    @Res() res: Response,
  ) {
    // Find the car by ID
    const car = await this.carsService.findOne(params.carId);
    if (!car) {
      throw new NotFoundException(`Car with ID ${params.carId} not found`);
    }

    // Generate the invoice
    const { buffer: pdfBuffer } = await this.invoiceService.generateInvoice(
      car,
      body.type,
      body.amount,
    );

    // Create Georgian filename for download based on type
    const vinOrId = car.vinCode || params.carId;
    const typeText = body.type === 'transportation' ? 'ტრანსპორტირების' : 'ავტომობილის';
    const georgianFilename = `${typeText} ინვოისი ${vinOrId}.pdf`;

    // URL encode the Georgian filename for proper browser handling
    const encodedFilename = encodeURIComponent(georgianFilename);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Send the PDF buffer
    return res.end(pdfBuffer);
  }
}
