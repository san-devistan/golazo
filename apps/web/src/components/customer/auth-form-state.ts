type AuthMode = "reset-request" | "sign-in" | "sign-up"

type AuthFormState = {
  confirmPassword: string
  email: string
  errorMessage: string | null
  isSubmitting: boolean
  mode: AuthMode
  password: string
  successMessage: string | null
}

type AuthFormAction =
  | { type: "switchMode"; mode: AuthMode }
  | { type: "close" }
  | { type: "submitStart" }
  | { type: "submitSuccess"; message: string }
  | { type: "submitAuthSuccess" }
  | { type: "submitError"; message: string }
  | { type: "submitEnd" }
  | { type: "setEmail"; value: string }
  | { type: "setPassword"; value: string }
  | { type: "setConfirmPassword"; value: string }

const INITIAL_AUTH_FORM_STATE: AuthFormState = {
  confirmPassword: "",
  email: "",
  errorMessage: null,
  isSubmitting: false,
  mode: "sign-in",
  password: "",
  successMessage: null,
}

function authFormReducer(
  state: AuthFormState,
  action: AuthFormAction
): AuthFormState {
  if (action.type === "switchMode") {
    return {
      ...state,
      confirmPassword: "",
      errorMessage: null,
      mode: action.mode,
      successMessage: null,
    }
  }

  if (action.type === "close") {
    return {
      ...state,
      confirmPassword: "",
      errorMessage: null,
      successMessage: null,
    }
  }

  if (action.type === "submitStart") {
    return {
      ...state,
      errorMessage: null,
      isSubmitting: true,
      successMessage: null,
    }
  }

  if (action.type === "submitSuccess") {
    return {
      ...state,
      isSubmitting: false,
      successMessage: action.message,
    }
  }

  if (action.type === "submitAuthSuccess") {
    return {
      ...state,
      confirmPassword: "",
      isSubmitting: false,
      password: "",
    }
  }

  if (action.type === "submitError") {
    return {
      ...state,
      errorMessage: action.message,
      isSubmitting: false,
    }
  }

  if (action.type === "submitEnd") {
    return { ...state, isSubmitting: false }
  }

  if (action.type === "setEmail") {
    return { ...state, email: action.value }
  }

  if (action.type === "setPassword") {
    return { ...state, password: action.value }
  }

  return { ...state, confirmPassword: action.value }
}

export { authFormReducer, INITIAL_AUTH_FORM_STATE }
export type { AuthMode }
