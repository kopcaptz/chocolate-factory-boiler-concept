/* Public tab 05 only. No annotations or commands are sent to the other tabs. */
(function (root) {
  'use strict';
  async function boot() {
    const container = document.getElementById('site-input-app');
    if (!container) return;
    try {
      const response = await fetch('assets/site-input-catalog.json?rev=a4-20261017-r1', {credentials:'omit'});
      if (!response.ok) throw new Error('Reference catalog unavailable');
      const catalog = await response.json();
      const engine = root.BoilerSiteCore.create(catalog);
      const app = root.BoilerSiteUI.mount(container, catalog, engine);
      root.BoilerCalcUI.mount(container, catalog, engine, app);
      root.boilerSiteApp = app;
      const heading = container.querySelector('.site-heading');
      for (const text of [
        'חישוב ראשוני בלבד — לא אישור תכנון; נדרשת בדיקת מהנדס',
        'נתונים נשמרים רק בדפדפן שלך. אין שליחה לשרת. הטיוטה בזיכרון הלשונית בלבד; לשמירה קבועה יש לייצא JSON לפני סגירה.',
        'EXAMPLE-3: דוגמה בלבד — נתונים סינתטיים. טעינה רק לאחר אישור; הדוגמה אינה נתוני מפעל ואינה אישור ציוד או ערכי הגנה.'
      ]) {
        const note = document.createElement('p');
        note.className = 'site-note';
        note.textContent = text;
        heading.append(note);
      }
    } catch (error) {
      const message = document.createElement('p');
      message.setAttribute('role', 'alert');
      message.textContent = 'טעינת הטופס נכשלה. יש לרענן את העמוד ולבדוק שקובצי האתר זמינים. לא נשלחו נתונים.';
      container.replaceChildren(message);
      console.error('Public site-data bootstrap failed', error);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})(window);
