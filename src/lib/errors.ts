const EXACT_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Неверный email или пароль",
  "Invalid credentials": "Неверный email или пароль",
  "Email not confirmed": "Подтвердите email перед входом",
  "User already registered": "Пользователь с таким email уже существует",
  "Signup requires a valid password": "Пароль слишком короткий — минимум 6 символов",
  "Password should be at least 6 characters": "Пароль слишком короткий — минимум 6 символов",
  "Unable to validate email address: invalid format": "Некорректный формат email",
  "Email rate limit exceeded": "Слишком много попыток. Подождите и попробуйте снова",
  "A user with this email is already registered": "Пользователь с таким email уже зарегистрирован",
  "Could not create account": "Не удалось создать аккаунт",
  "Could not save application": "Не удалось сохранить заявку",
  "Could not save application. Please try again": "Не удалось сохранить заявку. Попробуйте ещё раз",
  "Could not submit application": "Не удалось отправить заявку",
  "Could not load application status": "Не удалось загрузить статус заявки",
  "For security purposes, you can only request this once every 60 seconds":
    "Подождите минуту перед повторной попыткой",
  Unauthorized: "Войдите в аккаунт",
  Forbidden: "Недостаточно прав для этого действия",
  Blocked: "Доступ заблокирован",
  "Legal onboarding required": "Завершите юридическое оформление",
  "Not found": "Запись не найдена",
  "Validation failed": "Проверьте правильность заполнения полей",
  "All consents required": "Примите все условия и документы",
  "Under 16": "Доступ доступен только с 16 лет",
};

const ZOD_MESSAGES: Record<string, string> = {
  Required: "Обязательное поле",
  "Invalid email": "Некорректный email",
  "Invalid enum value": "Выберите значение из списка",
  "Invalid literal value, expected true": "Необходимо принять условие",
  "String must contain at least 1 character(s)": "Заполните поле",
  "String must contain at least 2 character(s)": "Минимум 2 символа",
  "Expected string, received null": "Заполните поле",
  "Expected number, received nan": "Укажите число",
};

const FIELD_LABELS: Record<string, string> = {
  fullName: "ФИО",
  email: "Email",
  telegram: "Telegram",
  phone: "Телефон",
  city: "Город",
  country: "Страна",
  dateOfBirth: "Дата рождения",
  businessName: "Название бизнеса",
  password: "Пароль",
  amount: "Сумма",
  serviceType: "Услуга",
};

const PARTIAL_PATTERNS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Неверный email или пароль"],
  [/email not confirmed/i, "Подтвердите email перед входом"],
  [/jwt expired|session expired|refresh token/i, "Сессия истекла — войдите снова"],
  [/network|failed to fetch|fetch failed/i, "Проблема с интернетом. Проверьте соединение"],
  [/duplicate key|already exists|already registered/i, "Пользователь с таким email уже зарегистрирован"],
  [/row-level security|permission denied/i, "Нет доступа к этой операции"],
  [/email address .* is invalid/i, "Некорректный email"],
  [/invalid email/i, "Некорректный email"],
  [/rate limit/i, "Слишком много попыток. Подождите и попробуйте снова"],
  [/too many requests/i, "Слишком много запросов. Подождите немного"],
  [/not found/i, "Запись не найдена"],
  [/unauthorized/i, "Войдите в аккаунт"],
  [/forbidden/i, "Недостаточно прав"],
  [/validation failed/i, "Проверьте правильность заполнения полей"],
  [/timeout/i, "Превышено время ожидания. Попробуйте снова"],
  [/internal server error/i, "Ошибка сервера. Попробуйте позже"],
];

function statusFallback(status: number): string {
  if (status === 400) return "Проверьте правильность данных";
  if (status === 401) return "Войдите в аккаунт";
  if (status === 403) return "Недостаточно прав для этого действия";
  if (status === 404) return "Данные не найдены";
  if (status === 409) return "Конфликт данных — возможно, запись уже существует";
  if (status === 422) return "Проверьте правильность заполнения полей";
  if (status === 429) return "Слишком много запросов. Подождите немного";
  if (status >= 500) return "Ошибка сервера. Попробуйте позже";
  return "Не удалось выполнить действие";
}

function translateZodMessage(message: string): string {
  if (ZOD_MESSAGES[message]) return ZOD_MESSAGES[message];
  const minLen = message.match(/String must contain at least (\d+) character/);
  if (minLen) return `Минимум ${minLen[1]} символов`;
  const maxLen = message.match(/String must contain at most (\d+) character/);
  if (maxLen) return `Максимум ${maxLen[1]} символов`;
  return message;
}

function formatZodFlatten(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
  const parts: string[] = [];

  for (const msg of e.formErrors ?? []) {
    parts.push(translateZodMessage(msg));
  }

  for (const [field, messages] of Object.entries(e.fieldErrors ?? {})) {
    const label = FIELD_LABELS[field] ?? field;
    for (const msg of messages ?? []) {
      parts.push(`${label}: ${translateZodMessage(msg)}`);
    }
  }

  return parts.length ? parts[0] : null;
}

function translateRawMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "Что-то пошло не так";

  if (EXACT_MESSAGES[trimmed]) return EXACT_MESSAGES[trimmed];

  for (const [pattern, ru] of PARTIAL_PATTERNS) {
    if (pattern.test(trimmed)) return ru;
  }

  // Hide raw engine codes like signup_disabled / invalid_grant, not full sentences.
  if (/^[a-z][a-z0-9_]+$/i.test(trimmed)) {
    return "Не удалось выполнить действие. Попробуйте ещё раз";
  }

  return trimmed;
}

export function toUserMessage(error: unknown, fallback = "Что-то пошло не так"): string {
  if (error == null) return fallback;

  if (typeof error === "string") {
    return translateRawMessage(error);
  }

  if (error instanceof Error) {
    return translateRawMessage(error.message);
  }

  const zodMessage = formatZodFlatten(error);
  if (zodMessage) return zodMessage;

  if (typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return translateRawMessage((error as { message: string }).message);
  }

  return fallback;
}

export function apiErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === "string") {
      return toUserMessage(err, statusFallback(status));
    }
    const zodMessage = formatZodFlatten(err);
    if (zodMessage) return zodMessage;
  }

  return statusFallback(status);
}
