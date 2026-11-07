export const isValidUUID = (value) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function validateOrder({ id, deviceId, customer, items } = {}) {
  if (!isValidUUID(id) || typeof deviceId !== 'string' || !deviceId.trim() || !validCustomer(customer)) {
    return 'Datos del pedido o del cliente inválidos.';
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
    return 'El pedido debe incluir entre 1 y 50 productos.';
  }

  const ids = new Set();
  for (const item of items) {
    if (typeof item.productId !== 'string' || ids.has(item.productId) ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
      !Number.isInteger(item.priceCents) || item.priceCents < 0) {
      return 'Hay productos o cantidades inválidas.';
    }
    ids.add(item.productId);
  }
  return null;
}

export function validateInventory(items, products) {
  const byId = new Map(products.map((product) => [product.id, product]));
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) return `El set ${item.productId} ya no está disponible.`;
    if (product.price_cents !== item.priceCents) {
      return `El precio de ${product.name} cambió. Actualiza el catálogo y vuelve a comprar.`;
    }
    if (product.stock < item.quantity) return `No hay existencias suficientes de ${product.name}.`;
  }
  return null;
}

function validCustomer(customer) {
  return customer && ['name', 'phone', 'email', 'address'].every((key) =>
    typeof customer[key] === 'string' && customer[key].trim().length > 0,
  ) && /^\S+@\S+\.\S+$/.test(customer.email);
}