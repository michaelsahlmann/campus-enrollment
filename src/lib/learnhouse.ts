function sanitizeBaseUrl(url?: string): string {
  if (!url) return "https://campus.michaelsahlmann.com";
  const trimmed = url.trim();
  const match = trimmed.match(/https?:\/\/[^\s\]\)]+/);
  return (match ? match[0] : trimmed).replace(/\/$/, "");
}

const LEARNHOUSE_API_URL = sanitizeBaseUrl(process.env.LEARNHOUSE_API_URL);

const LEARNHOUSE_ORG_SLUG = (process.env.LEARNHOUSE_ORG_SLUG || "default").trim();

const LEARNHOUSE_API_TOKEN = process.env.LEARNHOUSE_API_TOKEN?.trim() || "";

export const DEFAULT_COURSE_UUID = "course_8bbc2b81-c213-4c9d-86f2-ce613dc6cdac";

/**
 * Genera una contraseña segura que cumple las reglas de LearnHouse:
 * Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.
 */
export function generateSecurePassword(): string {
  const charsUpper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const charsLower = "abcdefghijkmnopqrstuvwxyz";
  const charsNumbers = "23456789";
  const charsSpecial = "!@#$%&*";

  const randomFrom = (set: string) => set[randomInt(set.length)];

  // Garantizar al menos un carácter de cada tipo requerido
  const pass = [
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

  for (let index = pass.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [pass[index], pass[swapIndex]] = [pass[swapIndex], pass[index]];
  }
  return pass.join("");
}

/**
 * Genera un username limpio y legible (ej. juanp_421) evitando hashes crípticos.
 */
export function generateCleanUsername(name: string, email: string): string {
  const base = (name || email.split("@")[0])
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15);
  const suffix = randomInt(100, 1000);
  return `${base || "user"}_${suffix}`;
}

export interface LearnHouseCourse {
  id: number;
  course_uuid: string;
  name: string;
  description: string | null;
  public: boolean;
  published: boolean;
}

export interface LearnHouseUser {
  id: number;
  user_uuid: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
}

export interface LearnHouseEnrollmentResponse {
  id: number;
  trail_uuid: string;
  user_id: number;
  runs: Array<{
    course_id: number;
    status: string;
  }>;
}

export interface LearnHouseMagicLinkResponse {
  url: string;
  token: string;
  expires_at: string;
}

export class LearnHouseClient {
  private baseUrl: string;
  private orgSlug: string;
  private token: string;

  constructor() {
    this.baseUrl = LEARNHOUSE_API_URL;
    this.orgSlug = LEARNHOUSE_ORG_SLUG;
    this.token = LEARNHOUSE_API_TOKEN;
  }

  private getHeaders() {
    if (!this.token) {
      throw new Error("LEARNHOUSE_API_TOKEN no está configurado.");
    }

    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Consulta si un usuario ya existe en LearnHouse por correo electrónico.
   */
  async getUserByEmail(email: string): Promise<LearnHouseUser | null> {
    const encoded = encodeURIComponent(email.trim().toLowerCase());
    const url = `${this.baseUrl}/api/v1/admin/${this.orgSlug}/users/by-email/${encoded}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
        cache: "no-store",
      });

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`LearnHouse API error (${res.status}): ${errorText}`);
      }

      return (await res.json()) as LearnHouseUser;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("404")) return null;
      throw error;
    }
  }

  /**
   * Da de alta un nuevo usuario con rol de estudiante, correo verificado y contraseña inicial.
   */
  async createUser(params: {
    email: string;
    name: string;
    password?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ user: LearnHouseUser; tempPassword: string }> {
    const email = params.email.trim().toLowerCase();
    const parts = params.name.trim().split(/\s+/);
    const firstName = parts[0] || email.split("@")[0];
    const lastName = parts.slice(1).join(" ") || "";
    const username = generateCleanUsername(firstName, email);
    const tempPassword = params.password || generateSecurePassword();

    const url = `${this.baseUrl}/api/v1/admin/${this.orgSlug}/users`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        email,
        username,
        first_name: firstName,
        last_name: lastName,
        password: tempPassword,
        role_id: 4, // Rol de Estudiante
        email_verified: true,
        extra_metadata: params.metadata || {},
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error al crear usuario en LearnHouse (${res.status}): ${errorText}`);
    }

    const user = (await res.json()) as LearnHouseUser;
    return { user, tempPassword };
  }

  /**
   * Matricula al usuario en el curso especificado por UUID.
   */
  async enrollUser(
    userId: number,
    courseUuid: string
  ): Promise<LearnHouseEnrollmentResponse> {
    const url = `${this.baseUrl}/api/v1/admin/${this.orgSlug}/enrollments/${userId}/${courseUuid}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
    });

    if (res.status === 400) {
      // Ya matriculado, se considera exitoso
      return {
        id: userId,
        trail_uuid: "already_enrolled",
        user_id: userId,
        runs: [],
      };
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error al matricular en LearnHouse (${res.status}): ${errorText}`);
    }

    return (await res.json()) as LearnHouseEnrollmentResponse;
  }

  /**
   * Desmatricula al usuario del curso y remueve sus accesos en LearnHouse.
   */
  async unenrollUser(
    userId: number,
    courseUuid: string
  ): Promise<boolean> {
    const url = `${this.baseUrl}/api/v1/admin/${this.orgSlug}/enrollments/${userId}/${courseUuid}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (res.status === 404) {
      return true; // Ya no estaba matriculado
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error al desmatricular en LearnHouse (${res.status}): ${errorText}`);
    }

    return true;
  }

  /**
   * Genera un enlace de acceso directo (Magic Link) sin requerir contraseña.
   */
  async generateMagicLink(
    userId: number,
    courseUuid: string
  ): Promise<string> {
    const url = `${this.baseUrl}/api/v1/admin/${this.orgSlug}/auth/magic-link`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        user_id: userId,
        redirect_to: `/courses/${courseUuid}`,
        ttl_seconds: 900,
      }),
    });

    if (!res.ok) {
      // Si falla la generación del magic link, devolvemos la URL directa al curso
      return `${this.baseUrl}/courses/${courseUuid}`;
    }

    const data = (await res.json()) as LearnHouseMagicLinkResponse;
    if (data.token) {
      return `${this.baseUrl}/api/v1/admin/${this.orgSlug}/auth/magic-consume?token=${data.token}`;
    }

    if (data.url) {
      try {
        const parsed = new URL(data.url);
        return `${this.baseUrl}${parsed.pathname}${parsed.search}`;
      } catch {
        return data.url;
      }
    }

    return `${this.baseUrl}/courses/${courseUuid}`;
  }

  /** Lista el catálogo de la organización para sincronizarlo localmente. */
  async listCourses(): Promise<LearnHouseCourse[]> {
    const courses: LearnHouseCourse[] = [];
    const pageSize = 50;

    for (let page = 1; page <= 100; page += 1) {
      const url = `${this.baseUrl}/api/v1/courses/org_slug/${encodeURIComponent(this.orgSlug)}/page/${page}/limit/${pageSize}?include_unpublished=true`;
      const res = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 403 && errorText.includes("challenge-platform")) {
          throw new Error(
            "Cloudflare está bloqueando la API de LearnHouse. Configura una excepción para /api/v1/ antes de volver a sincronizar."
          );
        }
        throw new Error(`Error al listar cursos de LearnHouse (${res.status}): ${errorText}`);
      }

      const pageCourses = (await res.json()) as LearnHouseCourse[];
      courses.push(...pageCourses);
      if (pageCourses.length < pageSize) break;
    }

    return courses;
  }

  /**
   * Flujo completo: consulta o crea el usuario, lo matricula y genera el enlace.
   */
  async provisionAndEnroll(params: {
    name: string;
    email: string;
    courseUuid: string;
    metadata?: Record<string, unknown>;
    password?: string;
  }) {
    let user = await this.getUserByEmail(params.email);
    let isNewUser = false;
    let tempPassword: string | undefined = undefined;

    if (!user) {
      const created = await this.createUser({
        email: params.email,
        name: params.name,
        password: params.password,
        metadata: params.metadata,
      });
      user = created.user;
      tempPassword = created.tempPassword;
      isNewUser = true;
    }

    const enrollment = await this.enrollUser(user.id, params.courseUuid);
    const magicLink = await this.generateMagicLink(user.id, params.courseUuid);

    return {
      user,
      isNewUser,
      enrollment,
      magicLink,
      tempPassword,
    };
  }
}

export const learnhouse = new LearnHouseClient();

export interface StudentEnrollmentInput {
  fullName: string;
  email: string;
  courseUuid?: string;
  metadata?: Record<string, unknown>;
  password?: string;
}

export interface StudentEnrollmentResult {
  userId: number;
  email: string;
  tempPassword?: string;
  magicUrl?: string;
  isNewUser: boolean;
  user: LearnHouseUser;
}

/**
 * Función helper de alto nivel para matricular estudiantes en LearnHouse según la guía de integración.
 */
export async function enrollStudentInLearnHouse(
  input: StudentEnrollmentInput
): Promise<StudentEnrollmentResult> {
  const courseUuid = input.courseUuid || DEFAULT_COURSE_UUID;
  const result = await learnhouse.provisionAndEnroll({
    name: input.fullName,
    email: input.email,
    courseUuid,
    metadata: input.metadata,
    password: input.password,
  });

  return {
    userId: result.user.id,
    email: result.user.email,
    tempPassword: result.tempPassword,
    magicUrl: result.magicLink,
    isNewUser: result.isNewUser,
    user: result.user,
  };
}

export interface WelcomeEmailParams {
  firstName: string;
  email: string;
  courseName?: string;
  tempPassword?: string;
  magicUrl?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Genera la plantilla HTML del correo de bienvenida para Instituto Varkentis.
 */
export function generateWelcomeEmailHtml(params: WelcomeEmailParams): string {
  const courseName = params.courseName || "Curso de Bolsa de Valores en Paraguay";
  return `<!DOCTYPE html>
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

    <h1>¡Hola, ${escapeHtml(params.firstName)}! Te damos la bienvenida a Instituto Varkentis</h1>
    <p>Tu inscripción al <strong>${escapeHtml(courseName)}</strong> está confirmada y tu acceso al Campus Virtual ya se encuentra activo.</p>

    <div class="creds-box">
      <div class="creds-item"><strong>Portal del Campus:</strong> <a href="https://campus.michaelsahlmann.com">https://campus.michaelsahlmann.com</a></div>
      <div class="creds-item"><strong>Tu Usuario:</strong> ${escapeHtml(params.email)}</div>
      ${params.tempPassword ? `<div class="creds-item"><strong>Tu Contraseña Inicial:</strong> <code>${escapeHtml(params.tempPassword)}</code></div>` : ""}
    </div>

    ${params.magicUrl ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${escapeHtml(params.magicUrl)}" class="btn">Ingresar al Campus con 1 Clic &rarr;</a>
      <p style="font-size: 12px; color: #64748b; margin-top: 8px;">(Este botón de acceso rápido es válido durante 15 minutos)</p>
    </div>` : ""}

    <p style="font-size: 14px; color: #475569;">
      Puedes ingresar en cualquier momento desde tu computadora o teléfono con tu correo y contraseña. Te recomendamos cambiar tu contraseña temporal al iniciar sesión en tu perfil.
    </p>

    <div class="footer">
      Instituto Varkentis — Campus Virtual de Finanzas e Inversiones
    </div>
  </div>
</body>
</html>`;
}
import { randomInt } from "node:crypto";

