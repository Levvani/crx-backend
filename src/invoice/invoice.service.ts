import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Car } from '../cars/schemas/car.schema';
import { PDFDocument, rgb, PDFPage, PDFFont } from 'pdf-lib';

// Create a counter schema for invoice numbers
export interface Counter {
  _id: string;
  seq: number;
}

@Injectable()
export class InvoiceService {
  private readonly uploadsPath: string;
  private readonly logoPath: string;
  private readonly regularFontPath: string;
  private readonly boldFontPath: string;

  constructor(@InjectModel('Counter') private counterModel: Model<Counter>) {
    // Path to save generated invoices
    this.uploadsPath = path.join(process.cwd(), 'uploads/invoices');
    // Path to company logo
    this.logoPath = path.join(process.cwd(), 'src/assets/crxLogo.jpg');
    // Path to Georgian fonts
    this.regularFontPath = path.join(
      process.cwd(),
      'src/assets/fonts/NotoSansGeorgian-Regular.ttf',
    );
    this.boldFontPath = path.join(process.cwd(), 'src/assets/fonts/NotoSansGeorgian-Bold.ttf');
    // Ensure the uploads directory exists
    void this.ensureUploadsDirectory();
  }

  /**
   * Ensure the uploads directory exists
   */
  private async ensureUploadsDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadsPath);
    } catch {
      await fs.mkdir(this.uploadsPath, { recursive: true });
    }
  }

  /**
   * Generate a unique invoice number in the format 80015-XXX
   */
  private async getNextInvoiceNumber(): Promise<string> {
    const counter = await this.counterModel.findOneAndUpdate(
      { _id: 'invoiceId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    // Use the counter for the number after the dash, starting from 45
    const invoiceNumber = 45 + counter.seq - 1;
    return `80015-${invoiceNumber}`;
  }

  /**
   * Load the company logo
   */
  private async loadLogo(pdfDoc: PDFDocument) {
    const logoBytes = await fs.readFile(this.logoPath);
    const logoImage = await pdfDoc.embedJpg(logoBytes);
    return logoImage;
  }

  /**
   * Helper function to draw mixed text with appropriate fonts
   * Georgian characters use Georgian font, everything else uses standard font
   */
  private drawMixedText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    size: number,
    georgianFont: PDFFont,
    standardFont: PDFFont,
  ): void {
    let currentX = x;
    let currentSegment = '';
    let isGeorgian = false;

    // Georgian Unicode range: \u10A0-\u10FF
    const isGeorgianChar = (char: string) => {
      const code = char.charCodeAt(0);
      return code >= 0x10a0 && code <= 0x10ff;
    };

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charIsGeorgian = isGeorgianChar(char);

      // If we're switching font types, render the current segment
      if (i > 0 && charIsGeorgian !== isGeorgian) {
        if (currentSegment) {
          const font = isGeorgian ? georgianFont : standardFont;
          page.drawText(currentSegment, {
            x: currentX,
            y: y,
            size: size,
            font: font,
            color: rgb(0, 0, 0),
          });

          // Calculate width of rendered text to update X position
          const textWidth = font.widthOfTextAtSize(currentSegment, size);
          currentX += textWidth;
        }
        currentSegment = '';
      }

      currentSegment += char;
      isGeorgian = charIsGeorgian;
    }

    // Render the final segment
    if (currentSegment) {
      const font = isGeorgian ? georgianFont : standardFont;
      page.drawText(currentSegment, {
        x: currentX,
        y: y,
        size: size,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
  }

  /**
   * Draw a table with borders and merged cells using mixed fonts
   */
  private drawTable(
    page: PDFPage,
    standardFont: PDFFont,
    georgianBoldFont: PDFFont,
    georgianFont: PDFFont,
    fontSize: number,
    tableData: { vinNumber: string; amount: number; purpose: string },
    startX: number,
    startY: number,
    rowHeight: number,
    columnWidths: number[],
  ): void {
    let currentY = startY;

    // Draw table headers using mixed fonts
    this.drawMixedText(
      page,
      'გადასახადი',
      startX + 20,
      currentY,
      fontSize,
      georgianBoldFont,
      standardFont,
    );
    this.drawMixedText(
      page,
      'თანხა',
      startX + columnWidths[0] + 20,
      currentY,
      fontSize,
      georgianBoldFont,
      standardFont,
    );
    this.drawMixedText(
      page,
      'ინვოისის დანიშნულება',
      startX + columnWidths[0] + columnWidths[1] + 20,
      currentY,
      fontSize,
      georgianBoldFont,
      standardFont,
    );

    // Draw horizontal line below headers
    page.drawLine({
      start: { x: startX, y: currentY - 5 },
      end: {
        x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        y: currentY - 5,
      },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    currentY -= rowHeight;

    // Draw table rows using mixed fonts
    this.drawMixedText(
      page,
      tableData.vinNumber,
      startX + 20,
      currentY,
      fontSize,
      georgianFont,
      standardFont,
    );
    this.drawMixedText(
      page,
      `$${tableData.amount}`,
      startX + columnWidths[0] + 20,
      currentY,
      fontSize,
      georgianFont,
      standardFont,
    );
    this.drawMixedText(
      page,
      tableData.purpose,
      startX + columnWidths[0] + columnWidths[1] + 20,
      currentY,
      fontSize,
      georgianFont,
      standardFont,
    );

    // Draw horizontal line below each row
    page.drawLine({
      start: { x: startX, y: currentY - 5 },
      end: {
        x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        y: currentY - 5,
      },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    currentY -= rowHeight;

    // Draw merged row for static text in Georgian using mixed fonts
    const mergedText =
      'შენიშვნა ბანკის ოპერატორს: გთხოვთ, თანხა გადმორიცხოთ „ქარექს იმპორტის" ანგარიშზე, უკუკონვერტაციით (რეკონით)';

    // For long text, we need to handle it differently since drawMixedText doesn't support maxWidth
    // Split the long text into chunks that fit the width
    const words = mergedText.split(' ');
    let currentLine = '';
    let lineY = currentY;
    const maxWidth = columnWidths[0] + columnWidths[1] + columnWidths[2] - 20;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      // Approximate width check (Georgian font width estimation)
      if (testLine.length * (fontSize * 0.6) > maxWidth && currentLine) {
        // Draw the current line
        this.drawMixedText(
          page,
          currentLine,
          startX + 10,
          lineY,
          fontSize,
          georgianFont,
          standardFont,
        );
        currentLine = word;
        lineY -= fontSize + 2; // Move to next line
      } else {
        currentLine = testLine;
      }
    }

    // Draw the final line
    if (currentLine) {
      this.drawMixedText(
        page,
        currentLine,
        startX + 10,
        lineY,
        fontSize,
        georgianFont,
        standardFont,
      );
    }

    // Draw horizontal line below merged row
    page.drawLine({
      start: { x: startX, y: currentY - 30 },
      end: {
        x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        y: currentY - 30,
      },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Draw top horizontal line
    page.drawLine({
      start: { x: startX, y: startY + 15 },
      end: {
        x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        y: startY + 15,
      },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Draw vertical lines for the table
    page.drawLine({
      start: { x: startX, y: startY + 15 },
      end: { x: startX, y: currentY - 30 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: startX + columnWidths[0], y: startY + 15 },
      end: { x: startX + columnWidths[0], y: currentY + 15 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: startX + columnWidths[0] + columnWidths[1], y: startY + 15 },
      end: {
        x: startX + columnWidths[0] + columnWidths[1],
        y: currentY + 15,
      },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: {
        x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        y: startY + 15,
      },
      end: {
        x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        y: currentY - 30,
      },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  /**
   * Generate an invoice PDF for a car using pdf-lib (exact implementation from your code)
   * @param car The car object containing data for the invoice
   * @param type The type of invoice ('transportation' or 'car')
   * @param amount Optional amount to override default car prices
   * @returns Object containing the file path and buffer
   */
  async generateInvoice(
    car: Car,
    type: string,
    amount?: number,
  ): Promise<{ filePath: string; buffer: Buffer }> {
    try {
      const invoiceNumber = await this.getNextInvoiceNumber();

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();

      // Register fontkit for custom fonts (dynamic import approach)
      const fontkitInstance = await import('@pdf-lib/fontkit');
      pdfDoc.registerFontkit(fontkitInstance.default || fontkitInstance);

      // Embed both Georgian and standard fonts
      let georgianFont: PDFFont;
      let georgianBoldFont: PDFFont;

      // Always embed standard fonts for numbers and Latin text
      const standardFont = await pdfDoc.embedFont('Helvetica');
      const standardBoldFont = await pdfDoc.embedFont('Helvetica-Bold');

      try {
        const fontBytes = await fs.readFile(this.regularFontPath);
        georgianFont = await pdfDoc.embedFont(fontBytes);

        const boldFontBytes = await fs.readFile(this.boldFontPath);
        georgianBoldFont = await pdfDoc.embedFont(boldFontBytes);
      } catch (fontError) {
        console.warn(
          'Could not load Georgian fonts, using standard fonts for all text:',
          fontError,
        );
        // Fallback to standard fonts for everything
        georgianFont = standardFont;
        georgianBoldFont = standardBoldFont;
      }

      const page = pdfDoc.addPage([600, 800]);

      // Load the company logo
      const logoImage = await this.loadLogo(pdfDoc);

      // Set font and font size
      const fontSize = 12;

      // Draw the company logo
      page.drawImage(logoImage, {
        x: 50,
        y: page.getHeight() - 100,
        width: 200,
        height: 50,
      });

      // Draw static fields with mixed fonts using the smart helper function
      this.drawMixedText(
        page,
        '„ქარექს იმპორტი"',
        50,
        page.getHeight() - 150,
        fontSize,
        georgianBoldFont,
        standardBoldFont,
      );

      this.drawMixedText(
        page,
        'საიდენტიფიკაციო კოდი: 402180983',
        50,
        page.getHeight() - 175,
        fontSize,
        georgianBoldFont,
        standardBoldFont,
      );

      this.drawMixedText(
        page,
        'ბანკი: საქართველოს ბანკი',
        50,
        page.getHeight() - 190,
        fontSize,
        georgianBoldFont,
        standardBoldFont,
      );

      this.drawMixedText(
        page,
        'ბანკის სვიფტი: BAGAGE22',
        50,
        page.getHeight() - 205,
        fontSize,
        georgianBoldFont,
        standardBoldFont,
      );

      this.drawMixedText(
        page,
        'ანგარიშის ნომერი: GE40BG0000000498826082',
        50,
        page.getHeight() - 220,
        fontSize,
        georgianBoldFont,
        standardBoldFont,
      );

      // Draw dynamic invoice number
      this.drawMixedText(
        page,
        `ინვოისი# ${invoiceNumber}`,
        400,
        page.getHeight() - 100,
        fontSize,
        georgianBoldFont,
        standardBoldFont,
      );

      // Determine amount based on type and provided amount
      let finalAmount: number;
      let purpose: string;

      if (type === 'transportation') {
        finalAmount = amount !== undefined ? amount : car.transportationPrice || 0;
        purpose = 'ტრანსპორტირება';
      } else if (type === 'car') {
        finalAmount = amount !== undefined ? amount : car.auctionPrice || 0;
        purpose = 'ავტომობილის ღირებულება';
      } else {
        throw new Error(`Invalid type: ${type}. Must be 'transportation' or 'car'`);
      }

      // Draw the table
      const tableData = {
        vinNumber: car.vinCode || 'N/A',
        amount: finalAmount,
        purpose: purpose,
      };

      this.drawTable(
        page,
        standardFont,
        georgianBoldFont,
        georgianFont,
        fontSize,
        tableData,
        50,
        page.getHeight() - 260,
        20,
        [200, 100, 200],
      );

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      // Save to file with Georgian filename based on type
      const typeText = type === 'transportation' ? 'ტრანსპორტირების' : 'ავტომობილის';
      const filename = `${typeText} ინვოისი ${car.vinCode}.pdf`;
      const filePath = path.join(this.uploadsPath, filename);
      await fs.writeFile(filePath, pdfBuffer);

      return { filePath, buffer: pdfBuffer };
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw new Error(
        `Failed to generate invoice: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
