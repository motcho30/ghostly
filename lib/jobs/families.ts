/**
 * Role families. A job title maps to the first family whose pattern matches,
 * and the quiz offers families as tap-to-fill chips, ranked by live roles.
 */
export type Family = { id: string; label: string; pattern: RegExp };

export const FAMILIES: Family[] = [
  {
    id: "hospitality",
    label: "Hospitality & Retail",
    pattern:
      /\b(barista|shift lead|shift leader|kitchen|chef|cook\b|waiter|waitress|front of house|store manager|retail|sales assistant|crew member|team member|porter|host\b)/i,
  },
  {
    id: "data",
    label: "Data & Analytics",
    pattern:
      /\b(data|analytics|analyst|bi\b|business intelligence|machine learning|ml\b|ai engineer|research scientist|scientist|statistic|quant\b|quantitative)/i,
  },
  {
    id: "product",
    label: "Product Manager",
    pattern:
      /\b(product manager|product owner|head of product|product lead|product director|group product|vp,? product|product operations)/i,
  },
  {
    id: "design",
    label: "Design",
    pattern:
      /\b(design|designer|ux|ui\b|user research|researcher|brand designer|creative)/i,
  },
  {
    id: "engineering",
    label: "Software Engineer",
    pattern:
      /\b(engineer|engineering|developer|software|devops|sre\b|site reliability|backend|back-end|frontend|front-end|full[- ]?stack|mobile|ios|android|platform|infrastructure|security|qa\b|test automation|architect|programmer|firmware|technical staff|hardware)/i,
  },
  {
    id: "marketing",
    label: "Marketing",
    pattern:
      /\b(marketing|growth|seo|content|brand|communications|comms|pr\b|social media|copywriter|community|demand gen|lifecycle|media|planning|programmatic|commerce|search|producer|production|video|motion|social|creative)/i,
  },
  {
    id: "sales",
    label: "Sales",
    pattern:
      /\b(sales|account executive|business development|bdr|sdr|account manager|partnerships|commercial|revenue|solutions consultant|pre-?sales|new business|deal desk|revops|renewals|partner manager|client service|deployment)/i,
  },
  {
    id: "customer",
    label: "Customer Success & Support",
    pattern:
      /\b(customer|support|success|client services|onboarding|implementation|service desk|help ?desk)/i,
  },
  {
    id: "operations",
    label: "Operations",
    pattern:
      /\b(operations|ops\b|strategy|program manager|programme manager|project manager|chief of staff|business analyst|delivery manager|supply chain|logistics)/i,
  },
  {
    id: "finance",
    label: "Finance & Accounting",
    pattern:
      /\b(finance|financial|accountant|accounting|fp&a|treasury|tax|payroll|controller|audit|credit|risk|actuar|trader|trading|investment|equities|portfolio|restructuring|reporting)/i,
  },
  {
    id: "people",
    label: "People & HR",
    pattern:
      /\b(people|hr\b|human resources|talent|recruit|learning|l&d|workplace|culture|employee relations|compensation|ehs\b|health and safety)/i,
  },
  {
    id: "legal",
    label: "Legal & Compliance",
    pattern:
      /\b(legal|counsel|lawyer|solicitor|paralegal|compliance|privacy|regulatory|aml\b|kyc\b|fincrime|financial crime)/i,
  },
  {
    id: "science",
    label: "Science & Research",
    pattern:
      /\b(scientist|research|sonographer|clinical|laboratory|lab\b|chemist|biolog|pharmac|formulation|dmpk|quality control)/i,
  },
  {
    id: "admin",
    label: "Admin & Office",
    pattern:
      /\b(assistant|administrator|admin\b|office manager|receptionist|coordinator|executive assistant)/i,
  },
];

export const OTHER_FAMILY = { id: "other", label: "Other roles" };

export function familyOf(title: string): string {
  // Some titles hit two families ("Data Engineer"). Order above decides:
  // data before engineering, product before design, legal before finance.
  for (const f of FAMILIES) if (f.pattern.test(title)) return f.id;
  return OTHER_FAMILY.id;
}

export function familyLabel(id: string): string {
  return FAMILIES.find((f) => f.id === id)?.label ?? OTHER_FAMILY.label;
}
