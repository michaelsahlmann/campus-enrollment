const LEARNHOUSE_API_URL = (
  process.env.LEARNHOUSE_API_URL || "https://campus.michaelsahlmann.com"
).replace(/\/$/, "");

const LEARNHOUSE_ORG_SLUG = process.env.LEARNHOUSE_ORG_SLUG || "default";

const LEARNHOUSE_API_TOKEN =
  process.env.LEARNHOUSE_API_TOKEN ||
  "lh_REDACTED_TOKEN";

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
    } catch (err: any) {
      if (err.message?.includes("404")) return null;
      throw err;
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
    const cleanUser = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
    const username = `${cleanUser}_${Math.floor(100 + Math.random() * 900)}`;

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
        email_verified: true, // Acceso inmediato sin confirmación de email
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
        ttl_seconds: 86400, // Válido por 24 horas
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

    return `${this.baseUrl}/courses/${courseUuid}`;
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
