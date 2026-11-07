import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { StoreOrder } from './types';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] ?? char));

export async function shareInvoice(order: StoreOrder) {
  const rows = order.items.map((item) => `
    <tr><td>${escapeHtml(item.name)}<small> ${escapeHtml(item.productId)}</small></td>
    <td>${item.quantity}</td><td>${money(item.priceCents)}</td><td>${money(item.priceCents * item.quantity)}</td></tr>`).join('');
  const html = `<!doctype html><html><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;color:#171717;padding:32px}h1{font-size:24px}small{color:#777}
    .tag{color:#d71920;font-weight:bold}table{width:100%;border-collapse:collapse;margin-top:24px}
    th,td{text-align:left;padding:12px 8px;border-bottom:1px solid #ddd}th{font-size:12px;text-transform:uppercase}
    .total{text-align:right;font-size:20px;font-weight:bold;margin-top:24px}
  </style><body><p class="tag">LEGO STORE</p><h1>Factura de compra</h1>
    <p>Pedido: ${escapeHtml(order.id)}<br>Fecha: ${escapeHtml(new Date(order.createdAt).toLocaleString('es-MX'))}</p>
    <p><b>${escapeHtml(order.customer.name)}</b><br>${escapeHtml(order.customer.email)}<br>${escapeHtml(order.customer.address)}</p>
    <table><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="total">Total: ${money(order.totalCents)}</p><p>Pago simulado · Gracias por tu compra.</p></body></html>`;

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Factura LEGO Store' });
  }
}

function money(cents: number) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}