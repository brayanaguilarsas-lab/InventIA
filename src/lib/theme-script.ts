// Script inline que corre antes del primer paint para evitar FOUC de tema.
// Aplica `dark` al <html> si (a) hay preferencia guardada = dark, o
// (b) no hay preferencia y el sistema prefiere dark.
export const themeInitScript = `
(function(){try{
  var t = localStorage.getItem('theme');
  var dark = t === 'dark' || (t === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}catch(e){}})();
`;
