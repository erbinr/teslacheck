// Aplica el tema guardado antes de pintar (evita parpadeo). Sin red, sin datos.
try{var t=localStorage.getItem('tc:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}
