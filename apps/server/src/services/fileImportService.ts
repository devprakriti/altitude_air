import { Readable } from "node:stream";
import * as csv from "csv-parser";
import * as XLSX from "xlsx";

export type ManualItem = {
  sn?: string;
  name?: string;
  issueDate?: string;
  issueNo?: string;
  revDate?: string;
  revNo?: string;
  location?: string;
};

export type TrainingData = {
  name: string;
  jan?: string | number;
  feb?: string | number;
  mar?: string | number;
  apr?: string | number;
  may?: string | number;
  jun?: string | number;
  jul?: string | number;
  aug?: string | number;
  sep?: string | number;
  oct?: string | number;
  nov?: string | number;
  dec?: string | number;
};

export class FileImportService {
  /**
   * Parse Excel file (XLSX/XLS)
   */
  static async parseExcelFile(file: File): Promise<ManualItem[]> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip header row and map to ManualItem format
      const items: ManualItem[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (row && row.length > 0) {
          items.push({
            sn: row[0]?.toString() || "",
            name: row[1]?.toString() || "",
            issueDate: row[2]?.toString() || "",
            issueNo: row[3]?.toString() || "",
            revDate: row[4]?.toString() || "",
            revNo: row[5]?.toString() || "",
            location: row[6]?.toString() || "",
          });
        }
      }

      return items;
    } catch (error) {
      throw new Error(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Parse CSV file
   */
  static async parseCSVFile(file: File): Promise<ManualItem[]> {
    try {
      const text = await file.text();
      const items: ManualItem[] = [];

      return new Promise((resolve, reject) => {
        const stream = Readable.from([text]);

        stream
          .pipe(
            csv({
              headers: [
                "sn",
                "name",
                "issueDate",
                "issueNo",
                "revDate",
                "revNo",
                "location",
              ],
            })
          )
          .on("data", (row: any) => {
            items.push({
              sn: row.sn || "",
              name: row.name || "",
              issueDate: row.issueDate || "",
              issueNo: row.issueNo || "",
              revDate: row.revDate || "",
              revNo: row.revNo || "",
              location: row.location || "",
            });
          })
          .on("end", () => {
            resolve(items);
          })
          .on("error", (error) => {
            reject(new Error(`Failed to parse CSV file: ${error.message}`));
          });
      });
    } catch (error) {
      throw new Error(
        `Failed to parse CSV file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Parse training data from Excel file
   */
  static async parseTrainingExcelFile(file: File): Promise<TrainingData[]> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip header row and map to TrainingData format
      const trainingData: TrainingData[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (row && row.length > 0) {
          trainingData.push({
            name: row[0]?.toString() || "",
            jan: row[1] || "",
            feb: row[2] || "",
            mar: row[3] || "",
            apr: row[4] || "",
            may: row[5] || "",
            jun: row[6] || "",
            jul: row[7] || "",
            aug: row[8] || "",
            sep: row[9] || "",
            oct: row[10] || "",
            nov: row[11] || "",
            dec: row[12] || "",
          });
        }
      }

      return trainingData;
    } catch (error) {
      throw new Error(
        `Failed to parse training Excel file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Validate file type
   */
  static validateFileType(file: File, allowedTypes: string[]): boolean {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    return fileExtension ? allowedTypes.includes(fileExtension) : false;
  }

  /**
   * Get file extension
   */
  static getFileExtension(filename: string): string {
    return filename.split(".").pop()?.toLowerCase() || "";
  }

  /**
   * Validate file size
   */
  static validateFileSize(file: File, maxSizeInMB = 10): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  }

  /**
   * Generate sample CSV template
   */
  static generateSampleCSV(): string {
    const headers = [
      "S/N",
      "Name",
      "Issue Date",
      "Issue No",
      "Rev Date",
      "Rev No",
      "Location",
    ];
    const sampleData = [
      [
        "1",
        "Sample Manual 1",
        "2024-01-01",
        "001",
        "2024-01-15",
        "A",
        "Library A",
      ],
      [
        "2",
        "Sample Manual 2",
        "2024-01-02",
        "002",
        "2024-01-16",
        "B",
        "Library B",
      ],
    ];

    const csvContent = [headers, ...sampleData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    return csvContent;
  }

  /**
   * Generate sample Excel template
   */
  static generateSampleExcel(): Buffer {
    const headers = [
      "S/N",
      "Name",
      "Issue Date",
      "Issue No",
      "Rev Date",
      "Rev No",
      "Location",
    ];
    const sampleData = [
      [
        "1",
        "Sample Manual 1",
        "2024-01-01",
        "001",
        "2024-01-15",
        "A",
        "Library A",
      ],
      [
        "2",
        "Sample Manual 2",
        "2024-01-02",
        "002",
        "2024-01-16",
        "B",
        "Library B",
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Manual Items");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }
}
