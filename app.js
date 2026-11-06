import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getDatabase,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  set
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";
import { describeAuthError } from "./auth-errors.js";
import { firebaseConfig } from "./firebase-config.js";

const el = (id) => document.getElementById(id);

const signedOutView = el("signed-out");
const signedInView = el("signed-in");
const message = el("message");
const itemsList = el("items");
const emptyNote = el("empty");
const form = el("item-form");
const input = el("item-text");

function showMessage(text) {
  message.textContent = text;
  message.hidden = !text;
}

if (!firebaseConfig.apiKey) {
  signedOutView.hidden = false;
  el("login-github").disabled = true;
  el("login-google").disabled = true;
  showMessage("Firebase не настроен: заполните firebase-config.js.");
} else {
  start();
}

function start() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);
  const itemsRef = ref(db, "items");

  let stopListening = null;

  function unsubscribeFromItems() {
    if (stopListening) {
      stopListening();
      stopListening = null;
    }
  }

  async function login(provider) {
    showMessage("");
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      showMessage(describeAuthError(error));
    }
  }

  el("login-github").addEventListener("click", () => login(new GithubAuthProvider()));
  el("login-google").addEventListener("click", () => login(new GoogleAuthProvider()));

  el("logout").addEventListener("click", async () => {
    showMessage("");
    // Отписываемся заранее, иначе после выхода сервер ответит ошибкой доступа.
    unsubscribeFromItems();
    try {
      await signOut(auth);
    } catch (error) {
      showMessage(`Не удалось выйти: ${error.message}`);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    const user = auth.currentUser;
    if (!text || !user) return;

    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    showMessage("");
    try {
      await set(push(itemsRef), {
        text,
        uid: user.uid,
        authorName: authorName(user),
        createdAt: serverTimestamp()
      });
      input.value = "";
      input.focus();
    } catch (error) {
      showMessage(`Не удалось добавить запись: ${error.message}`);
    } finally {
      submit.disabled = false;
    }
  });

  onAuthStateChanged(auth, (user) => {
    unsubscribeFromItems();
    signedOutView.hidden = Boolean(user);
    signedInView.hidden = !user;

    if (!user) {
      itemsList.replaceChildren();
      emptyNote.hidden = true;
      input.value = "";
      return;
    }

    el("user-name").textContent = authorName(user);
    stopListening = onValue(
      query(itemsRef, orderByChild("createdAt"), limitToLast(100)),
      renderItems,
      (error) => showMessage(`Не удалось загрузить список: ${error.message}`)
    );
  });
}

function authorName(user) {
  return (user.displayName || user.email || "Без имени").slice(0, 100);
}

function renderItems(snapshot) {
  const rows = [];
  // forEach идёт в порядке запроса; новые записи показываем сверху.
  snapshot.forEach((child) => {
    rows.unshift(renderItem(child.val()));
  });
  itemsList.replaceChildren(...rows);
  emptyNote.hidden = rows.length > 0;
}

function renderItem(item) {
  const row = document.createElement("li");
  row.textContent = item.text;

  const meta = document.createElement("span");
  meta.className = "meta";
  const date = new Date(item.createdAt).toLocaleString("ru-RU");
  meta.textContent = `${item.authorName}, ${date}`;
  row.append(meta);
  return row;
}
