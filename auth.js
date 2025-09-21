(() => {
  const SECRET = "418c96e3c27bcea99c334435811cc220";


  const ADMINS = {
    "admin": {"hash":"6f2cb9dd8f4b65e24e1c3f3fa5bc57982349237f11abceacd45bbcb74d621c25","role":"super","enabled":true},
    "lead":  {"hash":"27248aceef232db7d65391402cd725422a95a93582f9890d47e640483ad04a30","role":"manager","enabled":true}
  };

  const STORE_KEY = "admin_session_v1";
  const REGISTRY_KEY = "admin_users_v1";
  const TTL_MIN = 120;


  function randomHex(n = 16) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Hex(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  }

  async function sign(obj) {
    return sha256Hex(JSON.stringify(obj) + SECRET);
  }


  function getRegistry() {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return { version: 1, users: {} };
    try {
      const { reg, sig } = JSON.parse(raw);

      sign(reg).then(x => { if (x !== sig) console.warn("[auth] registry integrity check failed"); });
      return reg || { version: 1, users: {} };
    } catch {
      console.warn("[auth] registry parse failed");
      return { version: 1, users: {} };
    }
  }

  async function saveRegistry(reg) {
    const sig = await sign(reg);
    localStorage.setItem(REGISTRY_KEY, JSON.stringify({ reg, sig }));
  }

  function effectiveUsers() {
    const reg = getRegistry();
    return { ...ADMINS, ...(reg.users || {}) };
  }

  function getUserRecord(username) {
    const u = (username || "").trim().toLowerCase();
    return effectiveUsers()[u];
  }

  function getUserRole(username) {
    return getUserRecord(username)?.role || null;
  }

  function hasRole(username, ...allowed) {
    const rec = getUserRecord(username);
    if (!rec || !rec.enabled) return false;
    return allowed.length === 0 || allowed.includes(rec.role);
  }

  async function addAdmin(username, password, role = "manager") {
    const u = (username || "").trim().toLowerCase();
    if (!u) throw new Error("用户名不能为空");
    const reg = getRegistry();
    if (!reg.users) reg.users = {};
    if (reg.users[u]) throw new Error("用户名已存在");

    const salt = randomHex(16);
    const hash = await sha256Hex(`${salt}:${password}`);
    reg.users[u] = { hash, salt, role, enabled: true, createdAt: Date.now() };
    await saveRegistry(reg);
    return { username: u, role };
  }

  async function setPassword(username, newPassword) {
    const u = (username || "").trim().toLowerCase();
    const reg = getRegistry();
    if (!reg.users || !reg.users[u]) {

      if (!reg.users) reg.users = {};
      const salt = randomHex(16);
      const hash = await sha256Hex(`${salt}:${newPassword}`);
      reg.users[u] = { hash, salt, role: ADMINS[u]?.role || "manager", enabled: true, createdAt: Date.now() };
      await saveRegistry(reg);
      return;
    }
    const salt = randomHex(16);
    const hash = await sha256Hex(`${salt}:${newPassword}`);
    reg.users[u].salt = salt;
    reg.users[u].hash = hash;
    await saveRegistry(reg);
  }

  async function setEnabled(username, enabled) {
    const u = (username || "").trim().toLowerCase();
    const reg = getRegistry();
    if (!reg.users || !reg.users[u]) {

      if (!ADMINS[u]) throw new Error("用户不存在");
      if (!reg.users) reg.users = {};
      const base = ADMINS[u];
      reg.users[u] = { ...base, createdAt: reg.users[u]?.createdAt || Date.now() };
    }
    reg.users[u].enabled = !!enabled;
    await saveRegistry(reg);
  }


  async function generateInvite({ u, role = "manager", ttlMinutes = 60 }) {
    const token = { u: (u||"").trim().toLowerCase(), role, exp: Date.now() + ttlMinutes*60_000, n: randomHex(12) };
    const sig = await sign(token);
    return btoa(encodeURIComponent(JSON.stringify({ token, sig })));
  }

  async function acceptInvite(inviteStr, password) {
    const { token, sig } = JSON.parse(decodeURIComponent(atob(inviteStr)));
    const ok = (await sign(token)) === sig;
    if (!ok) throw new Error("邀请签名不合法");
    if (Date.now() > token.exp) throw new Error("邀请已过期");
    return addAdmin(token.u, password, token.role);
  }


  function readSession() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); }
    catch (e) { return null; }
  }

  function clearSession() {
    localStorage.removeItem(STORE_KEY);
  }

  async function writeSession(user) {
    const iat = Date.now();
    const exp = iat + TTL_MIN*60*1000;
    const token = { u: user, iat, exp, n: Math.random().toString(36).slice(2) };
    const sig = await sign(token);
    localStorage.setItem(STORE_KEY, JSON.stringify({ token, sig }));
  }

  async function verifySession(sess) {
    if (!sess || !sess.token || !sess.sig) return false;
    if (Date.now() > sess.token.exp) return false;
    const sig2 = await sign(sess.token);
    const rec = getUserRecord(sess.token.u);
    return sig2 === sess.sig && !!rec && !!rec.enabled;
  }


  async function login(username, password) {
    const u = (username || "").trim().toLowerCase();
    const rec = getUserRecord(u);
    if (!rec || !rec.enabled) throw new Error("未授权的管理员或账号已被禁用");


    let ok = false;
    if (rec.salt) {
      const h = await sha256Hex(`${rec.salt}:${password || ""}`);
      ok = (h === rec.hash);
    } else {
      const h = await sha256Hex(password || "");
      ok = (h === rec.hash);
    }
    if (!ok) throw new Error("密码不正确");

    await writeSession(u);
    return { user: u, role: rec.role };
  }

  async function getSessionUser() {
    const sess = readSession();
    if (!(await verifySession(sess))) return null;
    return sess.token.u;
  }

  async function requireAuth() {
    const okUser = await getSessionUser();
    if (!okUser) {
      const back = location.pathname + location.search + location.hash;
      location.replace("admin-login.html?redirect=" + encodeURIComponent(back));
      return;
    }
    document.documentElement.style.visibility = "visible";
    window.__ADMIN_USER__ = okUser;
    window.__ADMIN_ROLE__ = getUserRole(okUser) || null;
  }

  function logout(redirectToLogin=true) {
    clearSession();
    if (redirectToLogin) location.replace("admin-login.html");
  }

  function injectLogoutButton() {
    if (!/admin\.html(\?|#|$)/i.test(location.pathname)) return;
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "退出登录";
    btn.style.position = "fixed";
    btn.style.right = "16px";
    btn.style.bottom = "16px";
    btn.style.zIndex = "9999";
    btn.onclick = () => logout(true);
    document.addEventListener("DOMContentLoaded", () => document.body.appendChild(btn));
  }

  window.Auth = {

    login, requireAuth, logout, getSessionUser,

    getUserRole, hasRole, getUserRecord,

    addAdmin, setPassword, setEnabled,

    generateInvite, acceptInvite
  };
  injectLogoutButton();
})();
