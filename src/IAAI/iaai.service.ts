import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import { AxiosResponse } from "axios";

@Injectable()
export class IaaIService {
  constructor(private readonly httpService: HttpService) {}

  async getCarDetailsByLot(lotNumber: string) {
    try {
      const url = `https://vis.iaai.com/Home/GetVehicleData?salvageId=${lotNumber}`;
      const response: AxiosResponse<string> = await lastValueFrom(
        this.httpService.get<string>(url, {
          responseType: "text",
          // eslint-disable-next-line prettier/prettier
        })
      );
      const responseData = JSON.parse(response.data) as Record<string, unknown>;

      return {
        data: responseData,
      };
    } catch (error) {
      console.error("Error fetching car details:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        // eslint-disable-next-line prettier/prettier
        `Failed to fetch car details for lot ${lotNumber}: ${errorMessage}`
      );
    }
  }
}
