# Guía de Integración de API Pública - El Trigal

Esta documentación contiene la especificación de los endpoints públicos del catálogo para su integración en el frontend.

---

## 🌍 Reglas Globales de Localización (Bilingüe)

Todos los endpoints públicos aceptan el parámetro query `locale`.
* **Valores aceptados:** `es` (Español, por defecto) o `en` (Inglés).
* **Comportamiento:** Resuelve automáticamente todos los textos localizados (nombres, descripciones, ingredientes, alérgenos y campos SEO) al idioma solicitado antes de retornar la respuesta.
* **Nombres de variables:** Los nombres de las variables (JSON keys) permanecen idénticos en ambos idiomas (`categoriaName`, `productoName`, etc.). Solo cambian los valores internos.

---

## 1. Listado Plano de Productos (Optimizado / Sin Sobrecarga)

Retorna una lista plana y paginada de productos. Ideal para cuadrículas de productos o resultados de búsqueda.

* **Endpoint:** `GET /api/v1/public/products`
* **Local:** `http://localhost:3000/api/v1/public/products`
* **Producción:** `https://tu-servidor.onrender.com/api/v1/public/products`

### 📋 Parámetros de Consulta (Query Params)

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| `locale` | String | No | Idioma de respuesta (`es` o `en`). Por defecto `es`. | `locale=en` |
| `type` | String | No | Filtro de origen: `local` (EE.UU.) o `imported` (Ecuador). | `type=imported` |
| `mainCategoryId` | String | No | Filtro por ID de categoría de MongoDB. | `mainCategoryId=6a6b7aee95a56c0b3f63e5c1` |
| `categorySlug` | String | No | Filtro por slug de la categoría (en español o inglés). | `categorySlug=galletas` |
| `search` | String | No | Búsqueda por texto (mínimo 2 caracteres). | `search=yogurt` |
| `page` | Number | No | Número de página. Por defecto `1`. | `page=1` |
| `limit` | Number | No | Cantidad de productos por página. Por defecto `10`. | `limit=12` |
| `sort` | String | No | Criterio de ordenación: `sortOrder`, `name`, `price-asc`, `price-desc`, `newest`. | `sort=price-asc` |

### 📥 Ejemplo de Respuesta (`?type=imported&locale=en`)

```json
{
  "success": true,
  "data": [
    {
      "productoId": "6a6b7ba11ba5083728831312",
      "productoName": "Cookie Love",
      "productoSlug": "cookie-love",
      "productoDescription": "The most delicious",
      "productoPrice": 2.00,
      "productoImage": "https://res.cloudinary.com/.../screenshot.png",
      "productoIngredients": "Wheat flour, sugar, butter",
      "productoAllergens": ["Gluten", "Milk"],
      "productoSeo": {
        "metaTitle": "Love Cookie | The Wheat Cookies",
        "metaDescription": "Cookie Love - The most delicious Sourced from Ecuador. for only $2.00."
      },
      "sortOrder": 0
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1,
    "requestId": "ec8cde7e-3d24-4984-86bc-123706708433",
    "timestamp": "2026-07-30T18:55:59.928Z"
  }
}
```

---

## 2. Categorías con Productos Aninados (Estructura de Menú)

Retorna la jerarquía completa de categorías junto con sus respectivos productos embebidos dentro de ellas. Ideal para renderizar el menú interactivo con pestañas.

* **Endpoint:** `GET /api/v1/public/categories/with-products`
* **Local:** `http://localhost:3000/api/v1/public/categories/with-products`
* **Producción:** `https://tu-servidor.onrender.com/api/v1/public/categories/with-products`

### 📋 Parámetros de Consulta (Query Params)

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| `locale` | String | No | Idioma de respuesta (`es` o `en`). Por defecto `es`. | `locale=en` |
| `type` | String | No | Filtro de origen: `local` o `imported`. | `type=imported` |

### 📥 Ejemplo de Respuesta (`?type=imported&locale=en`)

```json
{
  "success": true,
  "data": [
    {
      "categoriaId": "6a6b7aee95a56c0b3f63e5c1",
      "categoriaName": "Cookies",
      "categoriaSlug": "cookies",
      "categoriaOrigin": {
        "type": "imported",
        "country": "Ecuador",
        "countryCode": "EC"
      },
      "sortOrder": 2,
      "productos": [
        {
          "productoId": "6a6b7ba11ba5083728831312",
          "productoName": "Cookie Love",
          "productoSlug": "cookie-love",
          "productoDescription": "The most delicious",
          "productoPrice": 2.00,
          "productoImage": "https://res.cloudinary.com/.../screenshot.png",
          "productoIngredients": "",
          "productoAllergens": [],
          "productoSeo": {
            "metaTitle": "Love Cookie | The Wheat Cookies",
            "metaDescription": "Cookie Love - The most delicious Sourced from Ecuador. for only $2.00."
          },
          "sortOrder": 0
        }
      ]
    }
  ],
  "meta": {
    "requestId": "90bc0865-0155-4727-af74-c455b93799f3",
    "timestamp": "2026-07-30T18:47:14.727Z"
  }
}
```
