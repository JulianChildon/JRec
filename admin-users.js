document.addEventListener('DOMContentLoaded', async () => {
  const table = document.getElementById('adminTable');
  const addForm = document.getElementById('addForm');
  const inviteForm = document.getElementById('inviteForm');
  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout(true));

  function fmtTime(t) {
    if (!t) return '-';
    try { return new Date(t).toLocaleString(); } catch { return '-'; }
  }

  function sourceOf(rec) {
    return rec.salt ? 'runtime' : 'builtin';
  }

  function listAdmins() {
    const eff = (Auth.getUserRecord && Auth.getUserRecord) ? null : null;
    const builtins = ['admin','lead'];
    const names = new Set(builtins);

    try {
      const regRaw = localStorage.getItem('admin_users_v1');
      if (regRaw) {
        const parsed = JSON.parse(regRaw);
        Object.keys(parsed?.reg?.users || {}).forEach(n => names.add(n));
      }
    } catch {}

    const arr = [];
    names.forEach(n => {
      const rec = Auth.getUserRecord(n);
      if (rec) arr.push({ name:n, ...rec });
    });

    arr.sort((a,b) => (a.role === 'super' ? -1 : 1) - (b.role === 'super' ? -1 : 1) || a.name.localeCompare(b.name));
    return arr;
  }

  function render() {
    const rows = listAdmins().map(rec => {
      const src = sourceOf(rec);
      return `
        <tr>
          <td>${rec.name}</td>
          <td>${rec.role}</td>
          <td>${rec.enabled ? '✅' : '⛔️'}</td>
          <td>${src}</td>
          <td>${rec.createdAt ? fmtTime(rec.createdAt) : '-'}</td>
          <td style="display:flex;gap:8px">
            <button class="btn small" data-act="toggle" data-u="${rec.name}">${rec.enabled ? '禁用' : '启用'}</button>
            <button class="btn small" data-act="reset" data-u="${rec.name}">重置密码</button>
          </td>
        </tr>
      `;
    }).join('');
    table.innerHTML = rows || '<tr><td colspan="6" class="muted">暂无数据</td></tr>';

    table.querySelectorAll('button[data-act="toggle"]').forEach(b => {
      b.addEventListener('click', async () => {
        const u = b.dataset.u;
        const rec = Auth.getUserRecord(u);
        try {
          await Auth.setEnabled(u, !rec.enabled);
          render();
        } catch(e) {
          alert(e.message || '操作失败');
        }
      });
    });

    table.querySelectorAll('button[data-act="reset"]').forEach(b => {
      b.addEventListener('click', async () => {
        const u = b.dataset.u;
        const np = prompt(`请输入 ${u} 的新密码（至少12位建议）：`);
        if (!np) return;
        try {
          await Auth.setPassword(u, np);
          alert('密码已重置');
          render();
        } catch(e) {
          alert(e.message || '重置失败');
        }
      });
    });
  }

  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('addUsername').value.trim();
      const p = document.getElementById('addPassword').value;
      const r = document.getElementById('addRole').value;
      if (!u || !p) return alert('请输入用户名与密码');
      if (p.length < 8) {
        if (!confirm('密码少于 8 位，确定继续吗？')) return;
      }
      try {
        await Auth.addAdmin(u, p, r);
        alert('新增成功');
        addForm.reset();
        render();
      } catch (e2) {
        alert(e2.message || '新增失败');
      }
    });
  }

  if (inviteForm) {
    inviteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('inviteU').value.trim();
      const r = document.getElementById('inviteRole').value;
      const ttl = parseInt(document.getElementById('inviteTTL').value, 10) || 60;
      try {
        const token = await Auth.generateInvite({ u, role: r, ttlMinutes: ttl });
        const url = location.origin + location.pathname.replace(/[^/]+$/, '') + 'admin-accept.html?invite=' + encodeURIComponent(token);
        const out = document.getElementById('inviteOut');
        out.textContent = url;
        try { await navigator.clipboard.writeText(url); } catch {}
      } catch (e2) {
        alert(e2.message || '生成失败');
      }
    });
  }

  render();
});
