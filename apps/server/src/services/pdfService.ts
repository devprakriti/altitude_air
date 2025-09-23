import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { s3Client, generateFileKey } from '../lib/s3';

// Define fonts configuration
const fonts = {
	Roboto: {
		normal: 'Helvetica',
		bold: 'Helvetica-Bold',
		italics: 'Helvetica-Oblique',
		bolditalics: 'Helvetica-BoldOblique'
	}
};

const printer = new PdfPrinter(fonts);

export interface TrainingOverviewData {
	title?: string;
	asOfDate?: string;
	year?: string;
	rows: Array<{
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
	}>;
	legend?: string[];
}

export interface TechnicalLibraryData {
	items: Array<{
		sn?: string;
		name?: string;
		issueDate?: string;
		issueNo?: string;
		revDate?: string;
		revNo?: string;
		location?: string;
	}>;
}

export class PDFService {
	/**
	 * Generate Training Overview PDF
	 */
	static async generateTrainingOverviewPDF(data: TrainingOverviewData): Promise<Buffer> {
		const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
		const headerRow = [{ text: 'NAME', bold: true }].concat(
			months.map(m => ({ text: m, bold: true }))
		);

		const body = [headerRow];
		data.rows.forEach(row => {
			const tableRow = [{ text: row.name || '', margin: [2, 3, 2, 3] }];
			months.forEach(month => {
				const key = month.toLowerCase() as keyof typeof row;
				tableRow.push({
					text: (row[key] ?? '').toString(),
					margin: [0, 3, 0, 3]
				});
			});
			body.push(tableRow);
		});

		const docDefinition: TDocumentDefinitions = {
			pageMargins: [24, 36, 24, 36],
			content: [
				{
					text: 'ALTITUDE AIR PVT. LTD.',
					bold: true,
					alignment: 'center',
					margin: [0, 0, 0, 2]
				},
				{
					text: data.title || 'CAMO & AMO TRAINING OVERVIEW',
					bold: true,
					alignment: 'center',
					margin: [0, 0, 0, 8]
				},
				{
					columns: [
						{ text: `As on: ${data.asOfDate || ''}`, fontSize: 9 },
						{ text: `Training Plan Overview ${data.year || ''}`, alignment: 'right', fontSize: 9 }
					],
					margin: [0, 0, 0, 8]
				},
				{
					table: {
						headerRows: 1,
						widths: [160].concat(new Array(12).fill('*')),
						body
					},
					layout: { fillColor: (i: number) => (i === 0 ? '#f3f4f6' : null) }
				},
				...(data.legend?.length ? [{ margin: [0, 10, 0, 0], text: data.legend.join('\n') }] : [])
			],
			defaultStyle: { font: 'Roboto', fontSize: 10 }
		};

		return this.generatePDFBuffer(docDefinition);
	}

	/**
	 * Generate Technical Library PDF
	 */
	static async generateTechnicalLibraryPDF(data: TechnicalLibraryData): Promise<Buffer> {
		const body = [
			[
				{ text: 'S/N', bold: true },
				{ text: 'List of manuals', bold: true },
				{ text: 'Issue date', bold: true },
				{ text: 'Issue no.', bold: true },
				{ text: 'Rev. date', bold: true },
				{ text: 'Rev. no', bold: true },
				{ text: 'Location', bold: true }
			]
		];

		data.items.forEach(item => {
			body.push([
				item.sn ?? '',
				item.name ?? '',
				item.issueDate ?? '',
				item.issueNo ?? '',
				item.revDate ?? '',
				item.revNo ?? '',
				item.location ?? ''
			]);
		});

		const docDefinition: TDocumentDefinitions = {
			pageMargins: [30, 40, 30, 40],
			content: [
				{
					text: 'Engineering Department\nTechnical Library',
					style: 'title',
					margin: [0, 0, 0, 10]
				},
				{
					text: `Last Updated: ${new Date().toLocaleDateString()}`,
					style: 'small',
					margin: [0, 0, 0, 8]
				},
				{
					table: {
						headerRows: 1,
						widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', '*'],
						body
					},
					layout: 'lightHorizontalLines'
				}
			],
			styles: {
				title: { fontSize: 16, bold: true, alignment: 'center' },
				small: { fontSize: 9 }
			},
			defaultStyle: { font: 'Roboto', fontSize: 10 }
		};

		return this.generatePDFBuffer(docDefinition);
	}

	/**
	 * Generate a simple document PDF
	 */
	static async generateSimpleDocumentPDF(title: string, content: string): Promise<Buffer> {
		const docDefinition: TDocumentDefinitions = {
			content: [
				{ text: title, bold: true, fontSize: 16, margin: [0, 0, 0, 8] },
				{ text: content || '(No content provided)' }
			],
			defaultStyle: { font: 'Roboto', fontSize: 10 }
		};

		return this.generatePDFBuffer(docDefinition);
	}

	/**
	 * Generate PDF buffer from document definition
	 */
	private static generatePDFBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			try {
				const doc = printer.createPdfKitDocument(docDefinition);
				const chunks: Buffer[] = [];

				doc.on('data', (chunk: Buffer) => chunks.push(chunk));
				doc.on('end', () => resolve(Buffer.concat(chunks)));
				doc.on('error', reject);

				doc.end();
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Save PDF buffer to S3
	 */
	static async savePDFToS3(buffer: Buffer, filename: string, userId: string): Promise<{ fileKey: string; size: number }> {
		const timestamp = Date.now();
		const sanitizedFilename = filename.replace(/[^\w.\-]/g, '_');
		const fullFilename = `${timestamp}__${sanitizedFilename}`;
		const fileKey = generateFileKey(userId, fullFilename);

		// Upload to S3
		await s3Client.write(fileKey, buffer, {
			type: 'application/pdf',
			acl: 'private'
		});

		return {
			fileKey,
			size: buffer.length
		};
	}

	/**
	 * Get file from S3
	 */
	static async getFileFromS3(fileKey: string): Promise<Buffer | null> {
		try {
			const exists = await s3Client.exists(fileKey);
			if (!exists) {
				return null;
			}

			const s3File = s3Client.file(fileKey);
			const arrayBuffer = await s3File.arrayBuffer();
			return Buffer.from(arrayBuffer);
		} catch (error) {
			console.error('Error getting file from S3:', error);
			return null;
		}
	}

	/**
	 * Delete file from S3
	 */
	static async deleteFileFromS3(fileKey: string): Promise<boolean> {
		try {
			await s3Client.delete(fileKey);
			return true;
		} catch (error) {
			console.error('Error deleting file from S3:', error);
			return false;
		}
	}
}
