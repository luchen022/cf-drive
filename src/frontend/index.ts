// 内嵌前端 HTML — 文件浏览器 + 管理后台（单文件 SPA）
// 此文件由 scripts/build-frontend.js 自动生成，请勿手动编辑

export const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>cf-drive</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;color:#333}
a{color:#0070f3;text-decoration:none}
a:hover{text-decoration:underline}
.container{max-width:960px;margin:0 auto;padding:16px}
.header{background:#fff;border-bottom:1px solid #e5e5e5;padding:12px 0;margin-bottom:16px}
.header-inner{max-width:960px;margin:0 auto;padding:0 16px;display:flex;align-items:center;justify-content:space-between}
.site-title{font-size:18px;font-weight:600;color:#333}
.header-actions{display:flex;gap:8px}
.breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:12px;font-size:14px}
.breadcrumb span{color:#999}
.file-table{background:#fff;border-radius:8px;border:1px solid #e5e5e5;overflow:hidden}
.file-table table{width:100%;border-collapse:collapse}
.file-table th{background:#fafafa;padding:10px 16px;text-align:left;font-size:13px;color:#666;border-bottom:1px solid #e5e5e5;font-weight:500}
.file-table td{padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px}
.file-table tr:last-child td{border-bottom:none}
.file-table tr:hover td{background:#fafafa}
.file-row{cursor:pointer}
.file-icon{margin-right:8px;font-size:16px}
.file-name{display:flex;align-items:center}
.file-size{color:#999;font-size:13px}
.file-date{color:#999;font-size:13px}
.col-size{width:100px;text-align:right}
.col-date{width:160px}
.loading{text-align:center;padding:40px;color:#999}
.empty{text-align:center;padding:40px;color:#999}
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;border:1px solid #e5e5e5;background:#fff;cursor:pointer;font-size:13px;color:#333;transition:background .15s}
.btn:hover{background:#f5f5f5}
.btn-primary{background:#0070f3;color:#fff;border-color:#0070f3}
.btn-primary:hover{background:#005cc5}
.btn-danger{background:#e00;color:#fff;border-color:#e00}
.btn-danger:hover{background:#c00}
.admin-layout{display:flex;min-height:calc(100vh - 57px)}
.sidebar{width:200px;background:#fff;border-right:1px solid #e5e5e5;padding:16px 0;flex-shrink:0}
.sidebar-item{display:block;padding:9px 20px;font-size:14px;color:#555;cursor:pointer;transition:background .15s}
.sidebar-item:hover,.sidebar-item.active{background:#f0f7ff;color:#0070f3}
.admin-content{flex:1;padding:24px;overflow:auto}
.admin-content h2{font-size:18px;margin-bottom:16px;font-weight:600}
.form-group{margin-bottom:14px}
.form-group label{display:block;font-size:13px;color:#555;margin-bottom:5px;font-weight:500}
.form-group input,.form-group select,.form-group textarea{width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:14px;outline:none;transition:border .15s}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:#0070f3}
.form-group textarea{resize:vertical;min-height:80px}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:100}
.modal{background:#fff;border-radius:10px;padding:24px;width:480px;max-width:95vw;max-height:90vh;overflow-y:auto}
.modal h3{font-size:16px;font-weight:600;margin-bottom:16px}
.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.admin-table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;border:1px solid #e5e5e5;overflow:hidden}
.admin-table th{background:#fafafa;padding:10px 14px;text-align:left;font-size:13px;color:#666;border-bottom:1px solid #e5e5e5;font-weight:500}
.admin-table td{padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px}
.admin-table tr:last-child td{border-bottom:none}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:12px}
.badge-work{background:#e6f4ea;color:#1a7f37}
.badge-error{background:#ffeef0;color:#cf222e}
.badge-disabled{background:#f0f0f0;color:#888}
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f5}
.login-box{background:#fff;border-radius:10px;padding:32px;width:360px;border:1px solid #e5e5e5}
.login-box h2{text-align:center;margin-bottom:24px;font-size:20px}
.error-msg{color:#e00;font-size:13px;margin-top:8px}
@media(max-width:640px){
  .col-date{display:none}
  .col-size{display:none}
  .admin-layout{flex-direction:column}
  .sidebar{width:100%;border-right:none;border-bottom:1px solid #e5e5e5;display:flex;flex-wrap:wrap;padding:8px}
  .sidebar-item{padding:6px 12px}
}
</style>
</head>
<body>
<div id="app"></div>
<script>
(function(){
'use strict';

const state = {
  path: '/',
  items: [],
  loading: false,
  error: null,
  siteTitle: 'cf-drive',
  token: localStorage.getItem('cf_token') || '',
};

function getRoute() {
  const hash = location.hash.slice(1) || '/';
  if (hash.startsWith('/admin')) return { page: 'admin', sub: hash.slice(6) || '/storage' };
  return { page: 'browse', path: hash };
}

function navigate(hash) {
  location.hash = hash;
  render();
}

window.addEventListener('hashchange', render);

async function api(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return res.json();
}

function fmtSize(n) {
  if (!n) return '-';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n/1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n/1048576).toFixed(1) + ' MB';
  return (n/1073741824).toFixed(2) + ' GB';
}

function fmtDate(s) {
  if (!s) return '-';
  return new Date(s).toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function fileIcon(item) {
  if (item.isDir) return '📁';
  const ext = item.name.split('.').pop().toLowerCase();
  const map = { mp4:'🎬', mkv:'🎬', avi:'🎬', mov:'🎬', mp3:'🎵', flac:'🎵', wav:'🎵',
    jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️', webp:'🖼️', svg:'🖼️',
    pdf:'📄', doc:'📝', docx:'📝', xls:'📊', xlsx:'📊', ppt:'📊', pptx:'📊',
    zip:'🗜️', rar:'🗜️', '7z':'🗜️', tar:'🗜️', gz:'🗜️',
    js:'💻', ts:'💻', py:'💻', go:'💻', java:'💻', c:'💻', cpp:'💻', rs:'💻',
    txt:'📃', md:'📃', json:'📃', xml:'📃', yaml:'📃', yml:'📃' };
  return map[ext] || '📄';
}

function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e[k] = v;
    else e.setAttribute(k, v);
  });
  children.flat().forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

async function loadFiles(path, forceRefresh = false) {
  state.loading = true;
  state.error = null;
  renderBrowse(path);
  try {
    const url = '/api/fs/list?path=' + encodeURIComponent(path) + (forceRefresh ? '&refresh=1' : '');
    const res = await api('GET', url);
    if (res.code === 200) {
      state.items = res.data.content || [];
      state.path = path;
    } else {
      state.error = res.message;
      state.items = [];
    }
  } catch(e) {
    state.error = '网络错误';
    state.items = [];
  }
  state.loading = false;
  renderBrowse(path);
}

function renderBrowse(path) {
  const app = document.getElementById('app');
  const parts = path.split('/').filter(Boolean);

  const header = el('div', {class:'header'},
    el('div', {class:'header-inner'},
      el('span', {class:'site-title'}, state.siteTitle),
      el('div', {class:'header-actions'},
        el('button', {class:'btn', onclick:()=>loadFiles(path, true)}, '🔄 刷新'),
        el('button', {class:'btn', onclick:()=>navigate('#/admin')}, '⚙️ 管理')
      )
    )
  );

  const crumbs = [el('a', {href:'#/'}, '🏠 根目录')];
  let cur = '';
  parts.forEach(p => {
    cur += '/' + p;
    const cp = cur;
    crumbs.push(el('span', {}, ' / '));
    crumbs.push(el('a', {href:'#' + cp}, p));
  });
  const breadcrumb = el('div', {class:'breadcrumb'}, ...crumbs);

  let tableBody;
  if (state.loading) {
    tableBody = el('tr', {}, el('td', {colspan:'3', class:'loading'}, '加载中…'));
  } else if (state.error) {
    tableBody = el('tr', {}, el('td', {colspan:'3', class:'empty'}, '❌ ' + state.error));
  } else if (!state.items.length) {
    tableBody = el('tr', {}, el('td', {colspan:'3', class:'empty'}, '空目录'));
  } else {
    const rows = state.items.map(item => {
      const tr = el('tr', {class:'file-row'});
      let dirLink;
      if (item.isDir) {
        // 如果 item.id 是绝对路径（以 / 开头），直接使用
        // 否则拼接当前路径
        if (item.id.startsWith('/')) {
          dirLink = '#' + item.id;
        } else {
          dirLink = '#' + path.replace(/\\/$/,'') + '/' + item.name;
        }
      }
      const nameTd = el('td', {class:'file-name'},
        el('span', {class:'file-icon'}, fileIcon(item)),
        item.isDir
          ? el('a', {href: dirLink}, item.name)
          : el('a', {href: '/d' + path.replace(/\\/$/,'') + '/' + item.name, target:'_blank'}, item.name)
      );
      tr.appendChild(nameTd);
      tr.appendChild(el('td', {class:'file-size col-size'}, fmtSize(item.size)));
      tr.appendChild(el('td', {class:'file-date col-date'}, fmtDate(item.modified)));
      return tr;
    });
    tableBody = rows;
  }

  const table = el('div', {class:'file-table'},
    el('table', {},
      el('thead', {}, el('tr', {},
        el('th', {}, '名称'),
        el('th', {class:'col-size'}, '大小'),
        el('th', {class:'col-date'}, '修改时间')
      )),
      el('tbody', {}, ...(Array.isArray(tableBody) ? tableBody : [tableBody]))
    )
  );

  app.innerHTML = '';
  app.appendChild(header);
  app.appendChild(el('div', {class:'container'}, breadcrumb, table));
}

function isLoggedIn() {
  if (!state.token) return false;
  try {
    const p = JSON.parse(atob(state.token.split('.')[1]));
    return p.exp > Date.now()/1000;
  } catch { return false; }
}

function renderLogin(errorMsg) {
  const app = document.getElementById('app');
  
  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
      const res = await api('POST', '/api/auth/login', { username, password });
      if (res.code === 200 && res.data && res.data.token) {
        state.token = res.data.token;
        localStorage.setItem('cf_token', state.token);
        location.hash = '#/admin';
        render();
      } else {
        renderLogin(res.message || '登录失败');
      }
    } catch(e) {
      renderLogin('网络错误: ' + e.message);
    }
  }

  const loginBox = el('div', {class:'login-box'},
    el('h2', {}, '登录 cf-drive'),
    el('form', {onsubmit: handleLogin},
      el('div', {class:'form-group'},
        el('label', {}, '用户名'),
        el('input', {type:'text', id:'username', required:true})
      ),
      el('div', {class:'form-group'},
        el('label', {}, '密码'),
        el('input', {type:'password', id:'password', required:true})
      ),
      errorMsg ? el('div', {class:'error-msg'}, errorMsg) : null,
      el('button', {type:'submit', class:'btn btn-primary', style:'width:100%;margin-top:8px'}, '登录')
    )
  );

  app.innerHTML = '';
  app.appendChild(el('div', {class:'login-wrap'}, loginBox));
}

async function renderAdmin(sub) {
  if (!isLoggedIn()) { renderLogin(); return; }
  const app = document.getElementById('app');

  const navItems = [
    { path:'/storage', label:'📦 挂载管理' },
    { path:'/user', label:'👤 用户管理' },
    { path:'/setting', label:'⚙️ 系统设置' },
  ];

  const sidebar = el('div', {class:'sidebar'},
    ...navItems.map(n =>
      el('div', {
        class: 'sidebar-item' + (sub === n.path ? ' active' : ''),
        onclick: () => navigate('#/admin' + n.path)
      }, n.label)
    ),
    el('div', {class:'sidebar-item', onclick:()=>{ state.token=''; localStorage.removeItem('cf_token'); navigate('#/'); }}, '🚪 退出')
  );

  const content = el('div', {class:'admin-content'});
  const layout = el('div', {class:'admin-layout'}, sidebar, content);

  const header = el('div', {class:'header'},
    el('div', {class:'header-inner'},
      el('a', {href:'#/', class:'site-title'}, '← ' + state.siteTitle),
      el('span', {}, '管理后台')
    )
  );

  app.innerHTML = '';
  app.appendChild(header);
  app.appendChild(layout);

  if (sub === '/storage') await renderStoragePage(content);
  else if (sub === '/user') await renderUserPage(content);
  else if (sub === '/setting') await renderSettingPage(content);
  else await renderStoragePage(content);
}

async function renderStoragePage(container) {
  container.innerHTML = '';
  container.appendChild(el('h2', {}, '挂载管理'));
  
  const res = await api('GET', '/api/admin/storage/list');
  const mounts = res.code === 200 && res.data ? (res.data.content || []) : [];
  
  const driversRes = await api('GET', '/api/admin/driver/list');
  const drivers = driversRes.code === 200 && driversRes.data ? (driversRes.data.content || []) : [];

  const toolbar = el('div', {style:'margin-bottom:16px'},
    el('button', {class:'btn btn-primary', onclick:()=>showMountModal(null, drivers, ()=>renderStoragePage(container))}, '+ 新建挂载')
  );

  const table = el('table', {class:'admin-table'},
    el('thead', {}, el('tr', {},
      el('th', {}, '挂载路径'),
      el('th', {}, '驱动'),
      el('th', {}, '状态'),
      el('th', {}, '备注'),
      el('th', {style:'width:200px'}, '操作')
    )),
    el('tbody', {}, ...mounts.map(m => el('tr', {},
      el('td', {}, m.mount_path),
      el('td', {}, m.driver),
      el('td', {}, 
        el('span', {class: 'badge badge-' + m.status}, 
          m.status === 'work' ? '正常' : m.status === 'error' ? '错误' : '禁用'
        )
      ),
      el('td', {}, m.remark || '-'),
      el('td', {},
        el('button', {class:'btn', style:'font-size:12px;padding:4px 8px', onclick:()=>showMountModal(m, drivers, ()=>renderStoragePage(container))}, '编辑'),
        ' ',
        el('button', {class:'btn', style:'font-size:12px;padding:4px 8px', onclick:async()=>{
          await api('POST', '/api/admin/storage/' + (m.disabled ? 'enable' : 'disable'), {id: m.id});
          renderStoragePage(container);
        }}, m.disabled ? '启用' : '禁用'),
        ' ',
        el('button', {class:'btn btn-danger', style:'font-size:12px;padding:4px 8px', onclick:async()=>{
          if (confirm('确定删除挂载 ' + m.mount_path + ' ?')) {
            await api('POST', '/api/admin/storage/delete', {id: m.id});
            renderStoragePage(container);
          }
        }}, '删除')
      )
    )))
  );

  container.appendChild(toolbar);
  container.appendChild(table);
}

function showMountModal(mount, drivers, onSave) {
  const isEdit = !!mount;
  const overlay = el('div', {class:'modal-overlay'});
  
  const form = el('form', {onsubmit: async (e) => {
    e.preventDefault();
    const additionStr = document.getElementById('addition').value;
    let additionObj;
    try {
      additionObj = JSON.parse(additionStr);
    } catch (err) {
      alert('Addition 配置格式错误，请检查 JSON 格式: ' + err.message);
      return;
    }
    
    const data = {
      mount_path: document.getElementById('mount_path').value,
      driver: document.getElementById('driver').value,
      addition: additionObj,
      cache_expiration: parseInt(document.getElementById('cache_expiration').value),
      remark: document.getElementById('remark').value,
    };
    if (isEdit) data.id = mount.id;
    
    const res = await api('POST', '/api/admin/storage/' + (isEdit ? 'update' : 'create'), data);
    if (res.code === 200) {
      document.body.removeChild(overlay);
      onSave();
    } else {
      alert('操作失败: ' + res.message);
    }
  }});

  const fields = [
    el('div', {class:'form-group'},
      el('label', {}, '挂载路径'),
      el('input', {type:'text', id:'mount_path', required:true, value: mount?.mount_path || '', placeholder:'/path'})
    ),
    el('div', {class:'form-group'},
      el('label', {}, '驱动类型'),
      el('select', {id:'driver', required:true},
        el('option', {value:''}, '-- 选择驱动 --'),
        ...drivers.map(d => el('option', {value:d.name, selected: mount?.driver === d.name}, d.config?.displayName || d.name))
      )
    ),
    el('div', {class:'form-group'},
      el('label', {}, 'Addition 配置 (JSON)'),
      el('textarea', {id:'addition', required:true, placeholder:'{"key": "value"}'}, mount?.addition || '{}')
    ),
    el('div', {class:'form-group'},
      el('label', {}, '缓存过期时间 (秒)'),
      el('input', {type:'number', id:'cache_expiration', value: mount?.cache_expiration ?? 300})
    ),
    el('div', {class:'form-group'},
      el('label', {}, '备注'),
      el('input', {type:'text', id:'remark', value: mount?.remark || ''})
    ),
  ];

  form.append(...fields);
  
  const modal = el('div', {class:'modal'},
    el('h3', {}, isEdit ? '编辑挂载' : '新建挂载'),
    form,
    el('div', {class:'modal-actions'},
      el('button', {type:'button', class:'btn', onclick:()=>document.body.removeChild(overlay)}, '取消'),
      el('button', {type:'submit', class:'btn btn-primary', onclick:(e)=>{e.preventDefault(); form.dispatchEvent(new Event('submit'))}}, '保存')
    )
  );

  overlay.appendChild(modal);
  overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}

async function renderUserPage(container) {
  container.innerHTML = '';
  container.appendChild(el('h2', {}, '用户管理'));
  
  const res = await api('GET', '/api/admin/user/list');
  const users = res.code === 200 && res.data ? (res.data.content || []) : [];

  const toolbar = el('div', {style:'margin-bottom:16px'},
    el('button', {class:'btn btn-primary', onclick:()=>showUserModal(null, ()=>renderUserPage(container))}, '+ 新建用户')
  );

  const table = el('table', {class:'admin-table'},
    el('thead', {}, el('tr', {},
      el('th', {}, '用户名'),
      el('th', {}, '角色'),
      el('th', {}, '状态'),
      el('th', {}, '创建时间'),
      el('th', {style:'width:150px'}, '操作')
    )),
    el('tbody', {}, ...users.map(u => el('tr', {},
      el('td', {}, u.username),
      el('td', {}, u.role === 'admin' ? '管理员' : '访客'),
      el('td', {}, u.disabled ? '已禁用' : '正常'),
      el('td', {}, fmtDate(u.created_at)),
      el('td', {},
        el('button', {class:'btn', style:'font-size:12px;padding:4px 8px', onclick:()=>showUserModal(u, ()=>renderUserPage(container))}, '编辑'),
        ' ',
        el('button', {class:'btn btn-danger', style:'font-size:12px;padding:4px 8px', onclick:async()=>{
          if (confirm('确定删除用户 ' + u.username + ' ?')) {
            await api('POST', '/api/admin/user/delete', {id: u.id});
            renderUserPage(container);
          }
        }}, '删除')
      )
    )))
  );

  container.appendChild(toolbar);
  container.appendChild(table);
}

function showUserModal(user, onSave) {
  const isEdit = !!user;
  const overlay = el('div', {class:'modal-overlay'});
  
  const form = el('form', {onsubmit: async (e) => {
    e.preventDefault();
    const data = {
      username: document.getElementById('username').value,
      role: document.getElementById('role').value,
      disabled: document.getElementById('disabled').checked ? 1 : 0,
    };
    const pwd = document.getElementById('password').value;
    if (pwd) data.password = pwd;
    if (isEdit) data.id = user.id;
    
    const res = await api('POST', '/api/admin/user/' + (isEdit ? 'update' : 'create'), data);
    if (res.code === 200) {
      document.body.removeChild(overlay);
      onSave();
    } else {
      alert('操作失败: ' + res.message);
    }
  }});

  const fields = [
    el('div', {class:'form-group'},
      el('label', {}, '用户名'),
      el('input', {type:'text', id:'username', required:true, value: user?.username || ''})
    ),
    el('div', {class:'form-group'},
      el('label', {}, '密码' + (isEdit ? ' (留空不修改)' : '')),
      el('input', {type:'password', id:'password', required: !isEdit})
    ),
    el('div', {class:'form-group'},
      el('label', {}, '角色'),
      el('select', {id:'role', required:true},
        el('option', {value:'guest', selected: user?.role === 'guest'}, '访客'),
        el('option', {value:'admin', selected: user?.role === 'admin'}, '管理员')
      )
    ),
    el('div', {class:'form-group'},
      el('label', {},
        el('input', {type:'checkbox', id:'disabled', checked: user?.disabled}),
        ' 禁用此用户'
      )
    ),
  ];

  form.append(...fields);
  
  const modal = el('div', {class:'modal'},
    el('h3', {}, isEdit ? '编辑用户' : '新建用户'),
    form,
    el('div', {class:'modal-actions'},
      el('button', {type:'button', class:'btn', onclick:()=>document.body.removeChild(overlay)}, '取消'),
      el('button', {type:'submit', class:'btn btn-primary', onclick:(e)=>{e.preventDefault(); form.dispatchEvent(new Event('submit'))}}, '保存')
    )
  );

  overlay.appendChild(modal);
  overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}

async function renderSettingPage(container) {
  container.innerHTML = '';
  container.appendChild(el('h2', {}, '系统设置'));
  
  const res = await api('GET', '/api/admin/setting/list');
  const settings = res.code === 200 && res.data ? (res.data.content || []) : [];

  const form = el('form', {onsubmit: async (e) => {
    e.preventDefault();
    const updates = settings.map(s => ({
      key: s.key,
      value: s.type === 'bool' 
        ? (document.getElementById('setting_' + s.key).checked ? 'true' : 'false')
        : document.getElementById('setting_' + s.key).value
    }));
    
    const res = await api('POST', '/api/admin/setting/save', { settings: updates });
    if (res.code === 200) {
      alert('保存成功');
      renderSettingPage(container);
    } else {
      alert('保存失败: ' + res.message);
    }
  }});

  settings.forEach(s => {
    const group = el('div', {class:'form-group'});
    group.appendChild(el('label', {}, s.description || s.key));
    
    if (s.type === 'bool') {
      const checkbox = el('input', {type:'checkbox', id:'setting_' + s.key, checked: s.value === 'true'});
      group.appendChild(checkbox);
    } else if (s.type === 'number') {
      group.appendChild(el('input', {type:'number', id:'setting_' + s.key, value: s.value}));
    } else {
      group.appendChild(el('input', {type:'text', id:'setting_' + s.key, value: s.value}));
    }
    
    form.appendChild(group);
  });

  form.appendChild(el('button', {type:'submit', class:'btn btn-primary', style:'margin-top:8px'}, '保存设置'));
  container.appendChild(form);
}

async function render() {
  const route = getRoute();
  if (route.page === 'admin') {
    await renderAdmin(route.sub);
  } else {
    await loadFiles(route.path);
  }
}

render();

})();
</script>
</body>
</html>
`;
