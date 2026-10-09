export type Platform = "Instagram" | "X" | "Facebook" | "TikTok" | "YouTube" | "Google Play" | "App Store";
export type Risk = "Critical" | "High" | "Medium";

export type OfficialApp = {
  store: "Google Play" | "App Store";
  name: string;
  publisher: string;
  packageId: string;
};

export type BrandProfile = {
  brandName: string;
  logoUrl: string;
  officialAccounts: string[];
  officialApps: OfficialApp[];
  identifiers: string[];
};

export type Candidate = {
  id: string;
  name: string;
  account: string;
  platform: Platform;
  kind: string;
  discovered: string;
  developer?: string;
  packageId?: string;
  description: string;
  usesBrandLogo: boolean;
  scamSignals: string[];
};

export type Finding = Candidate & {
  score: number;
  risk: Risk;
  reasons: string[];
  official: boolean;
  nameSimilarity: number;
};

export const initialProfile: BrandProfile = {
  brandName: "BrandShield AI",
  logoUrl: "",
  officialAccounts: ["@brandshieldai", "@brandshield_ai", "facebook.com/brandshieldai"],
  officialApps: [
    { store: "Google Play", name: "BrandShield AI Secure", publisher: "BrandShield AI", packageId: "ai.brandshield.app" },
    { store: "App Store", name: "BrandShield AI Secure", publisher: "BrandShield AI", packageId: "ai.brandshield.app" },
  ],
  identifiers: ["BrandShield AI Secure", "BrandShield AI", "brandshield.ai"],
};

export const candidates: Candidate[] = [
  { id: "s1", name: "BrandShield AI Official", account: "@brandshieldai", platform: "Instagram", kind: "Official brand profile", discovered: "Monitored", description: "Official BrandShield AI customer updates.", usesBrandLogo: true, scamSignals: [] },
  { id: "s2", name: "BrandShield AI Support", account: "@brandshieldai_help", platform: "Instagram", kind: "Possible impersonation", discovered: "12 min ago", description: "Message us for account recovery. Claim your reward now.", usesBrandLogo: true, scamSignals: ["Requests passwords by DM", "Unsolicited reward offer"] },
  { id: "s3", name: "Brand5hield AI Customer Care", account: "@brand5hield_ai", platform: "X", kind: "Look-alike account", discovered: "1 hr ago", description: "We are here to help BrandShield AI customers.", usesBrandLogo: true, scamSignals: ["Directs users to an unverified link"] },
  { id: "s4", name: "BrandShield AI Rewards", account: "facebook.com/brandshieldai.rewards", platform: "Facebook", kind: "Fake brand page", discovered: "2 hrs ago", description: "BrandShield AI giveaway. Send your details to claim a prize.", usesBrandLogo: true, scamSignals: ["Unsolicited reward offer", "Requests personal information"] },
  { id: "s5", name: "BrandShield AI Customer Care", account: "@brandshieldai_care", platform: "TikTok", kind: "Scam account", discovered: "3 hrs ago", description: "Official support team. Contact our agent to verify your wallet.", usesBrandLogo: false, scamSignals: ["Requests account verification"] },
  { id: "s6", name: "Bright Shield Community", account: "@brightshieldcommunity", platform: "Facebook", kind: "Community page", discovered: "4 hrs ago", description: "An independent community for local safety news.", usesBrandLogo: false, scamSignals: [] },
  { id: "a1", name: "BrandShield AI Wallet Pro", account: "Google Play", platform: "Google Play", kind: "Suspicious mobile app", discovered: "38 min ago", developer: "BS Wallet Labs", packageId: "ai.bswallet.pro", description: "BrandShield AI account wallet and secure login. Enter your credentials to sync.", usesBrandLogo: true, scamSignals: ["Requests credentials", "Unverified developer"] },
  { id: "a2", name: "BrandShield AI Secure", account: "Google Play", platform: "Google Play", kind: "Official mobile app", discovered: "Monitored", developer: "BrandShield AI", packageId: "ai.brandshield.app", description: "The official BrandShield AI security application.", usesBrandLogo: true, scamSignals: [] },
  { id: "a3", name: "Brand Shield AI Security", account: "App Store", platform: "App Store", kind: "Suspicious mobile app", discovered: "5 hrs ago", developer: "Brightstar Mobile LLC", packageId: "com.brightstar.brandshield", description: "BrandShield AI security tools and account protection. Similar name and branding.", usesBrandLogo: true, scamSignals: ["Unverified developer"] },
  { id: "a4", name: "BrandShield AI Secure", account: "App Store", platform: "App Store", kind: "Official mobile app", discovered: "Monitored", developer: "BrandShield AI", packageId: "ai.brandshield.app", description: "The official BrandShield AI security application.", usesBrandLogo: true, scamSignals: [] },
  { id: "a5", name: "Shield Notes", account: "Google Play", platform: "Google Play", kind: "Unrelated mobile app", discovered: "6 hrs ago", developer: "Northside Apps", packageId: "com.northside.notes", description: "A private notebook for your notes.", usesBrandLogo: false, scamSignals: [] },
];

const lookalikeMap: Record<string, string> = {
  "0": "o", "1": "l", "3": "e", "5": "s", "8": "b",
  "а": "a", "е": "e", "і": "i", "о": "o", "р": "p", "с": "c", "х": "x",
};

function canonical(value: string): string {
  return Array.from(value.toLocaleLowerCase()).map((character) => lookalikeMap[character] ?? character).join("").replace(/[^a-z0-9]/g, "");
}

function editDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[right.length];
}

export function similarity(candidate: string, brand: string): number {
  const source = canonical(candidate);
  const target = canonical(brand);
  if (!source || !target) return 0;
  if (source === target) return 1;
  if (source.includes(target)) return Math.max(0.8, target.length / source.length);
  if (target.includes(source) && source.length >= Math.ceil(target.length * 0.7)) return source.length / target.length;
  const distance = editDistance(source, target);
  return Math.max(0, 1 - distance / Math.max(source.length, target.length));
}

function officialCandidate(candidate: Candidate, profile: BrandProfile): boolean {
  const account = canonical(candidate.account);
  const isOfficialAccount = profile.officialAccounts.some((official) => canonical(official) === account);
  if (isOfficialAccount) return true;
  if (candidate.platform !== "Google Play" && candidate.platform !== "App Store") return false;
  return profile.officialApps.some((app) => {
    if (app.store !== candidate.platform) return false;
    const samePackage = Boolean(candidate.packageId && app.packageId && canonical(candidate.packageId) === canonical(app.packageId));
    const sameNameAndPublisher = canonical(candidate.name) === canonical(app.name) &&
      canonical(candidate.developer ?? "") === canonical(app.publisher);
    return samePackage || sameNameAndPublisher;
  });
}

export function analyzeCandidate(candidate: Candidate, profile: BrandProfile): Finding {
  const official = officialCandidate(candidate, profile);
  const nameSimilarity = similarity(candidate.name, profile.brandName);
  const reasons: string[] = [];
  let score = 0;

  if (nameSimilarity >= 0.68) {
    score += Math.round(nameSimilarity * 40);
    const compactName = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const compactBrand = profile.brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
    reasons.push(compactName.includes(compactBrand) && compactName !== compactBrand
      ? "Brand name plus added words"
      : nameSimilarity < 0.9 ? "Look-alike spelling in the name" : "Brand name appears in the name");
  }

  const brandReferences = [profile.brandName, ...profile.identifiers].filter(Boolean);
  const descriptionMatch = brandReferences.some((identifier) => canonical(candidate.description).includes(canonical(identifier)));
  if (candidate.usesBrandLogo) {
    score += 20;
    reasons.push("Uses or claims the brand logo");
  }
  if (candidate.platform === "Google Play" || candidate.platform === "App Store") {
    const trustedPublisher = profile.officialApps.some((app) =>
      app.store === candidate.platform && canonical(app.publisher) === canonical(candidate.developer ?? ""),
    );
    if (!trustedPublisher) {
      score += 15;
      reasons.push("Publisher does not match an official app");
    }
  }
  if (descriptionMatch) {
    score += 12;
    reasons.push("Brand identifier appears in the description");
  }
  if (candidate.scamSignals.length) {
    score += Math.min(16, candidate.scamSignals.length * 8);
    reasons.push(...candidate.scamSignals);
  }

  const risk: Risk = score >= 85 ? "Critical" : score >= 60 ? "High" : "Medium";
  return { ...candidate, score: Math.min(score, 100), risk, reasons, official, nameSimilarity };
}

export function analyzeCandidates(profile: BrandProfile): Finding[] {
  return candidates
    .map((candidate) => analyzeCandidate(candidate, profile))
    .filter((finding) => !finding.official && finding.score >= 35)
    .sort((left, right) => right.score - left.score);
}

export function parseProfileText(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}
