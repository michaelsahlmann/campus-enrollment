export interface CourseItem {
  id: string;
  name: string;
  course_uuid: string;
  description: string;
  price_pyg: number;
  price_usd: number;
  badge?: string;
}

export const DEFAULT_COURSES: CourseItem[] = [
  {
    id: "course_8bbc2b81-c213-4c9d-86f2-ce613dc6cdac",
    name: "Curso de Bolsa de Valores en Paraguay: De Cero a tu Primera Inversión",
    course_uuid: "course_8bbc2b81-c213-4c9d-86f2-ce613dc6cdac",
    description: "Una guía práctica y completa para dar tus primeros pasos en el mercado bursátil paraguayo (BVA).",
    price_pyg: 1500000,
    price_usd: 200,
    badge: "Principal",
  },
];
