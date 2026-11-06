export function describeAuthError(error) {
  switch (error.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Браузер заблокировал окно входа. Разрешите всплывающие окна для этого сайта.";
    case "auth/account-exists-with-different-credential":
      return "Аккаунт с этой почтой уже создан через другой способ входа. Войдите тем способом, которым пользовались раньше.";
    case "auth/unauthorized-domain":
      return "Этот домен не разрешён: добавьте его в Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "Этот способ входа не включён в Authentication → Sign-in method.";
    default:
      return `Не удалось войти: ${error.message}`;
  }
}
