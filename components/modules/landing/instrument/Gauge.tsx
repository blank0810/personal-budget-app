import { GAUGE } from './gauge-geometry';
import { SAMPLE_LABEL, SAMPLE_PILLARS, SAMPLE_SCORE } from './sample-reading';

/**
 * Gauge — the page's hero object and its one signature motion: an
 * instrument taking a reading. The needle settles once on load and the
 * channel bars fill behind it.
 *
 * A server component. The needle and bars animate in pure CSS with
 * `backwards` fill, so the resting style is the final one — no JS gates
 * visibility, and a headless render or a background tab still shows a
 * complete reading.
 *
 * Honesty: this is one illustrative output of the scorer, labelled as a
 * sample on the face of the component. It is not a claim about users.
 */
export function Gauge() {
	return (
		<div className='gauge-panel'>
			<div className='gauge-head'>
				<span className='micro'>Sample reading</span>
				<span className='micro'>Weighted</span>
			</div>

			<svg
				className='gauge'
				viewBox={GAUGE.viewBox}
				role='img'
				aria-label={`Sample financial health reading: ${SAMPLE_SCORE} out of 100, rated ${SAMPLE_LABEL}.`}
			>
				<path className='g-track' d={GAUGE.track} fill='none' strokeWidth='2' />
				<path
					className='g-fill'
					d={GAUGE.fill(SAMPLE_SCORE)}
					fill='none'
					strokeWidth='4'
				/>
				<g className='g-ticks' strokeWidth='1.5'>
					{GAUGE.ticks.map((t) => (
						<line key={`${t.x1}-${t.y1}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
					))}
				</g>
				<g
					className='needle'
					style={
						{
							'--needle-deg': `${GAUGE.needleRotation(SAMPLE_SCORE).toFixed(1)}deg`,
						} as React.CSSProperties
					}
				>
					<line
						className='g-needle'
						x1={GAUGE.centre.cx}
						y1={GAUGE.centre.cy}
						x2={GAUGE.centre.cx}
						y2={30}
						strokeWidth='3'
						strokeLinecap='round'
					/>
					<circle className='g-hub' cx={GAUGE.centre.cx} cy={GAUGE.centre.cy} r='6' />
				</g>
			</svg>

			<div className='gauge-read'>
				<b aria-hidden='true'>{SAMPLE_SCORE}</b>
				<span aria-hidden='true'>/100</span>
			</div>
			<p className='gauge-state' aria-hidden='true'>
				{SAMPLE_LABEL}
			</p>

			<dl className='channels'>
				{SAMPLE_PILLARS.map((pillar) => (
					<div className='chan' key={pillar.name}>
						<dt>
							<b>{pillar.name}</b>
							<span className='sr-only'> — {pillar.question}</span>
						</dt>
						<dd className='chan-read'>
							<span
								className='bar'
								role='img'
								aria-label={`${pillar.name}: grade ${pillar.grade}, ${pillar.score} out of 100`}
							>
								<i style={{ width: `${pillar.score}%` }} />
							</span>
							<span className='g' aria-hidden='true'>
								{pillar.grade}
							</span>
						</dd>
					</div>
				))}
			</dl>

			<p className='fine' style={{ marginTop: '1rem', fontSize: '.8125rem' }}>
				Sample figures, shown to explain the output. Your score is computed from
				what you log &mdash; nothing is estimated from a bank feed.
			</p>
		</div>
	);
}
