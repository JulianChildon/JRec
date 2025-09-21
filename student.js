// 学生表单提交处理
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('studentForm');
  if (!form) return;

  // 本地存储键名
  const STORAGE_KEY = 'student_applications';

  // 获取现有申请数据
  function getApplications() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  // 保存申请数据
  function saveApplication(data) {
    const applications = getApplications();
    applications.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }

  // 表单提交处理
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

    // 简单验证
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
