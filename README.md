# Smika Store - Backend

Backend desarrollado para **Smika Store**, una tienda online tipo catálogo orientada a productos de series, eventos, libros, preventas y productos personalizados.

El sistema permite gestionar productos, categorías, subcategorías, series, eventos, personajes, creadores, países u orígenes, usuarios, pedidos, favoritos, lista de deseos, recomendaciones personalizadas, notificaciones internas, subida de imágenes y redirección a WhatsApp para coordinar compras.

---

## Objetivo del proyecto

El objetivo del backend es brindar una API para administrar la información principal de Smika Store y permitir que los clientes puedan explorar productos, armar una lista de pedido y comunicarse con la tienda mediante WhatsApp.

En esta etapa, el sistema no implementa pasarela de pagos. Los pedidos se manejan como solicitudes o listas de compra que luego son coordinadas por WhatsApp.

---

## Tecnologías utilizadas

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- dotenv
- cors
- multer
- slugify
- socket.io
- express-validator
- nodemon

---

## Funcionalidades principales

El backend incluye los siguientes módulos:

- Autenticación de usuarios.
- Gestión de usuarios.
- Gestión de categorías y subcategorías.
- Gestión de series.
- Gestión de productos.
- Gestión de eventos.
- Gestión de personajes o criaturas.
- Gestión de creadores o autores.
- Gestión de países u orígenes.
- Lista de pedido o carrito.
- Gestión de pedidos.
- Estados de pago.
- Estados del pedido.
- Envío y tracking.
- Favoritos.
- Lista de deseos.
- Recomendaciones personalizadas.
- Notificaciones internas.
- Dashboard administrativo.
- Subida de imágenes.
- Redirección a WhatsApp.
- Eventos en tiempo real con Socket.IO.

---

## Autenticación y seguridad

El sistema utiliza JWT para proteger rutas privadas.

JWT significa **JSON Web Token**. En este proyecto se utiliza para identificar al usuario que inició sesión y controlar si tiene permisos de cliente o administrador.

Flujo general:

1. El usuario inicia sesión con correo y contraseña.
2. El backend valida los datos.
3. Si los datos son correctos, se genera un token JWT.
4. El frontend guarda ese token.
5. En las rutas protegidas, el frontend envía el token.
6. El backend verifica el token y permite o bloquea el acceso.

La contraseña del usuario se guarda cifrada usando `bcryptjs`.

Las rutas administrativas requieren:

1. Token válido.
2. Usuario con rol `admin`.

---

## Roles de usuario

El sistema maneja dos roles principales:

```txt
cliente
admin
```

El cliente puede:

- Registrarse.
- Iniciar sesión.
- Ver su perfil.
- Armar lista de pedido.
- Ver sus pedidos.
- Marcar favoritos.
- Usar lista de deseos.
- Ver recomendaciones.
- Ver notificaciones internas.

El administrador puede:

- Gestionar usuarios.
- Gestionar productos.
- Gestionar categorías.
- Gestionar series.
- Gestionar eventos.
- Gestionar personajes.
- Gestionar creadores.
- Gestionar orígenes.
- Gestionar pedidos.
- Actualizar pagos.
- Actualizar estados de pedido.
- Registrar envío y tracking.
- Crear notificaciones.
- Ver dashboard administrativo.

---

## Teléfono y país del usuario

Smika Store trabaja principalmente para Perú, por eso el sistema usa por defecto:

```txt
pais: PE
codigoPais: +51
```

El teléfono es opcional, pero recomendado para coordinar pedidos por WhatsApp.

Campos usados:

```txt
pais
codigoPais
telefono
telefonoCompleto
```

Ejemplo:

```txt
pais: PE
codigoPais: +51
telefono: 936649135
telefonoCompleto: +51936649135
```

Si el usuario registra un teléfono peruano, el sistema valida que sea un número móvil válido:

```txt
Debe empezar con 9 y tener 9 dígitos.
```

---

## WhatsApp

El sistema genera enlaces de WhatsApp usando el número oficial de Smika Store:

```txt
51936649135
```

Formato utilizado:

```txt
https://wa.me/51936649135?text=...
```

El mensaje generado incluye:

- Datos del cliente.
- Nombre.
- Apellido.
- Alias.
- Teléfono completo.
- Correo.
- Productos seleccionados.
- Cantidades.
- Precio referencial.
- Subtotal referencial.
- Total referencial.
- Monto pagado.
- Saldo pendiente.

En esta etapa no se implementa envío automático por WhatsApp mediante API oficial. Solo se genera un enlace con mensaje preparado.

La integración automática con WhatsApp Business Platform, Cloud API de Meta o proveedores externos queda como mejora futura.

---

## Categorías y subcategorías

El sistema permite manejar categorías principales y subcategorías.

Categorías principales consideradas:

- Series
- Eventos
- Libros
- Preventa
- Personalizados

Subcategorías consideradas:

### Series

- Chinas
- Coreanas
- Japonesas
- Variado

### Eventos

- Café
- Pop up
- Lebom
- Especiales

### Libros

- Tomos China
- Tomos KR
- Tomos JP
- Tomos TW

### Preventa

- China
- Corea
- Japón
- Variado

---

## Series

Las series se manejan como registros independientes relacionados con categorías, subcategorías, creadores y países u orígenes.

Cada serie puede tener:

- Nombre.
- Slug.
- Descripción.
- Imagen.
- Categoría principal.
- Subcategoría.
- País u origen.
- Creadores.
- Estado destacado.
- Estado activo.

---

## Personajes o criaturas

El sistema permite registrar personajes o criaturas para relacionarlos con productos y series.

Esto evita escribir personajes repetidos manualmente y permite que el administrador seleccione personajes desde listas desplegables en el frontend.

Cada personaje puede tener:

- Nombre.
- Slug.
- Tipo.
- Descripción.
- Imagen.
- Serie relacionada.
- Estado activo.

---

## Creadores o autores

El sistema permite registrar creadores, autores o responsables de una serie o producto.

Cada creador puede tener:

- Nombre.
- Slug.
- Tipo.
- Descripción.
- País de origen.
- Estado activo.

---

## Países u orígenes

El sistema permite manejar países u orígenes como registros independientes.

Ejemplos:

- China
- Corea
- Japón
- Taiwán
- Perú
- Variado
- Otro

Esto ayuda a no mezclar textos escritos manualmente en productos, series o eventos.

---

## Productos

El administrador puede gestionar productos con los siguientes datos:

- Nombre.
- Slug.
- Descripción.
- Precio referencial.
- Precio anterior.
- Imágenes.
- Categoría.
- Subcategoría.
- Serie.
- Evento relacionado.
- País u origen.
- Personajes.
- Marca.
- Tipo de producto.
- Disponibilidad.
- Stock.
- Tiempo estimado.
- Producto nuevo.
- Producto destacado.
- Estado activo.

Disponibilidades consideradas:

```txt
stock
preventa
por_pedido
agotado
```

La eliminación se maneja como desactivación lógica mediante el campo:

```txt
activo: false
```

Esto evita romper relaciones con pedidos, favoritos, recomendaciones o notificaciones.

---

## Subida de imágenes

Las imágenes se suben mediante `multer`.

Formatos permitidos:

```txt
JPG
JPEG
PNG
WEBP
```

Tamaño máximo recomendado:

```txt
5 MB
```

Las imágenes se almacenan en la carpeta:

```txt
uploads/
```

La carpeta `uploads/` está incluida en `.gitignore`, por lo tanto no se sube a GitHub.

Para producción, más adelante se puede mejorar usando almacenamiento externo para imágenes.

---

## Lista de pedido o carrito

El sistema permite que el cliente agregue productos a una lista de pedido o carrito antes de enviarlo como pedido.

El carrito puede manejar:

- Usuario registrado.
- Session ID.
- Productos.
- Cantidades.
- Precio referencial unitario.
- Total referencial.
- Estado del carrito.

Estados del carrito:

```txt
activo
convertido_en_pedido
abandonado
```

---

## Pedidos

El sistema permite crear pedidos de dos formas:

1. Desde una lista de pedido o carrito.
2. De forma directa.

Cada pedido guarda:

- Usuario relacionado, si existe.
- Datos del cliente.
- País del cliente.
- Código de país.
- Teléfono.
- Teléfono completo.
- Productos seleccionados.
- Cantidades.
- Precio referencial unitario.
- Subtotal referencial.
- Total referencial.
- Monto pagado.
- Saldo pendiente.
- Estado de pago.
- Estado del pedido.
- Enlace de WhatsApp generado.
- Observaciones del cliente.
- Notas administrativas.
- Datos de envío.
- Tracking.

---

## Estados de pago

Los pedidos pueden tener los siguientes estados de pago:

```txt
sin_pago
adelanto
pago_completo
cuotas
```

---

## Estados del pedido

Los pedidos pueden tener los siguientes estados:

```txt
pendiente_whatsapp
cotizado
separado
confirmado
en_preparacion
empaquetado
listo_para_entrega
enviado
en_courier
entregado
cancelado
```

---

## Envío y tracking

El pedido puede guardar información de envío:

```txt
courier
numeroTracking
trackingUrl
fechaEnvio
fechaEntregaEstimada
direccionEntrega
```

Esto permite que la administradora pueda actualizar el seguimiento del pedido y que el usuario pueda consultarlo desde su cuenta.

---

## Favoritos y lista de deseos

Cada usuario puede guardar preferencias como:

- Series favoritas.
- Categorías favoritas.
- Productos favoritos.
- Lista de deseos.
- Preferencia para recibir notificaciones.

Estas preferencias se usan para mejorar la experiencia del cliente dentro de la página.

---

## Recomendaciones personalizadas

El sistema incluye una sección de:

```txt
Recomendados para ti
```

Las recomendaciones cambian según cada usuario.

Se calculan principalmente a partir de:

- Series favoritas.
- Categorías favoritas.
- Productos favoritos.
- Lista de deseos.

Las recomendaciones se manejan por IDs de productos, series y categorías, evitando confusiones entre productos con nombres similares.

Ejemplo:

Aunque varios productos tengan nombres parecidos como “stand de acrílico”, cada producto se identifica internamente por su propio ID.

---

## Notificaciones internas

El sistema permite mostrar notificaciones dentro de la página.

Tipos de notificaciones consideradas:

```txt
manual
stock_bajo
producto_agotado
producto_restock
evento_proximo
novedad
producto
serie
categoria
pedido_actualizado
pago_pendiente
pedido_confirmado
pedido_empaquetado
pedido_enviado
tracking_disponible
pedido_entregado
```

Las notificaciones pueden estar dirigidas a:

```txt
todos
usuarios_especificos
por_preferencias
por_lista_deseos
por_pedido
```

Ejemplos de uso:

- Avisar que un producto de la lista de deseos está por agotarse.
- Avisar que un producto se agotó.
- Avisar que un producto volvió a stock.
- Avisar novedades relacionadas a una serie favorita.
- Avisar cambios en el estado de un pedido.
- Avisar que el tracking está disponible.
- Avisar que el pedido fue entregado.

---

## WebSocket

El backend usa `socket.io` para emitir eventos en tiempo real.

Eventos considerados:

- Nuevo pedido creado.
- Producto creado.
- Producto actualizado.
- Producto desactivado.
- Notificación creada.
- Estado de pedido actualizado.

Esto permite preparar el sistema para actualizaciones en vivo dentro del panel administrador o dentro de la cuenta del usuario.

---

## Dashboard administrativo

El dashboard administrativo muestra información resumida del sistema.

Puede mostrar conteos de:

- Usuarios.
- Productos.
- Categorías.
- Series.
- Eventos.
- Pedidos.
- Personajes.
- Creadores.
- Orígenes.
- Notificaciones.

También permite visualizar estados como:

- Pedidos pendientes por WhatsApp.
- Pedidos cotizados.
- Pedidos separados.
- Pedidos confirmados.
- Pedidos en preparación.
- Pedidos empaquetados.
- Pedidos listos para entrega.
- Pedidos enviados.
- Pedidos en courier.
- Pedidos entregados.
- Pedidos cancelados.
- Pagos pendientes.
- Pagos completos.
- Productos nuevos.
- Productos destacados.
- Stock bajo.
- Productos agotados.
- Eventos activos.
- Eventos próximos.

---

## Estructura del proyecto

```txt
smika-store-backend/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── server.js
├── uploads/
└── src/
    ├── app.js
    ├── config/
    │   └── db.js
    ├── controllers/
    ├── middlewares/
    ├── models/
    ├── routes/
    ├── seeders/
    ├── services/
    ├── utils/
    └── validators/
```

---

## Variables de entorno

El archivo real `.env` no debe subirse a GitHub.

Ejemplo de `.env.example`:

```env
PORT=4000
MONGO_URI=coloca_tu_cadena_de_conexion_mongodb
JWT_SECRET=coloca_una_clave_segura
WHATSAPP_NUMBER=51936649135
NODE_ENV=development
```

Ejemplo de `.env` local:

```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/smika_store
JWT_SECRET=coloca_tu_clave_real_generada
WHATSAPP_NUMBER=51936649135
NODE_ENV=development
```

La clave `JWT_SECRET` debe ser larga, privada y no debe compartirse ni subirse a GitHub.

---

## Instalación del proyecto

Primero se deben instalar las dependencias:

```bash
npm install
```

Luego se debe configurar el archivo `.env` con los datos correspondientes.

---

## Ejecutar en desarrollo

```bash
npm run dev
```

---

## Ejecutar en producción

```bash
npm start
```

---

## Ejecutar datos iniciales

El proyecto incluye un seeder para cargar categorías, subcategorías y países u orígenes iniciales.

```bash
npm run seed
```

---

## Scripts disponibles

```json
{
  "dev": "nodemon server.js",
  "start": "node server.js",
  "seed": "node src/seeders/seedData.js"
}
```

---

## Rutas principales de la API

### Ruta base

```txt
GET /api/health
```

---

### Autenticación

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

---

### Usuarios

```txt
GET    /api/users
GET    /api/users/:id
PATCH  /api/users/:id
PATCH  /api/users/:id/role
DELETE /api/users/:id
```

---

### Categorías

```txt
GET    /api/categories
GET    /api/categories/:id
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id
```

---

### Orígenes

```txt
GET    /api/origins
GET    /api/origins/:id
POST   /api/origins
PATCH  /api/origins/:id
DELETE /api/origins/:id
```

---

### Creadores

```txt
GET    /api/creators
GET    /api/creators/:id
POST   /api/creators
PATCH  /api/creators/:id
DELETE /api/creators/:id
```

---

### Personajes o criaturas

```txt
GET    /api/characters
GET    /api/characters/:id
POST   /api/characters
PATCH  /api/characters/:id
DELETE /api/characters/:id
```

---

### Series

```txt
GET    /api/series
GET    /api/series/:id
POST   /api/series
PATCH  /api/series/:id
DELETE /api/series/:id
```

---

### Productos

```txt
GET    /api/products
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id
```

---

### Eventos

```txt
GET    /api/events
GET    /api/events/:id
POST   /api/events
PATCH  /api/events/:id
DELETE /api/events/:id
```

---

### Carrito o lista de pedido

```txt
GET    /api/cart/:sessionId
POST   /api/cart/items
PATCH  /api/cart/items/:productId
DELETE /api/cart/items/:productId
DELETE /api/cart/:sessionId
```

---

### Pedidos

```txt
POST  /api/orders/from-cart
POST  /api/orders/direct
GET   /api/orders/me
GET   /api/orders
GET   /api/orders/:id
PATCH /api/orders/:id/status
```

---

### Preferencias

```txt
GET   /api/preferences/me
PATCH /api/preferences/series/:serieId/toggle
PATCH /api/preferences/categories/:categoryId/toggle
PATCH /api/preferences/products/:productId/favorite/toggle
PATCH /api/preferences/wishlist/:productId/toggle
PATCH /api/preferences/notifications
```

---

### Recomendaciones

```txt
GET /api/recommendations/me
```

---

### Notificaciones

```txt
GET    /api/notifications/me
PATCH  /api/notifications/read-all
PATCH  /api/notifications/:id/read
GET    /api/notifications/admin
POST   /api/notifications
DELETE /api/notifications/:id
```

---

### Dashboard

```txt
GET /api/dashboard
```

---

### Subida de imágenes

```txt
POST /api/uploads/single
POST /api/uploads/multiple
```

---

## Dependencias principales

```json
{
  "bcryptjs": "^3.0.2",
  "cors": "^2.8.5",
  "dotenv": "^16.6.1",
  "express": "^5.1.0",
  "express-validator": "^7.2.1",
  "jsonwebtoken": "^9.0.2",
  "mongoose": "^8.16.1",
  "multer": "^2.0.1",
  "slugify": "^1.6.6",
  "socket.io": "^4.8.1"
}
```

---

## Dependencias de desarrollo

```json
{
  "nodemon": "^3.1.10"
}
```

---

## Despliegue futuro

Para producción se considera:

- Frontend en Vercel.
- Backend en Render.
- Base de datos en MongoDB Atlas.

En Render se deben configurar variables de entorno como:

```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=clave_segura_para_produccion
WHATSAPP_NUMBER=51936649135
NODE_ENV=production
```

La clave `JWT_SECRET` de producción debe ser distinta, segura y privada.

---

## Consideraciones para GitHub

No se deben subir archivos sensibles o innecesarios como:

```txt
node_modules
.env
uploads
```

Por eso el archivo `.gitignore` debe contener:

```txt
node_modules
.env
uploads
.DS_Store
npm-debug.log
```

El archivo `.env.example` sí debe subirse porque sirve como guía para configurar el proyecto.

---

## Estado actual del proyecto

El backend cuenta con módulos principales para:

- Usuarios.
- Autenticación.
- Productos.
- Categorías.
- Subcategorías.
- Series.
- Eventos.
- Personajes.
- Creadores.
- Orígenes.
- Carrito o lista de pedido.
- Pedidos.
- Pagos referenciales.
- Envíos.
- Tracking.
- Notificaciones internas.
- Recomendaciones personalizadas.
- Favoritos.
- Lista de deseos.
- Dashboard administrativo.
- Subida de imágenes.
- Redirección a WhatsApp.

---

## Mejoras futuras

Algunas mejoras consideradas para próximas versiones son:

- Integrar pasarela de pagos.
- Integrar WhatsApp Business Platform o Cloud API de Meta.
- Enviar mensajes automáticos por WhatsApp.
- Usar almacenamiento externo para imágenes.
- Agregar reportes avanzados.
- Agregar historial detallado de cambios de pedido.
- Mejorar el sistema de recomendaciones con más criterios.
- Agregar filtros avanzados en el panel administrador.
- Agregar estadísticas de ventas o reservas.
- Implementar correos automáticos si la tienda lo necesita.

---

## Nota final

Este backend está diseñado para una primera versión funcional de Smika Store.

Actualmente, la coordinación de pedidos se realiza mediante enlaces preparados de WhatsApp y notificaciones internas dentro de la página. La administradora puede gestionar productos, usuarios, pedidos, estados, pagos, envíos y notificaciones desde el panel administrativo.