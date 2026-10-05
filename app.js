/* منطق الموقع */
let currentTab = 'morning';
let currentFilter = 'all';
let searchTerm = '';
let remainMap = {}; // id -> remaining
let favSet = new Set(JSON.parse(localStorage.getItem('adhkar_fav')||'[]'));

function todayKey(){ return new Date().toISOString().slice(0,10); }
function loadProgress(){
  try{
    const all = JSON.parse(localStorage.getItem('adhkar_progress')||'{}');
    const k = todayKey();
    remainMap = all[k] || {};
  }catch{ remainMap = {}; }
}
function saveProgress(){
  let all = {};
  try{ all = JSON.parse(localStorage.getItem('adhkar_progress')||'{}'); }catch{}
  all[todayKey()] = remainMap;
  localStorage.setItem('adhkar_progress', JSON.stringify(all));
}
function getData(){
  return currentTab==='morning' ? MORNING : EVENING;
}
function getRemain(item){
  if(remainMap[item.id]===undefined) return item.count;
  return remainMap[item.id];
}

function render(){
  const grid = document.getElementById('adhkarGrid');
  const data = getData();
  const title = document.getElementById('sectionTitle');

  if(currentTab==='morning'){
    title.innerHTML = `<h2>🌅 أذكار الصباح</h2><p>وقتها من طلوع الفجر إلى طلوع الشمس، وقيل إلى زوال الشمس — عددها ${data.length} ذكرًا</p>`;
  } else {
    title.innerHTML = `<h2>🌙 أذكار المساء</h2><p>وقتها من صلاة العصر إلى غروب الشمس، وقيل إلى الفجر — عددها ${data.length} ذكرًا</p>`;
  }

  let list = data.filter(it=>{
    if(searchTerm && !(it.title.includes(searchTerm)||it.text.includes(searchTerm))) return false;
    const r = getRemain(it);
    if(currentFilter==='fav' && !favSet.has(it.id)) return false;
    if(currentFilter==='done' && r!==0) return false;
    if(currentFilter==='todo' && r===0) return false;
    return true;
  });

  if(list.length===0){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)">لا توجد نتائج مطابقة 🔍<br>جرّب كلمة أخرى أو غيّر الفلتر</div>`;
  } else {
    grid.innerHTML = list.map((it,idx)=>{
      const r = getRemain(it);
      const done = r===0;
      const pct = Math.round(((it.count - r)/it.count)*100);
      const fav = favSet.has(it.id) ? 'on' : '';
      const star = favSet.has(it.id) ? '⭐' : '☆';
      return `
      <article class="card ${done?'done':''}" id="card-${it.id}">
        <span class="completed-flag">✓ تم بحمد الله</span>
        <div class="card-head">
          <span class="num">${idx+1}</span>
          <h3>${it.title}</h3>
          <button class="fav ${fav}" onclick="toggleFav('${it.id}')" title="مفضلة">${star}</button>
        </div>
        <div style="padding:0 1.2rem"><span class="count-badge">🔁 التكرار: ${it.count} ${r!==it.count&&!done?`• بقي ${r}`:''}</span></div>
        <div class="dhikr-text">${escapeHtml(it.text)}</div>
        <div class="meta">
          <div><span class="lbl">🌟 الفضل: </span>${it.virtue}</div>
          <div><span class="lbl">📖 المصدر: </span>${it.source}</div>
          <div><span class="lbl">✅ الدرجة: </span>${it.grade}</div>
          <div style="color:var(--muted);font-size:.8rem">🔎 ${it.ref}</div>
        </div>
        <div class="card-actions">
          <button class="tap-btn" ${done?'disabled':''} onclick="tap('${it.id}')">
            ${done ? '✓ تم — تقبّل الله' : (r===it.count ? 'ابدأ التكرار 🤲' : `اضغط — بقي ${r}`)}
          </button>
          <button class="mini-btn" onclick="copyOne('${it.id}')" title="نسخ">📋</button>
        </div>
        <div class="remain"><i style="width:${pct}%"></i></div>
      </article>`;
    }).join('');
  }
  updateStats();
}

function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

function tap(id){
  const data = getData();
  const item = data.find(x=>x.id===id);
  if(!item) return;
  let r = getRemain(item);
  if(r<=0) return;
  r--;
  remainMap[id]=r;
  saveProgress();
  // اهتزاز خفيف
  if(navigator.vibrate) navigator.vibrate(30);
  render();
  if(r===0){
    toast('تقبّل الله منك ✓ — ذكر جديد مكتمل');
    updateStats(true);
  }
}

function toggleFav(id){
  if(favSet.has(id)) favSet.delete(id); else favSet.add(id);
  localStorage.setItem('adhkar_fav', JSON.stringify([...favSet]));
  render();
}

function copyOne(id){
  const item = getData().find(x=>x.id===id);
  const t = `${item.title}\n\n${item.text}\n\n(التكرار: ${item.count}) — ${item.ref}`;
  navigator.clipboard.writeText(t).then(()=>toast('تم نسخ الذكر 📋'));
}

function updateStats(celebrate){
  const data = getData();
  const total = data.length;
  const done = data.filter(it=>getRemain(it)===0).length;
  const pct = total? Math.round(done/total*100):0;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statPct').textContent = pct+'%';
  document.getElementById('progressBar').style.width = pct+'%';
  if(pct===100 && total>0){
    document.getElementById('statPct').textContent = '100% 🎉';
  }
}

function toast(msg){
  const d = document.createElement('div');
  d.className='toast'; d.textContent=msg;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),2200);
}

/* تبويبات */
document.querySelectorAll('.nav-btn').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const t = b.dataset.tab;
    document.getElementById('sebhaSection').classList.add('hidden');
    document.getElementById('aboutSection').classList.add('hidden');
    document.getElementById('adhkarGrid').classList.remove('hidden');
    document.getElementById('mainToolbar').style.display='';
    document.getElementById('sectionTitle').style.display='';
    if(t==='sebha'){
      document.getElementById('sebhaSection').classList.remove('hidden');
      document.getElementById('adhkarGrid').classList.add('hidden');
      document.getElementById('mainToolbar').style.display='none';
      document.getElementById('sectionTitle').style.display='none';
    } else if(t==='about'){
      document.getElementById('aboutSection').classList.remove('hidden');
      document.getElementById('adhkarGrid').classList.add('hidden');
      document.getElementById('mainToolbar').style.display='none';
      document.getElementById('sectionTitle').style.display='none';
    } else {
      currentTab = t;
      render();
      document.getElementById('adhkarGrid').scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
});

/* فلاتر + بحث */
document.querySelectorAll('.chip').forEach(c=>{
  c.addEventListener('click',()=>{
    document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
    c.classList.add('active');
    currentFilter = c.dataset.filter;
    render();
  });
});
document.getElementById('searchInput').addEventListener('input',e=>{
  searchTerm = e.target.value.trim();
  render();
});

/* أزرار */
document.getElementById('resetBtn').addEventListener('click',()=>{
  if(!confirm('هل تريد تصفير تقدم اليوم؟')) return;
  getData().forEach(it=>{ remainMap[it.id]=it.count; });
  saveProgress(); render(); toast('تم التصفير — ابدأ من جديد 🤲');
});
document.getElementById('startBtn').addEventListener('click',()=>{
  document.getElementById('adhkarGrid').scrollIntoView({behavior:'smooth'});
});
document.getElementById('copyAll').addEventListener('click',()=>{
  const data = getData();
  const t = data.map((d,i)=>`${i+1}- ${d.title}\n${d.text}\n(يُقال ${d.count} مرات) | ${d.ref}`).join('\n\n');
  navigator.clipboard.writeText(t).then(()=>toast('تم نسخ جميع الأذكار 📋'));
});
document.getElementById('shareBtn').addEventListener('click',()=>{
  const url = location.href;
  if(navigator.share){ navigator.share({title:'أذكار الصباح والمساء',url}); }
  else { navigator.clipboard.writeText(url).then(()=>toast('تم نسخ رابط الموقع 🔗')); }
});

/* ثيم + خط */
document.getElementById('themeToggle').addEventListener('click',function(){
  document.body.classList.toggle('dark');
  this.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  localStorage.setItem('adhkar_theme', document.body.classList.contains('dark')?'dark':'light');
});
let fontScale = 1;
document.getElementById('fontPlus').addEventListener('click',()=>{
  fontScale = fontScale>=1.3 ? 1 : fontScale+0.1;
  document.querySelectorAll('.dhikr-text').forEach(el=>el.style.fontSize = (1.35*fontScale)+'rem');
  toast('حجم الخط: '+Math.round(fontScale*100)+'%');
});

/* ساعة + هجري + تلميح */
function tick(){
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  try{
    document.getElementById('hijriDate').textContent = new Intl.DateTimeFormat('ar-SA-u-ca-islamic',{day:'numeric',month:'long',year:'numeric'}).format(now);
  }catch{ document.getElementById('hijriDate').textContent = now.toLocaleDateString('ar-EG'); }
  const h = now.getHours();
  const isMorning = h>=4 && h<17;
  document.getElementById('timeHint').textContent = isMorning ? '🌅 وقت أذكار الصباح' : '🌙 وقت أذكار المساء';
}
setInterval(tick,1000); tick();

/* مسبحة */
let sebhaCount = 0, sebhaTarget = 33;
document.querySelectorAll('.sebha-opt').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.sebha-opt').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('sebhaName').textContent = b.dataset.dhikr;
    sebhaTarget = parseInt(b.dataset.target);
    sebhaCount = 0;
    sebhaPaint();
  });
});
document.getElementById('sebhaCircle').addEventListener('click',()=>{
  sebhaCount++;
  if(navigator.vibrate) navigator.vibrate(20);
  if(sebhaCount===sebhaTarget){ toast('تقبّل الله 🎉 — أتممت '+sebhaTarget); if(navigator.vibrate) navigator.vibrate([100,50,100]); }
  if(sebhaCount>sebhaTarget){ sebhaCount=1; }
  sebhaPaint();
});
function sebhaPaint(){
  document.getElementById('sebhaNum').textContent = sebhaCount;
  document.getElementById('sebhaTarget').textContent = 'من '+sebhaTarget;
}
document.getElementById('sebhaReset').addEventListener('click',()=>{ sebhaCount=0; sebhaPaint(); });

/* صعود */
window.addEventListener('scroll',()=>{
  document.getElementById('toTop').style.display = scrollY>600?'block':'none';
});
document.getElementById('toTop').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));

/* init */
loadProgress();
if(localStorage.getItem('adhkar_theme')==='dark'){ document.body.classList.add('dark'); document.getElementById('themeToggle').textContent='☀️'; }
(function(){
  const h = new Date().getHours();
  currentTab = (h>=4 && h<17) ? 'morning' : 'evening';
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===currentTab));
})();
render();
sebhaPaint();
