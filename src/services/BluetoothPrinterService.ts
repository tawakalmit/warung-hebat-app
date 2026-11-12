import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Transaction, TransactionItem, StoreSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';

/**
 * Bluetooth Thermal Printer Service
 * 
 * Menggunakan expo-print dengan format yang dioptimalkan untuk thermal printer 58mm.
 * Untuk print langsung tanpa RawBT, kita generate HTML yang sudah diformat
 * untuk ukuran kertas thermal dan menggunakan system print service.
 * 
 * Pada Android, expo-print akan menampilkan dialog print system yang bisa
 * langsung memilih printer Bluetooth yang sudah di-pair tanpa perlu RawBT.
 */

export interface PrintOptions {
  logoUri?: string | null;
  paperWidth?: number; // default 58mm = ~380 points
}

export class BluetoothPrinterService {
  private static DEFAULT_WIDTH = 380; // 58mm thermal paper

  /**
   * Konversi file URI lokal ke base64 data URI agar bisa ditampilkan di HTML WebView.
   * expo-print menggunakan WebView yang tidak bisa akses file:// langsung.
   */
  private static async getBase64Logo(logoUri: string): Promise<string | null> {
    try {
      const base64 = await FileSystem.readAsStringAsync(logoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      // Detect format from extension or default to png
      const isJpg = logoUri.toLowerCase().includes('.jpg') || logoUri.toLowerCase().includes('.jpeg');
      const mimeType = isJpg ? 'image/jpeg' : 'image/png';
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Error converting logo to base64:', error);
      return null;
    }
  }

  /**
   * Generate HTML receipt yang dioptimalkan untuk thermal printer
   */
  static async generateReceiptHTML(
    transaction: Transaction,
    items: TransactionItem[],
    storeSettings: StoreSettings,
    options?: PrintOptions
  ): Promise<string> {
    // Konversi logo ke base64 agar bisa tampil di WebView/print
    let logoDataUri: string | null = null;
    if (options?.logoUri) {
      logoDataUri = await this.getBase64Logo(options.logoUri);
    }

    const itemsHTML = items
      .map(
        (item) => `
      <tr>
        <td colspan="3" style="padding-top:4px;font-size:11px;">${item.product_name}</td>
      </tr>
      <tr>
        <td style="padding-left:8px;font-size:10px;color:#555;">${item.quantity} x ${formatCurrency(item.price)}</td>
        <td></td>
        <td style="text-align:right;font-size:11px;">${formatCurrency(item.subtotal)}</td>
      </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      width: ${options?.paperWidth || this.DEFAULT_WIDTH}px;
      margin: 0 auto;
      padding: 8px;
      color: #000;
    }
    .header { text-align: center; margin-bottom: 8px; }
    .logo { width: 60px; height: 60px; object-fit: contain; margin-bottom: 4px; }
    .store-name { font-size: 14px; font-weight: bold; }
    .store-info { font-size: 10px; color: #333; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .meta { font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    .total-section td { padding: 2px 0; font-size: 11px; }
    .grand-total td { font-size: 13px; font-weight: bold; padding-top: 4px; }
    .footer { text-align: center; font-size: 10px; margin-top: 8px; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    ${logoDataUri ? `<img src="${logoDataUri}" class="logo" />` : ''}
    <div class="store-name">${storeSettings.store_name}</div>
    ${storeSettings.address ? `<div class="store-info">${storeSettings.address}</div>` : ''}
    ${storeSettings.phone ? `<div class="store-info">Telp: ${storeSettings.phone}</div>` : ''}
  </div>
  
  <div class="divider"></div>
  
  <div class="meta">
    <div>No: ${transaction.invoice_number}</div>
    <div>Tgl: ${formatDate(transaction.created_at)}</div>
    ${transaction.customer_name ? `<div>Pelanggan: ${transaction.customer_name}</div>` : ''}
  </div>
  
  <div class="divider"></div>
  
  <table>
    <tbody>${itemsHTML}</tbody>
  </table>
  
  <div class="divider"></div>
  
  <table class="total-section">
    <tr>
      <td>Subtotal</td>
      <td style="text-align:right">${formatCurrency(transaction.total_amount)}</td>
    </tr>
    ${transaction.discount > 0 ? `<tr><td>Diskon</td><td style="text-align:right">-${formatCurrency(transaction.discount)}</td></tr>` : ''}
    <tr class="grand-total">
      <td>TOTAL</td>
      <td style="text-align:right">${formatCurrency(transaction.grand_total)}</td>
    </tr>
    <tr>
      <td>Bayar</td>
      <td style="text-align:right">${formatCurrency(transaction.payment_amount)}</td>
    </tr>
    <tr>
      <td>Kembali</td>
      <td style="text-align:right">${formatCurrency(transaction.change_amount)}</td>
    </tr>
  </table>
  
  <div class="divider"></div>
  <div class="footer">${storeSettings.footer_note}</div>
</body>
</html>`;
  }

  /**
   * Print langsung ke printer yang terhubung via system print service.
   * Pada Android, ini akan mendeteksi printer Bluetooth yang sudah di-pair.
   * Tidak perlu RawBT - langsung pakai Android Print Framework.
   */
  static async printDirect(
    transaction: Transaction,
    items: TransactionItem[],
    storeSettings: StoreSettings,
    options?: PrintOptions
  ): Promise<void> {
    const html = await this.generateReceiptHTML(transaction, items, storeSettings, options);

    await Print.printAsync({
      html,
      width: options?.paperWidth || this.DEFAULT_WIDTH,
    });
  }

  /**
   * Print ke PDF file (untuk sharing/saving)
   */
  static async printToPDF(
    transaction: Transaction,
    items: TransactionItem[],
    storeSettings: StoreSettings,
    options?: PrintOptions
  ): Promise<string> {
    const html = await this.generateReceiptHTML(transaction, items, storeSettings, options);

    const { uri } = await Print.printToFileAsync({
      html,
      width: options?.paperWidth || this.DEFAULT_WIDTH,
    });

    return uri;
  }

  /**
   * Select printer - memilih printer default untuk print berikutnya
   * Ini akan menampilkan dialog pemilihan printer dari system
   */
  static async selectPrinter(): Promise<Print.Printer | null> {
    try {
      const printer = await Print.selectPrinterAsync();
      return printer;
    } catch {
      return null;
    }
  }

  /**
   * Print dengan printer yang sudah dipilih sebelumnya
   */
  static async printWithSelectedPrinter(
    transaction: Transaction,
    items: TransactionItem[],
    storeSettings: StoreSettings,
    printer: Print.Printer,
    options?: PrintOptions
  ): Promise<void> {
    const html = await this.generateReceiptHTML(transaction, items, storeSettings, options);

    await Print.printAsync({
      html,
      width: options?.paperWidth || this.DEFAULT_WIDTH,
      printerUrl: printer.url,
    });
  }
}
