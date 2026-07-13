/* IRO's real program areas, per igirerwanda.org */
export type EventCategory =
  | "SheCanCODE"
  | "Entrepreneurship"
  | "Web Fundamentals"
  | "Advanced Backend"
  | "Advanced Frontend"
  | "Mentorship";

export type VenueEvent = {
  id: string;
  title: string;
  category: EventCategory;
  /** ISO date, e.g. "2026-07-18" — places the event on the calendar grid */
  date: string;
  time: string;
  /** when it wraps up, e.g. "9:00 PM" */
  endTime: string;
  space: string;
  price: string;
  /** one-liner on what the session is about, shown on the hero card */
  description: string;
  soldOut?: boolean;
};

export const CATEGORIES: EventCategory[] = [
  "SheCanCODE",
  "Entrepreneurship",
  "Web Fundamentals",
  "Advanced Backend",
  "Advanced Frontend",
  "Mentorship",
];

/* IRO brand family — greens and burnt oranges pulled from the logo */
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  SheCanCODE: "#e08a00",
  Entrepreneurship: "#c05a2e",
  "Web Fundamentals": "#c9a84c",
  "Advanced Backend": "#6fa84c",
  "Advanced Frontend": "#9dbe8d",
  Mentorship: "#f2efe4",
};

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function todayIso(): string {
  return toIso(new Date());
}

export function todaysEvent(): VenueEvent | undefined {
  const t = todayIso();
  return EVENTS.find((e) => e.date === t);
}

export function nextEvent(): VenueEvent | undefined {
  const t = todayIso();
  return [...EVENTS]
    .filter((e) => e.date >= t)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

export const EVENTS: VenueEvent[] = [
  {
    id: "shecancode-open-house",
    title: "SheCanCODE Open House",
    category: "SheCanCODE",
    date: "2026-07-04",
    time: "9:00 AM",
    endTime: "1:00 PM",
    space: "Main Hall",
    price: "Free",
    description:
      "Tour the campus, meet trainers and alumni, and learn how to apply for the next SheCanCODE cohort.",
  },
  {
    id: "web-fundamentals-info",
    title: "Web Fundamentals Info Session",
    category: "Web Fundamentals",
    date: "2026-07-10",
    time: "6:00 PM",
    endTime: "7:30 PM",
    space: "Studio B",
    price: "Free",
    description:
      "Everything about the 12-week blended bootcamp — the frontend and backend tracks, the schedule, and how to enrol.",
  },
  {
    id: "shecancode-demo-day",
    title: "SheCanCODE Demo Day",
    category: "SheCanCODE",
    date: "2026-07-13",
    time: "7:00 PM",
    endTime: "9:00 PM",
    space: "Main Hall",
    price: "Free entry",
    description:
      "The graduating cohort presents the web apps they built from scratch to family, partners, and hiring companies.",
  },
  {
    id: "react-typescript-workshop",
    title: "React & TypeScript Workshop",
    category: "Advanced Frontend",
    date: "2026-07-18",
    time: "7:30 PM",
    endTime: "9:30 PM",
    space: "Studio B",
    price: "Free",
    description:
      "Hands-on session building typed React components. Bring a laptop — newcomers to the Advanced Frontend track welcome.",
  },
  {
    id: "awe-pitch-night",
    title: "AWE Pitch Night",
    category: "Entrepreneurship",
    date: "2026-07-24",
    time: "8:00 PM",
    endTime: "10:00 PM",
    space: "Main Hall",
    price: "Free entry",
    description:
      "Founders from the Academy for Women Entrepreneurs pitch their businesses to mentors and local investors.",
  },
  {
    id: "tech-career-clinic",
    title: "Tech Career Clinic",
    category: "Mentorship",
    date: "2026-07-25",
    time: "9:00 AM",
    endTime: "12:00 PM",
    space: "Makers Room",
    price: "Free",
    description:
      "One-on-one CV reviews, mock interviews, and career advice from developers working in the industry.",
    soldOut: true,
  },
  {
    id: "spring-boot-lab",
    title: "Spring Boot API Lab",
    category: "Advanced Backend",
    date: "2026-07-31",
    time: "2:00 PM",
    endTime: "5:00 PM",
    space: "Studio B",
    price: "Free",
    description:
      "Build and secure a REST API with Java and Spring Boot, then ship it in a Docker container.",
  },
  {
    id: "javascript-jumpstart",
    title: "JavaScript Jumpstart",
    category: "Web Fundamentals",
    date: "2026-08-01",
    time: "10:00 AM",
    endTime: "1:00 PM",
    space: "Studio B",
    price: "Free",
    description:
      "A friendly first taste of programming — from variables to an interactive web page in one morning.",
  },
  {
    id: "mentor-circle",
    title: "Women in Tech Mentor Circle",
    category: "Mentorship",
    date: "2026-08-02",
    time: "9:30 AM",
    endTime: "11:30 AM",
    space: "Makers Room",
    price: "Free",
    description:
      "Monthly circle pairing students with women working across Rwanda's tech industry.",
  },
  {
    id: "docker-cicd-day",
    title: "Docker & CI/CD Bootcamp Day",
    category: "Advanced Backend",
    date: "2026-08-07",
    time: "8:30 AM",
    endTime: "4:30 PM",
    space: "Studio B",
    price: "Free",
    description:
      "Full-day intensive on containers, pipelines, and automated deployment for the Advanced Backend cohort.",
  },
  {
    id: "shecancode-graduation",
    title: "SheCanCODE Graduation",
    category: "SheCanCODE",
    date: "2026-08-09",
    time: "5:00 PM",
    endTime: "8:00 PM",
    space: "Main Hall",
    price: "Free entry",
    description:
      "Celebrate the newest graduates with project showcases, certificates, and stories from the cohort.",
  },
  {
    id: "awe-business-workshop",
    title: "AWE Business Skills Workshop",
    category: "Entrepreneurship",
    date: "2026-08-12",
    time: "6:30 PM",
    endTime: "8:30 PM",
    space: "Makers Room",
    price: "Free",
    description:
      "Practical session on pricing, bookkeeping, and marketing for women-led small businesses.",
  },
];
