"use server";

const API_URL = process.env.API_URL ?? "";
const API_KEY = process.env.API_KEY ?? "";

const MESSAGES = {
  invalidData: "Los datos ingresados no son válidos",
  systemError:
    "El sistema está experimentando problemas. Por favor, inténtelo de nuevo más tarde.",
} as const;

export type ResetPasswordActionResult = {
  success: boolean;
  message: string;
};

export type ResetPasswordInput = {
  email: string;
  documentNumber: string;
  newPassword: string;
};

export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ResetPasswordActionResult> {
  if (!API_URL || !API_KEY) {
    return { success: false, message: MESSAGES.systemError };
  }

  try {
    const response = await fetch(`${API_URL}/users/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: API_KEY,
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });

    // 4xx → identity mismatch or business precondition failure
    // (wrong email+document pair, or new password equals the old one).
    // The backend deliberately returns the same shape for these cases.
    if (response.status >= 400 && response.status < 500) {
      return { success: false, message: MESSAGES.invalidData };
    }

    if (!response.ok) {
      return { success: false, message: MESSAGES.systemError };
    }

    return {
      success: true,
      message: "Contraseña restablecida correctamente",
    };
  } catch {
    return { success: false, message: MESSAGES.systemError };
  }
}
