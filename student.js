document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('studentForm');
  if (!form) return;
  const STORAGE_KEY = 'student_applications';


  function getApplications() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }


  function saveApplication(data) {
    const applications = getApplications();
    applications.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }


  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      name: form.querySelector('#name').value.trim(),
      studentId: form.querySelector('#studentId').value.trim(),
      major: form.querySelector('#major').value.trim(),
      grade: form.querySelector('#grade').value,
      phone: form.querySelector('#phone').value.trim(),
      email: form.querySelector('#email').value.trim(),
      club: form.querySelector('#club').value.trim(),
      introduction: form.querySelector('#introduction').value.trim(),
      submittedAt: new Date().toISOString()
    };


    if (!formData.studentId || !formData.name) {
      alert('请填写学号和姓名');
      return;
    }

    try {
      saveApplication(formData);
      alert('申请提交成功！');
      form.reset();
    } catch (error) {
      console.error('保存申请失败:', error);
      alert('提交失败，请稍后再试');
    }
  });
});
