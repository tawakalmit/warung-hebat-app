import * as Print from 'expo-print';
import { Transaction, TransactionItem, StoreSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';

/**
 * Service untuk print invoice via Bluetooth thermal printer
 * Menggunakan expo-print sebagai fallback, dan bisa diintegrasikan
 * dengan react-native-thermal-receipt-printer untuk Bluetooth direct printing
 */

export class PrinterService {
  /**
   * Generate HTML receipt untuk printing
   */
  static generateReceiptHTML(
    transaction: Transaction,
    items: TransactionItem[],
    storeSettings: StoreSettings
  ): string {
    const itemsHTML = items
      .map(
        (item) => `
      <tr>
        <td style="text-align:left;padding:2px 0;">${item.product_name}</td>
        <td style="text-align:center;padding:2px 0;">${item.quantity}</td>
        <td style="text-align:right;padding:2px 0;">${formatCurrency(item.price)}</td>
        <td style="text-align:right;padding:2px 0;">${formatCurrency(item.subtotal)}</td>
      </tr>`
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      width: 280px;
      margin: 0 auto;
      padding: 8px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #333;
      margin: 6px 0;
    }
    .store-name {
      font-size: 14px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .total-section td {
      padding: 2px 0;
    }
    .grand-total {
      font-size: 13px;
      font-weight: bold;
    }
    .footer {
      margin-top: 8px;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="center store-name">${storeSettings.store_name}</div>
  ${storeSettings.address ? `<div class="center">${storeSettings.address}</div>` : ''}
  ${storeSettings.phone ? `<div class="center">Telp: ${storeSettings.phone}</div>` : ''}
  
  <div class="divider"></div>
  
  <div>No: ${transaction.invoice_number}</div>
  <div>Tgl: ${formatDate(transaction.created_at)}</div>
  ${transaction.customer_name ? `<div>Pelanggan: ${transaction.customer_name}</div>` : ''}
  <div>Kasir: -</div>
  
  <div class="divider"></div>
  
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Harga</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>
  
  <div class="divider"></div>
  
  <table class="total-section">
    <tr>
      <td>Subtotal</td>
      <td style="text-align:right">${formatCurrency(transaction.total_amount)}</td>
    </tr>
    ${
      transaction.discount > 0
        ? `<tr><td>Diskon</td><td style="text-align:right">-${formatCurrency(transaction.discount)}</td></tr>`
        : ''
    }
    <tr class="grand-total">
      <td>TOTAL</td>
      <td style="text-align:right">${formatCurrency(transaction.grand_total)}</td>
    </tr>
    <tr>
      <td>Bayar (${transaction.payment_method})</td>
      <td style="text-align:right">${formatCurrency(transaction.payment_amount)}</td>
    </tr>
    <tr>
      <td>Kembali</td>
      <td style="text-align:right">${formatCurrency(transaction.change_amount)}</td>
    </tr>
  </table>
  
  <div class="divider"></div>
  
  <div class="center footer">${storeSettings.footer_note}</div>
  <div class="center footer">${formatDate(transaction.created_at)}</div>
</body>
</html>`;
  }

  /**
   * Print menggunakan expo-print (system print dialog)
   * Bisa digunakan untuk print ke printer yang terhubung via system
   */
  static async printReceipt(
    transaction: Transaction,
    items: TransactionItem[],
    storeSettings: StoreSettings
  ): Promise<void> {
    const html = this.generateReceiptHTML(transaction, items, storeSettings);

    await Print.printAsync({
      html,
      width: 380, // ~58mm thermal paper width in points
    });
  }

  /**
   * Print ke PDF (untuk sharing/saving)
   */
  static async printToPDF(
    transaction: Transaction,
    items: TransactionItem[],
    storeSettings: StoreSettings
  ): Promise<string> {
    const html = this.generateReceiptHTML(transaction, items, storeSettings);

    const { uri } = await Print.printToFileAsync({
      html,
      width: 380,
    });

    return uri;
  }

  /**
   * Untuk integrasi Bluetooth thermal printer
   * Menggunakan react-native-thermal-receipt-printer-image-qr
   * 
   * Catatan: Untuk menggunakan fitur ini, perlu:
   * 1. Install: react-native-thermal-receipt-printer-image-qr
   * 2. Pair printer Bluetooth dari settings HP
   * 3. Gunakan fungsi ini untuk print langsung
   * 
   * Contoh penggunaan:
   * ```
   * import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';
   * 
   * // Scan & connect
   * await BLEPrinter.init();
   * const devices = await BLEPrinter.getDeviceList();
   * await BLEPrinter.connectPrinter(devices[0].inner_mac_address);
   * 
   * // Print
   * BLEPrinter.printText('<C>WARUNG HEBAT</C>\n');
   * BLEPrinter.printText('================================\n');
   * BLEPrinter.printText(`No: ${invoiceNumber}\n`);
   * // ... dst
   * ```
   */
  static generateThermalCommands(
    transaction: Transaction,
    items: TransactionItem[],
    storeSettings: StoreSettings
  ): string[] {
    const commands: string[] = [];
    const separator = '================================';

    commands.push(`<C><B>${storeSettings.store_name}</B></C>`);
    if (storeSettings.address) commands.push(`<C>${storeSettings.address}</C>`);
    if (storeSettings.phone) commands.push(`<C>Telp: ${storeSettings.phone}</C>`);
    commands.push(separator);
    commands.push(`No: ${transaction.invoice_number}`);
    commands.push(`Tgl: ${formatDate(transaction.created_at)}`);
    if (transaction.customer_name) {
      commands.push(`Pelanggan: ${transaction.customer_name}`);
    }
    commands.push(separator);

    for (const item of items) {
      commands.push(item.product_name);
      commands.push(
        `  ${item.quantity} x ${formatCurrency(item.price)}  ${formatCurrency(item.subtotal)}`
      );
    }

    commands.push(separator);
    commands.push(`Subtotal: ${formatCurrency(transaction.total_amount)}`);
    if (transaction.discount > 0) {
      commands.push(`Diskon: -${formatCurrency(transaction.discount)}`);
    }
    commands.push(`<B>TOTAL: ${formatCurrency(transaction.grand_total)}</B>`);
    commands.push(`Bayar: ${formatCurrency(transaction.payment_amount)}`);
    commands.push(`Kembali: ${formatCurrency(transaction.change_amount)}`);
    commands.push(separator);
    commands.push(`<C>${storeSettings.footer_note}</C>`);
    commands.push('\n\n\n'); // Feed paper

    return commands;
  }
}
