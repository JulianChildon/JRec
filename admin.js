document.addEventListener('DOMContentLoaded', async () => {
  const STORAGE_KEY = 'student_applications';
  const applicationsTable = document.getElementById('applicationsTable');
  const applicationCount = document.getElementById('applicationCount');
  const exportJsonBtn = document.getElementById('exportJson');
  const clearAllBtn = document.getElementById('clearAll');
  const modal = document.getElementById('modal');
  const editForm = document.getElementById('editForm');
  const closeModalBtn = document.getElementById('closeModal');


  function getApplications() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }


  function updateApplications(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    renderApplications();
  }


  function renderApplications() {
    const applications = getApplications();
    applicationCount.textContent = `${applications.length} 条申请`;
    
    if (applications.length === 0) {
      applicationsTable.innerHTML = '<tr><td colspan="8" class="muted">暂无申请数据</td></tr>';
      return;
    }

    applicationsTable.innerHTML = applications.map((app, index) => `
      <tr>
        <td>${app.studentId}</td>
        <td>${app.name}</td>
        <td>${app.major}</td>
        <td>${app.grade}</td>
        <td>${app.club || ''}</td>
        <td>${app.phone}</td>
        <td>${app.email}</td>
        <td class="ellipsis" title="${app.introduction}">${app.introduction.substring(0, 30)}${app.introduction.length > 30 ? '...' : ''}</td>
        <td>
          <button class="btn small edit-btn" data-index="${index}">编辑</button>
          <button class="btn small danger delete-btn" data-index="${index}">删除</button>
        </td>
      </tr>
    `).join('');


    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.index)));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteApplication(parseInt(btn.dataset.index)));
    });
  }


  function openEditModal(index) {
    const applications = getApplications();
    const app = applications[index];
    
    if (!app) return;
    
    document.getElementById('editIndex').value = index;
    document.getElementById('editStudentId').value = app.studentId;
    document.getElementById('editName').value = app.name;
    document.getElementById('editMajor').value = app.major;
    document.getElementById('editGrade').value = app.grade;
    document.getElementById('editClub').value = app.club || '';
    document.getElementById('editPhone').value = app.phone;
    document.getElementById('editEmail').value = app.email;
    document.getElementById('editIntroduction').value = app.introduction;
    
    modal.style.display = 'flex';
  }


  function closeEditModal() {
    modal.style.display = 'none';
    editForm.reset();
  }


  function deleteApplication(index) {
    if (!confirm('确定要删除这条申请吗？')) return;
    
    const applications = getApplications();
    applications.splice(index, 1);
    updateApplications(applications);
  }


  function exportToJson() {
    const applications = getApplications();
    const dataStr = JSON.stringify(applications, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `学生申请数据_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }


  function clearAllApplications() {
    if (!confirm('确定要清空所有申请数据吗？此操作不可撤销！')) return;
    updateApplications([]);
  }


  if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportToJson);
  if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllApplications);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeEditModal);
  

  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const index = parseInt(document.getElementById('editIndex').value);
      const applications = getApplications();
      
      applications[index] = {
        ...applications[index],
        studentId: document.getElementById('editStudentId').value.trim(),
        name: document.getElementById('editName').value.trim(),
        major: document.getElementById('editMajor').value.trim(),
        grade: document.getElementById('editGrade').value,
        club: document.getElementById('editClub').value.trim(),
        phone: document.getElementById('editPhone').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        introduction: document.getElementById('editIntroduction').value.trim()
      };
      
      updateApplications(applications);
      closeEditModal();
    });
  }


  renderApplications();
});
