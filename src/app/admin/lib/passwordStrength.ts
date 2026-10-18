export type PasswordCheck = {
  id: "length" | "letter" | "number" | "symbol";
  label: string;
  passed: boolean;
};

// The four rules behind the hint "at least 8 characters and a mix of
// letters, numbers, and symbols". The backend must enforce the same rules.
export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { id: "length", label: "At least 8 characters", passed: password.length >= 8 },
    { id: "letter", label: "A letter", passed: /[A-Za-z]/.test(password) },
    { id: "number", label: "A number", passed: /[0-9]/.test(password) },
    { id: "symbol", label: "A symbol", passed: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

export function isStrongPassword(password: string): boolean {
  return getPasswordChecks(password).every((c) => c.passed);
}

export type StrengthLevel = { score: 0 | 1 | 2 | 3 | 4; label: string };

export function getStrengthLevel(password: string): StrengthLevel {
  if (!password) return { score: 0, label: "" };
  const score = getPasswordChecks(password).filter((c) => c.passed).length as 0 | 1 | 2 | 3 | 4;
  const label = ["", "Weak", "Fair", "Good", "Strong"][score];
  return { score, label };
}
