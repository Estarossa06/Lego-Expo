export function requireRole(role) {
  return (request, response, next) => {
    if (!request.user || request.user.role !== role) {
      response.status(403).json({ error: 'Permisos insuficientes para esta acción.' });
      return;
    }
    next();
  };
}
