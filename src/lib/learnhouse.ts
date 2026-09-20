const LEARNHOUSE_API_URL = (
  process.env.LEARNHOUSE_API_URL || "https://campus.michaelsahlmann.com"
).replace(/\/$/, "");

const LEARNHOUSE_ORG_SLUG = process.env.LEARNHOUSE_ORG_SLUG || "default";

const LEARNHOUSE_API_TOKEN = process.env.LEARNHOUSE_API_TOKEN;

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
    this.token = LEARNHOUSE_API_TOKEN || "";
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
   * Da de alta un nuevo usuario con rol de estudiante y correo verificado.
   */
  async createUser(params: {
    email: string;
    name: string;
  }): Promise<LearnHouseUser> {
    const email = params.email.trim().toLowerCase();
    const parts = params.name.trim().split(/\s+/);
    const firstName = parts[0] || email.split("@")[0];
    const lastName = parts.slice(1).join(" ") || "";
    const cleanUser = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "student";
    const username = `${cleanUser}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

    const url = `${this.baseUrl}/api/v1/admin/${this.orgSlug}/users`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        email,
        username,
        first_name: firstName,
        last_name: lastName,
        role_id: 4, // Rol de Estudiante
        email_verified: true,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error al crear usuario en LearnHouse (${res.status}): ${errorText}`);
    }

    return (await res.json()) as LearnHouseUser;
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
    return data.url || `${this.baseUrl}/courses/${courseUuid}`;
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
  }) {
    let user = await this.getUserByEmail(params.email);
    let isNewUser = false;

    if (!user) {
      user = await this.createUser({
        email: params.email,
        name: params.name,
      });
      isNewUser = true;
    }

    const enrollment = await this.enrollUser(user.id, params.courseUuid);
    const magicLink = await this.generateMagicLink(user.id, params.courseUuid);

    return {
      user,
      isNewUser,
      enrollment,
      magicLink,
    };
  }
}

export const learnhouse = new LearnHouseClient();
