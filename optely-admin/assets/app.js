/* Optely Admin – diagram och små hjälpfunktioner (ingen byggprocess). */
(function () {
  'use strict';

  // Bekräftelsedialog för knappar/formulär med data-confirm
  document.addEventListener('submit', function (e) {
    var msg = e.target.getAttribute('data-confirm');
    if (msg && !window.confirm(msg)) e.preventDefault();
  });

  // Kopiera-knappar
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var input = document.getElementById(btn.getAttribute('data-copy'));
    if (!input) return;
    var text = input.value !== undefined ? input.value : input.textContent;
    navigator.clipboard.writeText(text).then(function () {
      var old = btn.textContent;
      btn.textContent = 'Kopierat';
      setTimeout(function () { btn.textContent = old; }, 1400);
    });
  });

  // Månadsväljare som byter sida direkt
  document.querySelectorAll('select[data-autosubmit]').forEach(function (el) {
    el.addEventListener('change', function () { el.form.submit(); });
  });

  if (typeof Chart === 'undefined') return;

  var css = getComputedStyle(document.documentElement);
  var v = function (name) { return css.getPropertyValue(name).trim(); };
  var palette = [v('--chart-1'), v('--chart-2'), v('--chart-3'), v('--chart-4')];

  var eur = new Intl.NumberFormat('sv-FI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var plain = new Intl.NumberFormat('sv-FI', { maximumFractionDigits: 1 });

  Chart.defaults.font.family = v('--sans') || 'system-ui';
  Chart.defaults.font.size = 12;
  Chart.defaults.color = v('--text-2');
  Chart.defaults.borderColor = v('--border');
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
  Chart.defaults.plugins.legend.labels.useBorderRadius = true;
  Chart.defaults.plugins.legend.labels.borderRadius = 3;
  Chart.defaults.plugins.tooltip.backgroundColor = v('--text');
  Chart.defaults.plugins.tooltip.titleColor = v('--surface');
  Chart.defaults.plugins.tooltip.bodyColor = v('--surface');
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.maintainAspectRatio = false;

  function hexAlpha(color, alpha) {
    if (color.charAt(0) !== '#' || color.length !== 7) return color;
    var a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return color + a;
  }

  document.querySelectorAll('canvas[data-chart]').forEach(function (canvas) {
    var spec;
    try {
      spec = JSON.parse(document.getElementById(canvas.getAttribute('data-chart')).textContent);
    } catch (err) { return; }

    var money = spec.format !== 'number';
    var fmt = function (n) { return money ? eur.format(n) : plain.format(n); };
    var type = spec.type || 'bar';

    var datasets = spec.series.map(function (s, i) {
      var color = palette[s.color !== undefined ? s.color : i % palette.length];
      var ds = {
        label: s.label,
        data: s.data,
        type: s.type || type,
        borderColor: color,
        backgroundColor: (s.type || type) === 'line' ? hexAlpha(color, 0.12) : color,
        borderWidth: (s.type || type) === 'line' ? 2 : 0,
        borderRadius: 4,
        maxBarThickness: 36,
        tension: 0.25,
        pointRadius: spec.labels.length > 18 ? 0 : 3,
        pointHoverRadius: 5,
        fill: !!s.fill,
        borderDash: s.dashed ? [5, 4] : undefined,
      };
      if (type === 'doughnut') {
        ds.backgroundColor = spec.labels.map(function (_, j) { return palette[j % palette.length]; });
        ds.borderColor = v('--surface');
        ds.borderWidth = 2;
      }
      return ds;
    });

    var options = {
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: datasets.length > 1 || type === 'doughnut', position: type === 'doughnut' ? 'right' : 'top', align: 'end' },
        tooltip: { callbacks: { label: function (ctx) {
          var val = ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed;
          return ' ' + ctx.dataset.label + ': ' + fmt(val);
        } } },
      },
    };
    if (type === 'doughnut') {
      options.cutout = '62%';
      options.interaction = undefined;
      options.plugins.tooltip.callbacks.label = function (ctx) {
        var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0) || 1;
        return ' ' + ctx.label + ': ' + fmt(ctx.parsed) + ' (' + plain.format(ctx.parsed / total * 100) + ' %)';
      };
    } else {
      options.scales = {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
        y: {
          beginAtZero: spec.beginAtZero !== false,
          grid: { color: v('--border') },
          border: { display: false },
          ticks: { callback: function (val) { return fmt(val); }, maxTicksLimit: 6 },
        },
      };
    }

    new Chart(canvas, { type: type, data: { labels: spec.labels, datasets: datasets }, options: options });
  });
})();
