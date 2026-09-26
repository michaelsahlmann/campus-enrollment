# Guía de Integración API LearnHouse LMS (Vercel Backend)

Esta documentación está dirigida al equipo de desarrollo para implementar la automatización de alta de alumnos, matriculación en cursos y envío de credenciales desde un backend en **Vercel** (Next.js / Node.js).

---

## 1. Resumen Ejecutivo y Resolución de Dudas Previas

### ¿Por qué salieron nombres y datos raros anteriormente?
- **Nombre de usuario hash (`michelsd12_81226d0d496b`):** 
  LearnHouse autogenera un hash aleatorio si en la petición de creación solo se envía el email sin un `first_name` ni un `username` amigable. Para evitarlo, el backend en Vercel debe separar el nombre completo del alumno en `first_name` y `last_name`, y construir un `username` limpio (ej. `juanp_421`).
- **Falta de contraseña inicial:**
  Por defecto, LearnHouse no asigna contraseña a menos que se incluya el campo `password` en el cuerpo de la petición. Si no se envía, la cuenta queda marcada como usuario SSO/Magic Link sin contraseña local.

### ¿Por qué la contraseña debe enviarse desde Vercel y no depender del correo interno de LearnHouse?
1. **Seguridad y Criptografía:** LearnHouse (al igual que cualquier plataforma moderna) hashea las contraseñas con bcrypt en cuanto las recibe. Nunca guarda contraseñas en texto claro en la base de datos, por lo que su correo interno no puede incluir la contraseña.
2. **Entrega Confiable y Marca Propia:** Vercel genera la contraseña temporal en memoria antes de mandarla a la API. Por lo tanto, Vercel tiene en sus manos el correo, el nombre, la contraseña en texto plano y el enlace directo, permitiendo enviar un correo o WhatsApp de bienvenida 100% personalizado con la identidad de **Instituto Varkentis**.

---

## 2. Actualizaciones y Persistencia (¿Se borra algo si se actualiza LearnHouse?)

> [!IMPORTANT]
> **Respuesta directa:** Los datos de alumnos, contraseñas y cursos **NUNCA** se pierden durante una actualización.

1. **Base de Datos (100% Persistente):**
   - Todo lo creado vía API (usuarios, contraseñas hasheadas, inscripciones a cursos, avances) se almacena en PostgreSQL (`learnhouse-db`), el cual corre sobre un volumen de almacenamiento persistente (`learnhouse_db_data`).
   - Reiniciar, redeplegar o actualizar la versión de LearnHouse no toca ni borra estos datos.
2. **Variables de Entorno (100% Persistentes):**
   - Las variables configuradas en OpenShip y en la plantilla del VPS (`LEARNHOUSE_DOMAIN`, `LEARNHOUSE_SSL`, etc.) se preservan en la base de datos del orquestador.
3. **Por qué la integración con Vercel es la mejor arquitectura:**
   - Al realizar el aprovisionamiento y el envío del correo de bienvenida con las credenciales desde **Vercel**, LearnHouse funciona como un **headless LMS**.
   - No dependes de modificaciones internas en el código de LearnHouse. Si mañana sale la versión 2.0 de LearnHouse y se actualiza la imagen Docker, **tu integración en Vercel seguirá funcionando sin romperse**.

---

## 3. Especificación Técnica de la API de LearnHouse

### 3.1. Configuración de Acceso

| Parámetro | Valor |
| :--- | :--- |
| **Base URL** | `https://campus.michaelsahlmann.com/api/v1` |
| **Cabecera de Autenticación** | `Authorization: Bearer <API_TOKEN>` |
| **Token API Producción** | `lh_dc8RpUb1xAgq2p0LBz0qXMmpIe9EiBeclv5EmgQmISc` |
| **Organization Slug** | `default` |

---

### 3.2. Reglas de Complejidad de Contraseñas en LearnHouse
La API valida las contraseñas con el servicio de seguridad interno. Toda contraseña generada **debe cumplir obligatoriamente**:
- Mínimo **8 caracteres**.
- Al menos **1 letra mayúscula** (`[A-Z]`).
- Al menos **1 letra minúscula** (`[a-z]`).
- Al menos **1 número** (`[0-9]`).
- Al menos **1 carácter especial** (`!@#$%^&*()_+-=[]{}|;':",./<>?`).

*Ejemplo válido generado:* `Varkentis7391!` o `Campus$9482#`

---

### 3.3. Catálogo de Cursos Disponibles

| Nombre del Curso | UUID del Curso |
| :--- | :--- |
| **Curso de Bolsa de Valores en Paraguay: De Cero a tu Primera Inversión** | `course_8bbc2b81-c213-4c9d-86f2-ce613dc6cdac` |

---

## 4. Flujo de Integración Paso a Paso (Backend en Vercel)

El flujo que debe ejecutar la función serverless o API route en Vercel tras confirmar el pago (webhook de Stripe, MercadoPago, etc.):

```mermaid
flowchart TD
    A["Webhook de Pago en Vercel"] --> B["Verificar si el Alumno existe en LearnHouse<br/>GET /users/by-email/{email}"]
    B -->|Existe| D["Obtener user_id existente"]
    B -->|No Existe| C["Generar contraseña segura & username limpio<br/>POST /users (crear usuario)"]
    C --> D
    D --> E["Matricular alumno en el curso<br/>POST /enrollments/{user_id}/{course_uuid}"]
    E --> F["(Opcional) Generar Magic Link de 1 clic<br/>POST /auth/magic-link"]
    F --> G["Enviar Correo / WhatsApp de Bienvenida desde Vercel<br/>(con URL, usuario, contraseña y magic link)"]
```

---

### Paso 1: Consultar si el alumno ya tiene cuenta

- **Método:** `GET`
- **Ruta:** `https://campus.michaelsahlmann.com/api/v1/admin/default/users/by-email/{email}`
- **Headers:**
  ```http
  Authorization: Bearer lh_dc8RpUb1xAgq2p0LBz0qXMmpIe9EiBeclv5EmgQmISc
  ```
- **Respuestas:**
  - `200 OK`: El alumno ya existe. Extraer `data.id` para la matrícula.
  - `404 Not Found`: El alumno no existe. Proceder al Paso 2 para crearlo.

---

### Paso 2: Crear el Alumno (Aprovisionamiento con Contraseña)

- **Método:** `POST`
- **Ruta:** `https://campus.michaelsahlmann.com/api/v1/admin/default/users`
- **Headers:**
  ```http
  Authorization: Bearer lh_dc8RpUb1xAgq2p0LBz0qXMmpIe9EiBeclv5EmgQmISc
  Content-Type: application/json
  ```
- **Cuerpo de la Petición (Payload):**
  ```json
  {
    "email": "alumno@gmail.com",
    "username": "michels_492",
    "first_name": "Michel",
    "last_name": "Sahlmann",
    "password": "Varkentis7391!",
    "role_id": 4,
    "extra_metadata": {
      "source": "checkout_vercel",
      "payment_id": "cs_live_123456789"
    }
  }
  ```

#### Especificación de Campos:
| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `email` | string | Sí | Correo electrónico en minúsculas y sin espacios. |
| `username` | string | Sí | Único en el sistema. Alfanumérico con guión bajo (máx 150 caracteres). |
| `first_name` | string | Sí | Nombre de pila del alumno. Se usará para todos los saludos en el campus. |
| `last_name` | string | No | Apellido(s) del alumno. |
| `password` | string | Sí | Contraseña que cumpla con los requisitos de complejidad. |
| `role_id` | integer | Sí | Siempre colocar `4` (Rol de Alumno/Miembro). |
| `extra_metadata` | object | No | Objeto JSON libre para guardar IDs de pago o pasarela. |

- **Respuesta Exitosa (200 OK):**
  ```json
  {
    "id": 12,
    "user_uuid": "user_a1b2c3d4-...",
    "email": "alumno@gmail.com",
    "username": "michels_492",
    "first_name": "Michel",
    "last_name": "Sahlmann",
    "email_verified": true
  }
  ```

---

### Paso 3: Matricular al Alumno en el Curso

- **Método:** `POST`
- **Ruta:** `https://campus.michaelsahlmann.com/api/v1/admin/default/enrollments/{user_id}/{course_uuid}`
- **Headers:**
  ```http
  Authorization: Bearer lh_dc8RpUb1xAgq2p0LBz0qXMmpIe9EiBeclv5EmgQmISc
  ```
- **Valores en la URL:**
  - `{user_id}`: El `id` numérico obtenido en el Paso 1 o 2 (ej. `12`).
  - `{course_uuid}`: `course_8bbc2b81-c213-4c9d-86f2-ce613dc6cdac`
- **Respuesta Exitosa (200 OK):**
  Confirma que el usuario quedó habilitado con acceso al material del curso.

---

### Paso 4 (Opcional pero muy recomendado): Generar Magic Link de 1 Clic

Permite que el alumno entre de inmediato al curso pulsando un botón en su correo o WhatsApp sin tener que escribir su usuario y contraseña la primera vez.

- **Método:** `POST`
- **Ruta:** `https://campus.michaelsahlmann.com/api/v1/admin/default/auth/magic-link`
- **Headers:**
  ```http
  Authorization: Bearer lh_dc8RpUb1xAgq2p0LBz0qXMmpIe9EiBeclv5EmgQmISc
  Content-Type: application/json
  ```
- **Payload:**
  ```json
  {
    "user_id": 12,
    "redirect_to": "/courses/course_8bbc2b81-c213-4c9d-86f2-ce613dc6cdac",
    "ttl_seconds": 900
  }
  ```
- **Respuesta Exitosa:**
  ```json
  {
    "token": "d7a8f9b0c1e2..."
  }
  ```
- **URL resultante para el botón de acceso:**
  `https://campus.michaelsahlmann.com/api/v1/admin/default/auth/magic-consume?token={token}`

---

## 5. Implementación de Referencia en TypeScript (Next.js / Vercel)

El desarrollador puede copiar y adaptar esta función en su repositorio de Vercel (por ejemplo en `lib/learnhouse.ts` o dentro de su API route):

```typescript
// lib/learnhouse.ts

const LEARNHOUSE_API_URL = "https://campus.michaelsahlmann.com/api/v1";
const LEARNHOUSE_TOKEN = process.env.LEARNHOUSE_API_TOKEN || "lh_dc8RpUb1xAgq2p0LBz0qXMmpIe9EiBeclv5EmgQmISc";
const DEFAULT_COURSE_UUID = "course_8bbc2b81-c213-4c9d-86f2-ce613dc6cdac";

/**
 * Genera una contraseña segura que cumple las reglas de LearnHouse:
 * Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.
 */
export function generateSecurePassword(): string {
  const charsUpper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const charsLower = "abcdefghijkmnopqrstuvwxyz";
  const charsNumbers = "23456789";
  const charsSpecial = "!@#$%&*";

  const randomFrom = (set: string) => set[Math.floor(Math.random() * set.length)];

  // Garantizar al menos un carácter de cada tipo requerido
  let pass = [
    randomFrom(charsUpper),
    randomFrom(charsLower),
    randomFrom(charsNumbers),
    randomFrom(charsSpecial),
  ];

  // Completar hasta 10 caracteres
  const allChars = charsUpper + charsLower + charsNumbers + charsSpecial;
  for (let i = 0; i < 6; i++) {
    pass.push(randomFrom(allChars));
  }

  // Mezclar caracteres
  return pass.sort(() => Math.random() - 0.5).join("");
}

/**
 * Genera un username limpio y único
 */
export function generateCleanUsername(name: string, email: string): string {
  const base = (name || email.split("@")[0])
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${base || "user"}_${suffix}`;
}

export interface StudentEnrollmentInput {
  fullName: string;
  email: string;
  courseUuid?: string;
  metadata?: Record<string, any>;
}

export interface StudentEnrollmentResult {
  userId: number;
  email: string;
  tempPassword?: string;
  magicUrl?: string;
  isNewUser: boolean;
}

export async function enrollStudentInLearnHouse(
  input: StudentEnrollmentInput
): Promise<StudentEnrollmentResult> {
  const email = input.email.trim().toLowerCase();
  const nameParts = (input.fullName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || email.split("@")[0];
  const lastName = nameParts.slice(1).join(" ") || "";
  const courseUuid = input.courseUuid || DEFAULT_COURSE_UUID;

  const headers = {
    Authorization: `Bearer ${LEARNHOUSE_TOKEN}`,
    "Content-Type": "application/json",
  };

  // 1. Verificar si el usuario ya existe
  let userId: number | null = null;
  let isNewUser = false;
  let tempPassword: string | undefined = undefined;

  const lookupRes = await fetch(
    `${LEARNHOUSE_API_URL}/admin/default/users/by-email/${encodeURIComponent(email)}`,
    { headers }
  );

  if (lookupRes.ok) {
    const existing = await lookupRes.json();
    userId = existing.id;
  } else if (lookupRes.status === 404) {
    // 2. Crear usuario nuevo con contraseña generada
    isNewUser = true;
    tempPassword = generateSecurePassword();
    const username = generateCleanUsername(firstName, email);

    const createRes = await fetch(`${LEARNHOUSE_API_URL}/admin/default/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        username,
        first_name: firstName,
        last_name: lastName,
        password: tempPassword,
        role_id: 4,
        extra_metadata: input.metadata || {},
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Error creando usuario en LearnHouse: ${err}`);
    }

    const created = await createRes.json();
    userId = created.id;
  } else {
    throw new Error(`Error consultando usuario en LearnHouse: ${lookupRes.statusText}`);
  }

  // 3. Matricular en el curso
  const enrollRes = await fetch(
    `${LEARNHOUSE_API_URL}/admin/default/enrollments/${userId}/${courseUuid}`,
    { method: "POST", headers }
  );

  if (!enrollRes.ok) {
    const err = await enrollRes.text();
    throw new Error(`Error matriculando alumno en curso: ${err}`);
  }

  // 4. Generar Magic Link de 1 clic
  let magicUrl: string | undefined = undefined;
  try {
    const magicRes = await fetch(`${LEARNHOUSE_API_URL}/admin/default/auth/magic-link`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: userId,
        redirect_to: `/courses/${courseUuid}`,
        ttl_seconds: 900,
      }),
    });

    if (magicRes.ok) {
      const magicData = await magicRes.json();
      if (magicData.token) {
        magicUrl = `https://campus.michaelsahlmann.com/api/v1/admin/default/auth/magic-consume?token=${magicData.token}`;
      }
    }
  } catch (e) {
    console.warn("No se pudo generar magic link opcional:", e);
  }

  return {
    userId: userId!,
    email,
    tempPassword,
    magicUrl,
    isNewUser,
  };
}
```

---

## 6. Plantilla del Correo de Bienvenida para Enviar desde Vercel

Cuando la función en Vercel termine la ejecución, debe disparar el correo electrónico al alumno (usando Resend, Postmark o AWS SES) con el siguiente formato:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
    .card { background-color: #ffffff; border-radius: 10px; max-width: 580px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; }
    .logo { text-align: center; margin-bottom: 24px; }
    h1 { color: #0f172a; font-size: 22px; margin-bottom: 12px; }
    .creds-box { background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #cbd5e1; }
    .creds-item { margin: 8px 0; font-size: 15px; }
    .creds-item strong { color: #334155; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px; text-align: center; }
    .footer { margin-top: 32px; font-size: 13px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <img src="https://campus.michaelsahlmann.com/content/media/media_8eecae45-8167-4d92-bbbe-f4b63897d26c.png" alt="Instituto Varkentis" width="160" />
    </div>

    <h1>¡Hola, {{firstName}}! Te damos la bienvenida a Instituto Varkentis</h1>
    <p>Tu inscripción al <strong>Curso de Bolsa de Valores en Paraguay</strong> está confirmada y tu acceso al Campus Virtual ya se encuentra activo.</p>

    <div class="creds-box">
      <div class="creds-item"><strong>Portal del Campus:</strong> <a href="https://campus.michaelsahlmann.com">https://campus.michaelsahlmann.com</a></div>
      <div class="creds-item"><strong>Tu Usuario:</strong> {{email}}</div>
      {{#if tempPassword}}
      <div class="creds-item"><strong>Tu Contraseña Inicial:</strong> <code>{{tempPassword}}</code></div>
      {{/if}}
    </div>

    {{#if magicUrl}}
    <div style="text-align: center; margin: 24px 0;">
      <a href="{{magicUrl}}" class="btn">Ingresar al Campus con 1 Clic &rarr;</a>
      <p style="font-size: 12px; color: #64748b; margin-top: 8px;">(Este botón de acceso rápido es válido durante 15 minutos)</p>
    </div>
    {{/if}}

    <p style="font-size: 14px; color: #475569;">
      Puedes ingresar en cualquier momento desde tu computadora o teléfono con tu correo y contraseña. Te recomendamos cambiar tu contraseña temporal al iniciar sesión en tu perfil.
    </p>

    <div class="footer">
      Instituto Varkentis — Campus Virtual de Finanzas e Inversiones
    </div>
  </div>
</body>
</html>
```
