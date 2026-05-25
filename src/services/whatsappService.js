const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "51936649135";

const formatProductLine = (item, index) => {
  const nombre = item.nombreProducto || item.producto?.nombre || "Producto";
  const cantidad = item.cantidad || 1;
  const precio = item.precioReferencialUnitario || 0;
  const subtotal = item.subtotalReferencial || cantidad * precio;

  return `${index + 1}. ${nombre}
Cantidad: ${cantidad}
Precio referencial: S/ ${precio}
Subtotal referencial: S/ ${subtotal}`;
};

const generateWhatsAppMessage = (order) => {
  const nombre = order.cliente?.nombre || "Cliente";
  const apellido = order.cliente?.apellido || "";
  const alias = order.cliente?.alias || "";
  const telefono = order.cliente?.telefonoCompleto || "No indicado";
  const correo = order.cliente?.email || "No indicado";

  const productLines = order.items
    .map((item, index) => formatProductLine(item, index))
    .join("\n\n");

  return `Hola Smika Store 💖, quiero consultar sobre mi pedido.

Mis datos:
Nombre: ${nombre} ${apellido}
Alias: ${alias || "No indicado"}
Teléfono: ${telefono}
Correo: ${correo}

Productos seleccionados:
${productLines}

Total referencial: S/ ${order.totalReferencial}
Monto pagado: S/ ${order.montoPagado || 0}
Saldo pendiente: S/ ${order.saldoPendiente || order.totalReferencial}

Quedo atento/a para coordinar disponibilidad, pago y entrega.`;
};

const generateWhatsAppLink = (order) => {
  const message = generateWhatsAppMessage(order);
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
};

module.exports = {
  generateWhatsAppMessage,
  generateWhatsAppLink
};