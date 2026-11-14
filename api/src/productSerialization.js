export function sanitizeProduct(row) {
  if (!row) return null;
  const rawPrice = row.price_cents ?? row.priceCents;
  const rawImageUrl = row.image_url ?? row.imageUrl;
  const priceCents = Number(rawPrice);
  const stock = Number(row.stock);
  if (!Number.isInteger(priceCents) || !Number.isInteger(stock) || typeof rawImageUrl !== 'string') {
    throw new Error('La fila del producto contiene datos inválidos.');
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents,
    stock,
    imageUrl: rawImageUrl,
    category: row.category,
    isActive: row.is_active ?? row.isActive,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}
