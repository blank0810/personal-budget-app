/* Theme control for the Instrument mockup.
 *
 * The no-flash half of this runs inline in <head> (see each page) so
 * data-theme is on <html> before first paint. This file only handles
 * the toggle.
 *
 * Preference order: an explicit choice the visitor made, else the
 * operating system. A public page that forces light on someone whose
 * machine is dark is a small rudeness, and it also means the product
 * screenshots stop matching the page around them.
 */
(function () {
	var KEY = 'bp-instrument-theme';
	var root = document.documentElement;

	function apply(next) {
		root.setAttribute('data-theme', next);
		try { localStorage.setItem(KEY, next); } catch (e) { /* storage can be blocked */ }
	}

	/* Fallback path: a brief class that turns on token transitions, then
	   removes itself. Leaving those transitions permanently on would tax
	   every hover and scroll for the sake of one control. */
	function crossfade(next) {
		root.classList.add('theming');
		apply(next);
		window.setTimeout(function () { root.classList.remove('theming'); }, 460);
	}

	function toggle(event) {
		var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
		var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (reduced || typeof document.startViewTransition !== 'function') {
			return reduced ? apply(next) : crossfade(next);
		}

		/* Circular wipe originating at the control the visitor just hit,
		   so the change reads as caused by them rather than as a flash. */
		var r = event.currentTarget.getBoundingClientRect();
		var x = r.left + r.width / 2;
		var y = r.top + r.height / 2;
		var radius = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y)
		);

		var vt = document.startViewTransition(function () { apply(next); });
		vt.ready.then(function () {
			root.animate(
				{ clipPath: [
					'circle(0px at ' + x + 'px ' + y + 'px)',
					'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'
				] },
				{ duration: 560, easing: 'cubic-bezier(.16,1,.3,1)',
				  pseudoElement: '::view-transition-new(root)' }
			);
		});
	}

	document.querySelectorAll('.toggle').forEach(function (el) {
		el.addEventListener('click', toggle);
	});

	/* Follow the OS while the visitor has not made an explicit choice. */
	var mq = window.matchMedia('(prefers-color-scheme: dark)');
	mq.addEventListener('change', function (e) {
		try { if (localStorage.getItem(KEY)) return; } catch (err) { /* ignore */ }
		root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
	});
})();
