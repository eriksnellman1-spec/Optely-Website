// Små hjälpare: datum/tid-fältet för Ring senare och Möte bokat, Fel person, tangenter 1–5 och n.
(function () {
  const form = document.getElementById('outcome-form');
  if (!form) return;
  const when = document.getElementById('when');
  const wrong = document.getElementById('wrong-person');

  form.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.toggle === 'wrong-person') {
      wrong.hidden = !wrong.hidden;
      if (!wrong.hidden) wrong.querySelector('input').focus();
      return;
    }
    // Första klicket på Ring senare / Möte bokat visar datum och tid; nästa klick sparar.
    if (btn.dataset.needs === 'when' && when.hidden) {
      e.preventDefault();
      when.hidden = false;
      when.dataset.for = btn.value;
      when.querySelector('input').focus();
      btn.classList.add('armed');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.key === 'n') {
      e.preventDefault();
      document.getElementById('note').focus();
      return;
    }
    const btn = form.querySelector('[data-key="' + e.key + '"]');
    if (btn) {
      e.preventDefault();
      btn.click();
    }
  });
})();

// Markera alla i en tabell.
document.querySelectorAll('[data-check-all]').forEach((box) => {
  box.addEventListener('change', () => {
    box.closest('form').querySelectorAll('input[name="ids[]"]').forEach((c) => (c.checked = box.checked));
  });
});
