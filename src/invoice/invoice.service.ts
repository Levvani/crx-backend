import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as fs from "fs";
import * as path from "path";
import { Car } from "../cars/schemas/car.schema";
import * as PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import * as libre from "libreoffice-convert";
import { promisify } from "util";

// Create a counter schema for invoice numbers
export interface Counter {
  _id: string;
  seq: number;
}

@Injectable()
export class InvoiceService {
  private readonly templatePath: string;
  private readonly uploadsPath: string;

  constructor(@InjectModel("Counter") private counterModel: Model<Counter>) {
    // Path to the invoice template
    this.templatePath = path.join(
      process.cwd(),
      "src/assets/ტრანსპორტირების ინვოისი.docx",
    );
    // Path to save generated invoices
    this.uploadsPath = path.join(process.cwd(), "uploads/invoices");
    // Ensure the uploads directory exists
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
    }
  }

  /**
   * Get the next invoice number by incrementing the counter
   */
  private async getNextInvoiceNumber(): Promise<number> {
    const counter = await this.counterModel.findOneAndUpdate(
      { _id: "invoiceId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return counter.seq;
  }

  /**
   * Generate an invoice DOCX for a car and save it to disk
   * @param car The car object containing data for the invoice
   * @returns Object containing the file path and buffer
   */
  async generateInvoice(
    car: Car,
  ): Promise<{ filePath: string; buffer: Buffer }> {
    try {
      const invoiceNumber = await this.getNextInvoiceNumber();
      const content = fs.readFileSync(this.templatePath);
      const zip = new PizZip(content);
      const templateData = {
        NUM: invoiceNumber,
        VIN_CODE: car.vinCode,
        AMOUNT: car.transportationPrice || 0,
      };
      const doc = new Docxtemplater(zip);
      doc.render(templateData);
      const docxBuffer = doc
        .getZip()
        .generate({ type: "nodebuffer" }) as Buffer;
      const docxFilename = `invoice_${invoiceNumber}_${car.vinCode}.docx`;
      const docxFilePath = path.join(this.uploadsPath, docxFilename);
      fs.writeFileSync(docxFilePath, docxBuffer);
      // Convert DOCX to PDF
      const pdfFilename = `invoice_${invoiceNumber}_${car.vinCode}.pdf`;
      const pdfFilePath = path.join(this.uploadsPath, pdfFilename);
      const convertAsync = promisify(libre.convert);
      const pdfBuffer = await convertAsync(docxBuffer, ".pdf", undefined);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
      return { filePath: pdfFilePath, buffer: pdfBuffer };
    } catch (error) {
      console.error("Error generating invoice:", error);
      throw new Error(`Failed to generate invoice: ${error.message}`);
    }
  }
}
